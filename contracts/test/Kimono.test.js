const Kimono = artifacts.require('Kimono');
const KimonoCoin = artifacts.require('KimonoCoin');
const BigNumber = web3.BigNumber;


const BASE_UNIT = 10**18;

contract('Kimono', function(accounts) {

  context('Advertise', function() {
    let kimonoCoin;
    let kimono;
    let [owner, revealer1] = accounts;

    beforeEach(async function () {
      await setupKimono(accounts);
      kimonoCoin = await KimonoCoin.deployed();
      kimono = await Kimono.deployed();
    });

    it('should correctly advertise', async function() {
      let publicKey = 'asdfadsf';
      let minReward = 5 * BASE_UNIT;
      let stakeAmount = 50 * BASE_UNIT;

      await kimono.advertise(publicKey, minReward, stakeAmount, { from: revealer1 });

      let revealersCount = await kimono.getRevealersCount.call();
      let [storedPublicKey, storedMinReward, storedStakeAmount] = await kimono.revealerTable.call(revealer1);

      assert.equal(revealersCount, 1, 'revealersCount is correct');
      assert.equal(storedMinReward.toNumber(), minReward, 'stored minReward is correct');
      assert.equal(storedStakeAmount.toNumber(), stakeAmount, 'stored stakeAmount is correct');
    });

  });

});

async function setupKimono(accounts) {
  await KimonoCoin.new();
  let kimonoCoin = await KimonoCoin.deployed();
  const b = await Kimono.new(kimonoCoin.address);
}
