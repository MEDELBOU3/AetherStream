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
  }
  
  // Bridge methods
  async getUserDashboard(uid) {
      const p = await this.social.getUserProfile(uid);
      const s = await this.analytics.getStatisticsDashboard(uid);
      return { success: true, profile: p.profile, stats: s.stats, activeSessions: [], activityFeed: [] };
  }

  async getFriends(uid) { return await this.social.getFriendsList(uid); }
  async searchForUsers(q) { return await this.social.searchUsers(q); }
}



export const firebaseAPI = new FirebaseAPI();