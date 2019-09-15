const {AbstractBank, generate_yargs_builder} = require('./abstract-bank');

class DaiwaNext extends AbstractBank {
  static get siteSpec() {
    return {
      errorSelector: 'p.error',
      loginUrl: 'https://next.bank-daiwa.co.jp/web/loginPage.do',
      loginErrorSelector: 'p.error,div.panel-error',
      transferSelectCandidateSelector: 'div#registerd-account-list tbody tr',
      transferSelectLabelSelector: 'input[name="btnChoice"]',
      transferInputTextFieldSelector: 'input[name="txtFkomiKin"]',
      transferValidator: /^振込手数料\s*0円.*$/m,
      transferValidatorError: '振込手数料がかかります',
      transferConfirmSubmitButtonSelector: 'input[name="BtnJikko"]',
    };
  }

  async loginResult() {
    // 「パスワード変更のお願い」が出ていたらスキップ
    const selectors = ['ul.action-cancel span', 'body']
    const [button] = await this._page.waitForSelectors(selectors);
    if (button) {
      return Promise.all([
        this._page.waitForNavigation({waitUntil: 'networkidle2'}),
        button.click()
      ]);
    }
  }

  async gotoTransferPage() {
    this.logger.debug('gotoTransferPage()');
    // 振り込みページへ
    const furikomiTopLink = await this._page.waitForSelector(
      'ul#global-nav a[href*="remittanceTop"]',
      {visible: true}
    );
    if (!furikomiTopLink) {
      throw new Error('振込ページへのリンクが見つかりませんでした');
    }
    await Promise.all([
      this._page.waitForNavigation({waitUntil: 'networkidle2'}),
      furikomiTopLink.click()
    ]);
    // 「すべてを表示」ボタンを押す
    const showAllLink = await this._page.waitForSelector(
      'a[href="#registerd-account-more-list"]',
      {visible: true}
    );
    if (!showAllLink) {
      throw new Error('「すべてを表示」ボタンが見つかりませんでした');
    }
    return showAllLink.click();
  }
}

const command = [ `daiwanext <command>`, '大和ネクスト銀行', '大和ネクスト', '大和' ];
const description = '大和ネクスト銀行から口座振込を行います';
const builder = generate_yargs_builder(DaiwaNext);

module.exports = {DaiwaNext, command, description, builder};
