import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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
const db = getFirestore(app);

async function setAdminRole() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "asrbek@skillhubapp.com", "Asrbek2778.");
    const user = userCredential.user;
    
    await setDoc(doc(db, "profiles", user.uid), {
      name: "Asrbek",
      role: "admin",
      createdAt: new Date().toISOString()
    });
    
    console.log("Successfully set admin role for asrbek@skillhubapp.com");
    process.exit(0);
  } catch (error) {
    console.error("Error setting role:", error.message);
    process.exit(1);
  }
}

setAdminRole();
