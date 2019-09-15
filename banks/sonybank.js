const {AbstractBank, generate_yargs_builder} = require('./abstract-bank');

class SonyBank extends AbstractBank {
  static get siteSpec() {
    return {
      errorSelector: 'body.error h2, div#errMsg',
      loginUrl: 'https://o2o.moneykit.net/NBG100001U01.html?nc=181029001',
      loginSubmitButtonSelector: 'ul.submit_button a[href*="mySubmit"]',
      transferSelectCandidateSelector: 'div.box4',
      transferSelectLabelSelector: 'a.choice',
      transferInputTextFieldSelector: 'input[name="FkomiKin"]',
      transferInputSubmitButtonSelector: 'ul.submit_button a',
      transferConfirmListSelector: 'div.content table tr, div.content ul li',
      transferConfirmSubmitButtonSelector: 'ul.submit_button a',
    };
  }

  async gotoTransferPage() {
    // 「振込」 リンクを押す
    await Promise.all([
      this._page.waitForNavigation({waitUntil: 'networkidle2'}),
      this._page.waitForSelector('li.furikomi a', {visible: true})
      .then(el => el.click())
    ]);
    // 「登録先への振込」 ボタンを押す、別ウインドウが開く
    [this._page] = await Promise.all([
      this.browser.waitForTarget(t => t.opener() === this._page.target())
        .then(t => t.page()),
      this._page.waitForSelector('ul.menuList5 a[href*="61"]', {visible: true})
        .then(el => el.click())
    ]);
    // targetが新規に作られるとnetworkidleを待つ方法がないのでreload、かなりトリッキー
    return this._page.reload({waitUntil: 'networkidle2'});
  }
}

const command = [ `sonybank <command>`, 'ソニー銀行', 'ソニー' ]
const description = 'ソニー銀行から口座振込を行います'
const builder = generate_yargs_builder(SonyBank);

module.exports = {SonyBank, command, description, builder};
