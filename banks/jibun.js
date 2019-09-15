const {AbstractBank, generate_yargs_builder} = require('./abstract-bank');

class Jibun extends AbstractBank {
  static get siteSpec() {
    return {
      loginUrl: 'https://www.jibunbank.co.jp/redirect/login.html',
      loginSubmitButtonSelector: 'a#idLogon',
      errorSelector: 'div.error',
      transferSelectLabelSelector: 'input[type="radio"]',
      transferSelectSubmitButtonSelector: 'a.btn#idNext',
      transferInputTextFieldSelector: 'input[name="fldtransferamt"]',
      transferInputSubmitButtonSelector: 'a.btn#idNext',
      transferValidator: /^手数料（税込）0円$/m,
      transferValidatorError: '振込手数料がかかります',
      transferConfirmSubmitButtonSelector: 'a.btn[onclick*="fnConfirm"]',
      transferConfirmOutput: true, // resultで情報が出ないため
      transferResultListSelector: 'div#content div.post,div#content div.warning'
    };
  }

  async gotoTransferPage() {
    // 「振込」 トップレレベルメニューをひらく
    await this._page.waitForSelector('a.transfer', {visible: true})
      .then(el => el.click());
    // 「振込」 メニューを押す
    return Promise.all([
      this._page.waitForNavigation({waitUntil: 'networkidle2'}),
      this._page.waitForSelector('a#targetIdMenuobjectTPT', {visible: true})
        .then(el => el.click())
    ]);
  }

  async transferSelect(bankName){
    // 口座選択画面
    await super.transferSelect(bankName);
    // 口座名義確認画面：「次へ」を押す
    return Promise.all([
      this._page.waitForNavigation({waitUntil: 'networkidle2'}),
      this._page.waitForSelector('a.btn#idNext', {visible: true})
        .then(el => el.click())
    ]);
  }

  async transferConfirm() {
    await this._page.waitFor(500); // 念のため?待つ

    // <script>除去
    // via: https://stackoverflow.com/questions/50867065/puppeteer-removing-elements-by-class/50867205
    await this._page.evaluate(selector => {
      const elements = document.querySelectorAll(selector);
      for (var i=0; i< elements.length; i++){
        elements[i].parentNode.removeChild(elements[i]);
      }
    }, 'table tr script');
    // 親メソッド呼び出し
    return super.transferConfirm();
  }
}

const command = [ `jibun <command>`, 'じぶん銀行', 'じぶん' ]
const description = 'じぶん銀行から口座振込を行います'
const builder = generate_yargs_builder(Jibun);

module.exports = {Jibun, command, description, builder};
