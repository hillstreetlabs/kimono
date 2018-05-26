import expectEventInTransaction from "./helpers/expectEvent";
import expectThrow from "./helpers/expectThrow";
import toWei from "./helpers/toWei";
import { constants } from "./helpers/constants";

const KimonoCoin = artifacts.require("KimonoCoin");
const BigNumber = web3.BigNumber;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

contract("KimonoCoin", ([creator, spender, owner, randomUser]) => {
  let token;

  beforeEach(async () => {
    token = await KimonoCoin.new({ from: creator });
  });

  describe("approveAll", () => {
    it("should set the allowed mapping to 2^256 - 1", async () => {
      await expectEventInTransaction(
        token.approveAll(spender, { from: owner }),
        "ApproveAll"
      );

      const allowance = await token.allowance(owner, spender);
      allowance.should.be.bignumber.equal(
        constants.UNLIMITED_ALLOWANCE_IN_BASE_UNITS
      );
    });
  });

  describe("transferFrom", () => {
    it("should revert if owner has insufficient balance", async () => {
      const ownerBalance = await token.balanceOf(owner);
      const amountToTransfer = ownerBalance.plus(1);
      await token.approve(randomUser, amountToTransfer, { from: owner });
      await expectThrow(
        token.transferFrom(owner, randomUser, amountToTransfer)
      );
    });

    it("should throw if spender has insufficient allowance", async () => {
      await token.mint(owner, 1, { from: creator });
      const ownerBalance = await token.balanceOf(owner);
      const amountToTransfer = ownerBalance;
      const spenderAllowance = await token.allowance(owner, spender);
      const spenderAllowanceIsInsufficient =
        spenderAllowance.cmp(amountToTransfer) < 0;

      spenderAllowanceIsInsufficient.should.equal(true);
      await expectThrow(token.transferFrom(owner, spender, amountToTransfer));
    });

    it("should be successful on a 0 value transfer", async () => {
      const amountToTransfer = new BigNumber(0);
      const result = await token.transferFrom(
        owner,
        spender,
        amountToTransfer,
        {
          from: spender
        }
      );
      await expectEventInTransaction(
        token.transferFrom(owner, spender, amountToTransfer, {
          from: spender
        }),
        "Transfer"
      );
    });

    it("should not modify spender allowance if spender allowance is 2^256 - 1", async () => {
      await token.mint(owner, 1, { from: creator });
      const initOwnerBalance = await token.balanceOf(owner);
      const amountToTransfer = initOwnerBalance;

      await token.approveAll(spender, { from: owner });
      const initSpenderAllowance = await token.allowance(owner, spender);

      await expectEventInTransaction(
        token.transferFrom(owner, spender, amountToTransfer, {
          from: spender
        }),
        "Transfer"
      );

      const newSpenderAllowance = await token.allowance(owner, spender);

      initSpenderAllowance.should.be.bignumber.equal(
        constants.UNLIMITED_ALLOWANCE_IN_BASE_UNITS
      );
      initSpenderAllowance.should.be.bignumber.equal(newSpenderAllowance);
    });

    it("should transfer the correct balances if spender has sufficient allowance", async () => {
      await token.mint(owner, 1, { from: creator });
      const initOwnerBalance = await token.balanceOf(owner);
      const amountToTransfer = initOwnerBalance;
      const initSpenderAllowance = initOwnerBalance;

      await token.approve(spender, initSpenderAllowance, { from: owner });
      await expectEventInTransaction(
        token.transferFrom(owner, spender, amountToTransfer, {
          from: spender
        }),
        "Transfer"
      );

      const newOwnerBalance = await token.balanceOf(owner);
      const newSpenderBalance = await token.balanceOf(spender);

      newOwnerBalance.should.be.bignumber.equal(0);
      newSpenderBalance.should.be.bignumber.equal(initOwnerBalance);
    });

    it("should modify allowance if spender has sufficient allowance less than 2^256 - 1", async () => {
      await token.mint(owner, 1, { from: creator });
      const initOwnerBalance = await token.balanceOf(owner);
      const amountToTransfer = initOwnerBalance;
      const initSpenderAllowance = initOwnerBalance;

      await token.approve(spender, initSpenderAllowance, { from: owner });
      await expectEventInTransaction(
        token.transferFrom(owner, spender, amountToTransfer, {
          from: spender
        }),
        "Transfer"
      );

      const newSpenderAllowance = await token.allowance(owner, spender);
      newSpenderAllowance.should.be.bignumber.equal(0);
    });
  });

  describe("fallback function", () => {
    it("reverts if ETH is sent", async () => {
      await expectThrow(
        token.sendTransaction({ from: randomUser, value: toWei(1) })
      );
    });

    it("does nothing if no ETH is sent", async () => {
      await token.sendTransaction({ from: randomUser, value: toWei(0) }).should
        .be.fulfilled;
    });
  });

  describe("distributeTokensForTesting", () => {
    const amount = toWei(1000);
    const accounts = [owner, spender, randomUser];

    it("let's only the creator of the token distribute tokens", async () => {
      await expectThrow(
        token.distributeTokensForTesting(accounts, amount, {
          from: randomUser
        })
      );
    });

    it("prevent token distribution after the minting is finished", async () => {
      await token.finishMinting({ from: creator });
      await expectThrow(
        token.distributeTokensForTesting(accounts, amount, {
          from: creator
        })
      );
    });

    it("sets the balance of accounts to the correct value", async () => {
      await expectEventInTransaction(
        token.distributeTokensForTesting(accounts, amount, {
          from: creator
        }),
        "TestingDistributeTokens"
      );

      for (let i = 0; i < accounts.length; i++) {
        const accountBalance = await token.balanceOf(accounts[i]);
        accountBalance.should.be.bignumber.equal(amount);
      }
    });
  });
});
