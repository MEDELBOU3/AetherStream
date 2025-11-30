# AetherStream Advanced Features Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     AETHERSTREAM DESKTOP APP                      │
│                        (Electron)                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │   Unified Firebase API Manager (api.js) │
        │  Single interface to all features       │
        └─────────────────────────────────────────┘
           ↓              ↓              ↓              ↓
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  Social  │  │ Sessions │  │Analytics │  │   Auth   │
    │  (social │  │(sessions)│  │(analytics)  │   (auth) │
    │   .js)   │  │  .js)    │  │  .js)    │  │  .js)    │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
           ↓              ↓              ↓              ↓
    ┌───────────────────────────────────────────────────────┐
    │          Firebase Firestore Database                  │
    │                                                       │
    │  ┌─────────┐  ┌──────────┐  ┌──────────┐ ┌────────┐ │
    │  │  users  │  │ watch    │  │ viewing  │ │ratings │ │
    │  │         │  │ history  │  │sessions  │ │        │ │
    │  └─────────┘  └──────────┘  └──────────┘ └────────┘ │
    │                                                       │
    └───────────────────────────────────────────────────────┘
           ↓              ↓              ↓              ↓
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Profiles │  │ Watch    │  │Real-time │  │Activity  │
    │ & Social │  │ History  │  │Sync      │  │ Feed     │
    │ Graph    │  │& Ratings │  │& Chat    │  │& Trends  │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## Feature Modules Interaction

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                              │
└──────────────────────────────────────────────────────────────────┘

1. SIGNUP & PROFILE
   User → Firebase Auth → Create Profile (social.js)
                        → User Collection created
                        → Initialized with default stats

2. SOCIAL DISCOVERY
   User → Search Users (social.js) → Find Friends
        → Send Friend Requests
        → Build Friends List

3. WATCH EXPERIENCE
   User → Browse Movies → Select Movie
        → Log Watch Activity (analytics.js)
        → Update Stats
        → Get Recommendations

4. WATCH PARTY (Advanced)
   User A → Create Session (sessions.js) → Share ID
   User B → Join Session (sessions.js)
   Users → Listen to Real-time Updates
        → Sync Playback (currentTime, isPlaying)
        → Exchange Chat Messages
        → Update Quality/Captions

5. SOCIAL INTERACTION
   User → See Friends' Activities (analytics.js)
       → Get Smart Recommendations
       → View Trending Movies
       → Rate & Review Movies

6. DASHBOARD
   User → View Complete Dashboard (api.js)
       → Statistics
       → Friend Requests
       → Active Sessions
       → Personalized Feed
```

---

## Data Flow: Watch Party (Real-time)

```
┌────────────────────────────────────────────────────────────┐
│              WATCH PARTY REAL-TIME DATA FLOW                │
└────────────────────────────────────────────────────────────┘

Host Device:
   Video Player → playback event → updatePlaybackState()
                                ↓
                         Firestore Update
                                ↓
Friend Device 1:        Friend Device 2:        Friend Device 3:
   Listener ←─ Firestore Snapshot ─→ Listener
   Sync Video           Sync Video              Sync Video
   Update UI            Update UI               Update UI
   
Chat System:
   User Types Message → sendChatMessage() → Firestore Add
                                         ↓
   All Devices ← Real-time Snapshot ← Update Chat UI
```

---

## Firebase Collections Diagram

```
FIRESTORE DATABASE STRUCTURE
────────────────────────────────────────────────

firestore-root/
│
├── users/ (collection)
│   ├── uid1/ (document)
│   │   ├── displayName: "John"
│   │   ├── email: "john@example.com"
│   │   ├── photoURL: "..."
│   │   ├── friends: [uid2, uid3]
│   │   ├── friendRequests: [{from: uid4, timestamp}]
│   │   ├── followers: [uid2, uid5]
│   │   ├── following: [uid3]
│   │   ├── stats: {totalWatched, totalWatchTime, favoriteGenre}
│   │   └── preferences: {isPrivate, showActivity, allowMessages}
│   │
│   ├── uid2/ (document)
│   │   └── ... (same structure)
│   │
│   └── uid3/ (document)
│       └── ... (same structure)
│
├── viewingSessions/ (collection)
│   ├── session1/ (document)
│   │   ├── hostUid: "uid1"
│   │   ├── movieData: {id, title, duration, ...}
│   │   ├── participants: [uid1, uid2, uid3]
│   │   ├── currentTime: 1234 (seconds)
│   │   ├── isPlaying: true
│   │   ├── quality: "720p"
│   │   ├── captions: "en"
│   │   ├── chat: [
│   │   │   {userUid: "uid1", userName: "John", message: "Wow!", timestamp}
│   │   │   {userUid: "uid2", userName: "Jane", message: "Amazing!", timestamp}
│   │   │ ]
│   │   └── settings: {allowParticipants, maxParticipants, syncPlayback}
│   │
│   └── session2/ (document)
│       └── ... (same structure)
│
├── watchHistory/ (collection)
│   ├── doc1/ (document)
│   │   ├── uid: "uid1"
│   │   ├── movieData: {id, title, ...}
│   │   ├── watchDuration: 7200 (seconds)
│   │   ├── watchedAt: timestamp
│   │   ├── rating: 5
│   │   ├── review: "Amazing movie!"
│   │   └── completed: true
│   │
│   └── doc2/ (document)
│       └── ... (same structure)
│
└── ratings/ (collection)
    ├── rating1/ (document)
    │   ├── uid: "uid1"
    │   ├── movieId: "movie123"
    │   ├── rating: 5
    │   ├── review: "Best movie ever"
    │   └── ratedAt: timestamp
    │
    └── rating2/ (document)
        └── ... (same structure)
```

---

## API Call Sequence Diagram

### Scenario: Starting a Watch Party

```
Timeline:
─────────────────────────────────────────────────────────────

T0: Host Creates Session
    Host: firebaseAPI.startGroupWatchSession(uid, movie)
                    ↓
    Backend: sessions.createViewingSession()
                    ↓
    Firestore: Insert viewingSessions/{id} document
                    ↓
    Response: {sessionId: "session123", ...}

T1: Friend Joins Session
    Friend: firebaseAPI.joinSession(sessionId, uid)
                    ↓
    Backend: sessions.joinViewingSession()
                    ↓
    Firestore: Update participants array
                    ↓
    Response: {success: true}

T2: Host Starts Playing
    Host: firebaseAPI.syncPlayback(sessionId, 0, true)
                    ↓
    Backend: sessions.updatePlaybackState()
                    ↓
    Firestore: Update currentTime=0, isPlaying=true
                    ↓
    Listeners: All connected clients get update

T3: Friend's Listener Receives Update
    Friend: firebaseAPI.listenToSession(sessionId, callback)
                    ↓
    Callback: Receives {currentTime: 0, isPlaying: true}
                    ↓
    UI: Sync video player to 0s and play

T4: Friend Sends Chat
    Friend: firebaseAPI.sendSessionChat(sessionId, uid, name, msg)
                    ↓
    Backend: sessions.sendChatMessage()
                    ↓
    Firestore: Add message to chat array
                    ↓
    Listeners: All clients get chat update

T5: Host Receives Chat Update
    Host: Listener callback fires
              ↓
    Displays: "Jane: This scene is amazing!"
```

---

## Performance & Scalability

```
┌────────────────────────────────────────────┐
│        PERFORMANCE METRICS                  │
└────────────────────────────────────────────┘

Real-time Sync Latency:
  Local Network:     50-200ms (excellent)
  Same City:         200-500ms (good)
  Different Country: 500-2000ms (acceptable)

Firestore Quotas:
  Free Tier:  1M reads/day, 1M writes/day
  Paid:       $0.06 per 100k reads
              $0.18 per 100k writes
              $0.01 per 100k deletes

Optimal Configuration:
  ✓ Max 10 participants per session
  ✓ Batch operations for multi-user updates
  ✓ Archive chat after 1 month
  ✓ Cleanup inactive sessions after 24h

Concurrent Connections:
  Development:  ~100 users
  Production:   ~10,000 users (with proper indexing)
```

---

## Security Flow

```
┌──────────────────────────────────────────────┐
│         SECURITY & AUTHORIZATION             │
└──────────────────────────────────────────────┘

1. Authentication
   User → Firebase Auth → JWT Token
   All requests include JWT

2. Authorization (Firestore Rules)
   Read users/:
     ✓ Authenticated users can read any public profile
     ✓ Only user can read their own private data
   
   Write users/:
     ✓ Only user themselves can write to their profile
   
   Read watchHistory/:
     ✓ Only user can read their own watch history
   
   Write viewingSessions/:
     ✓ Only participants can write to active session
     ✓ Anyone can create a new session
   
   Read ratings/:
     ✓ Anyone authenticated can read all ratings

3. Data Validation
   Client-side:   Prevent invalid data before sending
   Server-side:   Firestore rules enforce constraints
   Both:          Defense in depth approach
```

---

## Module Dependencies

```
api.js
├── auth.js       (Authentication)
├── db.js         (Basic DB operations)
├── social.js     (Social features)
│   └── Firestore: users collection
├── sessions.js   (Viewing sessions)
│   └── Firestore: viewingSessions collection
└── analytics.js  (Watch tracking)
    └── Firestore: watchHistory, ratings collections

Components:
├── SocialDashboard.js
│   └── Imports: api.js (all features)
│   └── Displays: User dashboard with all data
```

---

## Usage Flow Chart

```
START → User Opens App
          ↓
     Authenticate? → No → Show Login Screen
          ↓ Yes
     Load Profile
          ↓
     Show Home Dashboard
          ├─→ Recent Activity Feed
          ├─→ Trending Movies
          ├─→ Friend Recommendations
          └─→ Active Watch Parties
          ↓
     User Action
     ├─ Browse Movies
     │  └─→ Watch Movie → Log Activity → Get Recommendations
     │
     ├─ Start Watch Party
     │  └─→ Create Session → Share ID → Friends Join → Real-time Sync
     │
     ├─ Search Friends
     │  └─→ Find User → Send Request → Accept → Add to Friends
     │
     └─ View Profile
        └─→ Edit Profile → Update Preferences → Change Settings
```

---

## Future Enhancement Opportunities

```
Phase 2 Features:
├── Video Recommendations ML Model
├── Live Streaming Capabilities
├── Payment Integration
├── Social Hashtags & Trending
├── Advanced Search (Algolia)
├── Email Notifications
├── Push Notifications
├── User Profiles Badges
├── Achievement System
└── Recommendation Algorithm v2

Phase 3 Features:
├── Admin Dashboard
├── Moderation Tools
├── Analytics Dashboard
├── Revenue Reports
├── A/B Testing Framework
├── Multi-language Support
├── Dark Mode Theme
└── Accessibility Improvements
```

---

**Architecture Version:** 1.0  
**Status:** Production Ready ✅  
**Last Updated:** 2025-11-30
