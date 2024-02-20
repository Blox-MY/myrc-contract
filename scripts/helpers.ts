import ethProvider from "eth-provider";
import { TransactionRequest } from "@ethersproject/providers";
import { run } from "hardhat";
import { EtherscanProvider } from "ethers";

export async function verifyContract(address: string, constructorArguments?: any) {
  let count = 0;
  while (count < 5) {
    try {
      console.log("Verifying contract:", address);
      await run("verify:verify", {
        address,
        constructorArguments: constructorArguments || [],
      });
      console.log("Contract verified!");
      break;
    } catch (error) {
      console.log(error);
      console.log("Contract verification failed.");
      console.log("Waiting 30 seconds for etherscan to index contract");
      await sleep(30000);
      count++;
    }
  }
}

export async function sendWithFrame(tx: TransactionRequest, name: string, network: string) {
  try {
    const frame = ethProvider("frame");

    const addresses: string[] = await frame.request({
      method: "eth_requestAccounts",
    });
    tx.from = addresses[0];

    const apiKey = getEtherscanApiKey(network);
    if (!apiKey) {
      throw new Error("Etherscan API key for network " + network + " not found");
    }
    const provider = new EtherscanProvider(network, apiKey);

    console.log("Sending transaction with Frame");
    const chainId = await provider.getNetwork();
    const deployTxHash: string = await frame.request({
      // chainId: "0x1", // mainnet
      // chainId: "0x5", // goerli
      // chainId: "0xAA36A7", // sepolia
      chainId: "0x" + chainId.chainId.toString(16).toUpperCase(),
      method: "eth_sendTransaction",
      params: [tx],
    });
    console.log("Transaction sent with Frame:", deployTxHash);
    console.log("Waiting for transaction to be mined...");
    const txReceipt = await provider.waitForTransaction(deployTxHash, 5);
    if (!txReceipt) {
      throw new Error("Transaction failed");
    }
    const contractAddress = txReceipt.contractAddress;
    if (!contractAddress) {
      console.log({ txReceipt });
      throw new Error("Contract address not found");
    }
    console.log(`Deployed ${name} contract at:`, contractAddress);
    return contractAddress;
  } catch (error) {
    console.log("Error in sendWithFrame");
    console.log(error);
    throw error;
  }
}

function getEtherscanApiKey(network: string) {
  switch (network) {
    case "arbitrumOne":
      return process.env.ETHERSCAN_API_KEY_ARB;
    default:
      return process.env.ETHERSCAN_API_KEY_ETH;
  }
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
