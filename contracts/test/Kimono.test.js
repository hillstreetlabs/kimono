const Kimono = artifacts.require('Kimono');
const KimonoCoin = artifacts.require('KimonoCoin');
const BigNumber = web3.BigNumber;

contract('Kimono', function(accounts) {

  context('Advertise', function() {
    let kimonoCoin;
    let kimono;

    beforeEach(async function () {
      await setupKimono(accounts);
      kimonoCoin = await KimonoCoin.deployed();
      kimono = await Kimono.deployed();
    });

    it('should correctly advertise', async function() {
      //await kimono.advertise();
    });

  });

});

async function setupKimono(accounts) {
  await KimonoCoin.new();
  let kimonoCoin = await KimonoCoin.deployed();
  const b = await Kimono.new(kimonoCoin.address);
}
