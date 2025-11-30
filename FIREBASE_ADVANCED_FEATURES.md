# AetherStream Advanced Firebase Features Guide

## 🚀 Overview

This guide explains the advanced Firebase features that have been added to AetherStream:

1. **Social Network System** - Friends, followers, user profiles
2. **Real-time Viewing Sessions** - Watch together with synchronized playback
3. **Activity Feed & Analytics** - Track watch history, get recommendations
4. **Integrated API Manager** - Easy access to all features

---

## 📁 New Files Created

### Firebase Module Files:
- `js/firebase/social.js` - User profiles & social connections
- `js/firebase/sessions.js` - Real-time viewing sessions
- `js/firebase/analytics.js` - Watch history & recommendations
- `js/firebase/api.js` - Unified API manager

---

## 🎯 Features in Detail

### 1. Social Network System (`social.js`)

#### Create/Update User Profile
```javascript
import { firebaseAPI } from "./js/firebase/api.js";

const result = await firebaseAPI.updateProfile(uid, {
  bio: "Movie enthusiast!",
  preferences: {
    isPrivate: false,
    showActivity: true,
    allowMessages: true
  }
});
```

#### Send Friend Request
```javascript
await firebaseAPI.addFriend(currentUserUid, targetUserUid);
```

#### Accept Friend Request
```javascript
await firebaseAPI.acceptFriendRequest(currentUserUid, senderUid);
```

#### Get Friends List
```javascript
const { friends } = await firebaseAPI.getFriends(uid);
```

#### Search Users
```javascript
const { users } = await firebaseAPI.searchForUsers("john");
```

#### Follow User (without mutual friendship)
```javascript
await firebaseAPI.social.followUser(uid, targetUid);
```

#### Database Schema
```
users/
├── {uid}/
│   ├── displayName: string
│   ├── email: string
│   ├── photoURL: string
│   ├── bio: string
│   ├── friends: [uid1, uid2, ...]
│   ├── friendRequests: [{from: uid, timestamp}, ...]
│   ├── followers: [uid1, uid2, ...]
│   ├── following: [uid1, uid2, ...]
│   ├── stats: {totalWatched, totalWatchTime, favoriteGenre}
│   └── preferences: {isPrivate, showActivity, allowMessages}
```

---

### 2. Real-time Viewing Sessions (`sessions.js`)

#### Create a Viewing Session
```javascript
const { sessionId } = await firebaseAPI.startGroupWatchSession(uid, {
  id: "movie-123",
  title: "Movie Title",
  duration: 7200, // seconds
  thumbnail: "url...",
  genre: "Action"
});
```

#### Join a Session
```javascript
await firebaseAPI.joinSession(sessionId, uid);
```

#### Sync Playback (all participants see same timestamp)
```javascript
// Update every time user plays/pauses
await firebaseAPI.syncPlayback(sessionId, currentTime, isPlaying);
```

#### Send Chat Message
```javascript
await firebaseAPI.sendSessionChat(
  sessionId, 
  uid, 
  userName, 
  "This scene is amazing!"
);
```

#### Listen to Real-time Updates
```javascript
const unsubscribe = firebaseAPI.listenToSession(sessionId, (data) => {
  if (data.success) {
    console.log("Current time:", data.session.currentTime);
    console.log("Participants:", data.session.participants);
    console.log("Chat:", data.session.chat);
  }
});

// Call to stop listening
unsubscribe();
```

#### Update Video Quality
```javascript
await firebaseAPI.sessions.updateQualitySetting(sessionId, "720p");
```

#### Database Schema
```
viewingSessions/
├── {sessionId}/
│   ├── hostUid: string
│   ├── movieData: {id, title, duration, ...}
│   ├── participants: [uid1, uid2, ...]
│   ├── isActive: boolean
│   ├── currentTime: number (seconds)
│   ├── isPlaying: boolean
│   ├── quality: string ("auto", "1080p", "720p", "480p")
│   ├── captions: string ("off", "en", "es", ...)
│   ├── chat: [{userUid, userName, message, timestamp}, ...]
│   └── settings: {allowParticipants, maxParticipants, syncPlayback}
```

---

### 3. Activity Feed & Analytics (`analytics.js`)

#### Log Watch Activity
```javascript
await firebaseAPI.watchMovie(uid, movieData, watchDurationInSeconds);
```

#### Rate and Review
```javascript
await firebaseAPI.rateMovie(uid, "movie-123", 5, "Amazing movie!");
```

#### Get Watch History
```javascript
const { history } = await firebaseAPI.getWatchHistory(uid, 20);
// Returns: [{movieData, watchDuration, rating, review, watchedAt}, ...]
```

#### Get Activity Feed (Friends' Activities)
```javascript
const { feed } = await firebaseAPI.analytics.getActivityFeed(uid);
// Shows what your friends have been watching
```

#### Get Smart Recommendations
```javascript
const { recommendations } = await firebaseAPI.analytics.getSmartRecommendations(uid);
// Returns: {topGenres, suggestGenres, basedOn: [movies]}
```

#### Get Trending Movies
```javascript
const { trending } = await firebaseAPI.analytics.getTrendingMovies(10);
// Returns most watched movies across all users
```

#### Get Statistics Dashboard
```javascript
const { stats } = await firebaseAPI.analytics.getStatisticsDashboard(uid);
// Returns: {
//   totalWatched,
//   totalWatchTime (in minutes),
//   favoriteGenre,
//   friendsCount,
//   followersCount,
//   recentWatches
// }
```

#### Database Schema
```
watchHistory/
├── {docId}/
│   ├── uid: string
│   ├── movieData: {...}
│   ├── watchDuration: number
│   ├── watchedAt: timestamp
│   ├── rating: number (1-5)
│   ├── review: string
│   └── completed: boolean

ratings/
├── {docId}/
│   ├── uid: string
│   ├── movieId: string
│   ├── rating: number (1-5)
│   ├── review: string
│   └── ratedAt: timestamp
```

---

### 4. Unified API Manager (`api.js`)

Import and use:
```javascript
import { firebaseAPI } from "./js/firebase/api.js";

// Get complete user dashboard
const dashboard = await firebaseAPI.getUserDashboard(uid);
// Returns: {profile, stats, activeSessions, activityFeed}

// Get personalized home feed
const feed = await firebaseAPI.getPersonalizedFeed(uid);
// Returns: {trending, recommendations, friendsActivity}
```

---

## 💡 Implementation Examples

### Example 1: User Registration & Profile Setup
```javascript
import { firebaseAPI } from "./js/firebase/api.js";

async function handleNewUser(user) {
  const result = await firebaseAPI.initializeNewUser(user);
  if (result.success) {
    console.log("Profile created:", result.profile);
  }
}
```

### Example 2: Watch Together Feature
```javascript
// Host creates session
async function startWatchParty(movie) {
  const { sessionId } = await firebaseAPI.startGroupWatchSession(
    currentUser.uid, 
    movie
  );
  
  // Share sessionId with friends
  copyToClipboard(sessionId);
}

// Friends join session
async function joinWatchParty(sessionId) {
  await firebaseAPI.joinSession(sessionId, currentUser.uid);
  
  // Listen to updates
  const unsubscribe = firebaseAPI.listenToSession(sessionId, (data) => {
    if (data.success) {
      // Sync player with host's time
      player.currentTime = data.session.currentTime;
      player.playing = data.session.isPlaying;
      
      // Update chat
      updateChatMessages(data.session.chat);
    }
  });
}
```

### Example 3: Personalized Home Feed
```javascript
async function loadHomeFeed() {
  const feed = await firebaseAPI.getPersonalizedFeed(currentUser.uid);
  
  // Display trending movies
  renderTrendingSection(feed.trending);
  
  // Display recommendations
  renderRecommendationsSection(feed.recommendations);
  
  // Display friends' activities
  renderActivityFeedSection(feed.friendsActivity);
}
```

### Example 4: Social Features
```javascript
// Search for users
async function searchUsers(query) {
  const { users } = await firebaseAPI.searchForUsers(query);
  renderUserSearch(users);
}

// Add friend
async function addFriend(userId) {
  await firebaseAPI.addFriend(currentUser.uid, userId);
  showNotification("Friend request sent!");
}

// Get friends list
async function loadFriendsList() {
  const { friends } = await firebaseAPI.getFriends(currentUser.uid);
  renderFriendsList(friends);
}
```

---

## 🔧 Configuration & Setup

### Firestore Security Rules

Add these rules to your Firestore to ensure data privacy:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
      
      // Allow public profile viewing
      allow read: if resource.data.preferences.isPrivate == false;
    }
    
    // Watch History (private)
    match /watchHistory/{document=**} {
      allow read, write: if request.auth.uid == resource.data.uid;
    }
    
    // Viewing Sessions (collaborative)
    match /viewingSessions/{sessionId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow write: if request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
    }
    
    // Ratings (public)
    match /ratings/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.uid;
    }
  }
}
```

### Indexes Required

Create these Firestore indexes for optimal performance:

1. **watchHistory**: uid, watchedAt (descending)
2. **viewingSessions**: participants (array), isActive
3. **ratings**: movieId, ratedAt (descending)

---

## 📊 Data Flow Diagram

```
User Registration
      ↓
Create Profile (social.js)
      ↓
User Dashboard (api.js)
      ├─→ Friends List
      ├─→ Watch History
      ├─→ Recommendations
      └─→ Active Sessions

User Watches Movie
      ↓
Log Activity (analytics.js)
      ↓
Update Stats
      ↓
Appears in Friends' Feed

Friends Start Watch Party
      ↓
Create Session (sessions.js)
      ↓
Join Session
      ↓
Real-time Sync (Firestore listeners)
      ├─→ Playback Time
      ├─→ Chat Messages
      └─→ Participant List
```

---

## ⚡ Performance Tips

1. **Use Caching**: Cache user profiles and watch history locally
2. **Batch Operations**: Use `writeBatch()` for multiple updates
3. **Limit Queries**: Always use `.limit()` in queries
4. **Index Creation**: Create Firestore indexes for frequently queried fields
5. **Real-time Optimization**: Unsubscribe from listeners when not needed

---

## 🔐 Security Best Practices

1. Enable Firebase Authentication
2. Set strict Firestore security rules (included above)
3. Never expose Firebase API keys in client code
4. Validate all user inputs on the server
5. Use HTTPS only
6. Enable rate limiting on sensitive operations

---

## 🚀 Next Steps

1. Update your Firestore security rules
2. Create Firestore indexes
3. Integrate these modules into your UI components
4. Test each feature thoroughly
5. Monitor Firestore usage and optimize as needed

---

## 📞 Support & Documentation

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security)

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-30  
**Features:** Social Network, Real-time Sessions, Analytics
