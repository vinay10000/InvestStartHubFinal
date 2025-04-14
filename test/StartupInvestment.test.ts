import { expect } from "chai";
import { ethers } from "hardhat";
import { StartupInvestment } from "../typechain-types";

describe("StartupInvestment", function () {
  // Contract instances
  let startupInvestment: StartupInvestment;
  
  // Signers
  let owner: any;
  let founder: any;
  let investor1: any;
  let investor2: any;
  
  // Test data
  const startupName = "TestStartup";
  const startupDesc = "A test startup for investment";
  const fundingGoal = ethers.parseEther("10"); // 10 ETH
  const valuation = ethers.parseEther("100"); // 100 ETH
  const smallInvestment = ethers.parseEther("1"); // 1 ETH
  const largeInvestment = ethers.parseEther("5"); // 5 ETH
  
  beforeEach(async function () {
    // Get signers
    [owner, founder, investor1, investor2] = await ethers.getSigners();
    
    // Deploy contract
    const StartupInvestment = await ethers.getContractFactory("StartupInvestment");
    startupInvestment = await StartupInvestment.deploy();
    
    // Register a test startup
    await startupInvestment.registerStartup(
      founder.address,
      startupName,
      startupDesc,
      fundingGoal,
      valuation
    );
  });
  
  describe("Startup Registration", function () {
    it("Should register a startup correctly", async function () {
      const startup = await startupInvestment.getStartup(1);
      
      expect(startup[2]).to.equal(startupName);
      expect(startup[3]).to.equal(startupDesc);
      expect(startup[4]).to.equal(fundingGoal);
      expect(startup[6]).to.equal(valuation);
      expect(startup[7]).to.equal(true); // isActive
    });
    
    it("Should increment startup ID correctly", async function () {
      // Register another startup
      await startupInvestment.registerStartup(
        founder.address,
        "Second Startup",
        "Another test",
        fundingGoal,
        valuation
      );
      
      // Check startups count
      const count = await startupInvestment.getStartupsCount();
      expect(count).to.equal(2);
    });
  });
  
  describe("Investments", function () {
    it("Should create investments correctly", async function () {
      // Make an investment
      await startupInvestment.connect(investor1).investInStartup(1, { value: smallInvestment });
      
      // Check investment details
      const investment = await startupInvestment.getInvestment(1);
      
      expect(investment[1]).to.equal(1); // startupId
      expect(investment[2]).to.equal(investor1.address);
      expect(investment[3]).to.equal(smallInvestment);
      expect(investment[5]).to.equal(false); // not verified yet
      
      // Startup funding should not have increased yet (verification needed)
      const startup = await startupInvestment.getStartup(1);
      expect(startup[5]).to.equal(0); // currentFunding
    });
    
    it("Should verify investments correctly", async function () {
      // Make an investment
      await startupInvestment.connect(investor1).investInStartup(1, { value: smallInvestment });
      
      // Verify the investment
      await startupInvestment.verifyInvestment(1);
      
      // Check investment is verified
      const investment = await startupInvestment.getInvestment(1);
      expect(investment[5]).to.equal(true); // verified
      
      // Startup funding should have increased
      const startup = await startupInvestment.getStartup(1);
      expect(startup[5]).to.equal(smallInvestment); // currentFunding
    });
    
    it("Should handle multiple investments correctly", async function () {
      // Make investments
      await startupInvestment.connect(investor1).investInStartup(1, { value: smallInvestment });
      await startupInvestment.connect(investor2).investInStartup(1, { value: largeInvestment });
      
      // Verify both investments
      await startupInvestment.verifyInvestment(1);
      await startupInvestment.verifyInvestment(2);
      
      // Startup funding should have increased correctly
      const startup = await startupInvestment.getStartup(1);
      expect(startup[5]).to.equal(smallInvestment + largeInvestment); // currentFunding
    });
  });
  
  describe("Fund Withdrawal", function () {
    it("Should allow founder to withdraw funds", async function () {
      // Make and verify an investment
      await startupInvestment.connect(investor1).investInStartup(1, { value: smallInvestment });
      await startupInvestment.verifyInvestment(1);
      
      // Check founder's balance before withdrawal
      const balanceBefore = await ethers.provider.getBalance(founder.address);
      
      // Withdraw funds
      await startupInvestment.connect(founder).withdrawFunds(1, smallInvestment);
      
      // Check founder's balance after withdrawal
      const balanceAfter = await ethers.provider.getBalance(founder.address);
      
      // Balance should have increased (minus gas costs)
      expect(balanceAfter).to.be.gt(balanceBefore);
      
      // Startup funding should have decreased
      const startup = await startupInvestment.getStartup(1);
      expect(startup[5]).to.equal(0); // currentFunding
    });
    
    it("Should not allow non-founders to withdraw", async function () {
      // Make and verify an investment
      await startupInvestment.connect(investor1).investInStartup(1, { value: smallInvestment });
      await startupInvestment.verifyInvestment(1);
      
      // Try to withdraw as non-founder (should fail)
      await expect(
        startupInvestment.connect(investor1).withdrawFunds(1, smallInvestment)
      ).to.be.revertedWith("Only founder can withdraw");
    });
  });
});