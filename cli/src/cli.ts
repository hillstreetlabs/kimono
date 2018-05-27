#!/usr/bin/env node
require("dotenv").config();

import program from "commander";
import Revealer from "./Revealer";
import Combiner from "./Combiner";
import Eth from "ethjs-query";
import createProvider from "./util/createProvider";
import advanceBlock from "./util/advanceBlock";
import EthContract from "ethjs-contract";
import kimono from "../../contracts/build/contracts/Kimono.json";
import kimonoCoin from "../../contracts/build/contracts/KimonoCoin.json";

program
  .command("reveal")
  .description("Starts a revealer")
  .action(async () => {
    const revealer = new Revealer(
      process.env.PRIVATE_KEY,
      process.env.JSON_RPC_URL
    );
    revealer.start();
    process.on("SIGINT", async () => {
      await revealer.exit();
      process.exit();
    });
  });

program
  .command("combine")
  .description("Starts a combiner")
  .action(async () => {
    const provider = createProvider(
      process.env.PRIVATE_KEY,
      process.env.JSON_RPC_URL
    );
    const combiner = new Combiner(provider);
    combiner.start();
    process.on("SIGINT", async () => {
      await combiner.exit();
      process.exit();
    });
  });

function getTestCombiners(number?: number) {
  const privateKeys: string[] = process.env.TEST_COMBINER_PRIVATE_KEYS.split(
    ","
  );
  number = number || privateKeys.length;
  const combiners: Combiner[] = new Array(number)
    .fill(0)
    .map(
      (_, i) =>
        new Combiner(
          createProvider(privateKeys[i], process.env.TEST_JSON_RPC_URL)
        )
    );
  return combiners;
}

program
  .command("combine:test")
  .description("Start N combiners for testing")
  .option("-N, --number <x>", "Number of combiners to launch", parseInt)
  .action(async (options: { number: number }) => {
    const combiners = getTestCombiners(options.number);
    combiners.forEach(async combiner => {
      await combiner.start();
    });

    process.on("SIGINT", async () => {
      await Promise.all(combiners.map(combiner => combiner.exit()));
      process.exit();
    });
  });

program
  .command("advanceBlock")
  .description("Adds a block every N milliseconds")
  .option("-D, --delay <x>", "Number of milliseconds between blocks", parseInt)
  .option("-T, --to <x>", "Block number to jump to", parseInt)
  .action(async (options: { delay: number; to: number }) => {
    const provider = createProvider(
      process.env.PRIVATE_KEY,
      process.env.TEST_JSON_RPC_URL
    );
    const eth = new Eth(provider);

    if (options.to) {
      let blockNumber = (await eth.blockNumber()).toNumber();
      console.log(blockNumber);
      while (blockNumber < options.to) {
        await advanceBlock(provider);
        blockNumber = (await eth.blockNumber()).toNumber();
        console.log(blockNumber);
      }
    } else if (options.delay) {
      let interval = setInterval(async () => {
        await advanceBlock(provider);
        console.log((await eth.blockNumber()).toNumber());
      }, options.delay || 10000);
      process.on("SIGINT", () => {
        clearInterval(interval);
        process.exit();
      });
    }
  });

function getTestRevealers(number?: number) {
  const privateKeys: string[] = process.env.TEST_REVEALER_PRIVATE_KEYS.split(
    ","
  );
  number = number || privateKeys.length;
  const revealers: Revealer[] = new Array(number)
    .fill(0)
    .map((_, i) => new Revealer(privateKeys[i], process.env.TEST_JSON_RPC_URL));
  return revealers;
}

program
  .command("reveal:test")
  .description("Start N revealers for testing")
  .option("-N, --number <x>", "Number of revealers to launch", parseInt)
  .action(async (options: { number: number }) => {
    const revealers = getTestRevealers(options.number);

    revealers.forEach(async revealer => {
      revealer.start();
    });

    process.on("SIGINT", async () => {
      await Promise.all(revealers.map(revealer => revealer.exit()));
      process.exit();
    });
  });

program
  .command("register:test")
  .description("Start N revealers for testing")
  .option("-N, --number <x>", "Number of revealers to launch", parseInt)
  .option("-S, --stake <x>", "Total amount to stake", parseFloat, 100)
  .option("-M, --min <x>", "Minimum message price", parseFloat, 1)
  .option("-P, --per <x>", "Amount to stake per message", parseFloat, 5)
  .action(
    async (options: {
      number: number;
      stake: number;
      min: number;
      per: number;
    }) => {
      const revealers = getTestRevealers(options.number);
      revealers.forEach(async revealer => {
        revealer.register(options.stake, options.min, options.per);
      });

      process.on("SIGINT", async () => {
        await Promise.all(revealers.map(revealer => revealer.exit()));
        process.exit();
      });
    }
  );

program
  .command("approveAll")
  .description("Start N revealers for testing")
  .action(async () => {
    async function getContract<T>(eth: Eth, contractObj: any) {
      try {
        const networkVersion = await eth.net_version();
        const builder = EthContract(eth)<T>(contractObj.abi);
        const contract = builder.at(
          contractObj.networks[networkVersion].address
        );
        if (!contract) throw new Error("Something went wrong");
        return contract;
      } catch (e) {
        throw new Error(
          "Something went wrong finding the contract on the network. Are you sure it's deployed?"
        );
      }
    }

    interface KimonoCoinContract {
      address: string;
      approveAll: (address: string, opts?: any) => Promise<string>;
    }

    await Promise.all(
      process.env.TEST_PRIVATE_KEYS.split(",").map(async privateKey => {
        const provider = createProvider(
          privateKey,
          process.env.TEST_JSON_RPC_URL
        );
        const eth = new Eth(provider);
        const accounts = await eth.accounts();
        const address = accounts[0].toLowerCase();
        const kimonoContract = await getContract<any>(eth, kimono);
        const coinContract = await getContract<KimonoCoinContract>(
          eth,
          kimonoCoin
        );
        await coinContract.approveAll(kimonoContract.address, {
          from: address,
          gas: 500000
        });
      })
    );
  });

program.parse(process.argv);
