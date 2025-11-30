/**
 * ADVANCED FIREBASE FEATURE: User Profiles & Social Network
 * Manages user profiles, friendships, and social connections
 */

import { db } from "./config.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Create or Update User Profile
 */
export const createUserProfile = async (user, profileData) => {
  if (!user) return { success: false, error: "No user" };

  try {
    const userRef = doc(db, "users", user.uid);
    const defaultProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "User",
      photoURL: user.photoURL || "",
      bio: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      friends: [],
      friendRequests: [],
      followers: [],
      following: [],
      stats: {
        totalWatched: 0,
        totalWatchTime: 0,
        favoriteGenre: "All"
      },
      preferences: {
        isPrivate: false,
        showActivity: true,
        allowMessages: true
      }
    };

    await setDoc(userRef, { ...defaultProfile, ...profileData }, { merge: true });
    return { success: true, profile: defaultProfile };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get User Profile
 */
export const getUserProfile = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { success: true, profile: userSnap.data() };
    }
    return { success: false, error: "User not found" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update User Profile
 */
export const updateUserProfile = async (uid, updates) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send Friend Request
 */
export const sendFriendRequest = async (fromUid, toUid) => {
  try {
    const recipientRef = doc(db, "users", toUid);

    // Add to recipient's friend requests
    await updateDoc(recipientRef, {
      friendRequests: arrayUnion({
        from: fromUid,
        timestamp: serverTimestamp()
      })
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Accept Friend Request
 */
export const acceptFriendRequest = async (uid, fromUid) => {
  try {
    const batch = writeBatch(db);

    // Add friend to current user
    const userRef = doc(db, "users", uid);
    batch.update(userRef, {
      friends: arrayUnion(fromUid),
      friendRequests: arrayRemove({
        from: fromUid
      })
    });

    // Add current user to friend's friends
    const friendRef = doc(db, "users", fromUid);
    batch.update(friendRef, {
      friends: arrayUnion(uid)
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Reject Friend Request
 */
export const rejectFriendRequest = async (uid, fromUid) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      friendRequests: arrayRemove({
        from: fromUid
      })
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Remove Friend
 */
export const removeFriend = async (uid, friendUid) => {
  try {
    const batch = writeBatch(db);

    const userRef = doc(db, "users", uid);
    batch.update(userRef, {
      friends: arrayRemove(friendUid)
    });

    const friendRef = doc(db, "users", friendUid);
    batch.update(friendRef, {
      friends: arrayRemove(uid)
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Search Users by Name or Email
 */
export const searchUsers = async (searchTerm) => {
  try {
    const usersRef = collection(db, "users");
    // Note: For production, consider using Algolia or similar for better search
    const q = query(usersRef, where("displayName", ">=", searchTerm), where("displayName", "<=", searchTerm + "\uf8ff"));
    const querySnapshot = await getDocs(q);

    const results = [];
    querySnapshot.forEach((doc) => {
      results.push({ uid: doc.id, ...doc.data() });
    });

    return { success: true, users: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get User's Friends List
 */
export const getFriendsList = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, error: "User not found" };
    }

    const friendIds = userSnap.data().friends || [];
    const friends = [];

    for (const friendId of friendIds) {
      const friendRef = doc(db, "users", friendId);
      const friendSnap = await getDoc(friendRef);
      if (friendSnap.exists()) {
        friends.push({ uid: friendId, ...friendSnap.data() });
      }
    }

    return { success: true, friends };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Follow User (without mutual friendship)
 */
export const followUser = async (uid, targetUid) => {
  try {
    const userRef = doc(db, "users", uid);
    const targetRef = doc(db, "users", targetUid);

    const batch = writeBatch(db);
    batch.update(userRef, { following: arrayUnion(targetUid) });
    batch.update(targetRef, { followers: arrayUnion(uid) });

    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Unfollow User
 */
export const unfollowUser = async (uid, targetUid) => {
  try {
    const userRef = doc(db, "users", uid);
    const targetRef = doc(db, "users", targetUid);

    const batch = writeBatch(db);
    batch.update(userRef, { following: arrayRemove(targetUid) });
    batch.update(targetRef, { followers: arrayRemove(uid) });

    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
