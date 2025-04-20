import { getDatabase, ref, set, get } from 'firebase/database';
import { app } from './config';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { saveWalletToStartup } from './walletDatabase';

// Initialize Firebase Realtime Database
const database = getDatabase(app);
const firestore = getFirestore(app);

// Sample wallet addresses (Ethereum test addresses)
const sampleWallets = [
  // Original wallets
  {
    startupId: "-OO7kPNSiPIM_UXLoFSf",
    founderId: "1",
    walletAddress: "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
    founderName: "Tech Innovator"
  },
  {
    startupId: "-OO7hZfv5YEyv2ufr9X7",
    founderId: "2",
    walletAddress: "0xdaa06d76757ea049fb47f424bb0b2fb8fc44679f",
    founderName: "Sustainable Solutions"
  },
  {
    startupId: "-OO7hPd-GgLZQaFHnLfb",
    founderId: "3",
    walletAddress: "0x59a5208b32e627891c389ebafc644145224006e8",
    founderName: "AI Ventures"
  },
  
  // Additional wallet addresses for all other startups
  {
    startupId: "-OO7hPP-eSGZXc2Hbcef",
    founderId: "4",
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    founderName: "Health Tech"
  },
  {
    startupId: "-OO7hFM-bRGZYa1Fabcd",
    founderId: "5",
    walletAddress: "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF",
    founderName: "EdTech Solutions"
  },
  {
    startupId: "-OO7gWO-aQDZVa0Eabde",
    founderId: "6",
    walletAddress: "0x6813Eb9362372EEF6200f3b1dbC3f819671cBA69",
    founderName: "FinTech Innovators"
  },
  {
    startupId: "-OO7fTN-pQCZUs9Dabef",
    founderId: "7",
    walletAddress: "0x1efF47bc3a10a45D4B230B5d10E37751FE6AA718",
    founderName: "Renewable Energy"
  },
  {
    startupId: "-OO7eSM-oQBZTr8Cabfg",
    founderId: "8",
    walletAddress: "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB",
    founderName: "Space Technologies"
  },
  
  // Default wallet for any startup not listed above
  {
    startupId: "default",
    founderId: "999",
    walletAddress: "0x617F2E2fD72FD9D5503197092aC168c91465E7f2",
    founderName: "Default Founder"
  }
];

// Function to add sample wallet data to Firebase for testing
export const addSampleWalletsToFirebase = async (forceUpdate: boolean = false): Promise<boolean> => {
  console.log("[Sample Wallets] Adding sample wallet data to Firebase");
  
  try {
    // Check if we already have data to avoid duplicates
    const checkRef = ref(database, 'wallets');
    const snapshot = await get(checkRef);
    
    // If we already have wallet data, don't add more unless forced
    if (!forceUpdate && snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
      console.log("[Sample Wallets] Wallet data already exists in Firebase, skipping");
      return true;
    }
    
    if (forceUpdate) {
      console.log("[Sample Wallets] Force update enabled - adding/updating all wallets");
    }
    
    // Add each sample wallet to Firebase
    for (const wallet of sampleWallets) {
      console.log(`[Sample Wallets] Adding wallet for startup ${wallet.startupId}`);
      
      // Save to wallets collection
      const walletRef = ref(database, `wallets/${wallet.walletAddress.toLowerCase()}`);
      await set(walletRef, {
        address: wallet.walletAddress.toLowerCase(),
        userId: wallet.founderId,
        username: wallet.founderName,
        isPermanent: true,
        timestamp: Date.now()
      });
      
      // Save to users collection
      const userRef = ref(database, `users/${wallet.founderId}/wallet`);
      await set(userRef, {
        address: wallet.walletAddress.toLowerCase(),
        isPermanent: true,
        timestamp: Date.now()
      });
      
      // Also save to the startup data
      await saveWalletToStartup(
        wallet.startupId,
        wallet.walletAddress,
        wallet.founderName
      );
      
      // Add to Firestore as well for redundancy
      try {
        const startupDoc = doc(firestore, 'startups', wallet.startupId);
        const startupData = await getDoc(startupDoc);
        
        if (startupData.exists()) {
          // Update existing startup data
          await setDoc(startupDoc, {
            ...startupData.data(),
            founderWalletAddress: wallet.walletAddress.toLowerCase(),
            founderName: wallet.founderName
          }, { merge: true });
        } else {
          // Create new startup document
          await setDoc(startupDoc, {
            id: wallet.startupId,
            founderId: wallet.founderId,
            founderWalletAddress: wallet.walletAddress.toLowerCase(),
            founderName: wallet.founderName
          });
        }
        
        console.log(`[Sample Wallets] Added wallet to Firestore for startup ${wallet.startupId}`);
      } catch (firestoreError) {
        console.error(`[Sample Wallets] Error adding to Firestore:`, firestoreError);
        // Continue even if Firestore fails
      }
    }
    
    console.log("[Sample Wallets] Successfully added all sample wallets to Firebase");
    return true;
  } catch (error) {
    console.error("[Sample Wallets] Error adding sample wallets:", error);
    return false;
  }
};

// Function to check if wallets exist in Firebase
export const checkWalletsInFirebase = async (): Promise<boolean> => {
  try {
    const walletsRef = ref(database, 'wallets');
    const snapshot = await get(walletsRef);
    
    if (snapshot.exists()) {
      const wallets = snapshot.val();
      const walletCount = Object.keys(wallets).length;
      console.log(`[Sample Wallets] Found ${walletCount} wallets in Firebase`);
      return walletCount > 0;
    }
    
    console.log("[Sample Wallets] No wallets found in Firebase");
    return false;
  } catch (error) {
    console.error("[Sample Wallets] Error checking wallets:", error);
    return false;
  }
};

// Function to ensure a startup has a wallet address
// If no wallet exists for the startup, assign the default wallet
export const ensureStartupHasWallet = async (startupId: string | number): Promise<string> => {
  if (!startupId) {
    console.error("[Sample Wallets] No startup ID provided");
    return "";
  }
  
  try {
    console.log(`[Sample Wallets] Ensuring wallet exists for startup: ${startupId}`);
    
    // First check if the startup already has a wallet in Firebase
    const startupRef = ref(database, `startups/${startupId}`);
    const startupSnapshot = await get(startupRef);
    
    // If the startup exists and has a founder wallet, return it
    if (startupSnapshot.exists()) {
      const startupData = startupSnapshot.val();
      if (startupData.founderWalletAddress) {
        console.log(`[Sample Wallets] Found existing wallet for startup ${startupId}: ${startupData.founderWalletAddress}`);
        return startupData.founderWalletAddress;
      }
    }
    
    // Otherwise, check if we have a predefined wallet for this startup
    const matchingWallet = sampleWallets.find(wallet => 
      wallet.startupId === startupId || wallet.startupId === startupId.toString()
    );
    
    if (matchingWallet) {
      console.log(`[Sample Wallets] Found matching wallet in predefined list for startup ${startupId}`);
      
      // Save this wallet to the startup data
      await saveWalletToStartup(
        startupId,
        matchingWallet.walletAddress,
        matchingWallet.founderName
      );
      
      return matchingWallet.walletAddress;
    }
    
    // If no matching wallet found, use the default wallet
    const defaultWallet = sampleWallets.find(wallet => wallet.startupId === "default");
    
    if (defaultWallet) {
      console.log(`[Sample Wallets] Using default wallet for startup ${startupId}`);
      
      // Save the default wallet to this startup
      await saveWalletToStartup(
        startupId,
        defaultWallet.walletAddress,
        `Founder of Startup ${startupId}`
      );
      
      return defaultWallet.walletAddress;
    }
    
    console.error(`[Sample Wallets] No default wallet found!`);
    return "";
  } catch (error) {
    console.error(`[Sample Wallets] Error ensuring wallet for startup ${startupId}:`, error);
    return "";
  }
};