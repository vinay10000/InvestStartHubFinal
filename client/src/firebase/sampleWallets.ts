import { getDatabase, ref, set, get } from 'firebase/database';
import { app } from './config';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { saveWalletToStartup } from './walletDatabase';

// Initialize Firebase Realtime Database
const database = getDatabase(app);
const firestore = getFirestore(app);

// Sample wallet addresses (Ethereum test addresses)
const sampleWallets = [
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
  // Add more sample wallets as needed
];

// Function to add sample wallet data to Firebase for testing
export const addSampleWalletsToFirebase = async (): Promise<boolean> => {
  console.log("[Sample Wallets] Adding sample wallet data to Firebase");
  
  try {
    // Check if we already have data to avoid duplicates
    const checkRef = ref(database, 'wallets');
    const snapshot = await get(checkRef);
    
    // If we already have wallet data, don't add more unless forced
    if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
      console.log("[Sample Wallets] Wallet data already exists in Firebase, skipping");
      return true;
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