const Kimono = artifacts.require('Kimono');
const KimonoCoin = artifacts.require('KimonoCoin');
const BigNumber = web3.BigNumber;


const BASE_UNIT = 10**18;
const MAX_UINT256 = new BigNumber('115792089237316195423570985008687907853269984665640564039457584007913129639935');

contract('Kimono', function(accounts) {

  context('Basic tests', function() {
    let kimonoCoin;
    let kimono;
    let [owner, revealer1] = accounts;

    beforeEach(async function () {
      await setupKimono(accounts);
      kimonoCoin = await KimonoCoin.deployed();
      kimono = await Kimono.deployed();
    });

    it('should correctly register new revealer', async function() {
      let publicKey = 'asdfadsf';
      let minReward = web3.toWei(1);
      let stakeOffer = web3.toWei(5);
      let totalStake = web3.toWei(50);

      await kimonoCoin.approve(kimono.address, MAX_UINT256, { from: revealer1 });

      await kimono.registerRevealer(publicKey, minReward, stakeOffer, totalStake, { from: revealer1 });

      let eligibleRevealersCount = await kimono.getEligibleRevealersCount.call();
      let [storedPublicKey, storedMinReward, storedStakeOffer] = await kimono.revealerTable.call(revealer1);
      let storedTotalStake = await kimono.totalStakes.call(revealer1);

      assert.equal(eligibleRevealersCount, 1, 'eligibleRevealersCount is correct');
      // TODO: check public key
      assert.equal(storedMinReward.toNumber(), minReward, 'stored minReward is correct');
      assert.equal(storedStakeOffer.toNumber(), stakeOffer, 'stored stakeOffer is correct');
      assert.equal(storedTotalStake.toNumber(), totalStake, 'stored totalStake is correct');
    });

    it('should correctly update revealer registration with more stake', async function() {
      let publicKey = 'asdfadsf';
      let minReward = web3.toWei(1);
      let stakeOffer = web3.toWei(5);
      let totalStake = web3.toWei(50);

      await kimonoCoin.approve(kimono.address, MAX_UINT256, { from: revealer1 });
      await kimono.registerRevealer(publicKey, minReward, stakeOffer, totalStake, { from: revealer1 });

      let eligibleRevealersCount = await kimono.getEligibleRevealersCount.call();
      let [storedPublicKey, storedMinReward, storedStakeOffer] = await kimono.revealerTable.call(revealer1);
      let storedTotalStake = await kimono.totalStakes.call(revealer1);

      assert.equal(eligibleRevealersCount, 1, 'eligibleRevealersCount is correct');
      // TODO: check public key
      assert.equal(storedMinReward.toNumber(), minReward, 'stored minReward is correct');
      assert.equal(storedStakeOffer.toNumber(), stakeOffer, 'stored stakeOffer is correct');
      assert.equal(storedTotalStake.toNumber(), totalStake, 'stored totalStake is correct');

      // Update
      publicKey = 'asdfadsf';
      minReward = web3.toWei(1);
      stakeOffer = web3.toWei(5);
      totalStake = web3.toWei(100);
      await kimono.registerRevealer(
        publicKey,
        minReward,
        stakeOffer,
        totalStake,
        { from: revealer1 }
      );
      eligibleRevealersCount = await kimono.getEligibleRevealersCount.call();
      [storedPublicKey, storedMinReward, storedStakeOffer] = await kimono.revealerTable.call(revealer1);
      storedTotalStake = await kimono.totalStakes.call(revealer1);
      assert.equal(eligibleRevealersCount, 1, 'eligibleRevealersCount is correct');
      assert.equal(storedMinReward.toNumber(), minReward, 'stored minReward is correct');
      assert.equal(storedStakeOffer.toNumber(), stakeOffer, 'stored stakeOffer is correct');
      assert.equal(storedTotalStake.toNumber(), totalStake, 'stored totalStake is correct');
    });

  });

});

async function setupKimono(accounts) {
  await KimonoCoin.new();
  let kimonoCoin = await KimonoCoin.deployed();
  const b = await Kimono.new(kimonoCoin.address);
}
