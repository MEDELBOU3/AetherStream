import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, 
  onAuthStateChanged, updateProfile, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, googleProvider } from "./config.js";

export const loginEmail = async (email, password) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: cred.user };
  } catch (e) { return { success: false, error: e.message }; }
};

export const registerEmail = async (email, password, name) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    return { success: true, user: cred.user };
  } catch (e) { return { success: false, error: e.message }; }
};

export const loginGoogle = async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return { success: true, user: res.user };
  } catch (e) { return { success: false, error: e.message }; }
};

export const logoutUser = async () => {
  try { await signOut(auth); return { success: true }; } 
  catch (e) { console.error(e); }
};

export const initAuthObserver = (onLogin, onLogout) => {
  onAuthStateChanged(auth, (user) => {
    if (user) onLogin(user); else onLogout();
  });
};