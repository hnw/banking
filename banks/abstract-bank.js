`use strict`;
const {TimeoutError} = require('puppeteer/Errors');
const devices = require('puppeteer/DeviceDescriptors');

const waitTimeForInputField = 500;

const asyncMap = async (array, asyncCallback) => {
  return Promise.all(array.map(asyncCallback));
}
const asyncFilter = async (array, asyncCallback) => {
  return Promise.all(array.map(asyncCallback))
    .then(bits => array.filter((_, i) => bits[i]));
}
/**
* 環境変数名にプレフィックスをつけて値をコピーする。
* yargsの.env()でプレフィックスありなしを同時に扱うためのトリッキーな解決策。
*/
const addPrefixToEnv = (prefix) => {
  if (prefix == '') {
    return;
  }
  prefix = prefix + '_';
  Object.keys(process.env).forEach(function (key) {
    if (!key.startsWith(prefix)) {
      const newKey = prefix + key;
      if (!process.env.hasOwnProperty(newKey)) {
        process.env[newKey] = process.env[key];
      }
    }
  });
}

const properties = {
  _nullinitOnceCalled: false,
  _loginOnceCalled: false,
  _page: null,
  _spec: null,
  _isHeadless: true,
}

class AbstractBank {
  constructor(spec) {
    Object.assign(this, spec, this.constructor.siteSpec, properties);
    this._spec = spec;
  }

  // 指定されたプレフィックスを持つプロパティについて、プレフィックスを除去したオブジェクトを返す
  unprefixProperty(prefix = '') {
    let unprefixed = {};
    for (const [key, value] of Object.entries(this)) {
      let newKey = key;
      if (key.startsWith(prefix)) {
        newKey = key.substring(prefix.length);
        newKey = newKey[0].toLowerCase() + newKey.substring(1);
        unprefixed[newKey] = value;
      }
    }
    return Object.assign({}, this, unprefixed);
  }

  async initialize() {
    if (this.logger) {
      this.logger.debug('initialize()');
    }
    if (this._initOnceCalled) {
      return this;
    }
    this._initOnceCalled = true;

    // お気に入りのロガーがある場合はコンストラクタ引数にセットしておけばそっち優先
    if (!this.logger) {
      const log4js = require('@hnw/log4js-customized').setDefaults(this._spec);
      this.logger = log4js.getLogger();
      this.logger.debug('initialize()');
    }

    // お気に入りのPuppeteerがある場合はコンストラクタ引数にセットしておけばそっち優先
    if (!this.browser) {
      const puppeteer = require('@hnw/puppeteer-customized').setDefaults(this._spec);
      this.browser = await puppeteer.launch()
      this.logger.debug('puppeteer.launch()');
    }

    this.logger.debug('newPage()');
    this._page = await this.browser.newPage();
    if (this.deviceName && devices.hasOwnProperty(this.deviceName)) {
      const device = devices[this.deviceName];
      await this._page.emulate(device);
    }
    this._isHeadless = await this._page.evaluate('!window.chrome');
    return this;
  }

  async terminate(errorOccurred = false) {
    this.logger.debug('terminate()');
    if (this.browser) {
      if (!this._isHeadless && this.debug) {
        // 非ヘッドレスモードかつデバッグモード有効ならブラウザを残す
        this.logger.debug('Keep browser open');
      } else if (!this._isHeadless && errorOccurred) {
        // 非ヘッドレスモードかつエラー終了の場合はブラウザを残す
        this.logger.debug('Keep browser open');
      } else {
        // それ以外ならブラウザを閉じる
        await this.browser.close();
      }
    }
  }

  async login() {
    if (this._loginOnceCalled) {
      return;
    }
    this._loginOnceCalled = true;
    await this.initialize();

    this.logger.debug('login()');
    if (this.id === undefined || this.password === undefined) {
      throw new Error('ID or password not specified.');
    }
    await this.gotoLoginPage();

    await this._page.waitForSelector('input:not([disabled])');

    this._page.on('dialog', async dialog => {
      const msg = await dialog.message();
      console.log('msg='+msg);
      throw new Error(msg);
    }).on('error', async err => {
      console.log('msg2='+err);
    });

    const formParams = Object.assign(this.unprefixProperty('login'), {
      textValues: (this.id + '').split(/\s+/),
      passwordValues: (this.password + '').split(/\s+/),
    });
    await this.submitForm(formParams);
    return this.loginResult();
  }

  async gotoLoginPage() {
    this.logger.debug(`gotoLoginPage()`);
    if (!this.loginUrl) {
      throw new Error('URL not specified');
    }
    return this._page.goto(this.loginUrl, {waitUntil: 'networkidle0'});
  }
  
  async loginResult() {
    // do nothing
    this.logger.debug("loginResult()")
  }

  async transfer(bankName, amount) {
    await this.login();
    this.logger.debug(`transfer(${bankName}, ${amount})`);
    await this.gotoTransferPage();
    await this.transferSelect(bankName);
    await this.transferInput(amount);
    await this.transferConfirm();
    await this.transferResult();
  }

  async gotoTransferPage() {
    this.logger.debug(`gotoTransferPage()`);
    if (!this.transferUrl) {
      throw new Error();
    }
    return this._page.goto(this.transferUrl, {waitUntil: 'networkidle0'});
  }

  async chooseIfMatched(params, text) {
    const defaults = {
      candidateSelector: 'table tr',
      labelSelector: 'input[type="submit"]:not([disabled]),input[type="button"]:not([disabled]),button:not([disabled]),a',
      submitButtonSelector: null,
    }
    const spec = Object.assign({}, defaults, params);
    await this._page.waitForSelector(spec.candidateSelector, {visible: true});
    const candidates = await this._page.$$(spec.candidateSelector).then(
      els => asyncFilter(els, el => el.$(spec.labelSelector))
    );
    if (candidates.length == 0) {
      throw new Error('振込先が0件です。振込先の登録を行ってください。');
    }
    for (let el of candidates) {
      this.logger.debug(`textContent = "${await el.textContent}"`);
      if ((await el.textContent).includes(text)) {
        const label = await el.$(spec.labelSelector);
        if (label) {
          if (!spec.submitButtonSelector) {
            return Promise.all([
              this._page.waitForNavigation({waitUntil: 'networkidle2'}),
              label.click()
            ]);
          }
          const submitButton = await this._page.$(spec.submitButtonSelector);
          if (!submitButton) {
            throw new Error('submit button not found');
          }
          await label.click();
          return Promise.all([
            this._page.waitForNavigation({waitUntil: 'networkidle2'}),
            submitButton.click()
          ]);
        }
      }
    }
    throw new Error(`振込先が見つかりませんでした: ${text}`);
  }

  async transferSelect(bankName) {
    this.logger.debug(`transferSelect("${bankName}")`);
    const formParams = this.unprefixProperty('transferSelect');
    return this.chooseIfMatched(formParams, bankName);
  }

  async transferInput(amount) {
    this.logger.debug(`transferInput(${amount})`);
    const formParams = Object.assign(this.unprefixProperty('transferInput'), {
      textValues: [amount]
    });
    return this.submitForm(formParams);
  }

  // 入力内容の一覧が表示されており、そのバリデーションを行う。
  // バリデーションをパスすればフォーム送信。
  // フォームはテキストフィールド0
  // かつパスワードフィールド0（pin === null）または1（pin !== null）
  async confirm(prefix = '') {
    // TODO
  }
  async validate(prefix = '') {
    // TODO
  }

  async transferConfirm() {
    this.logger.debug(`transferConfirm()`);
    const selector = this.transferConfirmListSelector || 'table tr';
    const confirmText = await this.getNormalizedText(selector);
    if (confirmText === '') {
      throw new Error(`確認用テキストが取得できませんでした。セレクタを見直してください: ${selector}`);
    }
    let validators = this.transferValidator || null;
    if (validators === null) {
      throw new Error(`バリデータがありません。振り込みを中止します。: ${confirmText}`);
    }
    if (!Array.isArray(validators)) {
      validators = [validators];
    }
    let validatorErrors = this.transferValidatorError || null;
    if (validators !== null && !Array.isArray(validatorErrors)) {
      validatorErrors = [validatorErrors];
    }
    for (let i = 0; i < validators.length; i++) {
      if (! validators[i] instanceof RegExp) {
        throw new Error(`バリデータが正規表現オブジェクトではありません: ${validators[i]}`);
      }
      if (!validators[i].test(confirmText)) {
        if (validatorErrors) {
          throw new Error(`振込を中止しました: ${validatorErrors[i]}`);
        }
        throw new Error(`振込を中止しました:\nvalidator=${validators[i]}\ntext=${confirmText}`);
      }
    }
    if (this.transferConfirmOutput) {
      this.logger.info(confirmText);
    } else {
      this.logger.debug(confirmText);
    }
    let formParams = this.unprefixProperty('transferConfirm');
    if (this.pin) {
      formParams.passwordValues = (this.pin + '').split(/\s+/);
    }
    return this.submitForm(formParams);
  }

  async transferResult() {
    this.logger.debug(`transferResult()`);
    const spec = this.unprefixProperty('transferResult');
    const resultSelector = spec.listSelector || 'table tr';
    if (spec.errorSelector) {
      const selectors = [spec.errorSelector, resultSelector];
      const [errorBlock] = await this._page.waitForSelectors(selectors);
      if (errorBlock) {
        const errMsg = await this.getNormalizedText(spec.errorSelector, "\n");
        if (errMsg) {
          this.logger.debug(`page.content() = ${await this._page.content()}`);
          throw new Error(errMsg);
        }
      }
    }
    const resultText = await this.getNormalizedText(resultSelector);
    this.logger.info(resultText);
  }


  async getNormalizedText(selector, separator = "\n") {
    const targets = await this._page.$$(selector).then(
      els => asyncFilter(els, el => el.isVisible())
    );
    let texts = await asyncMap(targets, el => el.textContent);
    texts = texts.map(t => t.trim().replace(/\s+/g,' '))
    texts = texts.filter(Boolean);
    return texts.join(separator);
  }

  async $(selector) {
    const els = await this.$$(selector);
    if (els.length === 0) {
      return null;
    }
    return els[0];
  }
  async $$(selector) {
    await this._page.waitForSelector(selector, {visible: true});
    return this._page.$$(selector).then(
      els => asyncFilter(els, el => el.isVisible())
    );
  }

  /**
   * フォームに適切な値を入力してフォーム送信します。
   * @param {Object} params フォームの入力値やその他必要な値
   * @return {AbstractBank}
   */
  async submitForm(params) {
    const defaults = {
      formSelector: 'form',
      textFieldSelector: 'input[type="text"]:not([value]):not([disabled]),input[type="text"][value=""]:not([disabled]),input[type="tel"]:not([value]):not([disabled]),input[type="tel"][value=""]:not([disabled])',
      passwordFieldSelector: 'input[type="password"]:not([disabled])',
      submitButtonSelector: 'input[type="submit"]:not([disabled]),input[type="button"]:not([disabled]),button:not([disabled])',
      errorSelector: null,
      textValues: [],
      passwordValues: [],
    }
    const spec = Object.assign({}, defaults, params);

    if (spec.errorSelector) {
      const selectors = [spec.errorSelector, spec.formSelector];
      const [errorBlock] = await this._page.waitForSelectors(selectors);
      //console.log(await errorBlock.outerHTML);
      if (errorBlock) {
        const errMsg = await this.getNormalizedText(spec.errorSelector, "\n");
        if (errMsg) {
          console.log(await this._page.content());
          throw new Error(errMsg);
        }
      }
    } else {
      await this._page.waitForSelector(spec.formSelector);
    }

    const {form, textFields, passwordFields, submitButtons} = await this.findForm(spec);
    if (form === null) {
      //const fullHtml = await this._page.content();
      //console.log(fullHtml);
      throw new Error(`form not found: ${spec.textValues.length} text / ${spec.passwordValues.length} password / 1 button`);
    }

    for (let i = 0; i < textFields.length; i++) {
      const val = spec.textValues[i];
      if (val === undefined || val === null) {
        throw new Error(`undefined value for text field #${i}`);
      }
      this.logger.debug(`input #${i}: outerHTML = ${await textFields[i].outerHTML}`);
      await textFields[i].type(val + '');
      await this._page.waitFor(waitTimeForInputField);
    }
    for (let i = 0; i < passwordFields.length; i++) {
      const val = spec.passwordValues[i];
      if (val === undefined || val === null) {
        throw new Error(`undefined value for password field #${i}`);
      }
      await passwordFields[i].type(val + '');
      await this._page.waitFor(waitTimeForInputField);
    }
    try {
      let waitOption = {waitUntil: ['load', 'networkidle2']}
      if (spec.formTimeout) {
        waitOption['timeout'] = spec.formTimeout;
      }
      this.logger.debug('waiting to load...');
      await Promise.all([
        this._page.waitForNavigation(waitOption),
        submitButtons[0].click()
      ]);
      this.logger.debug('done');
    } catch (e) {
      this.logger.debug(`timeout: submitButtons[0].outerHTML = ${await submitButtons[0].outerHTML}`);
      if (e instanceof TimeoutError) {
        const err = await this.getNormalizedText(spec.errorSelector, " ");
        if (err) {
          // タイムアウト＆ログイン失敗
          throw new Error(err);
        }
      }
      throw e;
    }
    if (spec.errorSelector) {
      const errMsg = await this.getNormalizedText(spec.errorSelector, " ");
      if (errMsg) {
        // ログイン失敗
        throw new Error(errMsg);
      }
    }
    return this;
  }

  /**
   * ページ中から入力できそうなフォームを返します
   * @param {Object} spec フォームの入力値やその他必要な値
   * @return {ElementHandle|null}
   */
  async findForm(spec) {
    const forms = await this._page.$$(spec.formSelector).then(
      els => asyncFilter(els, el => el.isVisible())
    );
    if (forms.length == 0) {
      return null;
    }
    let form = null;
    let textFields, passwordFields, submitButtons;
    for (let i = 0; i < forms.length; i++) {
      form = forms[i];
      textFields = await form.$$(spec.textFieldSelector).then(
        els => asyncFilter(els, el => el.isVisible())
      );
      passwordFields = await form.$$(spec.passwordFieldSelector).then(
        els => asyncFilter(els, el => el.isVisible())
      );
      submitButtons = await form.$$(spec.submitButtonSelector).then(
        els => asyncFilter(els, el => el.isVisible())
      );
      this.logger.debug(`textFields.length=${textFields.length}`);
      if (textFields.length !== spec.textValues.length) {
        if (textFields.length > 1) {
          const htmls = await asyncMap(textFields, el => el.outerHTML);
          this.logger.debug(`  textFields=${htmls}`);
        }
      }
      this.logger.debug(`passwordFields.length=${passwordFields.length}`);
      if (passwordFields.length !== spec.passwordValues.length) {
        if (passwordFields.length > 1) {
          const htmls = await asyncMap(passwordFields, el => el.outerHTML);
          this.logger.debug(`  passwordFields=${htmls}`);
        }
      }
      this.logger.debug(`submitButtons.length=${submitButtons.length}`);
      if (submitButtons.length > 1) {
        const htmls = await asyncMap(submitButtons, el => el.outerHTML);
        this.logger.debug(`  submitButtons=${htmls}`);
      } else if (submitButtons.length === 0) {
        let candidateButtons = await form.$$(spec.submitButtonSelector);
        if (candidateButtons.length === 0) {
          this.logger.debug(`  submitButtonSelector=${spec.submitButtonSelector}`);
        } else {
          const htmls = await asyncMap(candidateButtons, el => el.outerHTML);
          this.logger.debug(`  candidateButtons=${htmls}`);
        }
      }
      if (textFields.length == spec.textValues.length &&
          passwordFields.length == spec.passwordValues.length &&
          submitButtons.length == 1) {
        return {form, textFields, passwordFields, submitButtons};
      }
    }
    return null;
  }
}

generate_yargs_builder = (BankClazz) => {
  let obj = null;
  const envPrefix = BankClazz.name.toUpperCase();
  return (yargs) => {
    addPrefixToEnv(envPrefix);
    return yargs
      .env(envPrefix)
      .middleware(argv => obj = obj || new BankClazz(argv))
      .command({
        command:  [ 'login', 'ログイン' ],
        describe: 'ログイン',
        handler:  async (argv) => {
          await obj.login();
          await obj.terminate();
        },
        builder: yargs => yargs.strict(false),
      })
      .command({
        command:  [ 'transfer <bankname> <amount>', '振込', '銀行振込', '送金' ],
        describe: '指定銀行に指定金額を振込',
        handler:  async (argv) => {
          await obj.transfer(argv.bankname, argv.amount);
          await obj.terminate();
        },
        builder: yargs => yargs.strict(false),
      })
      .fail(async (msg, err, yargs) => {
        if (err && obj.logger) {
          obj.logger.warn('エラー: ' + err.message);
          obj.logger.info(err);
        }
        if (obj) {
          const errorOccurred = true;
          await obj.terminate(errorOccurred);
        }
      })
  }
}

module.exports = {AbstractBank, generate_yargs_builder};
