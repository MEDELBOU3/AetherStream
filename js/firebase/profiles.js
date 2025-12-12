/**
 * js/firebase/profiles.js
 * Manages Multi-profile with Kids Mode support
 */
import { db } from "./config.js";
import { 
  collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Helper to get the Active Profile ID
export const getActiveProfileId = () => localStorage.getItem('aether_active_profile');

// Helper to check if current mode is Kids
export const isKidsMode = () => localStorage.getItem('aether_is_kids') === 'true';

export const getAccountProfiles = async (uid) => {
    try {
        const colRef = collection(db, "users", uid, "profiles");
        const snap = await getDocs(colRef);
        const profiles = [];
        snap.forEach(doc => profiles.push({ id: doc.id, ...doc.data() }));
        
        if(profiles.length === 0) {
            // Default Admin is NOT a kid
            const admin = await createProfile(uid, "Admin", "https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png", "dark", false);
            profiles.push(defaultProfile);
        }
        return profiles;
    } catch (e) {
        console.error("Error fetching profiles:", e);
        return [];
    }
};


export const createProfile = async (uid, name, avatar, theme = 'dark', isKids = false) => {
    const newId = `profile_${Date.now()}`;
    const data = {
        id: newId,
        name: name,
        avatar: avatar,
        theme: theme,
        isKids: isKids, // <--- IMPORTANT: This must be saved
        createdAt: serverTimestamp(),
        watchlist: [], 
        history: [],
        settings: { theme: theme }
    };
    await setDoc(doc(db, "users", uid, "profiles", newId), data);
    return data;
};
export const deleteProfile = async (uid, profileId) => {
    await deleteDoc(doc(db, "users", uid, "profiles", profileId));
};

/**
 * Switch Active Profile (Updated)
 */
export const setActiveProfile = (profile) => {
    localStorage.setItem('aether_active_profile', profile.id);
    localStorage.setItem('aether_theme', profile.theme || 'dark');
    
    // SAVE KIDS STATUS TO LOCAL STORAGE
    localStorage.setItem('aether_is_kids', profile.isKids);

    // Apply Theme
    const colorMap = {
        'dark': '#E50914',
        'light': '#E50914',
        'kids': '#00A8E8' // Special Blue for Kids
    };
    const color = profile.isKids ? colorMap['kids'] : (colorMap[profile.theme] || '#E50914');
    document.documentElement.style.setProperty('--accent', color);

    window.location.reload();
};