#! /usr/bin/env node

const path = require('path');

const decryptValues = (argv) => {
  const EasyAes = require('@hnw/easyaes');
  const cipher = new EasyAes();
  return cipher.decrypt(argv, 2);
}

const setDebugAliases = (argv) => {
  if (argv.debug) {
    return {
      headless: false,
      verbose: 3,
    }
  }
  return;
}

async function cli() {
  require('dotenv').config({path: __dirname + '/.env'})
  let globalOptions;
  let yargs = require('@hnw/yargs-customized')
      .strict(true)
      .usage('Usage: $0 [options]')
      .boolean('debug')
      .describe('debug', 'Force headful')
      .version('0.0.1')
      .middleware(decryptValues)
      .middleware(setDebugAliases)
      .fail((msg, err, yargs) => {
        if (msg) {
          // failure message: might be typo for sub-command name
          console.error(`==> ${msg}`);
          yargs.showHelp();
          process.exit(1);
        }
      });

  yargs = yargs.commandDir('./banks');

  try {
    await yargs.argv
  } catch (e) {
    console.log("==== Uncatched exception ====");
    console.log(e);
  }
}

(async () => {
  /*
    現在のyargsではasync関数を含むサブコマンドの終了をうまく待てない
    awaitする意味もないし、awaitの後に終了系の処理を書くこともできない認識
    将来のバージョンで何とかなってほしい
  */
  await cli();
})();
