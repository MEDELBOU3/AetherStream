/**
 * FIREBASE API MANAGER
 * Centralized management of all Firebase operations
 * Provides easy access to all social, session, and analytics features
 */

import * as Auth from "./auth.js";
import * as DB from "./db.js";
import * as Social from "./social.js";
import * as Sessions from "./sessions.js";
import * as Analytics from "./analytics.js";

class FirebaseAPI {
  constructor() {
    this.auth = Auth;
    this.db = DB;
    this.social = Social;
    this.sessions = Sessions;
    this.analytics = Analytics;
    this.cache = {};
  }

  /**
   * Initialize User on First Login
   */
  async initializeNewUser(user) {
    const profileResult = await this.social.createUserProfile(user, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    });

    return profileResult;
  }

  /**
   * Get Complete User Dashboard
   */
  async getUserDashboard(uid) {
    try {
      const [profileRes, statsRes, sessionsRes, feedRes] = await Promise.all([
        this.social.getUserProfile(uid),
        this.analytics.getStatisticsDashboard(uid),
        this.sessions.getActiveUserSessions(uid),
        this.analytics.getActivityFeed(uid)
      ]);

      return {
        success: true,
        profile: profileRes.profile,
        stats: statsRes.stats,
        activeSessions: sessionsRes.sessions,
        activityFeed: feedRes.feed
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Start Group Watch Session
   */
  async startGroupWatchSession(hostUid, movieData) {
    const sessionRes = await this.sessions.createViewingSession(hostUid, movieData);
    
    if (sessionRes.success) {
      // Log watch activity
      await this.analytics.logWatchActivity(hostUid, movieData, 0);
    }

    return sessionRes;
  }

  /**
   * Get Personalized Home Feed
   */
  async getPersonalizedFeed(uid) {
    try {
      const [trendingRes, recsRes, feedRes] = await Promise.all([
        this.analytics.getTrendingMovies(10),
        this.analytics.getSmartRecommendations(uid),
        this.analytics.getActivityFeed(uid)
      ]);

      return {
        success: true,
        trending: trendingRes.trending,
        recommendations: recsRes.recommendations,
        friendsActivity: feedRes.feed
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for Users
   */
  async searchForUsers(term) {
    return await this.social.searchUsers(term);
  }

  /**
   * Get Friends List
   */
  async getFriends(uid) {
    return await this.social.getFriendsList(uid);
  }

  /**
   * Send Friend Request
   */
  async addFriend(fromUid, toUid) {
    return await this.social.sendFriendRequest(fromUid, toUid);
  }

  /**
   * Accept Friend Request
   */
  async acceptFriendRequest(uid, fromUid) {
    return await this.social.acceptFriendRequest(uid, fromUid);
  }

  /**
   * Watch Movie and Track Activity
   */
  async watchMovie(uid, movieData, watchDuration) {
    return await this.analytics.logWatchActivity(uid, movieData, watchDuration);
  }

  /**
   * Rate and Review Movie
   */
  async rateMovie(uid, movieId, rating, review) {
    return await this.analytics.rateMovie(uid, movieId, rating, review);
  }

  /**
   * Get User's Watch History
   */
  async getWatchHistory(uid, limit = 20) {
    return await this.analytics.getUserWatchHistory(uid, limit);
  }

  /**
   * Join a Viewing Session
   */
  async joinSession(sessionId, uid) {
    return await this.sessions.joinViewingSession(sessionId, uid);
  }

  /**
   * Leave Viewing Session
   */
  async leaveSession(sessionId, uid) {
    return await this.sessions.leaveViewingSession(sessionId, uid);
  }

  /**
   * Send Chat Message in Session
   */
  async sendSessionChat(sessionId, uid, userName, message) {
    return await this.sessions.sendChatMessage(sessionId, uid, userName, message);
  }

  /**
   * Update Playback State (for synced watching)
   */
  async syncPlayback(sessionId, currentTime, isPlaying) {
    return await this.sessions.updatePlaybackState(sessionId, currentTime, isPlaying);
  }

  /**
   * Listen to Session Updates (Real-time)
   */
  listenToSession(sessionId, callback) {
    return this.sessions.listenToSessionUpdates(sessionId, callback);
  }

  /**
   * Update User Profile
   */
  async updateProfile(uid, updates) {
    return await this.social.updateUserProfile(uid, updates);
  }
}

// Export singleton instance
export const firebaseAPI = new FirebaseAPI();

// Also export class for custom instances if needed
export default FirebaseAPI;
