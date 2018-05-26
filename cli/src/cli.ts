#!/usr/bin/env node
require("dotenv").config();

import program from "commander";
import Revealer from "./Revealer";
import Combiner from "./Combiner";
import HttpProvider from "ethjs-provider-http";

program
  .command("reveal")
  .description("Starts a revealer")
  .action(async () => {
    const provider = new HttpProvider(process.env.JSON_RPC_URL);
    const revealer = new Revealer(process.env.PRIVATE_KEY, provider);
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
    const provider = new HttpProvider(process.env.JSON_RPC_URL);
    const combiner = new Combiner(process.env.PRIVATE_KEY, provider);
    combiner.start();
    process.on("SIGINT", async () => {
      await combiner.exit();
      process.exit();
    });
  });

program
  .command("reveal:test")
  .description("Start N revealers for testing")
  .option("-N, --number <x>", "Number of revealers to launch", parseInt)
  .action(async (options: { number: number }) => {
    const provider = new HttpProvider(process.env.TEST_JSON_RPC_URL);
    const privateKeys: string[] = process.env.TEST_PRIVATE_KEYS.split(",");
    const number = options.number || privateKeys.length;
    const revealers: Revealer[] = new Array(number)
      .fill(0)
      .map((_, i) => new Revealer(privateKeys[i], provider));

    revealers.forEach(revealer => {
      revealer.start();
    });

    process.on("SIGINT", async () => {
      await Promise.all(revealers.map(revealer => revealer.exit()));
      process.exit();
    });
  });

program.parse(process.argv);
