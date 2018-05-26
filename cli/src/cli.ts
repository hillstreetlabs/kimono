#!/usr/bin/env node
require("dotenv").config();

import program = require("commander");
import Revealer from "./Revealer";

program
  .command("reveal")
  .description("Starts a revealer")
  .action(async () => {
    const revealer = new Revealer(process.env.PRIVATE_KEY);
    revealer.start();
    process.on("SIGINT", () => revealer.exit());
  });

program
  .command("combiner")
  .description("Starts a combiner")
  .action(async () => {
    const revealer = new Revealer(process.env.PRIVATE_KEY);
    revealer.start();
    process.on("SIGINT", () => revealer.exit());
  });

program
  .command("reveal:test")
  .description("Start N revealers for testing")
  .option("-N --number", "Number of revealers to launch", parseInt)
  .action(async (options: { number: number }) => {
    const privateKeys: string[] = process.env.TEST_PRIVATE_KEYS.split(",");
    const number = options.number || privateKeys.length;
    const revealers: Revealer[] = new Array(number)
      .fill(0)
      .map((_, i) => new Revealer(privateKeys[i]));

    revealers.forEach(revealer => {
      revealer.start();
    });

    process.on("SIGINT", () => {
      revealers.forEach(revealer => {
        revealer.exit();
      });
    });
  });

program.parse(process.argv);
