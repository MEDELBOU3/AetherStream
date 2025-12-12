/**
 * js/firebase/sessions.js
 * Real-time Viewing Session Logic
 */

import { db } from "./config.js";
import {
  doc, addDoc, updateDoc, collection, arrayUnion, arrayRemove, 
  onSnapshot, serverTimestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Create a Room
export const createViewingSession = async (hostUid, movieData) => {
  try {
    const sessionData = {
      hostUid: hostUid,
      movie: movieData, // { id, title, poster_path, media_type }
      participants: [hostUid],
      state: 'paused', // 'playing' or 'paused'
      time: 0,
      chat: [],
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "viewingSessions"), sessionData);
    return { success: true, sessionId: docRef.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// 2. Join a Room
export const joinViewingSession = async (sessionId, uid) => {
  try {
    const ref = doc(db, "viewingSessions", sessionId);
    await updateDoc(ref, {
      participants: arrayUnion(uid)
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// 3. Leave a Room
export const leaveViewingSession = async (sessionId, uid) => {
  try {
    const ref = doc(db, "viewingSessions", sessionId);
    await updateDoc(ref, {
      participants: arrayRemove(uid)
    });
    return { success: true };
  } catch (e) { console.error(e); }
};

// 4. Send Chat Message
export const sendChatMessage = async (sessionId, uid, name, msg) => {
  const ref = doc(db, "viewingSessions", sessionId);
  await updateDoc(ref, {
    chat: arrayUnion({
      user: name,
      msg: msg,
      uid: uid,
      timestamp: Date.now()
    })
  });
};

// 5. Update Playback Status (Sync)
export const updatePlaybackState = async (sessionId, time, state) => {
  const ref = doc(db, "viewingSessions", sessionId);
  await updateDoc(ref, {
    time: time,
    state: state // 'playing' or 'paused'
  });
};

// 6. Real-time Listener
export const listenToSessionUpdates = (sessionId, callback) => {
  const ref = doc(db, "viewingSessions", sessionId);
  
  // onSnapshot triggers every time the DB changes
  return onSnapshot(ref, (doc) => {
    if (doc.exists()) {
      callback({ success: true, session: doc.data() });
    } else {
      callback({ success: false, error: "Session ended" });
    }
  });
};

/**
 * Update Session Media Details (Season/Episode)
 * Used for TV Show navigation
 */
export const updateSessionMedia = async (sessionId, season, episode) => {
  const ref = doc(db, "viewingSessions", sessionId);
  try {
    // We update the nested 'movie' object fields
    await updateDoc(ref, {
      "movie.season": season,
      "movie.episode": episode,
      "state": "playing", // Auto-play next episode
      "time": 0 // Reset time
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};