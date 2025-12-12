import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAHsUCcYEkIaqRt1augubJIPJeVUR0VCc8",
  authDomain: "aether-f068c.firebaseapp.com",
  projectId: "aether-f068c",
  storageBucket: "aether-f068c.firebasestorage.app",
  messagingSenderId: "472757226316",
  appId: "1:472757226316:web:232c17fc647afaa4495de9",
  measurementId: "G-W48DKYPZ7R"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);