const {AbstractBank, generate_yargs_builder} = require('./abstract-bank');

class Suruga extends AbstractBank {
  static get siteSpec() {
    return {
      errorSelector: 'div.errArea',
      loginUrl: 'https://ib.surugabank.co.jp/im/IBGate/',
      transferUrl: 'https://ib.surugabank.co.jp/im/IBGate/iB01101CT',
      transferInputTextFieldSelector: 'input[name="PIA_AMT_INPUT"]',
      transferValidator: /^振込手数料\s*0円/m,
      transferValidatorError: '振込手数料が有料となるため処理を中断しました',
    };
  }
}

const command = [ `suruga <command>`, 'スルガ銀行', 'スルガ' ];
const description = 'スルガ銀行から口座振込を行います';
const builder = generate_yargs_builder(Suruga);

module.exports = {Suruga, command, description, builder};
