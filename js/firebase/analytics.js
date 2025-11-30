/**
 * ADVANCED FIREBASE FEATURE: Activity Feed & Watch History
 * Tracks user activity and provides personalized recommendations
 */

import { db } from "./config.js";
import {
  doc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  increment,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Log Watch Activity
 */
export const logWatchActivity = async (uid, movieData, watchDuration) => {
  try {
    const watchHistoryRef = collection(db, "watchHistory");

    const activity = {
      uid,
      movieData,
      watchDuration,
      watchedAt: serverTimestamp(),
      rating: null,
      review: null,
      completed: watchDuration > movieData.duration * 0.8
    };

    const docRef = await addDoc(watchHistoryRef, activity);

    // Update user stats
    await updateUserStats(uid, movieData.genre, watchDuration);

    return { success: true, activityId: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update User Statistics
 */
export const updateUserStats = async (uid, genre, watchDuration) => {
  try {
    const userRef = doc(db, "users", uid);
    
    await updateDoc(userRef, {
      "stats.totalWatched": increment(1),
      "stats.totalWatchTime": increment(Math.floor(watchDuration / 60)), // Convert to minutes
      "stats.favoriteGenre": genre
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Rate Movie
 */
export const rateMovie = async (uid, movieId, rating, review = "") => {
  try {
    const ratingsRef = collection(db, "ratings");

    await addDoc(ratingsRef, {
      uid,
      movieId,
      rating, // 1-5 stars
      review,
      ratedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get User Watch History
 */
export const getUserWatchHistory = async (uid, limitCount = 20) => {
  try {
    const watchHistoryRef = collection(db, "watchHistory");
    const q = query(
      watchHistoryRef,
      where("uid", "==", uid),
      orderBy("watchedAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, history };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Activity Feed (Friends' Activities)
 */
export const getActivityFeed = async (uid) => {
  try {
    // Get user's friends
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, error: "User not found" };
    }

    const friends = userSnap.data().friends || [];

    // Get watch history of friends
    const watchHistoryRef = collection(db, "watchHistory");
    const feedActivities = [];

    for (const friendId of friends) {
      const q = query(
        watchHistoryRef,
        where("uid", "==", friendId),
        orderBy("watchedAt", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        feedActivities.push({
          id: doc.id,
          type: "watched",
          friendId,
          ...doc.data()
        });
      });
    }

    // Sort by timestamp
    feedActivities.sort((a, b) => b.watchedAt - a.watchedAt);

    return { success: true, feed: feedActivities.slice(0, 30) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Smart Recommendations Based on Watch History
 */
export const getSmartRecommendations = async (uid) => {
  try {
    // Get user's watch history
    const watchHistoryRef = collection(db, "watchHistory");
    const q = query(
      watchHistoryRef,
      where("uid", "==", uid),
      orderBy("watchedAt", "desc"),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const watchedMovies = [];
    const genreFrequency = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      watchedMovies.push(data.movieData);

      // Count genre frequency
      const genre = data.movieData.genre;
      genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
    });

    // Find top genres
    const topGenres = Object.entries(genreFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    return {
      success: true,
      recommendations: {
        topGenres,
        watchedCount: watchedMovies.length,
        suggestGenres: topGenres,
        basedOn: watchedMovies.slice(0, 5)
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Trending Movies (Most Watched)
 */
export const getTrendingMovies = async (limitCount = 10) => {
  try {
    const watchHistoryRef = collection(db, "watchHistory");
    const q = query(
      watchHistoryRef,
      orderBy("watchedAt", "desc"),
      limit(100)
    );

    const querySnapshot = await getDocs(q);
    const movieCounts = {};
    const movieData = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const movieId = data.movieData.id;

      movieCounts[movieId] = (movieCounts[movieId] || 0) + 1;
      if (!movieData[movieId]) {
        movieData[movieId] = data.movieData;
      }
    });

    const trending = Object.entries(movieCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitCount)
      .map(([movieId, count]) => ({
        ...movieData[movieId],
        viewCount: count
      }));

    return { success: true, trending };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get Statistics Dashboard
 */
export const getStatisticsDashboard = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, error: "User not found" };
    }

    const userData = userSnap.data();

    // Get recent watch history
    const watchHistoryRef = collection(db, "watchHistory");
    const q = query(
      watchHistoryRef,
      where("uid", "==", uid),
      orderBy("watchedAt", "desc"),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const recentWatches = [];

    querySnapshot.forEach((doc) => {
      recentWatches.push(doc.data());
    });

    return {
      success: true,
      stats: {
        totalWatched: userData.stats.totalWatched,
        totalWatchTime: userData.stats.totalWatchTime,
        favoriteGenre: userData.stats.favoriteGenre,
        friendsCount: userData.friends.length,
        followersCount: userData.followers.length,
        recentWatches
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
