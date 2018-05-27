const KimonoCoin = artifacts.require("KimonoCoin");
const Kimono = artifacts.require("Kimono");
const AddressArrayUtils = artifacts.require("AddressArrayUtils");

RINKEBY_ACCOUNTS = [
  "0x8aa4b7c4B26a923cFA86251BE9Acfc834463D85E",
  "0x5b310417Cb579ED9c4790a548ac5c38550f75B5B",
  "0x88959364Ec2Fb18b723572D9ae9163c6fC4739a8",
  "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
  "0xb4B2d6632bbd18969cCCCd3B9637f4323929E080"
];

module.exports = function(deployer, network, accounts) {
  testAccounts = deployer.network_id === 4 ? RINKEBY_ACCOUNTS : accounts;
  testEnvironment = deployer.network_id !== 1;

  console.log("Deploying KimonoCoin...");
  return deployer
    .deploy(KimonoCoin)
    .then(() => {
      return KimonoCoin.deployed();
    })
    .then(t => {
      token = t;

      // Distribute tokens to the list of addresses for testing
      if (testEnvironment) {
        console.log("Minting test KimonoCoins for the accounts...");
        const amount = new web3.BigNumber(web3.toWei(10000, "ether"));
        return token.distributeTokensForTesting(testAccounts, amount);
      }
    })
    .then(() => {
      console.log("Deploying the AddressArrayUtils...");
      return deployer.deploy(AddressArrayUtils);
    })
    .then(() => {
      console.log("Linking the AddressArrayUtils..");
      return deployer.link(AddressArrayUtils, [Kimono]);
    })
    .then(() => {
      console.log("Deploying the Kimono protocol...");
      return deployer.deploy(Kimono, token.address);
    })
    .then(() => {
      return Kimono.deployed();
    })
    .then(() => {
      console.log("Deployment complete!");
    });
};
