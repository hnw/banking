# banking

銀行サイトの振込操作などを自動化するプログラムです。

Node.js+Puppeteerで作られています。

## Synopsis

```
$ ./cli.js transfer <srcBank> <dstBank> <ammount>
```

## Description

...

## Install

```
$ git clone https://github.com/hnw/banking
$ cd banking
$ npm i
$ cp .env.example .env
$ vi .env
```

### Install on Raspberry Pi

```
$ git clone https://github.com/hnw/banking
$ cd banking
$ PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm i
$ cp .env.example .env
$ vi .env
```

## Encrypt `.env` entry

```
$ npm run keygen > $HOME/.easyaes
$ npm run enc
foobar
skI0whmp02xIDfXfbxgrDu5GUmqv8y3HknS59t05A/Hnyw==
```

Then edit `.env` as follows:

```
SOME_SERVICE_PASSWORD = skI0whmp02xIDfXfbxgrDu5GUmqv8y3HknS59t05A/Hnyw==
```
