import { db } from "./config.js";
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection,
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  increment, 
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===========================
   WATCHLIST & USER DATA
   =========================== */

/**
 * ADD TO WATCHLIST
 * Supports "Smart Sync" (Small objects) to save bandwidth
 */
export const addToCloudList = async (user, movie) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  try {
    // Merge: true creates the document if it doesn't exist
    await setDoc(userRef, {
      watchlist: arrayUnion(movie)
    }, { merge: true });
  } catch (e) { 
    console.error("Error adding to cloud list:", e); 
  }
};

/**
 * REMOVE FROM WATCHLIST
 */
export const removeFromCloudList = async (user, movie) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, {
      watchlist: arrayRemove(movie)
    });
  } catch (e) { 
    console.error("Error removing from cloud list:", e); 
  }
};

/**
 * GET USER DATA
 * Returns Watchlist and Settings
 */
export const getUserData = async (user) => {
  if (!user) return null;
  const userRef = doc(db, "users", user.uid);
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return { watchlist: [], settings: {} };
    }
  } catch (e) { 
    console.error("Error fetching user data:", e); 
    return null; 
  }
};

/**
 * SAVE SETTINGS (Theme, etc.)
 */
export const saveUserSettings = async (user, settings) => {
  if(!user) return;
  const userRef = doc(db, "users", user.uid);
  try {
    await setDoc(userRef, { settings: settings }, { merge: true });
  } catch (e) { console.error("Settings Save Error:", e); }
};


/* ===========================
   ORIGINALS & ANALYTICS
   =========================== */

/**
 * TRACK VIEW (Smart Counter)
 * Called when player opens. Uses atomic increment.
 */
export const trackGlobalView = async (media) => {
  if (!media || !media.id) return;

  const mediaId = media.id.toString();
  const docRef = doc(db, "global_stats", mediaId);
  
  try {
    await setDoc(docRef, {
      id: media.id,
      title: media.title || media.name,
      poster_path: media.poster_path || null,
      
      // --- ADD THIS LINE ---
      backdrop_path: media.backdrop_path || null, 
      // --------------------

      media_type: media.media_type || 'movie',
      view_count: increment(1),
      last_watched: new Date().toISOString()
    }, { merge: true });
    
    console.log(`[Analytics] +1 Global View: ${media.title || media.name}`);
  } catch (e) {
    console.error("Tracking Error:", e);
  }
};

export const trackHistory = async (user, media, season = null, episode = null) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  
  const historyItem = {
    id: media.id,
    title: media.title || media.name,
    poster_path: media.poster_path,
    backdrop_path: media.backdrop_path,
    media_type: media.media_type || 'movie',
    // SAVE SEASON DATA
    season: season,
    episode: episode,
    watched_at: new Date().toISOString()
  };

  try {
    // Note: This adds a new entry. 
    // To limit list size or remove duplicates, you'd need to read-modify-write,
    // but arrayUnion is fine for a basic history log.
    await setDoc(userRef, {
      history: arrayUnion(historyItem)
    }, { merge: true });
  } catch (e) {
    console.error("History Save Error:", e);
  }
};
/**
 * GET LEADERBOARD
 * Returns top content sorted by view count
 */
export const getGlobalRankings = async (limitCount = 20) => {
  const statsRef = collection(db, "global_stats");
  const q = query(statsRef, orderBy("view_count", "desc"), limit(limitCount));
  
  try {
    const querySnapshot = await getDocs(q);
    const results = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data());
    });
    return results;
  } catch (e) {
    console.error("Ranking Fetch Error:", e);
    return [];
  }
};
