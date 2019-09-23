const { spawnSync } = require('child_process');

const command = [ 'transfer <src> <dst> <amount>', '振込', '銀行振込', '送金' ];
const description = '指定銀行に指定金額を振込';
const handler = function (argv) {
  const command = process.argv[0];
  const scriptPath = process.argv[1];
  let args = process.argv.slice(2);
  const subcommand = argv._[0]
  const subcommandIndex = args.findIndex(el => el === subcommand);
  const srcIndex = args.findIndex(el => el === argv.src);
  // swap subcommand and src
  args[subcommandIndex] = argv.src;
  args[srcIndex] = subcommand;
  args.unshift(scriptPath)
  const ret = spawnSync(command, args, { stdio: 'inherit' });
};
const builder = function (yargs) {
  yargs.strict(false)
}

module.exports = {command, description, handler, builder};
