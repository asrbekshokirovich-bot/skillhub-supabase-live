import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function replaceAccount() {
  try {
    // 1. Delete old account (requires sign-in first)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, "barxayot@skillhubapp.com", "Barxayot123!");
      await deleteUser(userCredential.user);
      console.log("Successfully deleted old account: barxayot@skillhubapp.com");
    } catch (e) {
      console.log("Old account not found or already deleted.");
    }

    // 2. Create new admin account
    const newAdmin = await createUserWithEmailAndPassword(auth, "asrbek@skillhubapp.com", "Asrbek2778.");
    console.log("Successfully created new admin account: asrbek@skillhubapp.com");
    
    process.exit(0);
  } catch (error) {
    console.error("Error process:", error.message);
    process.exit(1);
  }
}

replaceAccount();
