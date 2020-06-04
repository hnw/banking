const {AbstractBank, generate_yargs_builder} = require('./abstract-bank');

class Shinsei extends AbstractBank {
  static get siteSpec() {
    return {
      errorSelector: 'div.errorMsgx, p[ng-bind-html="errorMessagex"]',
      loginUrl: 'https://bk.shinseibank.com/SFC/apps/services/www/SFC/desktopbrowser/default/login?mode=1',
      loginIdSelector: 'input[name="nationalId"]',
      loginPasswordSelector: 'input[name="password"]',
      transferInputFormSelector: 'body',
      transferInputTextFieldSelector: 'input[name="amount"]',
      transferInputSubmitButtonSelector: 'p.inputAmountBtnSpace button:nth-child(2)',
      transferValidator: [/^今月の他行宛振込手数料無料回数.*残り\s*([1-9]|10)回.*$/m, /^キャッシュバック\D*(314|210|105)円$/m],
      transferValidatorError: ['振込手数料無料回数が残っていません', 'キャッシュバック額が不正です', ],
      transferConfirmFormSelector: 'p.btnSpace',
      transferConfirmSubmitButtonSelector: 'button:not(.return)',
      transferConfirmFormTimeout: 900000, // 15min
    };
  }

  async gotoTransferPage() {
    this.logger.debug('gotoTransferPage()');
    // ページレンダリング待ち
    await this._page.waitForSelector('h1', {visible: true});
    // 「振込」トップへ
    await Promise.all([
      this._page.waitForNavigation({waitUntil: ["load", "networkidle2"]}),
      this._page.$('header li.nav-item a[ng-click*="TR0001"]').then(el => el.click())
    ]);
    // ページレンダリング待ち
    await this._page.waitForSelector('h1', {visible: true});
    // 振込先選択ページへ
    return Promise.all([
      this._page.waitForNavigation({waitUntil: ["load", "networkidle2"]}),
      this._page.$('header ul.sub li a[ng-click*="TR0002"]').then(el => el.click())
    ]);
  }

  async transferSelect(bankName) {
    // ページレンダリング待ち
    await this._page.waitForSelector('h1', {visible: true});
    return super.transferSelect(bankName);
  }

  async transferInput(amount) {
    // ページレンダリング待ち
    await this._page.waitForSelector('h1', {visible: true});
    return super.transferInput(amount);
  }

  async transferConfirm() {
    // ページレンダリング待ち
    await this._page.waitForSelector('h1', {visible: true});
    // ↑では待ててない分があるっぽいので10秒待ち
    await this._page.waitFor(10000);
    return super.transferConfirm();
  }

  async transferResult() {
    // ページレンダリング待ち
    await this._page.waitForSelector('h1', {visible: true});
    return super.transferResult();
  }
}

const command = [ `shinsei <command>`, '新生銀行', '新生' ]
const description = '新生銀行から口座振込を行います'
const builder = generate_yargs_builder(Shinsei);

module.exports = {Shinsei, command, description, builder};
