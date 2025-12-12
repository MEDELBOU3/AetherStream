/**
 * js/firebase/analytics.js
 * Backend logic for calculating stats and recommendations
 */

import { db } from "./config.js";
import { 
  doc, getDoc, collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * LOG ACTIVITY
 */
export const logActivity = async (uid, media, type, extraData = {}) => {
  try {
    await addDoc(collection(db, "activityFeed"), {
      userId: uid,
      userPhoto: extraData.userPhoto || null,
      userName: extraData.userName || "User",
      type: type,
      movieTitle: media.title || media.name,
      poster_path: media.poster_path,
      rating: extraData.rating || null,
      timestamp: serverTimestamp()
    });
  } catch (e) { console.error("Activity Log Error:", e); }
};

/**
 * GET STATS DASHBOARD
 */
export const getStatisticsDashboard = async (uid) => {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const history = userData.history || [];
        const favorites = userData.favorites || [];

        // Calculate Avg Rating
        const q = query(collection(db, "ratings"), where("uid", "==", uid));
        const ratingsSnap = await getDocs(q);
        
        let totalStars = 0;
        let ratedCount = 0;
        const distribution = { 1:0, 2:0, 3:0, 4:0, 5:0 };

        ratingsSnap.forEach(doc => {
            const r = doc.data().rating;
            if(r) {
                totalStars += r;
                ratedCount++;
                if(distribution[r] !== undefined) distribution[r]++;
            }
        });

        const avgRating = ratedCount > 0 ? (totalStars / ratedCount) : 0;

        // Calculate Watch Time
        let totalMinutes = 0;
        history.forEach(h => {
             totalMinutes += (h.media_type === 'movie' ? 120 : 45);
        });

        return {
            success: true,
            stats: {
                totalWatched: history.length,
                totalFavorites: favorites.length,
                totalWatchTime: totalMinutes,
                averageRating: avgRating,
                ratingDistribution: distribution,
                recentWatches: history.slice(-5).reverse()
            }
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * GET ACTIVITY FEED
 */
export const getActivityFeed = async (uid) => {
    const q = query(collection(db, "activityFeed"), orderBy("timestamp", "desc"), limit(20));
    const snap = await getDocs(q);
    const feed = [];
    snap.forEach(d => feed.push(d.data()));
    return { success: true, feed };
};

/**
 * GET TRENDING (For Analytics Tab)
 */
export const getTrendingMovies = async (limitCount=10) => {
     const q = query(collection(db, "global_stats"), orderBy("view_count", "desc"), limit(limitCount));
     const res = [];
     const snap = await getDocs(q);
     snap.forEach(d => res.push(d.data()));
     return { success: true, trending: res };
};

/**
 * GET SMART RECOMMENDATIONS (The Seed)
 */
export const getSmartRecommendations = async (uid) => {
    try {
        const userRef = doc(db, "users", uid);
        const snapshot = await getDoc(userRef);
        
        if (snapshot.exists()) {
            const data = snapshot.data();
            const history = data.history || [];
            
            if (history.length > 0) {
                // Return the last watched item as the seed
                const lastWatched = history[history.length - 1];
                return { 
                    success: true, 
                    seed: lastWatched, 
                    isPersonalized: true 
                };
            }
        }
        return { success: true, seed: null, isPersonalized: false };

    } catch (error) {
        console.error("Recs Error:", error);
        return { success: false, error: error.message };
    }
};