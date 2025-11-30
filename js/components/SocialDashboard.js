/**
 * EXAMPLE: Social Dashboard Component
 * Shows how to use the advanced Firebase features
 */

class SocialDashboard {
  constructor() {
    this.currentUser = null;
    this.friends = [];
    this.sessions = [];
  }

  /**
   * Initialize Dashboard
   */
  async init(user) {
    this.currentUser = user;
    
    // Import the Firebase API
    const { firebaseAPI } = await import("./js/firebase/api.js");
    this.firebase = firebaseAPI;
    
    // Load all data
    await this.loadDashboard();
    await this.setupEventListeners();
  }

  /**
   * Load Complete Dashboard
   */
  async loadDashboard() {
    const dashboard = await this.firebase.getUserDashboard(this.currentUser.uid);
    
    if (dashboard.success) {
      this.renderProfile(dashboard.profile);
      this.renderStats(dashboard.stats);
      this.renderActiveSessions(dashboard.activeSessions);
      this.renderActivityFeed(dashboard.activityFeed);
    }
  }

  /**
   * Render User Profile
   */
  renderProfile(profile) {
    const html = `
      <div class="profile-card">
        <img src="${profile.photoURL}" alt="${profile.displayName}" class="avatar">
        <h2>${profile.displayName}</h2>
        <p>${profile.bio}</p>
        <div class="profile-stats">
          <div class="stat">
            <strong>${profile.friends.length}</strong>
            <span>Friends</span>
          </div>
          <div class="stat">
            <strong>${profile.followers.length}</strong>
            <span>Followers</span>
          </div>
          <div class="stat">
            <strong>${profile.following.length}</strong>
            <span>Following</span>
          </div>
        </div>
        <button class="btn" onclick="editProfile()">Edit Profile</button>
      </div>
    `;
    document.getElementById("profileContainer").innerHTML = html;
  }

  /**
   * Render Statistics
   */
  renderStats(stats) {
    const html = `
      <div class="stats-dashboard">
        <div class="stat-card">
          <h3>Movies Watched</h3>
          <p class="stat-value">${stats.totalWatched}</p>
        </div>
        <div class="stat-card">
          <h3>Total Watch Time</h3>
          <p class="stat-value">${Math.floor(stats.totalWatchTime / 60)}h</p>
        </div>
        <div class="stat-card">
          <h3>Favorite Genre</h3>
          <p class="stat-value">${stats.favoriteGenre}</p>
        </div>
        <div class="stat-card">
          <h3>Friends</h3>
          <p class="stat-value">${stats.friendsCount}</p>
        </div>
      </div>
    `;
    document.getElementById("statsContainer").innerHTML = html;
  }

  /**
   * Render Active Watching Sessions
   */
  renderActiveSessions(sessions) {
    if (sessions.length === 0) {
      document.getElementById("sessionsContainer").innerHTML = 
        "<p>No active sessions. Start a watch party!</p>";
      return;
    }

    const html = sessions.map(session => `
      <div class="session-card">
        <img src="${session.movieData.thumbnail}" alt="${session.movieData.title}">
        <div class="session-info">
          <h3>${session.movieData.title}</h3>
          <p><strong>Watching with:</strong> ${session.participants.length} people</p>
          <p><strong>Current:</strong> ${this.formatTime(session.currentTime)}</p>
          <button class="btn btn-primary" onclick="joinSession('${session.id}')">
            Join Session
          </button>
        </div>
      </div>
    `).join("");

    document.getElementById("sessionsContainer").innerHTML = html;
  }

  /**
   * Render Activity Feed
   */
  renderActivityFeed(feed) {
    if (feed.length === 0) {
      document.getElementById("feedContainer").innerHTML = 
        "<p>No activity yet. Add friends to see their activities!</p>";
      return;
    }

    const html = feed.map(activity => `
      <div class="activity-item">
        <img src="${activity.movieData.thumbnail}" alt="" class="thumb">
        <div class="activity-content">
          <p>
            <strong>${activity.userName}</strong> watched 
            <strong>${activity.movieData.title}</strong>
            ${activity.rating ? `<span class="rating">★ ${activity.rating}</span>` : ""}
          </p>
          <small>${this.formatDate(activity.watchedAt)}</small>
          ${activity.review ? `<p class="review">"${activity.review}"</p>` : ""}
        </div>
      </div>
    `).join("");

    document.getElementById("feedContainer").innerHTML = html;
  }

  /**
   * Start Watch Party
   */
  async startWatchParty(movieData) {
    const result = await this.firebase.startGroupWatchSession(
      this.currentUser.uid, 
      movieData
    );

    if (result.success) {
      alert(`Watch party started! Session ID: ${result.sessionId}`);
      this.setupSessionListener(result.sessionId);
    }
  }

  /**
   * Setup Real-time Session Listener
   */
  setupSessionListener(sessionId) {
    const unsubscribe = this.firebase.listenToSession(sessionId, (data) => {
      if (data.success) {
        this.updateSessionUI(data.session);
      } else {
        console.log("Session ended:", data.error);
        unsubscribe();
      }
    });
  }

  /**
   * Update Session UI with Real-time Data
   */
  updateSessionUI(session) {
    // Sync video player
    if (window.videoPlayer) {
      window.videoPlayer.currentTime = session.currentTime;
      if (session.isPlaying && window.videoPlayer.paused) {
        window.videoPlayer.play();
      } else if (!session.isPlaying && !window.videoPlayer.paused) {
        window.videoPlayer.pause();
      }
    }

    // Update participants list
    document.getElementById("participants").innerHTML = 
      `Watching with: ${session.participants.length} people`;

    // Update chat
    this.updateChat(session.chat);
  }

  /**
   * Update Chat Messages
   */
  updateChat(messages) {
    const chatContainer = document.getElementById("chatMessages");
    if (!chatContainer) return;

    const html = messages.slice(-10).map(msg => `
      <div class="chat-message">
        <strong>${msg.userName}:</strong> ${msg.message}
      </div>
    `).join("");

    chatContainer.innerHTML = html;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  /**
   * Send Chat Message
   */
  async sendChatMessage(sessionId, message) {
    await this.firebase.sendSessionChat(
      sessionId,
      this.currentUser.uid,
      this.currentUser.displayName,
      message
    );
  }

  /**
   * Rate Movie
   */
  async rateMovie(movieId, rating, review) {
    const result = await this.firebase.rateMovie(
      this.currentUser.uid,
      movieId,
      rating,
      review
    );
    if (result.success) {
      alert("Movie rated successfully!");
    }
  }

  /**
   * Add Friend
   */
  async addFriend(friendUid) {
    const result = await this.firebase.addFriend(this.currentUser.uid, friendUid);
    if (result.success) {
      alert("Friend request sent!");
    }
  }

  /**
   * Search Users
   */
  async searchUsers(query) {
    const result = await this.firebase.searchForUsers(query);
    if (result.success) {
      this.displaySearchResults(result.users);
    }
  }

  /**
   * Display Search Results
   */
  displaySearchResults(users) {
    const html = users.map(user => `
      <div class="user-card">
        <img src="${user.photoURL}" alt="${user.displayName}" class="avatar-small">
        <div>
          <h4>${user.displayName}</h4>
          <p>${user.bio}</p>
          <button class="btn btn-small" onclick="dashboard.addFriend('${user.uid}')">
            Add Friend
          </button>
        </div>
      </div>
    `).join("");

    document.getElementById("searchResults").innerHTML = html;
  }

  /**
   * Get Recommendations
   */
  async getRecommendations() {
    const result = await this.firebase.analytics.getSmartRecommendations(
      this.currentUser.uid
    );

    if (result.success) {
      console.log("Top Genres:", result.recommendations.topGenres);
      console.log("Suggested Genres:", result.recommendations.suggestGenres);
      return result.recommendations;
    }
  }

  /**
   * Get Trending Movies
   */
  async getTrending() {
    const result = await this.firebase.analytics.getTrendingMovies(10);
    if (result.success) {
      return result.trending;
    }
  }

  /**
   * Setup Event Listeners
   */
  async setupEventListeners() {
    // Search box
    const searchBox = document.getElementById("searchBox");
    if (searchBox) {
      searchBox.addEventListener("keyup", (e) => {
        if (e.target.value.length > 2) {
          this.searchUsers(e.target.value);
        }
      });
    }

    // Chat input
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && e.target.value) {
          this.sendChatMessage(window.currentSessionId, e.target.value);
          e.target.value = "";
        }
      });
    }
  }

  /**
   * Utility: Format Time
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Utility: Format Date
   */
  formatDate(date) {
    if (!date) return "";
    const d = new Date(date.seconds * 1000);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  }
}

// Export for use
export const dashboard = new SocialDashboard();
