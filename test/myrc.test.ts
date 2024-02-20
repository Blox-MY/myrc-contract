import { assert, expect } from "chai";
import { ethers, network } from "hardhat";
import { MYRC } from "../typechain-types";
import { MaxUint256, Signature, Signer, parseEther, verifyTypedData } from "ethers";

describe("MYRC Unit Test", function () {
  let myrc: MYRC;
  let owner: Signer;
  let ownerAddress: string;
  let notOwner: Signer;
  let notOwnerAddress: string;
  const types = {
    Permit: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "spender",
        type: "address",
      },
      {
        name: "value",
        type: "uint256",
      },
      {
        name: "nonce",
        type: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
      },
    ],
  };

  this.beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    ownerAddress = await owner.getAddress();
    notOwner = signers[1];
    notOwnerAddress = await notOwner.getAddress();
    const MYRCFactory = await ethers.getContractFactory("MYRC");
    myrc = await MYRCFactory.deploy(ownerAddress, ownerAddress, ownerAddress);
    await myrc.waitForDeployment();

    await myrc.mint(ownerAddress, parseEther("1000000"));
  });

  describe("constructor", () => {
    it("initializes the token with the correct name and symbol ", async () => {
      const name = (await myrc.name()).toString();
      assert.equal(name, "MYRC");

      const symbol = (await myrc.symbol()).toString();
      assert.equal(symbol, "MYRC");
    });
  });

  describe("transfers", () => {
    it("Should be able to transfer tokens successfully to an address", async () => {
      const LOOP = 50n;
      const tokensToSend = parseEther("10");
      await myrc.mint(ownerAddress, tokensToSend * LOOP);
      for (let i = 0; i < LOOP; i++) {
        await myrc.transfer(notOwnerAddress, tokensToSend);
      }
      expect(await myrc.balanceOf(notOwnerAddress)).to.equal(tokensToSend * LOOP);
    });
    it("emits an transfer event, when a transfer occurs", async () => {
      await expect(myrc.transfer(notOwnerAddress, parseEther("10"))).to.emit(myrc, "Transfer");
    });
  });

  describe("access control", () => {
    it("should not allow users without role to execute mint", async () => {
      await expect(myrc.connect(notOwner).mint(notOwnerAddress, 10)).to.be.reverted;
    });
    it("should not allow users without role to execute withdraw myrc", async () => {
      await expect(myrc.connect(notOwner).rescueToken(await myrc.getAddress(), notOwnerAddress)).to
        .be.reverted;
    });
    it("should not allow users without role to execute withdraw", async () => {
      await expect(myrc.connect(notOwner).rescueEth(notOwnerAddress)).to.be.reverted;
    });

    it("should not allow users without role to execute blacklist", async () => {
      await expect(myrc.connect(notOwner).restrictAddress(notOwnerAddress, true)).to.be.reverted;
      await expect(myrc.connect(notOwner).restrictAddress(notOwnerAddress, false)).to.be.reverted;
    });
    it("allows role owner to execute mint", async () => {
      await expect(myrc.mint(ownerAddress, 10)).to.not.be.reverted;
    });
    it("allows role owner to execute withdraw myrc", async () => {
      await expect(myrc.mint(await myrc.getAddress(), 10)).to.not.be.reverted;
      expect(await myrc.balanceOf(await myrc.getAddress())).to.equal(10);
      const expectedOwnerBalance = await myrc.balanceOf(ownerAddress);
      await expect(myrc.rescueToken(await myrc.getAddress(), ownerAddress)).to.not.be.reverted;
      expect(await myrc.balanceOf(ownerAddress)).to.equal(expectedOwnerBalance + 10n);
    });
    // it("allows role owner to execute withdraw eth", async () => {
    //   await pay.pay(await myrc.getAddress(), { value: 10 });
    //   await expect(myrc.rescueEth(ownerAddress)).to.not.be.reverted;
    // });

    it("allows role owner to execute blacklist", async () => {
      await expect(myrc.restrictAddress(notOwnerAddress, true)).to.not.be.reverted;
      await expect(myrc.restrictAddress(notOwnerAddress, false)).to.not.be.reverted;
    });
  });

  describe("permit", () => {
    it("should allow users to permit", async () => {
      const nonce = await myrc.nonces(ownerAddress);
      const deadline = MaxUint256;
      const values = {
        owner: ownerAddress,
        spender: notOwnerAddress,
        value: 10,
        nonce: nonce,
        deadline: deadline,
      };
      const domain = {
        name: await myrc.name(),
        version: "1",
        chainId: network.config.chainId,
        verifyingContract: await myrc.getAddress(),
      };
      const signature = await owner.signTypedData(domain, { Permit: types.Permit }, values);
      // split the signature into its components
      const sig = Signature.from(signature);

      // verify the Permit type data with the signature
      const recovered = verifyTypedData(domain, types, values, sig);
      await expect(myrc.permit(ownerAddress, notOwnerAddress, 10, deadline, sig.v, sig.r, sig.s)).to
        .not.be.reverted;
      await expect(myrc.permit(ownerAddress, notOwnerAddress, 10, deadline, sig.v, sig.r, sig.s)).to
        .be.reverted;
      // transfer
      await expect(myrc.connect(notOwner).transferFrom(ownerAddress, notOwnerAddress, 10)).to.not.be
        .reverted;
      // check balance
      expect(await myrc.balanceOf(notOwnerAddress)).to.equal(10);
    });
    // it("should allow users to permit and transferFrom", async () => {
    //   const nonce = await myrc.nonces(ownerAddress);
    //   const deadline = ethers.constants.MaxUint256;
    //   const digest = await myrc.getDigest(ownerAddress, notOwnerAddress, 10, nonce, deadline);
    //   const { v, r, s } = await owner._signTypedData("MYRC", digest);
    //   await expect(
    //     myrc.permit(ownerAddress, notOwnerAddress, notOwnerAddress, 10, deadline, v, r, s)
    //   ).to.not.be.reverted;

    // });
  });

  describe("blacklist", () => {
    it("should prevent users from transferring tokens to blacklisted address", async () => {
      await myrc.mint(notOwnerAddress, 10);
      await myrc.restrictAddress(notOwnerAddress, true);
      expect(await myrc.restrictedAddresses(notOwnerAddress)).to.be.true;
      await expect(myrc.transfer(notOwnerAddress, 10)).to.be.reverted;
    });
    it("should prevent users from transferring tokens from blacklisted address", async () => {
      await myrc.mint(notOwnerAddress, 10);
      await myrc.restrictAddress(notOwnerAddress, true);
      expect(await myrc.restrictedAddresses(notOwnerAddress)).to.be.true;
      await expect(myrc.connect(notOwner).transfer(ownerAddress, 10)).to.be.reverted;
    });
  });
});
