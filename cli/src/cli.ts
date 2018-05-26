#!/usr/bin/env node
require("dotenv").config();

import program from "commander";
import Revealer from "./Revealer";
import Combiner from "./Combiner";
import Eth from "ethjs-query";
import BN from "bn.js";
import createProvider from "./util/createProvider";
import advanceBlock from "./util/advanceBlock";

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

program
  .command("advanceBlock")
  .description("Adds a block every N milliseconds")
  .option("-N, --number <x>", "Number of milliseconds between blocks", parseInt)
  .action(async (options: { number: number }) => {
    const provider = createProvider(
      process.env.PRIVATE_KEY,
      process.env.JSON_RPC_URL
    );

    let interval = setInterval(
      () => advanceBlock(provider),
      options.number || 10000
    );
    process.on("SIGINT", () => {
      clearInterval(interval);
      process.exit();
    });
  });

function getTestRevealers(number?: number) {
  const privateKeys: string[] = process.env.TEST_PRIVATE_KEYS.split(",");
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

program.parse(process.argv);
