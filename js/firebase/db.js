import { db } from "./config.js";
import {
  doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc,
  arrayUnion, arrayRemove, increment, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// REMOVED IMPORT: import { currentProfileId } from "./profiles.js"; 
// We will get it from localStorage directly to avoid circular dependency.

import { logActivity } from "./analytics.js";
// Note: If analytics.js also imports db.js, ensure it only exports helper functions, 
// or move logActivity here to be safe. But usually this one is fine.

const TMDB_KEY = "31280d77499208623732d77823eabcb4";

/**
 * HELPER: Ensure media object has images
 *
const ensureMediaImages = async (media) => {
  if (media.poster_path && media.backdrop_path) return media;

  try {
    const type = media.media_type || 'movie';
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${media.id}?api_key=${TMDB_KEY}`);
    const data = await res.json();
    return {
      ...media,
      poster_path: data.poster_path || media.poster_path || null,
      backdrop_path: data.backdrop_path || media.backdrop_path || null
    };
  } catch (e) {
    return media;
  }
};*/ 

/**
 * HELPER: Ensure media object has images and Correct Type
 */
const ensureMediaImages = async (media) => {
  // 1. Auto-detect type if missing
  // TMDB uses 'title' for movies and 'name' for TV.
  if (!media.media_type) {
     if (media.name && !media.title) media.media_type = 'tv';
     else if (media.title) media.media_type = 'movie';
  }

  // If we already have images, just return (but ensure type is attached)
  if (media.poster_path && media.backdrop_path) return media;

  try {
    const type = media.media_type || 'movie';
    // Fetch fresh data from TMDB
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${media.id}?api_key=${TMDB_KEY}`);
    
    if (!res.ok) throw new Error("API Fetch Failed");
    
    const data = await res.json();
    
    return {
      ...media,
      media_type: type, // Ensure type is saved
      title: data.title || data.name || media.title || media.name, // Normalize title
      poster_path: data.poster_path || media.poster_path || null,
      backdrop_path: data.backdrop_path || media.backdrop_path || null
    };
  } catch (e) {
    console.warn("Could not hydrate images:", e);
    return media;
  }
};

/**
 * HELPER: Get correct document ref (Profile aware)
 */
const getUserRef = (uid) => {
  // Read directly from storage to avoid import loops
  const profileId = localStorage.getItem('aether_active_profile');
  if (profileId) {
    return doc(db, "users", uid, "profiles", profileId);
  }
  return doc(db, "users", uid);
};

/* --- WATCHLIST & DATA --- */

export const addToCloudList = async (user, movie) => {
  if (!user) return;
  const ref = getUserRef(user.uid);

  // Hydrate before saving
  const fullMovie = await ensureMediaImages(movie);

  const cleanItem = {
    id: fullMovie.id,
    title: fullMovie.title || fullMovie.name,
    poster_path: fullMovie.poster_path,
    backdrop_path: fullMovie.backdrop_path,
    media_type: fullMovie.media_type || 'movie',
    vote_average: fullMovie.vote_average || 0
  };

  try { await setDoc(ref, { watchlist: arrayUnion(cleanItem) }, { merge: true }); }
  catch (e) { console.error(e); }
};

export const removeFromCloudList = async (user, movie) => {
  if (!user) return;
  const ref = getUserRef(user.uid);
  // Note: arrayRemove is strict. If the object isn't identical to what's in DB, it won't remove.
  // A better production approach handles removal by ID, but for this demo:
  try {
    // Fetch list, filter, update (Guaranteed removal)
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const list = snap.data().watchlist || [];
      const newList = list.filter(i => i.id !== movie.id);
      await updateDoc(ref, { watchlist: newList });
    }
  }
  catch (e) { console.error(e); }
};

export const getUserData = async (user) => {
  if (!user) return null;
  const ref = getUserRef(user.uid);
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { watchlist: [], history: [], settings: {} };
  } catch (e) { return null; }
};

export const saveUserSettings = async (user, settings) => {
  if (!user) return;
  const ref = getUserRef(user.uid);
  try { await setDoc(ref, { settings: settings }, { merge: true }); }
  catch (e) { console.error(e); }
};

/* --- ANALYTICS (GLOBAL) --- */
/*
export const trackGlobalView = async (media) => {
  if (!media || !media.id) return;
  const fullMedia = await ensureMediaImages(media);

  try {
    await setDoc(doc(db, "global_stats", fullMedia.id.toString()), {
      id: fullMedia.id,
      title: fullMedia.title || fullMedia.name,
      poster_path: fullMedia.poster_path,
      backdrop_path: fullMedia.backdrop_path,
      media_type: fullMedia.media_type || 'movie',
      view_count: increment(1)
    }, { merge: true });
  } catch (e) { console.error(e); }
};*/ 

export const trackGlobalView = async (media) => {
  if (!media || !media.id) return;

  // 1. Get fully hydrated object (with images and correct type)
  const fullMedia = await ensureMediaImages(media);

  try {
    // 2. Save to Firebase
    // We use setDoc with merge to update view count without overwriting images
    await setDoc(doc(db, "global_stats", fullMedia.id.toString()), {
      id: fullMedia.id,
      title: fullMedia.title || fullMedia.name, // Save the correct title
      poster_path: fullMedia.poster_path,
      backdrop_path: fullMedia.backdrop_path,
      media_type: fullMedia.media_type || 'movie',
      view_count: increment(1)
    }, { merge: true });
  } catch (e) { 
    console.error("Analytics Error:", e); 
  }
};

export const getGlobalRankings = async (limitCount = 20) => {
  const q = query(collection(db, "global_stats"), orderBy("view_count", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  const res = [];
  snap.forEach(d => res.push(d.data()));
  return res;
};

/* --- HISTORY --- */

export const trackHistory = async (user, media, season = null, episode = null) => {
  if (!user) return;
  const ref = getUserRef(user.uid);

  const fullMedia = await ensureMediaImages(media);

  const item = {
    id: fullMedia.id,
    title: fullMedia.title || fullMedia.name,
    poster_path: fullMedia.poster_path,
    backdrop_path: fullMedia.backdrop_path,
    media_type: fullMedia.media_type || 'movie',
    season: season,
    episode: episode,
    watched_at: new Date().toISOString()
  };

  try { await setDoc(ref, { history: arrayUnion(item) }, { merge: true }); }
  catch (e) { console.error(e); }

  const fullHistory = (await getUserData(user)).history;
  const unlocked = await checkAchievements(user, fullHistory);

  if (unlocked) {
    // Show Toast Notification
    unlocked.forEach(badge => {
      // You can implement a UI function: app.showToast(...)
      alert(`🏆 Achievement Unlocked: ${badge.name} ${badge.icon}`);
    });
  }
};

/* --- FAVORITES & RATINGS --- */

export const addFavorite = async (user, media) => {
  const fullMedia = await ensureMediaImages(media);
  const ref = getUserRef(user.uid);

  const item = {
    id: fullMedia.id,
    media_type: fullMedia.media_type || 'movie',
    title: fullMedia.title || fullMedia.name,
    poster_path: fullMedia.poster_path,
    backdrop_path: fullMedia.backdrop_path
  };

  // Save to Profile
  await setDoc(ref, { favorites: arrayUnion(item) }, { merge: true });

  // Log Activity (Global/Friend Feed)
  // We pass user info from auth object usually available in UI
  logActivity(user.uid, media, 'favorited', {
    userName: user.displayName,
    userPhoto: user.photoURL
  });
};

export const removeFavorite = async (user, media) => {
  const ref = getUserRef(user.uid);
  try {
    // Robust removal by ID
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const favs = snap.data().favorites || [];
      const newFavs = favs.filter(f => f.id !== media.id);
      await updateDoc(ref, { favorites: newFavs });
    }
  } catch (e) { console.error(e); }
};

export const rateMediaUser = async (user, media, rating) => {
  if (!user) return;
  const ratingId = `${user.uid}_${media.id}`;

  // Ratings are global (not per profile usually), but we can link them
  await setDoc(doc(db, "ratings", ratingId), {
    uid: user.uid,
    mediaId: media.id,
    mediaTitle: media.title || media.name,
    rating: rating,
    timestamp: new Date().toISOString()
  });

  logActivity(user.uid, media, 'rated', {
    userName: user.displayName,
    userPhoto: user.photoURL,
    rating: rating
  });
};

export const getUserRating = async (user, mediaId) => {
  if (!user) return 0;
  const ratingId = `${user.uid}_${mediaId}`;
  const snap = await getDoc(doc(db, "ratings", ratingId));
  return snap.exists() ? snap.data().rating : 0;
};

// Define Badges
const BADGES = {
  'scifi_fan': { id: 'scifi_fan', name: 'Time Traveler', icon: '🚀', req_genre: 878, req_count: 3 },
  'horror_fan': { id: 'horror_fan', name: 'Ghost Hunter', icon: '👻', req_genre: 27, req_count: 3 },
  'night_owl': { id: 'night_owl', name: 'Night Owl', icon: '🦉', req_hour_min: 2, req_hour_max: 5 },
  'binge_watcher': { id: 'binge_watcher', name: 'Bingewatcher', icon: '🍿', req_total: 10 }
};

export const checkAchievements = async (user, history) => {
  if (!user || !history) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  const currentBadges = userData.badges || [];
  const newBadges = [];

  // 1. Check Genre Badges
  const sciFiCount = history.filter(h => h.genre_ids && h.genre_ids.includes(878)).length;
  if (sciFiCount >= 3 && !currentBadges.includes('scifi_fan')) newBadges.push('scifi_fan');

  // 2. Check Night Owl (Current Time)
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 5 && !currentBadges.includes('night_owl')) newBadges.push('night_owl');

  // 3. Check Total Count
  if (history.length >= 10 && !currentBadges.includes('binge_watcher')) newBadges.push('binge_watcher');

  // SAVE IF NEW
  if (newBadges.length > 0) {
    await updateDoc(userRef, {
      badges: arrayUnion(...newBadges)
    });

    // Return details for UI Notification
    return newBadges.map(id => BADGES[id]);
  }

  return null;
};