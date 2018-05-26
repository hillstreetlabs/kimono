export default function advanceBlock(provider: any) {
  return new Promise((resolve, reject) => {
    provider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        id: Date.now()
      },
      (err, res) => {
        return err ? reject(err) : resolve(res);
      }
    );
  });
}
