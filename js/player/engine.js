import { STREAMING_PROVIDERS } from "./sources.js";
import { subs } from "./subtitles.js";
import { trackGlobalView, trackHistory} from "../firebase/db.js";

export class StreamEngine {
    constructor() {
        this.currentProviderIndex = 0;
        this.mediaData = null;
        this.season = null;
        this.episode = null;
        this.totalEpisodesInSeason = 0; // To track boundaries

        // UI Idle Timer
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
        if (savedIndex !== null && parseInt(savedIndex) < STREAMING_PROVIDERS.length) {
            this.currentProviderIndex = parseInt(savedIndex);
        }
        this.populateSettingsUI();
        this.syncSettings();

        // Setup UI Interactions (Hover/Idle)
        this.setupInteractions();
    }

    setupInteractions() {
        const modal = document.getElementById('streamModal');
        const controls = document.getElementById('streamControls');
        const header = document.getElementById('streamHeader');

        // Mouse Move = Show Controls
        modal.addEventListener('mousemove', () => {
            this.showControls(controls, header);

            // Reset Timer
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(() => {
                this.hideControls(controls, header);
            }, 3000); // Hide after 3 seconds of inactivity
        });
    }

    showControls(controls, header) {
        modal.style.cursor = 'auto';
        gsap.to([controls, header], { opacity: 1, duration: 0.3, overwrite: true });
    }

    hideControls(controls, header) {
        modal.style.cursor = 'none'; // Hide cursor for immersion
        gsap.to([controls, header], { opacity: 0, duration: 0.5, overwrite: true });
    }
    /**
     * Syncs the internal config object with the HTML inputs in #view-settings
     */
    syncSettings() {
        // General Playback
        const autoPlayInput = document.getElementById('settingAutoplay');
        if (autoPlayInput) this.config.autoplay = autoPlayInput.checked;

        const resInput = document.getElementById('settingResolution');
        if (resInput) this.config.resolution = resInput.value;

        // Subtitles & Audio
        const langInput = document.getElementById('settingSubLang');
        if (langInput) this.config.lang = langInput.value;

        const sizeInput = document.getElementById('settingSubSize');
        if (sizeInput) this.config.subSize = parseFloat(sizeInput.value);

        const colorInput = document.getElementById('settingSubColor');
        if (colorInput) this.config.subColor = colorInput.value;

        // Visuals
        const zoomInput = document.getElementById('settingZoom');
        if (zoomInput) this.config.zoom = parseFloat(zoomInput.value);

        const brightInput = document.getElementById('settingBrightness');
        if (brightInput) this.config.brightness = parseFloat(brightInput.value);

        console.log("[StreamEngine] Settings Synced:", this.config);

        // If player is open, update visuals immediately
        this.applyVisuals();
    }

    /**
     * Populates the <select> element in Settings with providers
     */
    populateSettingsUI() {
        const select = document.getElementById('providerSelect');
        if (!select) return;

        select.innerHTML = '';
        STREAMING_PROVIDERS.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = p.name;
            if (idx === this.currentProviderIndex) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            this.setProvider(e.target.value);
        };
    }

    setProvider(index) {
        this.currentProviderIndex = parseInt(index);
        localStorage.setItem('aether_provider_index', index);

        // If player is currently watching, reload the source immediately
        const modal = document.getElementById('streamModal');
        if (modal && modal.classList.contains('active')) {
            this.loadSource();
        }
    }

    /**
     * MAIN ENTRY POINT: Open the player for a specific media
     */
    async open(media, season = null, episode = null) {
        this.syncSettings();
        this.mediaData = media;
        this.season = season;
        this.episode = episode;
        this.config.subtitleUrl = null;

        const modal = document.getElementById('streamModal');
        const titleLabel = document.getElementById('streamTitle');
        const epNameLabel = document.getElementById('episodeNameLabel');
        const btnPrev = document.getElementById('btnPrevEp');
        const btnNext = document.getElementById('btnNextEp');

        modal.classList.add('active');
        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3 });

        // Only track if it's a real media object with an ID
        if (media && media.id) {
            trackGlobalView(media); // Global counter
            // Track User History (if logged in)
            if (window.app.state.user) {
                trackHistory(window.app.state.user, media);
            }
        }

        // 1. Determine Type & UI
        const isTv = (season !== null && episode !== null);

        if (isTv) {
            titleLabel.innerText = `${media.name} (S${season}:E${episode})`;
            epNameLabel.innerText = "Fetching Episode Info...";

            // Show Buttons
            btnPrev.style.display = 'flex';
            btnNext.style.display = 'flex';

            // FETCH EPISODE COUNT (Important for "Next" logic)
            await this.fetchSeasonMetadata(media.id, season);

            // Update Buttons State
            this.updateNavButtons();

        } else {
            // MOVIE
            titleLabel.innerText = media.title;
            epNameLabel.innerText = "";
            // Hide Nav Buttons
            btnPrev.style.display = 'none';
            btnNext.style.display = 'none';
        }

        // 2. Fetch Subtitles (Existing Logic)
        if (this.config.lang && this.config.lang !== '') {
            let year = '';
            if (media.release_date) year = media.release_date.split('-')[0];
            else if (media.first_air_date) year = media.first_air_date.split('-')[0];
            try {
                const fetchedUrl = await subs.getSubtitleUrl(media.id, season, episode, this.config.lang, media.title || media.name, year);
                if (fetchedUrl) this.config.subtitleUrl = fetchedUrl;
            } catch (e) { }
        }

        this.loadSource();
    }

    /**
     * FETCH SEASON INFO
     * Needed to know if we can go to next episode/season
     */
    async fetchSeasonMetadata(tmdbId, seasonNum) {
        // We access the global 'api' object from index.html
        if (!window.app || !window.api) return;

        try {
            const data = await api.get(`/tv/${tmdbId}/season/${seasonNum}`);
            if (data && data.episodes) {
                this.totalEpisodesInSeason = data.episodes.length;

                // Update Episode Title UI
                const currentEpData = data.episodes.find(e => e.episode_number == this.episode);
                if (currentEpData) {
                    document.getElementById('episodeNameLabel').innerText = currentEpData.name;
                }
            }
        } catch (e) {
            console.warn("Could not fetch season metadata");
            this.totalEpisodesInSeason = 99; // Fallback to avoid locking "Next" button
        }
    }

    /**
     * HANDLE PREV/NEXT LOGIC
     */
    updateNavButtons() {
        const btnPrev = document.getElementById('btnPrevEp');
        const btnNext = document.getElementById('btnNextEp');

        // Prev Button
        if (this.episode <= 1 && this.season <= 1) {
            btnPrev.classList.add('disabled'); // First Ep of First Season
        } else {
            btnPrev.classList.remove('disabled');
        }

        // Next Button (Simple check, assumes show continues)
        // To be perfectly accurate we'd need total season count too, but this suffices for 99% cases
        btnNext.classList.remove('disabled');
    }

    nextEpisode() {
        if (this.episode < this.totalEpisodesInSeason) {
            // Next in same season
            this.open(this.mediaData, this.season, this.episode + 1);
        } else {
            // Next Season, Ep 1
            this.open(this.mediaData, this.season + 1, 1);
        }
    }

    prevEpisode() {
        if (this.episode > 1) {
            // Previous in same season
            this.open(this.mediaData, this.season, this.episode - 1);
        } else if (this.season > 1) {
            // Previous Season (Start at Ep 1 for safety, user can skip forward)
            // Ideally we'd fetch the previous season ep count, but jumping to Ep 1 is safer
            this.open(this.mediaData, this.season - 1, 1);
        }
    }

    refreshStream() {
        const iframe = document.getElementById('streamFrame');
        if (iframe) {
            iframe.src = iframe.src; // Reload
            // Animate
            gsap.fromTo(iframe, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        }
    }

    openSettings() {
        this.close(); // Close player
        window.app.go('settings'); // Go to settings view
    }

    loadSource() {
        // A. Smart Resolution Routing (Switch to 4K provider if requested)
        let providerIndex = this.currentProviderIndex;
        if (this.config.resolution === '4K Ultra HD') {
            const best4k = STREAMING_PROVIDERS.findIndex(p => p.name.includes('4K') || p.name.includes('VidLink'));
            if (best4k > -1) {
                console.log("[StreamEngine] Smart Switching to High Quality Provider");
                providerIndex = best4k;
            }
        }

        const provider = STREAMING_PROVIDERS[providerIndex];
        const iframe = document.getElementById('streamFrame');
        const sourceLabel = document.getElementById('streamSourceLabel');
        const loader = document.getElementById('streamLoader');

        sourceLabel.innerText = `Source: ${provider.name}`;

        const type = this.mediaData.media_type || (this.mediaData.title ? 'movie' : 'tv');

        // B. Generate URL using Provider Logic
        const url = provider.urlFormat(
            this.mediaData.id,
            type,
            this.season,
            this.episode,
            this.mediaData,
            this.config // Passes subtitleUrl, lang, autoplay
        );

        if (!url) {
            alert(`Provider ${provider.name} is not compatible with this title.`);
            loader.style.display = 'none';
            return;
        }

        console.log("[StreamEngine] Loading URL:", url);

        // C. Set Source
        iframe.src = url;

        // D. On Load Animation
        iframe.onload = () => {
            setTimeout(() => {
                loader.style.display = 'none';
                gsap.to(iframe, { opacity: 1, duration: 0.5 });
                this.applyVisuals(); // Apply tint/zoom overrides
            }, 1500);
        };
    }


    /**
     * Applies CSS filters/transforms to the iframe container to simulate
     * subtitle color and size changes (CORS workaround).
     */
    applyVisuals() {
        const iframe = document.getElementById('streamFrame');
        const tintOverlay = document.getElementById('streamTintLayer');

        if (!iframe) return;

        // 1. Zoom/Scale (Affects Subtitle Size)
        // Combines the "Subtitle Size" setting and "Visual Zoom" setting
        const totalScale = (this.config.zoom || 1) * (this.config.subSize || 1);
        iframe.style.transform = `scale(${totalScale})`;

        // 2. Brightness/Contrast
        iframe.style.filter = `brightness(${this.config.brightness || 1})`;

        // 3. Tint Overlay (Simulates Subtitle Color)
        if (tintOverlay) {
            if (this.config.subColor && this.config.subColor !== 'none') {
                tintOverlay.style.backgroundColor = this.config.subColor;
                tintOverlay.style.opacity = '0.15'; // Subtle tint
                tintOverlay.style.mixBlendMode = 'multiply'; // Blends into white text
            } else {
                tintOverlay.style.backgroundColor = 'transparent';
                tintOverlay.style.mixBlendMode = 'normal';
            }
        }
    }

    /**
     * Helper for color swatches in HTML
     */
    setTint(color, el) {
        const hiddenInput = document.getElementById('settingSubColor');
        if (hiddenInput) hiddenInput.value = color;

        // Update active class on UI swatches
        document.querySelectorAll('.color-swatch').forEach(d => d.classList.remove('active'));
        if (el) el.classList.add('active');

        this.syncSettings();
    }

    close() {
        const modal = document.getElementById('streamModal');
        const iframe = document.getElementById('streamFrame');

        gsap.to(modal, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                // CRITICAL: removing active class restores pointer-events: none
                modal.classList.remove('active');
                iframe.src = '';
            }
        });
    }
}

// Export Singleton
export const player = new StreamEngine();