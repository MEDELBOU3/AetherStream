/**
 * js/ui/lens-ui.js
 * AETHER LENS: Augmented Reality style Metadata HUD
 */

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class LensUIController {
    constructor() {
        this.active = false;
        this.data = null;
    }

    init() {
        console.log("Aether Lens Initialized");
    }

    /**
     * ACTIVATE THE LENS
     */
    async toggle(movie) {
        this.active = !this.active;
        const overlay = document.getElementById('lensOverlay');
        
        if (this.active) {
            this.data = movie;
            overlay.style.display = 'block';
            this.runScanner();
            await this.analyzeData(movie);
        } else {
            this.close();
        }
    }

    close() {
        this.active = false;
        const overlay = document.getElementById('lensOverlay');
        gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => {
            overlay.style.display = 'none';
            overlay.style.opacity = 1; // Reset for next time
            this.clearHUD();
        }});
    }

    /**
     * VISUAL SCANNING EFFECT
     */
    runScanner() {
        // Scanner Line Animation
        const line = document.getElementById('lensScanLine');
        gsap.fromTo(line, 
            { top: '0%' }, 
            { top: '100%', duration: 1.5, ease: "power2.inOut", yoyo: true, repeat: 1 }
        );

        // UI Entrance
        gsap.fromTo('.lens-widget', 
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.5, ease: "back.out(1.7)" }
        );
    }

    /**
     * FETCH & PROCESS DATA
     */
    async analyzeData(movie) {
        // 1. Color Palette (Simulated based on Genre for CORS safety)
        const colors = this.getGenreColors(movie.genres);
        this.renderPalette(colors);

        // 2. Soundtrack (Search Query)
        const query = `${movie.title} ${movie.release_date?.split('-')[0]} soundtrack`;
        document.getElementById('lensMusicLink').href = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
        document.getElementById('lensMusicText').innerText = "Original Motion Picture Soundtrack";

        // 3. Temporal Context (Historical Fact)
        const year = movie.release_date?.split('-')[0];
        const context = this.getYearContext(year);
        document.getElementById('lensYearFact').innerText = context;

        // 4. Sentiment Analysis (Keyword Extraction)
        // We fetch keywords and reviews to determine the "Vibe"
        if(window.api) {
            const type = movie.media_type || 'movie';
            const keywords = await window.api.get(`/${type}/${movie.id}/keywords`);
            const kwList = keywords.keywords || keywords.results || [];
            
            this.renderVibeGraph(kwList);
        }
    }

    renderPalette(colors) {
        const container = document.getElementById('lensPalette');
        container.innerHTML = '';
        colors.forEach(c => {
            const div = document.createElement('div');
            div.className = 'palette-swatch';
            div.style.backgroundColor = c;
            container.appendChild(div);
        });
    }

    renderVibeGraph(keywords) {
        const container = document.getElementById('lensKeywords');
        container.innerHTML = '';
        // Take top 5 keywords
        keywords.slice(0, 5).forEach(k => {
            const span = document.createElement('span');
            span.className = 'lens-tag';
            span.innerText = `#${k.name}`;
            container.appendChild(span);
        });
    }

    clearHUD() {
        document.getElementById('lensKeywords').innerHTML = '';
        document.getElementById('lensPalette').innerHTML = '';
    }

    /* --- HELPERS --- */
    
    getGenreColors(genres) {
        // Returns a color palette based on primary genre
        if(!genres || !genres.length) return ['#fff', '#000', '#888'];
        const map = {
            'Action': ['#ef4444', '#7f1d1d', '#fca5a5'],
            'Science Fiction': ['#3b82f6', '#1e3a8a', '#93c5fd'],
            'Horror': ['#000000', '#dc2626', '#450a0a'],
            'Romance': ['#ec4899', '#831843', '#fbcfe8'],
            'Drama': ['#8b5cf6', '#4c1d95', '#c4b5fd']
        };
        const gName = genres[0].name;
        return map[gName] || ['#ffffff', '#cccccc', '#999999'];
    }

    getYearContext(year) {
        // A mini database of pop culture history
        const facts = {
            '2024': 'The rise of AI in cinema production.',
            '2023': 'Barbenheimer phenomenon took over theaters.',
            '2022': 'Cinema began recovering from the pandemic era.',
            '2019': 'The end of the Avengers Infinity Saga.',
            '2008': 'The MCU began and The Dark Knight changed superhero films.',
            '1999': 'The year of The Matrix and Fight Club.',
            '1994': 'The greatest year in film: Pulp Fiction, Shawshank, Lion King.'
        };
        return facts[year] || `Cinema in ${year} captured the zeitgeist of the era.`;
    }
}