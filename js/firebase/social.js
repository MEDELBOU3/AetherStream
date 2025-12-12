import { db } from "./config.js";
import { 
  doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, 
  query, limit, getDocs, writeBatch, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PROFILE ---
export const getUserProfile = async (uid) => {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) return { success: true, profile: snap.data() };
        return { success: false, error: "User not found" };
    } catch (e) { return { success: false, error: e.message }; }
};

export const updateUserProfile = async (uid, data) => {
    try {
        await setDoc(doc(db, "users", uid), data, { merge: true });
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
};

// --- SEARCH ---
export const searchUsers = async (term) => {
    if (!term || term.length < 2) return { success: false };
    try {
        const q = query(collection(db, "users"), limit(50));
        const snap = await getDocs(q);
        const users = [];
        const lowerTerm = term.toLowerCase();

        snap.forEach(doc => {
            const data = doc.data();
            const name = (data.displayName || "").toLowerCase();
            const email = (data.email || "").toLowerCase();
            if (name.includes(lowerTerm) || email.includes(lowerTerm)) {
                users.push({
                    uid: doc.id,
                    displayName: data.displayName,
                    photoURL: data.photoURL,
                    email: data.email,
                    isPrivate: data.preferences?.isPrivate || false
                });
            }
        });
        return { success: true, users };
    } catch (e) { return { success: false, error: e.message }; }
};

// --- REQUESTS (SUBCOLLECTION FIX) ---

export const sendFriendRequest = async (fromUid, toUid) => {
    try {
        // 1. Get My Info
        const mySnap = await getDoc(doc(db, "users", fromUid));
        const me = mySnap.data();

        // 2. Write to Subcollection: /users/{toUid}/friendRequests/{fromUid}
        // This matches the "allow create" rule we just set
        const requestRef = doc(db, "users", toUid, "friendRequests", fromUid);
        
        await setDoc(requestRef, {
            fromUid: fromUid,
            fromName: me.displayName || "Unknown",
            fromPhoto: me.photoURL || "",
            timestamp: new Date().toISOString()
        });
        
        return { success: true };
    } catch (e) {
        console.error("Send Request Error:", e);
        return { success: false, error: e.message };
    }
};

// Get Requests from Subcollection
export const getFriendRequestsList = async (uid) => {
    try {
        const q = query(collection(db, "users", uid, "friendRequests"));
        const snap = await getDocs(q);
        const requests = [];
        snap.forEach(doc => requests.push(doc.data()));
        return { success: true, requests };
    } catch (e) { return { success: false, error: e.message }; }
};

export const acceptFriendRequest = async (myUid, friendUid) => {
    try {
        const batch = writeBatch(db);
        
        const myRef = doc(db, "users", myUid);
        const friendRef = doc(db, "users", friendUid);

        // 1. Update MY arrays (Add Friend + Follow them)
        batch.update(myRef, { 
            friends: arrayUnion(friendUid),
            following: arrayUnion(friendUid),
            followers: arrayUnion(friendUid) // They follow me too
        });

        // 2. Update THEIR arrays (Add Me + Follow me)
        batch.update(friendRef, { 
            friends: arrayUnion(myUid),
            following: arrayUnion(myUid),
            followers: arrayUnion(myUid) // I follow them too
        });

        // 3. Delete the Request from Subcollection
        const reqRef = doc(db, "users", myUid, "friendRequests", friendUid);
        batch.delete(reqRef);

        await batch.commit();
        console.log("Friend request accepted & mutual follow established.");
        return { success: true };
    } catch (e) {
        console.error("Accept Error:", e);
        return { success: false, error: e.message };
    }
};

export const rejectFriendRequest = async (uid, fromUid) => {
    try {
        await deleteDoc(doc(db, "users", uid, "friendRequests", fromUid));
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
};

export const removeFriend = async (uid, friendUid) => {
    const batch = writeBatch(db);
    batch.update(doc(db, "users", uid), { friends: arrayRemove(friendUid) });
    batch.update(doc(db, "users", friendUid), { friends: arrayRemove(uid) });
    await batch.commit();
    return { success: true };
};

export const getFriendsList = async (uid) => {
    const p = await getUserProfile(uid);
    if(!p.success || !p.profile.friends) return { success: true, friends: [] };
    const friends = [];
    for (const fid of p.profile.friends) {
        const f = await getUserProfile(fid);
        if(f.success) friends.push(f.profile);
    }
    return { success: true, friends };
};