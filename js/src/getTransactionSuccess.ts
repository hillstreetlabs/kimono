import { TransactionReceipt } from "ethjs-shared";

// Thanks to ethjs for this one
export default (eth: any) => (txHash: string): Promise<TransactionReceipt> => {
  let count = 0;

  const timeout = eth.options.timeout || 800000;
  const interval = eth.options.interval || 5000;

  return new Promise((resolve, reject) => {
    const txInterval = setInterval(() => {
      eth.getTransactionReceipt(txHash, (err: any, result: any) => {
        if (err) {
          clearInterval(txInterval);
          reject(err);
        }

        if (!err && result) {
          clearInterval(txInterval);
          resolve(result);
        }
      });

      if (count >= timeout) {
        clearInterval(txInterval);
        const errMessage = `Receipt timeout waiting for tx hash: ${txHash}`;
        reject(errMessage);
      }

      count += interval;
    }, interval);
  });
};
