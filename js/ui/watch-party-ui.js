/**
 * js/ui/watch-party-ui.js
 * FIXED: TV Shows, Source Switching, and Next Episode Support
 */

import { 
    createViewingSession, 
    joinViewingSession, 
    leaveViewingSession, 
    sendChatMessage,
    listenToSessionUpdates,
    updatePlaybackState,
    updateSessionMedia 
} from "../firebase/sessions.js"; 

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { STREAMING_PROVIDERS } from "../player/sources.js";

export class WatchPartyUIController {
   constructor() {
        this.sessionId = null;
        this.unsubscribe = null; 
        this.isHost = false;
        this.currentSessionData = null; 
        this.localProviderIndex = 0; 
        this.playerState = 'paused';
        
        // Caching for queue to prevent API spam
        this.loadedSeasonId = null;
    }

    async init(sessionId = null) {
        // Load preferred provider from local storage
        const savedIdx = localStorage.getItem('aether_provider_index');
        if(savedIdx) this.localProviderIndex = parseInt(savedIdx);
        
        // If loaded via ?session=XYZ url
        if(sessionId) this.join(sessionId);
    }

    /* --- TABS --- */
    switchSidebarTab(tabName) {
        // 1. Reset Active Class on Buttons
        document.querySelectorAll('.sb-tab').forEach(el => el.classList.remove('active'));
        
        // Handle visual active state
        if(event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        } else {
            // Programmatic highlight fallback
            const tabs = document.querySelectorAll('.sb-tab');
            if(tabName === 'chat' && tabs[0]) tabs[0].classList.add('active');
            if(tabName === 'queue' && tabs[1]) tabs[1].classList.add('active');
            if(tabName === 'participants' && tabs[2]) tabs[2].classList.add('active');
        }

        // 2. Hide All Panels
        const panels = ['partyTabChat', 'partyTabParticipants', 'partyTabQueue'];
        panels.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });

        // 3. Show Target Panel
        const targetMap = {
            'chat': 'partyTabChat',
            'participants': 'partyTabParticipants',
            'queue': 'partyTabQueue'
        };
        
        const targetId = targetMap[tabName];
        const targetEl = document.getElementById(targetId);
        
        if(targetEl) {
            // Chat needs flex to position input at bottom, others block
            targetEl.style.display = (tabName === 'chat') ? 'flex' : 'block';
            
            // Subtle Animation
            if(window.gsap) {
                gsap.fromTo(targetEl, {opacity:0, x:5}, {opacity:1, x:0, duration:0.2});
            }
        }
    }

    /* --- SETUP & JOIN --- */
    async watchMovie(input) {
        const auth = getAuth();
        if(!auth.currentUser) return alert("Please login to host a party.");

        let movieData = {};

        // Handle Input Type (DOM Element vs Object)
        if (input instanceof Element) {
            // Clicked from a Grid Card
            const card = input.closest('.movie-card-small') || input.closest('.card');
            if(card) {
                movieData = {
                    id: Date.now(), // Fallback if ID missing in DOM
                    title: card.querySelector('.movie-title-small')?.innerText || card.querySelector('.card-title')?.innerText || "Unknown Title",
                    poster_path: card.querySelector('img')?.src || "",
                    media_type: 'movie' // Default, will try to detect
                };
                // Try to extract ID from onclick attribute if possible, otherwise rely on passed object
            }
        } else {
             // Passed as Data Object (Hero, Detail Page)
             movieData = { 
                 id: input.id,
                 title: input.title || input.name,
                 poster_path: input.poster_path,
                 media_type: input.media_type || (input.name ? 'tv' : 'movie'),
                 season: input.season || 1,
                 episode: input.episode || 1
             };
        }

        // Normalize TV Data
        if(movieData.media_type === 'tv') {
            if(!movieData.season) movieData.season = 1;
            if(!movieData.episode) movieData.episode = 1;
        }

        // Create Session in Firebase
        const res = await createViewingSession(auth.currentUser.uid, movieData);
        if(res.success) {
            this.isHost = true;
            this.join(res.sessionId);
        } else {
            alert("Error creating session: " + res.error);
        }
    }

    async join(sessionId) {
        const auth = getAuth();
        if(!auth.currentUser) return alert("Login required to join.");
        
        this.sessionId = sessionId;
        await joinViewingSession(sessionId, auth.currentUser.uid);

        // UI Transition
        document.querySelectorAll('.view-container').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const view = document.getElementById('view-watch-party');
        view.style.display = 'block';
        setTimeout(() => view.style.opacity = 1, 50);

        // Update Invite Link Box
        const input = document.getElementById('sessionIdDisplay');
        if(input) input.value = sessionId;
        
        this.startListener();
    }

     startListener() {
        if(this.unsubscribe) this.unsubscribe();
        this.unsubscribe = listenToSessionUpdates(this.sessionId, (data) => {
            if(data.success) {
                this.renderSessionData(data.session);
            } else { 
                alert("Session ended or does not exist."); 
                this.closeSession(); 
            }
        });
    }

    /* --- RENDER DATA (Sync Logic) --- */
     renderSessionData(session) {
        const prevData = this.currentSessionData;
        this.currentSessionData = session;
        const movie = session.movie;

        // 1. Header & TV Logic
        let titleText = movie.title || movie.name;
        const queueBtn = document.getElementById('tabBtnQueue');
        const epControls = document.getElementById('partyEpControls');

        if(movie.media_type === 'tv') {
            titleText += ` (S${movie.season}:E${movie.episode})`;
            if(queueBtn) queueBtn.style.display = 'block'; // Show Queue Tab
            if(epControls) epControls.style.display = 'flex'; // Show controls
            
            // Auto switch to queue on first load for TV
            if(!prevData) this.switchSidebarTab('queue');

            // LOAD QUEUE IF NEEDED
            this.loadEpisodeQueue(movie.id, movie.season, movie.episode);
        } else {
            if(queueBtn) queueBtn.style.display = 'none';
            if(epControls) epControls.style.display = 'none';
            if(!prevData) this.switchSidebarTab('chat');
        }
        
        const titleEl = document.getElementById('sessionMovieTitle');
        if(titleEl) titleEl.innerText = titleText;
        
        // 2. Load Video (Avoid reloading if same)
        const container = document.getElementById('watchPartyVideo');
        const iframeExists = container.querySelector('iframe');
        
        const shouldReload = !iframeExists || !prevData || 
                             prevData.movie.id !== movie.id ||
                             prevData.movie.season !== movie.season ||
                             prevData.movie.episode !== movie.episode;

        if (shouldReload) {
            this.loadVideoIframe(movie);
            this.highlightActiveEpisode(movie.episode); // Update sidebar highlight
        }

        // 3. Status UI
        this.updateSyncUI(session.state);

        // 4. Participants & Chat
        this.renderParticipants(session.participants);
        this.renderChat(session.chat);
    }

     /* --- QUEUE LOGIC (Optimized) --- */
    async loadEpisodeQueue(tmdbId, seasonNum, currentEp) {
        // Cache Check: Prevent re-fetching if we already have this season loaded
        const cacheKey = `${tmdbId}_${seasonNum}`;
        if(this.loadedSeasonId === cacheKey) {
            this.highlightActiveEpisode(currentEp);
            return;
        }

        const container = document.getElementById('partyQueueList');
        const titleEl = document.getElementById('queueTitle');
        
        if(container) container.innerHTML = '<div style="padding:20px; text-align:center; color:gray;">Loading Season...</div>';
        if(titleEl) titleEl.innerText = `Season ${seasonNum}`;

        try {
            // Ensure window.api exists
            if(!window.api) throw new Error("API not ready");

            const data = await window.api.get(`/tv/${tmdbId}/season/${seasonNum}`);
            
            if(container) container.innerHTML = '';
            
            if(!data || !data.episodes) {
                if(container) container.innerHTML = 'Error loading episodes.';
                return;
            }

            // Success: Update Cache Key
            this.loadedSeasonId = cacheKey;
            
            const IMG_BASE = 'https://image.tmdb.org/t/p/w300';

            data.episodes.forEach(ep => {
                const div = document.createElement('div');
                div.className = `queue-item ${ep.episode_number == currentEp ? 'active' : ''}`;
                div.dataset.ep = ep.episode_number; // Store ID for highlighting

                const imgUrl = ep.still_path ? IMG_BASE + ep.still_path : '';
                const imgHtml = imgUrl ? `<div class="queue-img" style="background-image: url('${imgUrl}')"></div>` : `<div class="queue-img placeholder"></div>`;

                div.innerHTML = `
                   ${imgHtml}
                   <div class="queue-info">
                      <span class="queue-ep-num">Episode ${ep.episode_number}</span>
                      <span class="queue-title">${ep.name}</span>
                   </div>
                `;

                // CLICK TO SWITCH FOR EVERYONE
                div.onclick = async () => {
                    if(!confirm(`Switch group to Ep ${ep.episode_number}?`)) return;
                    await updateSessionMedia(this.sessionId, seasonNum, ep.episode_number);
                };

                container.appendChild(div);
            });
            
            // Scroll to active after rendering
            setTimeout(() => this.highlightActiveEpisode(currentEp), 100);

        } catch(e) {
            console.error("Queue Error", e);
            if(container) container.innerHTML = "Failed to load episodes.";
        }
    }

    highlightActiveEpisode(epNum) {
        document.querySelectorAll('.queue-item').forEach(el => {
            if(el.dataset.ep == epNum) {
                el.classList.add('active');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                el.classList.remove('active');
            }
        });
    }

    updateSyncUI(state) {
        const statusBadge = document.getElementById('syncStatusText'); // Ensure ID matches HTML
        const playBtn = document.getElementById('playPauseBtn');
        const liveDot = document.getElementById('liveIndicator');
        
        if (state === 'playing') {
            if(statusBadge) { statusBadge.innerText = "Playing"; statusBadge.style.color = "#10b981"; }
            if(playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            if(liveDot) liveDot.style.backgroundColor = "#10b981";
            this.playerState = 'playing';
        } else {
            if(statusBadge) { statusBadge.innerText = "Paused"; statusBadge.style.color = "#fbbf24"; }
            if(playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
            if(liveDot) liveDot.style.backgroundColor = "#fbbf24";
            this.playerState = 'paused';
        }
    }


     loadVideoIframe(movie) {
        const container = document.getElementById('watchPartyVideo');
        if(!container) return;

        // Get Provider
        const provider = (STREAMING_PROVIDERS && STREAMING_PROVIDERS[this.localProviderIndex]) 
                         ? STREAMING_PROVIDERS[this.localProviderIndex] 
                         : { name: "VidSrc", urlFormat: (id, t, s, e) => t==='tv'?`https://vidsrc.to/embed/tv/${id}/${s}/${e}`:`https://vidsrc.to/embed/movie/${id}` };
        
        const label = document.getElementById('streamSourceLabel'); // Reusing ID from main player
        if(label) label.innerText = `Source: ${provider.name}`;

        const config = { autoplay: true, lang: 'en' }; 
        
        let url = "";
        try {
            url = provider.urlFormat(
                movie.id, 
                movie.media_type || 'movie', 
                movie.season || null, 
                movie.episode || null, 
                movie, 
                config
            );
        } catch(e) {
             console.error("Provider URL Error", e);
             // Safe Fallback
             url = `https://vidsrc.to/embed/${movie.media_type||'movie'}/${movie.id}`;
        }

        container.innerHTML = `
            <iframe src="${url}" 
                style="width:100%; height:100%; border:none; background:#000;" 
                allowfullscreen 
                allow="autoplay; encrypted-media; fullscreen">
            </iframe>
        `;
    }

    switchProvider() {
        this.localProviderIndex++;
        if(this.localProviderIndex >= (STREAMING_PROVIDERS ? STREAMING_PROVIDERS.length : 1)) this.localProviderIndex = 0;
        
        localStorage.setItem('aether_provider_index', this.localProviderIndex);
        
        if(this.currentSessionData) {
            this.loadVideoIframe(this.currentSessionData.movie);
        }
    }

    async changeEpisode(offset) {
        if(!this.currentSessionData) return;
        const movie = this.currentSessionData.movie;
        if(movie.media_type !== 'tv') return;

        let newEp = parseInt(movie.episode) + offset;
        let newSeason = parseInt(movie.season);

        if(newEp < 1) {
            if(newSeason > 1) { 
                newSeason--; 
                // We assume 1st ep of prev season for simplicity, 
                // ideally we'd fetch episode count of prev season.
                newEp = 1; 
            } 
            else return;
        }
        // Update Session -> Triggers Listener -> Updates UI
        await updateSessionMedia(this.sessionId, newSeason, newEp);
    }


    // --- UTILS (Chat, Participants, etc) ---
    renderParticipants(list) {
        const pList = document.getElementById('participantsList');
        if(!pList) return;
        pList.innerHTML = '';
        const currentUid = getAuth().currentUser.uid;
        
        if(!list) return;

        list.forEach(uid => {
            const isMe = uid === currentUid;
            pList.innerHTML += `
                <div class="participant" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; padding:5px; border-radius:5px; background:rgba(255,255,255,0.05);">
                    <div style="background:${isMe?'var(--accent)':'#555'}; color:#fff; display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; font-size:12px;">
                       <i class="fas fa-user"></i>
                    </div>
                    <span style="color:#fff; font-size:13px;">${isMe?'You': 'User '+uid.substr(0,4)}</span>
                </div>`;
        });
        const count = document.getElementById('syncCount');
        if(count) count.innerText = list.length;
    }

    renderChat(chat) {
        const box = document.getElementById('chatMessages');
        if(!box) return;
        
        // Reset if empty (first load)
        if(box.innerHTML.trim() === "") {
             box.innerHTML = '<div class="chat-system-msg">Session Started</div>';
        }

        // We re-render chat for simplicity. 
        // For production, diffing would be better, but this works for <100 messages.
        let html = '<div class="chat-system-msg">Session Started</div>'; 
        (chat || []).forEach(msg => {
            html += `<div class="chat-message" style="margin-bottom:8px; animation:fadeIn 0.3s;">
                <strong style="color:var(--accent); font-size:12px;">${msg.user}:</strong> 
                <span style="color:#ccc; font-size:13px;">${msg.msg}</span>
            </div>`;
        });
        
        // Only update if changed
        if(box.innerHTML.length !== html.length) {
            box.innerHTML = html;
            box.scrollTop = box.scrollHeight;
        }
    }

   async togglePlayPause() {
        const newState = this.playerState === 'playing' ? 'paused' : 'playing';
        await updatePlaybackState(this.sessionId, 0, newState);
    }

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        if(!input || !input.value.trim()) return;
        
        const auth = getAuth();
        const user = auth.currentUser;
        
        await sendChatMessage(this.sessionId, user.uid, user.displayName || "Traveler", input.value);
        input.value = '';
    }
    
     copySessionId() {
        const input = document.getElementById('sessionIdDisplay');
        if(input) {
            input.select();
            document.execCommand('copy');
            // Visual Feedback
            const btn = event.target.closest('button');
            if(btn) {
                const oldHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check" style="color:#10b981"></i>';
                setTimeout(() => btn.innerHTML = oldHTML, 1500);
            }
        }
    }
    
    async closeSession() {
        if(!confirm("Leave Party?")) return;
        
        if(this.unsubscribe) this.unsubscribe();
        const auth = getAuth();
        
        if(auth.currentUser && this.sessionId) {
            await leaveViewingSession(this.sessionId, auth.currentUser.uid);
        }
        
        // Cleanup UI
        const container = document.getElementById('watchPartyVideo');
        if(container) container.innerHTML = '';
        
        const view = document.getElementById('view-watch-party');
        if(view) {
            view.style.display = 'none';
            view.classList.remove('active');
        }

        if(window.app) window.app.go('home');
        
        // Reset State
        this.sessionId = null;
        this.currentSessionData = null;
        this.loadedSeasonId = null;
    }
}