import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get contract factories
  const StartupInvestment = await ethers.getContractFactory("StartupInvestment");
  const StartupTokenFactory = await ethers.getContractFactory("StartupTokenFactory");

  // Deploy StartupInvestment contract
  console.log("Deploying StartupInvestment...");
  const startupInvestment = await StartupInvestment.deploy();
  await startupInvestment.waitForDeployment();
  const startupInvestmentAddress = await startupInvestment.getAddress();
  console.log("StartupInvestment deployed to:", startupInvestmentAddress);

  // Deploy StartupTokenFactory contract
  console.log("Deploying StartupTokenFactory...");
  const startupTokenFactory = await StartupTokenFactory.deploy();
  await startupTokenFactory.waitForDeployment();
  const startupTokenFactoryAddress = await startupTokenFactory.getAddress();
  console.log("StartupTokenFactory deployed to:", startupTokenFactoryAddress);

  // Save contract addresses to JSON file
  console.log("Saving contract addresses...");
  const deploymentData = {
    startupInvestment: startupInvestmentAddress,
    startupTokenFactory: startupTokenFactoryAddress,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString(),
  };

  saveDeployment(deploymentData);
  saveAbiToFrontend();

  console.log("Deployment completed successfully!");
}

// Save deployment data to a JSON file
function saveDeployment(data: any) {
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filePath = path.join(deploymentsDir, `deployment-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  // Also save to a fixed latest deployment file
  const latestFilePath = path.join(deploymentsDir, "latest.json");
  fs.writeFileSync(latestFilePath, JSON.stringify(data, null, 2));
  
  console.log(`Deployment data saved to ${filePath}`);
}

// Save ABIs to the frontend for easy import
function saveAbiToFrontend() {
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const targetDir = path.join(__dirname, "../client/src/contracts");
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy StartupInvestment ABI
  const startupInvestmentPath = path.join(artifactsDir, "StartupInvestment.sol/StartupInvestment.json");
  if (fs.existsSync(startupInvestmentPath)) {
    const contractJson = JSON.parse(fs.readFileSync(startupInvestmentPath, "utf8"));
    const abiPath = path.join(targetDir, "StartupInvestment.json");
    fs.writeFileSync(abiPath, JSON.stringify({ abi: contractJson.abi }, null, 2));
    console.log(`StartupInvestment ABI saved to ${abiPath}`);
  }
  
  // Copy StartupToken ABI
  const startupTokenPath = path.join(artifactsDir, "StartupToken.sol/StartupToken.json");
  if (fs.existsSync(startupTokenPath)) {
    const contractJson = JSON.parse(fs.readFileSync(startupTokenPath, "utf8"));
    const abiPath = path.join(targetDir, "StartupToken.json");
    fs.writeFileSync(abiPath, JSON.stringify({ abi: contractJson.abi }, null, 2));
    console.log(`StartupToken ABI saved to ${abiPath}`);
  }
  
  // Copy StartupTokenFactory ABI
  const startupTokenFactoryPath = path.join(artifactsDir, "StartupTokenFactory.sol/StartupTokenFactory.json");
  if (fs.existsSync(startupTokenFactoryPath)) {
    const contractJson = JSON.parse(fs.readFileSync(startupTokenFactoryPath, "utf8"));
    const abiPath = path.join(targetDir, "StartupTokenFactory.json");
    fs.writeFileSync(abiPath, JSON.stringify({ abi: contractJson.abi }, null, 2));
    console.log(`StartupTokenFactory ABI saved to ${abiPath}`);
  }
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });