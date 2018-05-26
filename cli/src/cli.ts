#!/usr/bin/env node
require("dotenv").config();

import program from "commander";
import Revealer from "./Revealer";
import Combiner from "./Combiner";
import BN from "bn.js";
import createProvider from "./util/createProvider";

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
  .action(async (options: { number: number }) => {
    const revealers = getTestRevealers(options.number);
    revealers.forEach(async revealer => {
      revealer.register(new BN(10));
    });

    process.on("SIGINT", async () => {
      await Promise.all(revealers.map(revealer => revealer.exit()));
      process.exit();
    });
  });

program.parse(process.argv);
