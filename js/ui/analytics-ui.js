/**
 * js/ui/analytics-ui.js
 * ANALYTICS UI CONTROLLER
 * Manages user analytics, statistics, and recommendation UI interactions
 */

import {
    getStatisticsDashboard,
    getActivityFeed,
    getTrendingMovies,
    getSmartRecommendations
} from "../firebase/analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class AnalyticsUIController {
    constructor() {
        this.userStats = null;
        this.currentTab = 'feed';
    }

    async init() {
        console.log("Analytics UI Ready");
        const auth = getAuth();
        auth.onAuthStateChanged(user => {
            if (user) {
                // Pre-load stats so they are ready when tab clicked
                this.loadUserStats();
            }
        });
    }

    switchTab(tabName) {
        // UI Toggling
        document.querySelectorAll('.analytics-tab-btn').forEach(btn => btn.classList.remove('active'));
        if (event && event.currentTarget) event.currentTarget.classList.add('active');

        document.querySelectorAll('.analytics-tab-content').forEach(content => content.style.display = 'none');
        const target = document.getElementById(`tab-${tabName}`);
        if (target) {
            target.style.display = 'block';
            if (window.gsap) gsap.fromTo(target, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.2 });
        }

        this.currentTab = tabName;

        // Data Loading
        if (tabName === 'trending') this.loadTrending();
        if (tabName === 'feed') this.loadActivityFeed();
        if (tabName === 'stats') this.loadUserStats();
        if (tabName === 'recommendations') this.loadRecommendations();
    }

    /* =========================================
       1. RECOMMENDATIONS (Smart Fallback)
       ========================================= */
    async loadRecommendations() {
        const container = document.getElementById('recommendationsList');
        const headerSubtitle = document.querySelector('.recommendations-header .subtitle');

        // CHECK API AVAILABILITY
        if (!window.api) {
            console.error("CRITICAL: window.api is undefined. Add 'window.api = api;' to index.html");
            container.innerHTML = '<div class="empty-state"><p>System Error: API not linked.</p></div>';
            return;
        }

        // Don't reload if already populated
        if (container.children.length > 1) return;

        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Analyzing your taste...</div>';

        try {
            const uid = getAuth().currentUser?.uid;
            if (!uid) return;

            const result = await getSmartRecommendations(uid);
            let recommendedMovies = [];

            // STRATEGY: Personalized -> Similar -> Trending
            if (result.success && result.isPersonalized && result.seed) {
                const seed = result.seed;
                const type = seed.media_type || (seed.title ? 'movie' : 'tv');

                headerSubtitle.innerText = `Because you watched "${seed.title || seed.name}"`;

                // Try Recommendations
                let res = await window.api.get(`/${type}/${seed.id}/recommendations`);

                // Try Similar if empty
                if (!res?.results?.length) {
                    res = await window.api.get(`/${type}/${seed.id}/similar`);
                }

                // Try Genre Trending if still empty
                if (!res?.results?.length) {
                    headerSubtitle.innerText = `Popular ${type === 'tv' ? 'TV Shows' : 'Movies'} you might like`;
                    res = await window.api.get(`/trending/${type}/week`);
                }

                recommendedMovies = res?.results || [];
            }

            // FINAL FALLBACK: Global Trending
            if (!recommendedMovies.length) {
                headerSubtitle.innerText = "Top picks for you";
                const res = await window.api.get('/trending/all/day');
                recommendedMovies = res?.results || [];
            }

            container.innerHTML = '';
            if (recommendedMovies.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No recommendations found.</p></div>';
                return;
            }

            const template = document.getElementById('movieCardTemplate');
            recommendedMovies.forEach(m => {
                if (!m.poster_path) return;
                const clone = template.content.cloneNode(true);
                clone.querySelector('.movie-poster-small').src = `https://image.tmdb.org/t/p/w200${m.poster_path}`;
                clone.querySelector('.movie-title-small').innerText = m.title || m.name;
                const rating = m.vote_average ? m.vote_average.toFixed(1) : 'N/A';
                clone.querySelector('.movie-rating-small').innerHTML = `⭐ ${rating}`;

                clone.querySelector('button').onclick = () => {
                    // This calls the analytics-ui version of watchMovie, which might be incomplete
                    // OR it might be calling a global function if not scoped correctly.

                    // CHANGE THIS TO:
                    if (window.watchPartyUI) {
                        // Find the button element again inside the clone to pass it
                        const btn = clone.querySelector('button');
                        window.watchPartyUI.watchMovie(btn);
                    }
                };
                container.appendChild(clone);
            });

            // Animation
            if (window.gsap) {
                gsap.from(container.children, { y: 20, opacity: 0, stagger: 0.05, duration: 0.4 });
            }

        } catch (error) {
            console.error("Recs Error:", error);
            container.innerHTML = '<div class="empty-state">Service unavailable.</div>';
        }
    }

    /* =========================================
       2. STATISTICS DASHBOARD
       ========================================= */

    async loadUserStats() {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;

        try {
            const res = await getStatisticsDashboard(uid);
            if (res.success) {
                this.userStats = res.stats;
                this.renderUserStats();
            }
        } catch (e) { console.error("Stats Error", e); }
    }

    renderUserStats() {
        if (!this.userStats) return;

        // 1. Text Stats
        document.getElementById('statTotalWatched').innerText = this.userStats.totalWatched || 0;
        document.getElementById('statWatchTime').innerText = (this.userStats.totalWatchTime / 60).toFixed(1);

        const avg = this.userStats.averageRating || 0;
        document.getElementById('statAvgRating').innerText = avg.toFixed(1);

        const streakEl = document.getElementById('statStreak');
        if (streakEl) streakEl.innerText = this.userStats.totalFavorites || 0;

        // 2. Recent History
        const recentContainer = document.getElementById('recentMovies');
        if (recentContainer) {
            recentContainer.innerHTML = '';
            const history = this.userStats.recentWatches || [];
            if (history.length === 0) {
                recentContainer.innerHTML = '<div class="empty-state">No history.</div>';
            } else {
                history.forEach(m => {
                    if (m.poster_path) {
                        const img = document.createElement('img');
                        img.src = `https://image.tmdb.org/t/p/w200${m.poster_path}`;
                        img.style.cssText = "width:60px; height:90px; border-radius:4px; margin-right:10px; object-fit:cover; border:1px solid rgba(255,255,255,0.1); cursor:pointer;";
                        img.title = m.title || m.name;
                        // Optional: Click to play recent
                        img.onclick = () => { if (window.player) window.player.open(m, m.season, m.episode); };
                        recentContainer.appendChild(img);
                    }
                });
            }
        }

        // 3. Rating Bars
        this.renderRatingsSummary(this.userStats.ratingDistribution || {});
    }

    renderRatingsSummary(distribution) {
        const container = document.getElementById('ratingsSummary');
        if (!container) return;
        container.innerHTML = '';

        const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

        for (let i = 5; i >= 1; i--) {
            const count = distribution[i] || 0;
            const percent = (count / total) * 100;
            const div = document.createElement('div');
            div.className = 'rating-item';
            div.innerHTML = `
            <span style="width:50px; font-size:12px; color:gray;">${i} Stars</span>
            <div class="rating-bar">
              <div class="rating-fill" style="width: ${percent}%; transition: width 1s ease;"></div>
            </div>
            <span style="font-size:10px; opacity:0.6; width:30px; text-align:right;">${count}</span>
          `;
            container.appendChild(div);
        }
    }

    /* =========================================
       3. ACTIVITY FEED
       ========================================= */

    async loadActivityFeed() {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;

        const container = document.getElementById('activityFeed');
        container.innerHTML = '<div class="loading">Loading feed...</div>';

        try {
            const res = await getActivityFeed(uid);
            container.innerHTML = '';

            if (!res.feed || res.feed.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No recent activity.</p></div>';
                return;
            }

            const template = document.getElementById('activityItemTemplate');
            res.feed.forEach(item => {
                const clone = template.content.cloneNode(true);
                clone.querySelector('.activity-avatar').src = item.userPhoto || 'https://via.placeholder.com/50';
                clone.querySelector('.activity-user').innerText = item.userName || 'User';

                // Dynamic Action Text
                const actionSpan = clone.querySelector('.activity-action');
                if (item.type === 'rated') {
                    actionSpan.innerHTML = `rated <span style="color:#facc15">★ ${item.rating}</span>`;
                } else if (item.type === 'favorited') {
                    actionSpan.innerHTML = `favorited <i class="fas fa-heart" style="color:var(--accent)"></i>`;
                } else {
                    actionSpan.innerText = "watched";
                }

                clone.querySelector('.activity-movie').innerText = item.movieTitle || 'Movie';

                const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
                clone.querySelector('.activity-time').innerText = date.toLocaleDateString();

                // Remove default rating star from template if not needed
                const rBadge = clone.querySelector('.activity-rating');
                if (rBadge) rBadge.style.display = 'none';

                container.appendChild(clone);
            });
        } catch (e) {
            console.error("Feed Error:", e);
            container.innerHTML = '<div class="empty-state">Error loading feed.</div>';
        }
    }

    /* =========================================
       4. TRENDING MOVIES
       ========================================= */

    // --- NEW FILTER METHOD ---
    async filterTrending(period) {
        // Update Buttons
        const btns = document.querySelectorAll('.filter-pill');
        btns.forEach(b => b.classList.remove('active'));
        if (event) event.target.classList.add('active');

        this.loadTrending(period);
    }

    /* --- ADVANCED TRENDING LOADER --- */
    async loadTrending(period = 'week') {
        const podium = document.getElementById('trendingPodium');
        const list = document.getElementById('trendingListItems');

        // Show loading
        podium.innerHTML = '<div class="loading">Loading...</div>';
        list.innerHTML = '';

        try {
            let data = [];

            // 1. Get Data based on Filter
            if (period === 'week' && window.api) {
                // Use TMDB Trending for Week + Merge with Firebase Views
                const res = await window.api.get('/trending/all/week');
                data = res.results || [];
            } else if (window.api) {
                // Use TMDB Trending for Day
                const res = await window.api.get('/trending/all/day');
                data = res.results || [];
            }

            // Mock View Counts for demo (In production, merge with getGlobalRankings)
            // We add random view counts to TMDB data to make it look like internal data
            data = data.map(m => ({
                ...m,
                views: Math.floor(Math.random() * 5000) + 1000, // Simulated views
                trend: Math.random() > 0.5 ? 'up' : 'down'      // Simulated trend
            })).sort((a, b) => b.popularity - a.popularity); // Sort by popularity

            // Clear Loading
            podium.innerHTML = '';

            // 2. RENDER PODIUM (Top 3)
            const top3 = data.slice(0, 3);
            // Reorder for visual podium: [ #2, #1, #3 ]
            const visualOrder = [top3[1], top3[0], top3[2]];
            const ranks = [2, 1, 3]; // Corresponding ranks

            visualOrder.forEach((m, idx) => {
                if (!m) return;
                const rank = ranks[idx];
                const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '';

                const div = document.createElement('div');
                div.className = `podium-card rank-${rank}`;
                div.innerHTML = `
                <img src="${poster}" alt="${m.title}">
                <div class="podium-rank">${rank}</div>
            `;

                // Click to play
                div.onclick = () => {
                    const type = m.media_type || 'movie';
                    if (window.player) window.player.open(m, type === 'tv' ? 1 : null, 1);
                };

                podium.appendChild(div);
            });

            // 3. RENDER LIST (4-10)
            const rest = data.slice(3, 10);

            rest.forEach((m, idx) => {
                const rank = idx + 4;
                const poster = m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : '';
                const trendIcon = m.trend === 'up'
                    ? '<i class="fas fa-arrow-up" style="color:#10b981"></i>'
                    : '<i class="fas fa-arrow-down" style="color:#ef4444"></i>';

                const row = document.createElement('div');
                row.className = 'trend-item';
                row.innerHTML = `
                <div class="t-rank">${rank}</div>
                <div class="t-info">
                    <img src="${poster}" class="t-img">
                    <span class="t-title">${m.title || m.name}</span>
                </div>
                <div class="t-views">${m.views.toLocaleString()}</div>
                <div class="t-trend">${trendIcon}</div>
                <div>
                    <button class="btn-small" id="play-${rank}"><i class="fas fa-play"></i></button>
                </div>
            `;

                // Bind button
                row.querySelector(`#play-${rank}`).onclick = () => {
                    const type = m.media_type || 'movie';
                    if (window.player) window.player.open(m, type === 'tv' ? 1 : null, 1);
                };

                list.appendChild(row);
            });

            // Animation
            gsap.from('.podium-card', { y: 100, opacity: 0, stagger: 0.2, duration: 0.8, ease: "back.out(1.7)" });
            gsap.from('.trend-item', { x: -20, opacity: 0, stagger: 0.05, duration: 0.5, delay: 0.5 });

        } catch (e) {
            console.error("Trending Error", e);
            list.innerHTML = '<div class="empty-state">Failed to load trending.</div>';
        }
    }
}