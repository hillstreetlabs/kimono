#!/usr/bin/env node
require("dotenv").config();

import program = require("commander");
import Revealer from "./Revealer";

console.log(program);

program
  .command("reveal")
  .description("Starts a revealer")
  .action(async () => {
    const revealer = new Revealer(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    revealer.start();
    process.on("SIGINT", () => revealer.exit());
  });

program
  .command("reveal:test")
  .description("Start N revealers for testing")
  .option("-N --number", "Number of revealers to launch", parseInt)
  .action(async (options: { number: number }) => {
    console.log(options.number);
    const revealers: Revealer[] = new Array(options.number).map(
      () =>
        new Revealer(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        )
    );

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
