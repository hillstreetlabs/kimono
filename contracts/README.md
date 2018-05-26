# ETH Buenos Aires Hackathon Project

## Setup

This repo assumes you have truffle installed globally. If you don't have it make sure you have the most recent version installed.

```bash
yarn global add truffle
truffle version
Truffle v4.1.7 (core: 4.1.7)
Solidity v0.4.23 (solc-js)
```

Install dependencies/packages using [yarn](https://yarnpkg.com/en/)

```bash
yarn
```

Start a local blockchain like [Ganache](https://github.com/trufflesuite/ganache). You can use [Ganache CLI](https://github.com/trufflesuite/ganache-cli) or the [desktop client](http://truffleframework.com/ganache/).

```bash
yarn run ganache
```

Compile and migrate your local smart contracts.

```bash
truffle migrate --reset
```

## Testing

```bash
yarn run ganache
yarn run test
```

## Deploying to Rinkeby, Mainnet

To deploy to rinkeby or mainnet, first configure your environment.

Generate a MNEMONIC using [Metamask](https://metamask.io/) and get an API key from [Infura](https://infura.io/signup)

Make sure your account (the first address derived from your MNEMONIC) has at least `0.7 ETH`, then run

```bash
MNEMONIC="your mnemonic" INFURA_API_KEY="your API key" yarn run migrate:rinkeby
# or
MNEMONIC="your mnemonic" INFURA_API_KEY="your API key" yarn run migrate:mainnet
```

## Notes
- Maybe add min time to be configurable by revealer during advertising
- Think about extending functionality to allow other contracts to manage revealers on their behalf (don't use msg.sender)


