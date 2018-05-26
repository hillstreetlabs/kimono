#!/usr/bin/env node
require("dotenv").config();

import program from "commander";
import Revealer from "./Revealer";
import Combiner from "./Combiner";
import SignerProvider from "ethjs-provider-signer";
import { sign } from "ethjs-signer";
import { Transaction } from "ethjs-shared";
import { privateToAccount } from "ethjs-account";

function createProvider(privateKey: string, rpcUrl: string) {
  return new SignerProvider(rpcUrl, {
    signTransaction: (rawTx: Transaction, cb: (_: any, res: string) => void) =>
      cb(null, sign(rawTx, privateKey)),
    accounts: (cb: (_: any, keys: string[]) => void) =>
      cb(null, [privateToAccount(privateKey).address])
  });
}

program
  .command("reveal")
  .description("Starts a revealer")
  .action(async () => {
    const provider = createProvider(
      process.env.PRIVATE_KEY,
      process.env.JSON_RPC_URL
    );
    const revealer = new Revealer(provider);
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
  .command("reveal:test")
  .description("Start N revealers for testing")
  .option("-N, --number <x>", "Number of revealers to launch", parseInt)
  .action(async (options: { number: number }) => {
    const privateKeys: string[] = process.env.TEST_PRIVATE_KEYS.split(",");
    const number = options.number || privateKeys.length;
    const revealers: Revealer[] = new Array(number).fill(0).map((_, i) => {
      const provider = createProvider(
        privateKeys[i],
        process.env.TEST_JSON_RPC_URL
      );
      return new Revealer(provider);
    });

    revealers.forEach(revealer => {
      revealer.start();
    });

    process.on("SIGINT", async () => {
      await Promise.all(revealers.map(revealer => revealer.exit()));
      process.exit();
    });
  });

program.parse(process.argv);
