/**
 * js/player/engine.js
 */

import { STREAMING_PROVIDERS } from "./sources.js";
import { subs } from "./subtitles.js"; 
import { trackGlobalView, trackHistory } from "../firebase/db.js";

export class StreamEngine {
  constructor() {
    this.currentProviderIndex = 0;
    this.mediaData = null;
    this.season = null;
    this.episode = null;
    this.totalEpisodesInSeason = 0;
    this.idleTimer = null;
    
    this.config = {
      autoplay: true,
      resolution: 'Auto',
      hevc: true,
      lang: '',
      subtitleUrl: null,
      subSize: 1,
      subColor: 'none',
      brightness: 1,
      zoom: 1
    };
  }

  init() {
    const savedIndex = localStorage.getItem('aether_provider_index');
    if(savedIndex !== null && parseInt(savedIndex) < STREAMING_PROVIDERS.length) {
      this.currentProviderIndex = parseInt(savedIndex);
    }
    this.populateSettingsUI();
    this.syncSettings();
    this.setupInteractions();
  }

  setupInteractions() {
    const modal = document.getElementById('streamModal');
    const controls = document.getElementById('streamControls');
    const header = document.getElementById('streamHeader');

    modal.addEventListener('mousemove', () => {
      modal.style.cursor = 'auto';
      gsap.to([controls, header], { opacity: 1, duration: 0.3, overwrite: true });
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        modal.style.cursor = 'none';
        gsap.to([controls, header], { opacity: 0, duration: 0.5, overwrite: true });
      }, 3000);
    });
  }

  syncSettings() {
    const autoPlayInput = document.getElementById('settingAutoplay');
    if(autoPlayInput) this.config.autoplay = autoPlayInput.checked;
    const resInput = document.getElementById('settingResolution');
    if(resInput) this.config.resolution = resInput.value;
    const langInput = document.getElementById('settingSubLang');
    if(langInput) this.config.lang = langInput.value;
    const sizeInput = document.getElementById('settingSubSize');
    if(sizeInput) this.config.subSize = parseFloat(sizeInput.value);
    const colorInput = document.getElementById('settingSubColor');
    if(colorInput) this.config.subColor = colorInput.value;
    const zoomInput = document.getElementById('settingZoom');
    if(zoomInput) this.config.zoom = parseFloat(zoomInput.value);
    const brightInput = document.getElementById('settingBrightness');
    if(brightInput) this.config.brightness = parseFloat(brightInput.value);
    this.applyVisuals();
  }

  populateSettingsUI() {
    const select = document.getElementById('providerSelect');
    if(!select) return;
    select.innerHTML = '';
    STREAMING_PROVIDERS.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.innerText = p.name;
      if(idx === this.currentProviderIndex) opt.selected = true;
      select.appendChild(opt);
    });
    select.onchange = (e) => { this.setProvider(e.target.value); };
  }

  setProvider(index) {
    this.currentProviderIndex = parseInt(index);
    localStorage.setItem('aether_provider_index', index);
    const modal = document.getElementById('streamModal');
    if(modal && modal.classList.contains('active')) this.loadSource();
  }

  async open(media, season = null, episode = null) {
    this.syncSettings();
    this.mediaData = media;
    this.season = season;
    this.episode = episode;
    this.config.subtitleUrl = null;

    const modal = document.getElementById('streamModal');
    const titleLabel = document.getElementById('streamTitle');
    const epNameLabel = document.getElementById('episodeNameLabel');
    
    modal.classList.add('active');
    gsap.fromTo(modal, {opacity: 0}, {opacity: 1, duration: 0.3});

    if (season !== null && episode !== null) {
      titleLabel.innerText = `${media.name} (S${season}:E${episode})`;
      epNameLabel.innerText = "Fetching Episode Info...";
      document.getElementById('btnPrevEp').style.display = 'flex';
      document.getElementById('btnNextEp').style.display = 'flex';
      await this.fetchSeasonMetadata(media.id, season);
    } else {
      titleLabel.innerText = media.title;
      epNameLabel.innerText = "";
      document.getElementById('btnPrevEp').style.display = 'none';
      document.getElementById('btnNextEp').style.display = 'none';
    }

    if (media.id) {
        trackGlobalView(media);
        if(window.app && window.app.state.user) {
            trackHistory(window.app.state.user, media, season, episode);
        }
    }

    if (this.config.lang && this.config.lang !== '') {
       let year = '';
       if(media.release_date) year = media.release_date.split('-')[0];
       else if(media.first_air_date) year = media.first_air_date.split('-')[0];
       try {
         const fetchedUrl = await subs.getSubtitleUrl(media.id, season, episode, this.config.lang, media.title||media.name, year);
         if(fetchedUrl) this.config.subtitleUrl = fetchedUrl;
       } catch(e) {}
    }

    this.loadSource();
  }

  async fetchSeasonMetadata(tmdbId, seasonNum) {
    // Default fallback
    this.totalEpisodesInSeason = 99; 

    try {
        // Use the global app API to get real data
        if(window.api) {
            const data = await window.api.get(`/tv/${tmdbId}/season/${seasonNum}`);
            if(data && data.episodes) {
                this.totalEpisodesInSeason = data.episodes.length;
                console.log(`Season ${seasonNum} has ${this.totalEpisodesInSeason} episodes.`);
            }
        }
    } catch(e) {
        console.warn("Could not fetch season details:", e);
    }
  }

  nextEpisode() {
      if(!this.mediaData || !this.season || !this.episode) return;
      
      const currentEp = parseInt(this.episode);
      const currentSeason = parseInt(this.season);

      // Check if we reached the end of the season
      if(currentEp >= this.totalEpisodesInSeason) {
          // Jump to Next Season, Episode 1
          console.log("Jumping to next season...");
          this.open(this.mediaData, currentSeason + 1, 1);
      } else {
          // Standard Next Episode
          this.open(this.mediaData, currentSeason, currentEp + 1);
      }
  }

 prevEpisode() {
      if(!this.mediaData || !this.season || !this.episode) return;

      const currentEp = parseInt(this.episode);
      const currentSeason = parseInt(this.season);

      if(currentEp > 1) {
          // Standard Prev Episode
          this.open(this.mediaData, currentSeason, currentEp - 1);
      } else if (currentSeason > 1) {
          // Jump to Previous Season, Episode 1
          // (Simple behavior: start of prev season)
          this.open(this.mediaData, currentSeason - 1, 1);
      }
  }
  refreshStream() {
    const iframe = document.getElementById('streamFrame');
    if(iframe) iframe.src = iframe.src;
  }
  openSettings() {
    this.close();
    window.app.go('settings');
  }

  /*loadSource() {
    let providerIndex = this.currentProviderIndex;
    if(this.config.resolution === '4K Ultra HD') {
        const best4k = STREAMING_PROVIDERS.findIndex(p => p.name.includes('4K') || p.name.includes('VidLink'));
        if(best4k > -1) providerIndex = best4k;
    }

    const provider = STREAMING_PROVIDERS[providerIndex];
    const iframe = document.getElementById('streamFrame');
    const sourceLabel = document.getElementById('streamSourceLabel');
    const loader = document.getElementById('streamLoader');

    sourceLabel.innerText = `Source: ${provider.name}`;
    loader.style.display = 'flex';
    iframe.style.opacity = '0';
    iframe.src = 'about:blank';

    const type = this.mediaData.media_type || (this.mediaData.title ? 'movie' : 'tv');
    const url = provider.urlFormat(
      this.mediaData.id, type, this.season, this.episode, this.mediaData, this.config 
    );

    if(!url) {
      alert(`Provider ${provider.name} cannot play this title.`);
      loader.style.display = 'none';
      return;
    }

    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        const loader = document.getElementById('streamLoader');
        if(loader) loader.style.display = 'none';
        gsap.to(iframe, {opacity: 1, duration: 0.5});
        this.applyVisuals();

        // ============================================
        // NEW: GAMIFICATION TRIGGER
        // ============================================
        if (window.challengeSystem) {
            console.log("Tracking Quest Progress...");
            
            // 1. Determine Action Type
            const actionType = type === 'movie' ? 'watch_movie' : 'watch_episode';
            
            // 2. Get Genre (for "Watch Horror" quests)
            let genreId = null;
            if (this.mediaData.genres && this.mediaData.genres.length > 0) {
                genreId = this.mediaData.genres[0].id;
            } else if (this.mediaData.genre_ids && this.mediaData.genre_ids.length > 0) {
                genreId = this.mediaData.genre_ids[0];
            }

            // 3. Send to Engine
            window.challengeSystem.trackAction(actionType, { genreId: genreId });
        }
        // ============================================

      }, 1500);
    };
  }*/ 

    loadSource() {
    let providerIndex = this.currentProviderIndex;
    
    // Auto-select 4K if requested
    if(this.config.resolution === '4K Ultra HD') {
        const best4k = STREAMING_PROVIDERS.findIndex(p => p.name.includes('4K') || p.name.includes('VidLink'));
        if(best4k > -1) providerIndex = best4k;
    }

    const provider = STREAMING_PROVIDERS[providerIndex];
    const iframe = document.getElementById('streamFrame');
    const sourceLabel = document.getElementById('streamSourceLabel');
    const loader = document.getElementById('streamLoader');

    if(sourceLabel) sourceLabel.innerText = `Source: ${provider.name}`;
    if(loader) loader.style.display = 'flex';
    if(iframe) {
        iframe.style.opacity = '0';
        iframe.src = 'about:blank';
    }

    // Safety check for media data
    if (!this.mediaData) return;

    const type = this.mediaData.media_type || (this.mediaData.title ? 'movie' : 'tv');
    
    // Generate URL
    const url = provider.urlFormat(
      this.mediaData.id, type, this.season, this.episode, this.mediaData, this.config 
    );

    if(!url) {
      alert(`Provider ${provider.name} cannot play this title.`);
      if(loader) loader.style.display = 'none';
      return;
    }

    iframe.src = url;

    // --- SAFER LOADING LOGIC ---
    iframe.onload = () => {
      setTimeout(() => {
        if(loader) loader.style.display = 'none';
        gsap.to(iframe, {opacity: 1, duration: 0.5});
        this.applyVisuals();

        // 🛡️ SAFE GAMIFICATION TRIGGER 🛡️
        // This is wrapped so it NEVER stops the video from playing
        try {
            if (window.challengeSystem && window.app.state.user) {
                console.log("Tracking Quest Progress...");
                
                const actionType = type === 'movie' ? 'watch_movie' : 'watch_episode';
                
                // Safe Genre Check
                let genreId = null;
                if (this.mediaData.genres && this.mediaData.genres.length > 0) {
                    genreId = this.mediaData.genres[0].id;
                } else if (this.mediaData.genre_ids && this.mediaData.genre_ids.length > 0) {
                    genreId = this.mediaData.genre_ids[0];
                }

                window.challengeSystem.trackAction(actionType, { genreId: genreId });
            }
        } catch (err) {
            console.warn("Gamification tracking failed, but video is fine:", err);
        }

      }, 1500);
    };
  }

  applyVisuals() {
    const iframe = document.getElementById('streamFrame');
    const tintOverlay = document.getElementById('streamTintLayer');
    if(!iframe) return;
    const totalScale = (this.config.zoom || 1) * (this.config.subSize || 1);
    iframe.style.transform = `scale(${totalScale})`;
    iframe.style.filter = `brightness(${this.config.brightness || 1})`;

    if(tintOverlay) {
        if(this.config.subColor && this.config.subColor !== 'none') {
            tintOverlay.style.backgroundColor = this.config.subColor;
            tintOverlay.style.opacity = '0.15';
            tintOverlay.style.mixBlendMode = 'multiply';
        } else {
            tintOverlay.style.backgroundColor = 'transparent';
            tintOverlay.style.mixBlendMode = 'normal';
        }
    }
  }
  
  setTint(color, el) {
    const hiddenInput = document.getElementById('settingSubColor');
    if(hiddenInput) hiddenInput.value = color;
    document.querySelectorAll('.color-swatch').forEach(d => d.classList.remove('active'));
    if(el) el.classList.add('active');
    this.syncSettings();
  }

  close() {
    const modal = document.getElementById('streamModal');
    const iframe = document.getElementById('streamFrame');
    gsap.to(modal, {opacity: 0, duration: 0.3, onComplete: () => {
      modal.classList.remove('active');
      iframe.src = '';
    }});
  }
}
export const player = new StreamEngine();