import { ethers } from "ethers";

/**
 * Send ETH directly to a wallet address without contract interaction
 * This is used when investing in a startup by sending directly to the founder
 */
export const sendDirectETH = async (
  toAddress: string,
  amount: string
): Promise<{
  transactionHash: string;
  blockNumber: number;
  status: string;
}> => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  if (!ethers.isAddress(toAddress)) {
    throw new Error("Invalid recipient address");
  }

  console.log(`[Direct Transfer] Preparing to send ${amount} ETH to ${toAddress}`);

  try {
    // Create provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Get connected address for logging
    const fromAddress = await signer.getAddress();
    console.log(`[Direct Transfer] Sending from: ${fromAddress}`);

    // Convert amount to wei
    const amountInWei = ethers.parseEther(amount);
    console.log(`[Direct Transfer] Amount in Wei: ${amountInWei.toString()}`);
    
    // Send the transaction
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: amountInWei
    });
    
    console.log(`[Direct Transfer] Transaction sent with hash: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`[Direct Transfer] Transaction confirmed in block ${receipt?.blockNumber}`);
    
    return {
      transactionHash: tx.hash,
      blockNumber: receipt ? receipt.blockNumber : 0,
      status: receipt && receipt.status === 1 ? "success" : "failed"
    };
  } catch (error) {
    console.error("[Direct Transfer] Error:", error);
    throw error;
  }
};