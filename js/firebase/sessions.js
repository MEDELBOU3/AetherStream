/**
 * ADVANCED FIREBASE FEATURE: Real-time Viewing Sessions
 * Allows users to watch together in real-time with synchronized playback
 */

import { db } from "./config.js";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  deleteDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Create a Viewing Session
 */
export const createViewingSession = async (hostUid, movieData) => {
  try {
    const sessionRef = collection(db, "viewingSessions");
    const newSession = {
      hostUid,
      movieData,
      participants: [hostUid],
      isActive: true,
      createdAt: serverTimestamp(),
      currentTime: 0,
      isPlaying: false,
      quality: "auto",
      captions: "off",
      chat: [],
      settings: {
        allowParticipants: true,
        maxParticipants: 10,
        syncPlayback: true
      }
    };

    // Create session with auto-generated ID
    const sessionDoc = await setDoc(doc(collection(db, "viewingSessions")), newSession);
    
    // Get the ID of the newly created document
    const newSessionQuery = query(
      collection(db, "viewingSessions"),
      where("hostUid", "==", hostUid),
      where("createdAt", "==", newSession.createdAt)
    );
    
    const snapshot = await getDocs(newSessionQuery);
    const sessionId = snapshot.docs[0].id;

    return { success: true, sessionId, session: newSession };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Join a Viewing Session
 */
export const joinViewingSession = async (sessionId, userUid) => {
  try {
    const sessionRef = doc(db, "viewingSessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return { success: false, error: "Session not found" };
    }

    const sessionData = sessionSnap.data();

    // Check if session is full
    if (sessionData.participants.length >= sessionData.settings.maxParticipants) {
      return { success: false, error: "Session is full" };
    }

    // Add participant
    await updateDoc(sessionRef, {
      participants: arrayUnion(userUid)
    });

    return { success: true, session: sessionData };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Leave Viewing Session
 */
export const leaveViewingSession = async (sessionId, userUid) => {
  try {
    const sessionRef = doc(db, "viewingSessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return { success: false, error: "Session not found" };
    }

    const sessionData = sessionSnap.data();

    // Remove participant
    await updateDoc(sessionRef, {
      participants: arrayRemove(userUid)
    });

    // If host leaves or no participants, delete session
    if (userUid === sessionData.hostUid || sessionData.participants.length === 1) {
      await deleteDoc(sessionRef);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update Playback State (synchronized for all participants)
 */
export const updatePlaybackState = async (sessionId, currentTime, isPlaying) => {
  try {
    const sessionRef = doc(db, "viewingSessions", sessionId);
    await updateDoc(sessionRef, {
      currentTime,
      isPlaying,
      lastUpdated: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send Chat Message in Session
 */
export const sendChatMessage = async (sessionId, userUid, userName, message) => {
  try {
    const sessionRef = doc(db, "viewingSessions", sessionId);
    await updateDoc(sessionRef, {
      chat: arrayUnion({
        userUid,
        userName,
        message,
        timestamp: serverTimestamp()
      })
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Listen to Real-time Session Updates
 */
export const listenToSessionUpdates = (sessionId, callback) => {
  try {
    const sessionRef = doc(db, "viewingSessions", sessionId);
    
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ success: true, session: snapshot.data() });
      } else {
        callback({ success: false, error: "Session ended" });
      }
    });

    return unsubscribe;
  } catch (error) {
    callback({ success: false, error: error.message });
  }
};

/**
 * Get Active Sessions for a User
 */
export const getActiveUserSessions = async (userUid) => {
  try {
    const sessionsRef = collection(db, "viewingSessions");
    const q = query(
      sessionsRef,
      where("participants", "array-contains", userUid),
      where("isActive", "==", true)
    );

    const querySnapshot = await getDocs(q);
    const sessions = [];

    querySnapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, sessions };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update Video Quality Setting
 */
export const updateQualitySetting = async (sessionId, quality) => {
  try {
    const sessionRef = doc(db, "viewingSessions", sessionId);
    await updateDoc(sessionRef, { quality });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Toggle Captions
 */
export const toggleCaptions = async (sessionId, captions) => {
  try {
    const sessionRef = doc(db, "viewingSessions", sessionId);
    await updateDoc(sessionRef, { captions });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
