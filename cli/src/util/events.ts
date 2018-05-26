import withTimeout from "./withTimeout";
import EthAbi from "ethjs-abi";
import { Transaction, Block } from "ethjs-shared";
import Eth from "ethjs-query";

export const eventsFromTransaction = async (
  eth: Eth,
  abi: any[],
  transaction: Transaction
) => {
  const receipt = await withTimeout(
    eth.getTransactionReceipt(transaction.hash),
    2000
  );
  const decoder = EthAbi.logDecoder(abi);
  const decodedEvents = decoder(receipt.logs);
  return decodedEvents.map(event => {
    return {
      ...event,
      meta: {
        transactionHash: transaction.hash,
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber.toNumber()
      }
    };
  });
};

export const eventsFromBlock = async (
  eth: Eth,
  contract: { address: string; abi: any[] },
  block: Block
) => {
  if (!contract) return [];
  const transactions = block.transactions.filter(
    transaction => transaction.to == contract.address
  );
  const events = await Promise.all(
    transactions.map(transaction =>
      eventsFromTransaction(eth, contract.abi, transaction)
    )
  );
  return [].concat(...events); // Return flattened array of events
};
