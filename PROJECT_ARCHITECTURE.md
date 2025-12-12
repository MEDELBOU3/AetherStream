# AetherStream - Complete Architecture & UML Documentation

## Project Overview
**AetherStream** is a desktop streaming application built with Electron that provides:
- Multi-provider streaming support (VidSrc, VidLink, etc.)
- Firebase-based authentication and data management
- Social features (friends, watch parties, activity feeds)
- Advanced player with customizable subtitles and quality settings
- Global analytics and watch history tracking
- User profiles with watchlists and recommendations

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AETHERSTREAM DESKTOP APP                             │
│                        (Electron + Firebase)                                │
└─────────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────────┐
                           │   Electron Main     │
                           │   Process (main.js) │
                           └──────────┬──────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
        ┌───────────▼────────┐  ┌────▼─────────┐  ┌──▼──────────────┐
        │  BrowserWindow     │  │   IPC        │  │  System Menu    │
        │  (1400x900 px)     │  │  Handler     │  │  (File, Edit)   │
        └────────────┬───────┘  └──────────────┘  └─────────────────┘
                     │
        ┌────────────▼──────────────┐
        │   preload.js              │
        │ (Security Bridge)         │
        └────────────┬──────────────┘
                     │
        ┌────────────▼──────────────────────────────────────────┐
        │            index.html (UI Layer)                      │
        │  ┌──────────────────────────────────────────────────┐ │
        │  │ CSS Framework (GSAP animations, Glassmorphism)  │ │
        │  │ - animations.css, base.css, components.css      │ │
        │  │ - layout.css, responsive.css, modals.css        │ │
        │  └──────────────────────────────────────────────────┘ │
        └────────────┬──────────────────────────────────────────┘
                     │
        ┌────────────▼────────────────────────────────────────┐
        │         JavaScript Application Layer (js/)          │
        │                                                       │
        │  ┌────────────────────────────────────────────────┐ │
        │  │  UI Controllers (js/ui/)                       │ │
        │  │  ├── actor-ui.js      (Actor profiles)         │ │
        │  │  ├── analytics-ui.js  (Stats dashboard)        │ │
        │  │  ├── oracle-ui.js     (Recommendations)        │ │
        │  │  ├── social-ui.js     (Social features)        │ │
        │  │  └── watch-party-ui.js(Synchronized viewing)   │ │
        │  └────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌────────────────────────────────────────────────┐ │
        │  │  Player Module (js/player/)                    │ │
        │  │  ├── engine.js        (Stream engine)          │ │
        │  │  ├── sources.js       (Provider configs)       │ │
        │  │  └── subtitles.js     (Subtitle handler)       │ │
        │  └────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌────────────────────────────────────────────────┐ │
        │  │  Firebase Module (js/firebase/)                │ │
        │  │  ├── config.js        (Firebase init)          │ │
        │  │  ├── auth.js          (Authentication)         │ │
        │  │  ├── db.js            (Firestore ops)          │ │
        │  │  ├── social.js        (Social operations)      │ │
        │  │  ├── sessions.js      (Watch party)            │ │
        │  │  ├── analytics.js     (Stats & tracking)       │ │
        │  │  ├── api.js           (API wrapper)            │ │
        │  │  └── [External APIs]                           │ │
        │  │      ├── TMDB (movie/tv data)                  │ │
        │  │      └── IMDB (external IDs)                   │ │
        │  └────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌────────────────────────────────────────────────┐ │
        │  │  Components (js/components/)                   │ │
        │  │  └── SocialDashboard.js                        │ │
        │  └────────────────────────────────────────────────┘ │
        └────────────┬────────────────────────────────────────┘
                     │
                     │
        ┌────────────▼──────────────────────────────────────┐
        │        Firebase Realtime Backend                  │
        │                                                    │
        │  ┌────────────────────────────────────────────┐  │
        │  │  Authentication                            │  │
        │  │  ├── Email/Password                        │  │
        │  │  └── Google OAuth                          │  │
        │  └────────────────────────────────────────────┘  │
        │                                                    │
        │  ┌────────────────────────────────────────────┐  │
        │  │  Firestore Database                        │  │
        │  │  ├── /users/{uid}        (User profiles)   │  │
        │  │  ├── /global_stats       (Global rankings) │  │
        │  │  ├── /viewingSessions    (Watch parties)   │  │
        │  │  ├── /ratings            (User ratings)    │  │
        │  │  └── /activityFeed       (Activities)      │  │
        │  └────────────────────────────────────────────┘  │
        │                                                    │
        └────────────────────────────────────────────────────┘
```

---

## Class Hierarchy & Component Relationships

### 1. Authentication & User Management

```
┌─────────────────────────────────────────────┐
│         AUTH MODULE (auth.js)               │
├─────────────────────────────────────────────┤
│ Functions:                                  │
│ • loginEmail(email, password)               │
│ • registerEmail(email, password, name)      │
│ • loginGoogle()                             │
│ • logoutUser()                              │
│ • initAuthObserver(onLogin, onLogout)       │
├─────────────────────────────────────────────┤
│ Returns: {success, user, error}             │
│ Uses: Firebase Auth                         │
└─────────────────────────────────────────────┘
            │
            │ Calls
            ▼
┌─────────────────────────────────────────────┐
│      SOCIAL MODULE (social.js)              │
├─────────────────────────────────────────────┤
│ User Profile Management:                    │
│ • getUserProfile(uid)                       │
│ • updateUserProfile(uid, data)              │
│ • searchUsers(term)                         │
│                                             │
│ Friend System:                              │
│ • sendFriendRequest(fromUid, toUid)         │
│ • getFriendRequestsList(uid)                │
│ • acceptFriendRequest(myUid, friendUid)     │
│ • rejectFriendRequest(myUid, fromUid)       │
│                                             │
│ Friend Operations:                          │
│ • getFriendsList(uid)                       │
│ • removeFriend(uid, friendUid)              │
│ • blockUser(uid, blockedUid)                │
│ • getFollowersList(uid)                     │
│ • followUser(uid, followUid)                │
│ • unfollowUser(uid, unfollowUid)            │
└─────────────────────────────────────────────┘
```

### 2. Database & Data Management

```
┌──────────────────────────────────────────────────────────┐
│             DATABASE MODULE (db.js)                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Watchlist Management:                                    │
│ ├── addToCloudList(user, movie)                          │
│ ├── removeFromCloudList(user, movie)                     │
│ └── getUserData(user) → {watchlist, settings}            │
│                                                          │
│ Analytics & Global Rankings:                            │
│ ├── trackGlobalView(media)                              │
│ ├── getGlobalRankings(limitCount)                        │
│ └── [Updates global_stats collection]                    │
│                                                          │
│ Watch History:                                          │
│ ├── trackHistory(user, media, season, episode)          │
│ ├── getUserHistory(user)                                │
│ └── [Stores with watched_at timestamp]                   │
│                                                          │
│ User Settings:                                          │
│ └── saveUserSettings(user, settings)                     │
│                                                          │
│ Helper Functions:                                        │
│ └── ensureMediaImages(media)                             │
│     [Hydrates missing images from TMDB]                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
     │
     │ Integrates with
     ▼
┌──────────────────────────────────────────────────────────┐
│         ANALYTICS MODULE (analytics.js)                  │
├──────────────────────────────────────────────────────────┤
│ Activity Tracking:                                       │
│ • logActivity(uid, media, type, extraData)               │
│                                                          │
│ Statistics Dashboard:                                    │
│ • getStatisticsDashboard(uid)                            │
│   Returns: {                                             │
│     totalWatched,                                        │
│     totalFavorites,                                      │
│     totalWatchTime,                                      │
│     averageRating,                                       │
│     ratingDistribution,                                  │
│     recentWatches                                        │
│   }                                                      │
└──────────────────────────────────────────────────────────┘
```

### 3. Streaming Engine

```
┌──────────────────────────────────────────────────────────┐
│            STREAM ENGINE (engine.js)                     │
├──────────────────────────────────────────────────────────┤
│ Properties:                                              │
│ • currentProviderIndex: int                              │
│ • mediaData: MediaObject                                 │
│ • season: int | null                                     │
│ • episode: int | null                                    │
│ • config: {                                              │
│    autoplay: bool,                                       │
│    resolution: string,                                   │
│    hevc: bool,                                           │
│    lang: string,                                         │
│    subtitleUrl: string,                                  │
│    subSize: float,                                       │
│    subColor: string,                                     │
│    brightness: float,                                    │
│    zoom: float                                           │
│  }                                                       │
│                                                          │
│ Core Methods:                                            │
│ • init()                                                 │
│ • open(media, season, episode)                           │
│ • setProvider(index)                                     │
│ • loadSource()                                           │
│ • close()                                                │
│ • syncSettings()                                         │
│ • applyVisuals()                                         │
│                                                          │
│ UI Methods:                                              │
│ • setupInteractions()                                    │
│ • populateSettingsUI()                                   │
│ • togglePlayback()                                       │
│ • changeQuality(resolution)                              │
│ • loadSubtitles(url, lang)                               │
│                                                          │
│ Integrations:                                            │
│ ├── STREAMING_PROVIDERS array                            │
│ ├── Subtitle system                                      │
│ └── Firebase tracking                                    │
└──────────────────────────────────────────────────────────┘
     │
     │ Uses
     ▼
┌──────────────────────────────────────────────────────────┐
│           SOURCES MODULE (sources.js)                    │
├──────────────────────────────────────────────────────────┤
│ Streaming Providers:                                     │
│                                                          │
│ [1] VidSrc.su (Official)                                 │
│     └─ Format: vsrc.su/embed/{id}[/season/episode]       │
│                                                          │
│ [2] VidLink (Fast + Subs)                                │
│     └─ Format: vidlink.pro/{type}/{id}                   │
│                                                          │
│ [3] Additional Providers...                              │
│                                                          │
│ Each Provider Has:                                       │
│ • name: string                                           │
│ • logo: string (favicon URL)                             │
│ • urlFormat: function(id, type, season, episode, data)  │
│              → formatted URL with params                 │
│                                                          │
│ URL Construction Features:                               │
│ ├── IMDB ID priority (for movies)                        │
│ ├── TMDB ID fallback                                     │
│ ├── Query params (autoplay, language, etc.)              │
│ └── Color customization                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
     │
     │ Integrates with
     ▼
┌──────────────────────────────────────────────────────────┐
│         SUBTITLES MODULE (subtitles.js)                  │
├──────────────────────────────────────────────────────────┤
│ Subtitle Management:                                     │
│ • Load external subtitles                                │
│ • Parse subtitle formats (SRT, VTT, etc.)                │
│ • Apply styling (size, color, position)                  │
│ • Language selection                                     │
│ • Storage in player config                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4. Social & Session Management

```
┌──────────────────────────────────────────────────────────┐
│          SESSIONS MODULE (sessions.js)                   │
├──────────────────────────────────────────────────────────┤
│ Viewing Sessions (Watch Parties):                        │
│ • createViewingSession(hostUid, movie)                   │
│ • joinViewingSession(sessionId, uid)                     │
│ • leaveViewingSession(sessionId, uid)                    │
│ • sendChatMessage(sessionId, uid, name, msg)             │
│                                                          │
│ Playback Sync:                                           │
│ • updatePlaybackState(sessionId, state)                  │
│ • listenToSessionUpdates(sessionId, callback)            │
│                                                          │
│ Session Data Structure:                                  │
│ {                                                        │
│   host: string (uid),                                    │
│   movie: MediaObject,                                    │
│   participants: [uid, uid, ...],                         │
│   state: 'playing' | 'paused',                           │
│   time: number (seconds),                                │
│   chat: [{user, msg, time}, ...]                         │
│ }                                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
          │
          │ Displayed by
          ▼
┌──────────────────────────────────────────────────────────┐
│       SOCIAL DASHBOARD (SocialDashboard.js)              │
├──────────────────────────────────────────────────────────┤
│ Constructor:                                             │
│ • currentUser                                            │
│ • friends: []                                            │
│ • sessions: []                                           │
│                                                          │
│ Lifecycle Methods:                                       │
│ • init(user)                                             │
│ • loadDashboard()                                        │
│ • setupEventListeners()                                  │
│                                                          │
│ Render Methods:                                          │
│ • renderProfile(profile)                                 │
│ • renderStats(stats)                                     │
│ • renderActiveSessions(sessions)                         │
│ • renderActivityFeed(feed)                               │
│                                                          │
│ Displayed Data:                                          │
│ ├── User Profile Card                                    │
│ ├── Statistics Dashboard                                 │
│ ├── Active Watching Sessions                             │
│ └── Activity Feed                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5. UI Controllers

```
┌──────────────────────────────────────────────────────────┐
│           ACTOR UI CONTROLLER (actor-ui.js)              │
├──────────────────────────────────────────────────────────┤
│ Constructor:                                             │
│ • currentActor                                           │
│                                                          │
│ Methods:                                                 │
│ • init()                                                 │
│ • openActorProfile(personId)                             │
│ • resetUI()                                              │
│ • calculateAffinity(credits)                             │
│ • renderProfile(person)                                  │
│                                                          │
│ Features:                                                │
│ ├── Fetch actor credits from TMDB                        │
│ ├── Calculate user affinity (watched titles match)       │
│ ├── Generate affinity badges:                            │
│ │   └── "Super Fan", "Obsessed", etc.                    │
│ └── Display actor profile with watch history             │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│         ANALYTICS UI CONTROLLER (analytics-ui.js)        │
├──────────────────────────────────────────────────────────┤
│ Displays:                                                │
│ • Statistics Dashboard                                   │
│ • Watch Time Charts                                      │
│ • Rating Distributions                                   │
│ • Genre Preferences                                      │
│ • Viewing Patterns                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│          ORACLE UI CONTROLLER (oracle-ui.js)             │
├──────────────────────────────────────────────────────────┤
│ Recommendations Engine:                                  │
│ • AI-powered suggestions                                 │
│ • Based on watch history                                 │
│ • Genre analysis                                         │
│ • Actor affinity                                         │
│ • Social recommendations                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│           SOCIAL UI CONTROLLER (social-ui.js)            │
├──────────────────────────────────────────────────────────┤
│ Features:                                                │
│ • User search interface                                  │
│ • Friend request handling                                │
│ • Friend list display                                    │
│ • Profile editing                                        │
│ • Follow/Unfollow actions                                │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│        WATCH PARTY UI CONTROLLER (watch-party-ui.js)     │
├──────────────────────────────────────────────────────────┤
│ Features:                                                │
│ • Session creation                                       │
│ • Participant management                                 │
│ • Synchronized playback                                  │
│ • Chat interface                                         │
│ • User presence indicators                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Authentication Flow

```
USER
  │
  ├─ Email/Password ──────┐
  │                        │
  └─ Google OAuth ─────┬───┤
                       │   │
                       ▼   ▼
             ┌────────────────────┐
             │   auth.js          │
             │ loginEmail()       │
             │ loginGoogle()      │
             └────────┬───────────┘
                      │
                      ▼
             ┌────────────────────┐
             │  Firebase Auth     │
             └────────┬───────────┘
                      │
                      ▼
             ┌────────────────────┐
             │ Create User Doc    │
             │ /users/{uid}       │
             └────────┬───────────┘
                      │
                      ▼
             ┌────────────────────┐
             │ initAuthObserver   │
             │ Update UI          │
             └────────────────────┘
```

### Watch & Track Flow

```
USER PLAYS VIDEO
  │
  ├─ Selects Provider
  │  └─ StreamEngine.setProvider()
  │
  ├─ Opens Media
  │  └─ StreamEngine.open(media, season, episode)
  │
  ├─ Player Starts
  │  └─ Applies Config (quality, subtitles, etc.)
  │
  └─ Generates Stream URL
     └─ STREAMING_PROVIDERS.urlFormat()
        (VidSrc/VidLink/etc.)
              │
              ▼
        STREAMING PLATFORM
        (Iframe embedded)
              │
              ├─ Play starts
              │
              ▼ (On Play)
        trackGlobalView(media)
              │
              ├─ Hydrate images
              ├─ Update /global_stats
              └─ Increment view_count
              
              │ (On Complete/Exit)
              ▼
        trackHistory(user, media, season, episode)
              │
              ├─ Add to /users/{uid}/history
              └─ Log timestamp
              
              │
              ▼
        logActivity(uid, media, 'watched')
              │
              └─ Record in /activityFeed
```

### Social Interaction Flow

```
USER A
  │
  ├─ Searches User B
  │  └─ social.searchUsers(term)
  │     └─ Firebase query /users
  │
  ├─ Sends Friend Request
  │  └─ social.sendFriendRequest(uidA, uidB)
  │     └─ Creates /users/{uidB}/friendRequests/{uidA}
  │
  └─ Shares Watch Party
     └─ sessions.createViewingSession(uidA, movie)
        └─ Creates /viewingSessions/{sessionId}

USER B (Recipient)
  │
  ├─ Receives Notification
  │  └─ Listen to /users/{uidB}/friendRequests
  │
  ├─ Accepts Friend Request
  │  └─ social.acceptFriendRequest(uidB, uidA)
  │     ├─ Updates /users/{uidB}/friends = [uidA, ...]
  │     ├─ Updates /users/{uidB}/following = [uidA, ...]
  │     ├─ Updates /users/{uidA}/friends = [uidB, ...]
  │     └─ Deletes friend request
  │
  └─ Joins Watch Party
     └─ sessions.joinViewingSession(sessionId, uidB)
        ├─ Adds to participants array
        ├─ Syncs playback state
        └─ Receives chat messages
```

---

## Firestore Database Schema

```
FIRESTORE DATABASE
│
├─ /users/{uid}
│  ├─ displayName: string
│  ├─ email: string
│  ├─ photoURL: string
│  ├─ bio: string
│  ├─ watchlist: [
│  │    {
│  │      id, title, poster_path, backdrop_path,
│  │      media_type, vote_average, release_date
│  │    }
│  │  ]
│  ├─ history: [
│  │    {
│  │      id, title, media_type, season, episode,
│  │      watched_at: timestamp
│  │    }
│  │  ]
│  ├─ favorites: [media objects]
│  ├─ friends: [uid, uid, ...]
│  ├─ followers: [uid, uid, ...]
│  ├─ following: [uid, uid, ...]
│  ├─ blocked: [uid, uid, ...]
│  ├─ preferences: {
│  │    isPrivate: bool,
│  │    allowFriendRequests: bool
│  │  }
│  ├─ settings: {
│  │    theme, language, notifications
│  │  }
│  │
│  └─ /friendRequests/{fromUid}  [SUBCOLLECTION]
│     ├─ fromUid: string
│     ├─ fromName: string
│     ├─ fromPhoto: string
│     └─ timestamp: ISO string
│
├─ /global_stats/{mediaId}
│  ├─ id: number
│  ├─ title: string
│  ├─ poster_path: string
│  ├─ backdrop_path: string
│  ├─ media_type: string
│  ├─ view_count: number (incremented)
│  └─ last_watched: timestamp
│
├─ /viewingSessions/{sessionId}
│  ├─ host: uid
│  ├─ movie: MediaObject
│  ├─ participants: [uid, uid, ...]
│  ├─ state: 'playing' | 'paused'
│  ├─ time: number (current playback seconds)
│  └─ chat: [
│       {
│         user: name,
│         msg: string,
│         time: timestamp
│       }
│     ]
│
├─ /ratings/{ratingId}
│  ├─ uid: string
│  ├─ mediaId: number
│  ├─ rating: 1-5 (stars)
│  └─ timestamp: ISO string
│
├─ /activityFeed/{activityId}
│  ├─ userId: uid
│  ├─ userPhoto: string
│  ├─ userName: string
│  ├─ type: 'watched' | 'rated' | 'shared'
│  ├─ movieTitle: string
│  ├─ poster_path: string
│  ├─ rating: number
│  └─ timestamp: serverTimestamp
│
└─ /recommendations/{userId}
   ├─ suggestions: [MediaObject, ...]
   ├─ lastUpdated: timestamp
   └─ algorithm: 'collaborative' | 'content'
```

---

## External API Integrations

```
┌──────────────────────────────────────────────┐
│     EXTERNAL API INTEGRATIONS                │
└──────────────────────────────────────────────┘

1. TMDB API (The Movie Database)
   ├─ Endpoint: https://api.themoviedb.org/3
   ├─ API Key: 31280d77499208623732d77823eabcb4
   │
   └─ Used by:
      ├─ /search/movie (search)
      ├─ /search/tv
      ├─ /movie/{id} (details + images)
      ├─ /tv/{id}
      ├─ /person/{id} (actor profiles)
      ├─ /person/{id}/combined_credits (filmography)
      └─ Hydration of missing images

2. IMDB Integration
   └─ External IDs through TMDB
      └─ Format: tt{xxxxxx}
         └─ Used by VidSrc provider

3. STREAMING PROVIDERS
   ├─ VidSrc.su (Official)
   │  └─ Embed format: vsrc.su/embed/{id}[/season/episode]
   │
   └─ VidLink
      └─ Embed format: vidlink.pro/{type}/{id}

4. FONTS & ASSETS
   ├─ Google Fonts (Manrope, Playfair Display)
   ├─ FontAwesome Icons
   ├─ Boxicons
   └─ GSAP Animation Library
```

---

## Module Dependencies Graph

```
main.js (Electron Main)
    │
    ├─── preload.js (IPC Bridge)
    │       │
    │       └─── index.html
    │             │
    │             ├─── css/ (styling)
    │             │
    │             └─── js/
    │                   │
    │                   ├─── firebase/
    │                   │     ├─── config.js
    │                   │     │     ├─ auth.js
    │                   │     │     ├─ db.js
    │                   │     │     ├─ social.js
    │                   │     │     ├─ sessions.js
    │                   │     │     ├─ analytics.js
    │                   │     │     ├─ api.js ◄─── [API Wrapper]
    │                   │     │     └─ [TMDB, Firebase SDKs]
    │                   │     │
    │                   ├─── player/
    │                   │     ├─── engine.js ◄──────┐
    │                   │     │     ├─ sources.js   │
    │                   │     │     └─ subtitles.js │
    │                   │     └─ [STREAMING PROVIDERS]
    │                   │
    │                   ├─── ui/
    │                   │     ├─── actor-ui.js ─────┐
    │                   │     ├─── analytics-ui.js  ├─ [Firebase API]
    │                   │     ├─── oracle-ui.js     │
    │                   │     ├─── social-ui.js ────┤
    │                   │     └─── watch-party-ui.js┘
    │                   │
    │                   └─── components/
    │                         └─── SocialDashboard.js
    │
    └─── Database (Firebase Cloud)
          ├─ Authentication
          ├─ Firestore
          └─ Realtime Updates
```

---

## Component Interaction Matrix

```
┌────────────────────┬──────────────────────────────────────────────────┐
│   Component        │   Interacts With                                 │
├────────────────────┼──────────────────────────────────────────────────┤
│ StreamEngine       │ Sources, Subtitles, DB (tracking)                │
├────────────────────┼──────────────────────────────────────────────────┤
│ Auth              │ Firebase Auth, Social (on login)                  │
├────────────────────┼──────────────────────────────────────────────────┤
│ DB (Firestore)    │ All modules (central data hub)                    │
├────────────────────┼──────────────────────────────────────────────────┤
│ Social            │ Auth, DB, Sessions, API                           │
├────────────────────┼──────────────────────────────────────────────────┤
│ Sessions          │ Social, DB, Chat (watch parties)                  │
├────────────────────┼──────────────────────────────────────────────────┤
│ Analytics         │ DB, Activity Logging                              │
├────────────────────┼──────────────────────────────────────────────────┤
│ ActorUI           │ DB (user history), API (TMDB)                     │
├────────────────────┼──────────────────────────────────────────────────┤
│ SocialDashboard   │ API Wrapper, Social, Analytics                    │
├────────────────────┼──────────────────────────────────────────────────┤
│ API Wrapper       │ All Firebase modules, TMDB                        │
├────────────────────┼──────────────────────────────────────────────────┤
│ UI Controllers    │ DOM, Components, Firebase modules                 │
└────────────────────┴──────────────────────────────────────────────────┘
```

---

## Key Features & Implementation

### 1. **Multi-Provider Streaming**
   - **Mechanism**: URL formatting based on provider templates
   - **Providers**: VidSrc (IMDB-based), VidLink, and extensible
   - **Quality Control**: Resolution selection, HEVC support
   - **Implementation**: `sources.js` with provider-specific URL builders

### 2. **Firebase Integration**
   - **Authentication**: Email/Password + Google OAuth
   - **Firestore**: Real-time document database for users, sessions, stats
   - **Features**: Subcollections for friend requests, activity logs
   - **Sync**: Real-time listeners for watch parties and activity feeds

### 3. **Advanced Player Controls**
   - **Subtitles**: Language selection, size/color customization
   - **Playback**: Resolution, autoplay, brightness, zoom
   - **UI**: GSAP-powered animations, hide controls on idle
   - **Storage**: localStorage persistence of settings

### 4. **Social Networking**
   - **Friends**: Request system with accept/reject
   - **Follow System**: Follow/Unfollow with mutual following
   - **Watch Parties**: Synchronized viewing with chat
   - **Profiles**: User bios, public profiles, privacy settings

### 5. **Analytics & Rankings**
   - **Global Stats**: Track most-watched content platform-wide
   - **User Stats**: Watch time, favorite genres, ratings distribution
   - **Activity Feeds**: Social activity log with timestamps
   - **Recommendations**: Based on watch history and social network

### 6. **Actor Intelligence**
   - **Affinity Calculation**: Match user watch history with actor filmography
   - **Dynamic Badges**: "Fan", "Super Fan", "Obsessed" based on overlap
   - **Actor Profiles**: Full filmography and credits display

---

## Technology Stack

```
FRONTEND
├─ HTML5
├─ CSS3 (Glassmorphism, GSAP Animations)
├─ JavaScript (ES6+)
├─ GSAP (Animation library)
└─ Font libraries (Google Fonts, FontAwesome)

DESKTOP FRAMEWORK
├─ Electron (main.js, preload.js)
└─ Node.js APIs (IPC, File system)

BACKEND & DATABASE
├─ Firebase Authentication
├─ Firestore (NoSQL database)
├─ Real-time listeners
└─ Server timestamps

EXTERNAL APIs
├─ TMDB API (movie/tv data)
├─ Streaming Providers (iframes)
└─ OAuth 2.0 (Google)

BUILD TOOLS
├─ electron-builder (packaging)
├─ npm (package management)
└─ Electron-reloader (dev mode)
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│              SECURITY LAYERS                            │
└─────────────────────────────────────────────────────────┘

1. PRELOAD BRIDGE (preload.js)
   ├─ Context Isolation: true
   ├─ Node Integration: false
   ├─ Sandbox: true
   └─ → Prevents renderer process from accessing system APIs

2. FIREBASE SECURITY RULES
   ├─ Authentication: Required for user data access
   ├─ User Collections: Can only read/write own data
   ├─ Friend Requests: Subcollection write rules
   └─ → Prevents unauthorized access

3. IPC HANDLERS (main.js)
   ├─ Limited message handlers
   ├─ No arbitrary code execution
   └─ → Controls Electron process access

4. HTTPS ONLY
   ├─ TMDB API: HTTPS
   ├─ Firebase: HTTPS
   └─ → Encrypts data in transit

5. API KEY STORAGE
   ├─ Firebase config: In app (public)
   ├─ TMDB Key: In app (rate-limited)
   └─ → Security through rate limiting & Firebase rules
```

---

## Deployment Pipeline

```
Development
    │
    ├─ npm start
    │  └─ electron-reloader + dev mode
    │
    ├─ Testing
    │
    └─ Build Phase
        │
        ├─ npm run build
        │  └─ electron-builder
        │
        ├─ Platform Builds:
        │  ├─ Windows: .exe (NSIS installer) + Portable
        │  ├─ macOS: .dmg (distributable)
        │  └─ Linux: .AppImage / deb
        │
        └─ Release Assets
           ├─ Executable installers
           ├─ Portable versions
           └─ Auto-update manifests
```

---

## Performance Considerations

```
┌──────────────────────────────────────────────────────┐
│  OPTIMIZATION STRATEGIES                             │
└──────────────────────────────────────────────────────┘

1. IMAGE OPTIMIZATION
   ├─ TMDB poster/backdrop: Lazy loading
   ├─ Caching: Browser cache + localStorage
   └─ Hydration: On-demand image fetching from TMDB

2. FIRESTORE OPTIMIZATION
   ├─ Batch writes: Multiple updates in single transaction
   ├─ Incremental counters: For view counts
   ├─ Pagination: Limit 50 results per query
   └─ Subcollections: Organized data hierarchy

3. PLAYER OPTIMIZATION
   ├─ Provider iframe: Offloaded to streaming service
   ├─ Subtitle streaming: External URL handling
   ├─ Quality selection: User control over bandwidth
   └─ Idle detection: Auto-hide controls to save rendering

4. UI OPTIMIZATION
   ├─ GSAP: GPU-accelerated animations
   ├─ CSS Grid/Flexbox: Responsive layouts
   ├─ localStorage: Persistent user settings
   └─ Debouncing: Reduced event handler calls

5. NETWORK OPTIMIZATION
   ├─ CDN: TMDB, streaming providers
   ├─ Caching: HTTP cache headers
   └─ Lazy loading: Deferred data fetching
```

---

## Future Extensibility

```
┌──────────────────────────────────────────────────────┐
│  PLANNED EXTENSIONS                                  │
└──────────────────────────────────────────────────────┘

1. Additional Streaming Providers
   ├─ HiAnime
   ├─ Goku
   └─ More providers in STREAMING_PROVIDERS array

2. Advanced Recommendations
   ├─ ML-based collaborative filtering
   ├─ Trending content algorithms
   └─ Genre-based suggestions

3. Enhanced Social Features
   ├─ Direct messaging
   ├─ User reviews & ratings
   ├─ Watch list sharing
   └─ Social notifications

4. Mobile App
   ├─ React Native / Flutter
   ├─ Firebase sync
   └─ Cloud watchlist

5. Reporting & Moderation
   ├─ Content moderation
   ├─ User reporting
   └─ Admin dashboard

6. Analytics Dashboard
   ├─ User engagement metrics
   ├─ Trending content
   └─ Provider performance stats
```

---

## Error Handling & Logging

```
TRY-CATCH PATTERN IMPLEMENTED IN:
├─ Auth Module
│  └─ Returns {success: bool, error: string}
│
├─ DB Operations
│  └─ Handles missing images, network errors
│
├─ Stream Loading
│  └─ Falls back through providers
│
├─ Social Operations
│  └─ Validates data before operations
│
└─ UI Controllers
   └─ Graceful error display to user

LOGGING:
├─ Console.log: Development debug info
├─ Console.error: Critical errors
└─ Firebase Events: Activity tracking
```

---

## Summary

**AetherStream** is a sophisticated **cross-platform streaming desktop application** featuring:

✅ **Multi-provider streaming** with quality controls  
✅ **Firebase backend** for authentication and data persistence  
✅ **Social networking** with friend system and watch parties  
✅ **Advanced analytics** with global rankings  
✅ **Actor intelligence** with affinity calculations  
✅ **Responsive UI** with GSAP animations  
✅ **Real-time synchronization** for watch sessions  
✅ **Secure architecture** with Electron best practices  

The modular architecture enables easy addition of new providers, features, and integrations while maintaining security and performance standards.

---

**Created**: December 4, 2025  
**Project**: AetherStream - Ultimate Provider Edition  
**Architecture Version**: 1.0


#ifndef USER_H
#define USER_H

#include <string>
#include <ctime>
#include <memory>
#include <vector>
#include "UserProfile.h"
#include "UserRole.h"

namespace authentication {

// Forward declarations
class Media;
class DatabaseManager;

class User {
private:
    std::string userId;
    std::string email;
    std::string username;
    std::string passwordHash;
    UserRole role;
    std::tm createdAt;
    std::unique_ptr<UserProfile> profile;
    
public:
    User(const std::string& email, const std::string& username, const std::string& password);
    ~User();
    
    bool authenticate(const std::string& credentials) const;
    void updateProfile(std::unique_ptr<UserProfile> newProfile);
    std::vector<std::shared_ptr<Media>> getWatchlist() const;
    
    // Getters
    std::string getUserId() const { return userId; }
    std::string getEmail() const { return email; }
    std::string getUsername() const { return username; }
    UserRole getRole() const { return role; }
    UserProfile* getProfile() const { return profile.get(); }
    
    // Setters
    void setRole(UserRole newRole) { role = newRole; }
    void setUserId(const std::string& id) { userId = id; }
    
private:
    std::string hashPassword(const std::string& password) const;
};

} // namespace authentication

#endif // USER_H