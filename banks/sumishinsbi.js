const {AbstractBank, generate_yargs_builder} = require('./abstract-bank');

class SumishinSbi extends AbstractBank {
  static get siteSpec() {
    return {
      loginUrl: 'https://www.netbk.co.jp/contents/pages/wpl010101/i010101CT/DI01010210',
      errorSelector: 'div.m-boxError,div.m-boxWarn',
      transferUrl: 'https://www.netbk.co.jp/contents/pages/wpl040102/i040102CT/DI04010100?CallerScreen=2',
      transferSelectCandidateSelector: 'div.m-furikomi-kozalist li.ng-star-inserted',
      transferSelectLabelSelector: 'a.m-link',
      transferInputFormSelector: 'div.m-contentsWrap',
      transferInputTextFieldSelector: 'input[name="tfrAmt0"]',
      transferInputSubmitButtonSelector: 'a.m-btnEm-l',
      transferConfirmListSelector: 'tr th p, td div.m-colorMinus, td div.m-tbl-row, div.m-boxList div.m-boxList-detail dl',
      transferConfirmFormSelector: 'div.m-ctsCertification',
      transferConfirmSubmitButtonSelector: 'div.m-ctsCertification-cts-smart a',
      transferValidator: /^振込手数料\s*0円$/m,
      transferValidatorError: '振込手数料がかかります',
      transferResultListSelector: 'tr th p, td div.m-colorMinus, td div.m-tbl-row, div.m-boxList div.m-boxList-detail dl',
    };
  }

  async transferResult() {
    // スマート認証終了待ち（タイムアウト600秒=10分）
    await this._page.waitForNavigation({waitUntil: 'networkidle2', timeout: 600000});
    // スマート認証が完了すると確認画面に遷移する
    return super.transferResult();
  }
}

const command = [ `sumishinsbi <command>`, '住信SBI銀行', '住信SBI', '住信' ]
const description = '住信SBI銀行から口座振込を行います'
const builder = generate_yargs_builder(SumishinSbi);

module.exports = {SumishinSbi, command, description, builder};
