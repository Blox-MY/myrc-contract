import { TransactionRequest } from "@ethersproject/providers";
import { ethers } from "hardhat";
import { sendWithFrame, verifyContract } from "./helpers";

async function main() {
  // const myrcSafe = "0xCCa0793222422E8aC1dD48DB1Aa691f9D360A1c2"; // Eth mainnet safe
  const myrcSafe = "0xE16F1D01FaE9DB9aeeEcEe6a8B99ec0141321970"; // Arbitrum safe
  // const myrcSafe = "0xb30AEf901D612C94ba40d597712F403457F237d2"; // Daenax testing add for sepolia
  const admin = myrcSafe;
  const minter = myrcSafe;
  const police = myrcSafe;
  const myrcAddress = await deployMyrc(admin, minter, police);
  return myrcAddress;
}

async function deployMyrc(admin: string, minter: string, police: string) {
  let network = process.env.HARDHAT_NETWORK;
  if (!network) {
    console.log("No network specified. Defaulting to sepolia");
    network = "sepolia";
  }
  const MYRC = await ethers.getContractFactory("MYRC");
  const params = [admin, minter, police] as const;
  const tx = await MYRC.getDeployTransaction(...params);
  const contractAddress = await sendWithFrame(tx as TransactionRequest, "MYRC", network);
  await verifyContract(contractAddress, params);
  return contractAddress;
}

main();
