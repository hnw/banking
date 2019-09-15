const { spawnSync } = require('child_process');

const command = [ 'transfer <src> <dst> <amount>', '振込', '銀行振込', '送金' ];
const description = '指定銀行に指定金額を振込';
const handler = function (argv) {
  const ret = spawnSync('node',
                        [ argv.$0, argv.src, 'transfer', argv.dst, argv.amount ],
                        { stdio: 'inherit' });
  console.log(ret);
};
const builder = function (yargs) {
  yargs.strict(false)
}

module.exports = {command, description, handler, builder};
