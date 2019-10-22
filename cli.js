#! /usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

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

/**
 * srcPrefixから始まる環境変数があったら変数名のプレフィックスをdstPrefixに
 * 書き換えたキーに値をコピーする。
 * 複数アカウントの処理のため、環境変数をセットしなおす目的。
 */
const replacePrefixedEnv = (srcPrefix, dstPrefix) => {
  if (srcPrefix == '' || dstPrefix == '') {
    return;
  }
  srcPrefix = srcPrefix + '_';
  dstPrefix = dstPrefix + '_';
  Object.keys(process.env).forEach(function (key) {
    if (key.startsWith(srcPrefix)) {
      const newKey = dstPrefix + key.substring(srcPrefix.length);
      process.env[newKey] = process.env[key];
    }
  });
}

/**
 * サービスのalias名を環境変数から探す
 */
const searchServiceAlias = (serviceName) => {
  const targetSuffix = '_ALIAS'
  const matchedKey = Object.keys(process.env).find(function (key) {
    if (key.endsWith(targetSuffix)) {
      return process.env[key].split(',').includes(serviceName);
    }
  });
  if (matchedKey) {
    return matchedKey.slice(0, -targetSuffix.length);
  }
  return null;
}

/**
 * 同一サービスに対して複数アカウント/複数定義ある場合の処理
 */
const processForMultipleAcccount = () => {
  if (process.argv.length <= 2) {
    // サブコマンドが指定されてない
    return null;
  }
  const executable = process.argv[0];
  const scriptPath = process.argv[1];
  const serviceName = process.argv[2];
  let args = process.argv.slice(3);
  let targetPrefix = serviceName.toUpperCase();
  let originalServiceName = process.env[`${targetPrefix}_SERVICENAME`];
  if (!originalServiceName) {
    // エイリアス定義を探す
    targetPrefix = searchServiceAlias(serviceName);
    if (targetPrefix === null) {
      return null;
    }
    originalServiceName = process.env[`${targetPrefix}_SERVICENAME`];
  }
  const originalPrefix = originalServiceName.toUpperCase();
  if (targetPrefix === originalPrefix) {
    // 定義がループしている可能性があるので終了させる
    return null;
  }
  // サービス名本来のプレフィックスで環境変数をセットする
  replacePrefixedEnv(targetPrefix, originalPrefix);
  args.unshift(originalServiceName);
  args.unshift(scriptPath);
  // 引数を本来のサブコマンドに置き換えて同じスクリプトを起動する
  spawnSync(executable, args, { stdio: 'inherit' });
  return true;
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
        // サブコマンドが見つからなかったか、その他のエラー
        if (msg && processForMultipleAcccount() === null) {
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
