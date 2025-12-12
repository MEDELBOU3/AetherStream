/**
 * THE AETHER ORACLE
 * Mood-based recommendation engine
 */
export class OracleUIController {
    constructor() {
        // Map Moods to TMDB Filters
        this.moodMap = {
            "mind_bending": { 
                label: "Mind Bending", icon: "fa-brain",
                genres: "878,9648", // Sci-Fi, Mystery
                keywords: "210026|4565|14746", // psychological thriller, dystopia
                sort: "vote_average.desc" 
            },
            "adrenaline": { 
                label: "Adrenaline Rush", icon: "fa-fire-alt",
                genres: "28,12", // Action, Adventure
                sort: "popularity.desc",
                min_votes: 1000
            },
            "dark_gritty": { 
                label: "Dark & Gritty", icon: "fa-moon",
                genres: "80,53", // Crime, Thriller
                keywords: "9826|12358|10051", // murder, revenge, heist
                sort: "vote_count.desc"
            },
            "feel_good": { 
                label: "Feel Good", icon: "fa-smile-beam",
                genres: "35,10751", // Comedy, Family
                without_genres: "27,53", // No Horror/Thriller
                sort: "popularity.desc"
            },
            "tearjerker": { 
                label: "Need a Cry", icon: "fa-sad-tear",
                genres: "18,10749", // Drama, Romance
                keywords: "10683|2580", // sadness, tragedy
                sort: "vote_average.desc"
            },
            "hidden_gems": { 
                label: "Hidden Gems", icon: "fa-gem",
                genres: "",
                vote_average_gte: 7.5,
                vote_count_lte: 2000, // High rating, low popularity
                sort: "vote_average.desc"
            }
        };
        this.currentMood = null;
    }

    init() {
        console.log("Oracle Initialized");
        this.renderMoodButtons();
    }

    open() {
        const modal = document.getElementById('oracleModal');
        modal.classList.add('active');
        
        // Entrance Animation
        gsap.fromTo(modal.querySelector('.oracle-content'), 
            { scale: 0.9, opacity: 0 }, 
            { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.2)" }
        );
    }

    close() {
        const modal = document.getElementById('oracleModal');
        gsap.to(modal.querySelector('.oracle-content'), {
            scale: 0.9, opacity: 0, duration: 0.3, 
            onComplete: () => modal.classList.remove('active')
        });
    }

    renderMoodButtons() {
        const container = document.getElementById('oracleTags');
        container.innerHTML = '';
        
        Object.keys(this.moodMap).forEach(key => {
            const data = this.moodMap[key];
            const btn = document.createElement('button');
            btn.className = 'oracle-tag';
            btn.innerHTML = `<i class="fas ${data.icon}"></i> ${data.label}`;
            btn.onclick = () => this.selectMood(key, btn);
            container.appendChild(btn);
        });
    }

    selectMood(key, btn) {
        // UI Update
        document.querySelectorAll('.oracle-tag').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMood = key;
        
        // Show Generate Button
        const actionArea = document.getElementById('oracleActionArea');
        actionArea.style.display = 'flex';
        gsap.from(actionArea, { y: 20, opacity: 0 });
    }

    async generatePicks() {
        if(!this.currentMood || !window.api) return;
        
        const resultsContainer = document.getElementById('oracleResults');
        const loader = document.getElementById('oracleLoader');
        const config = this.moodMap[this.currentMood];
        
        // 1. Show Loader
        document.getElementById('oracleInputs').style.display = 'none';
        loader.style.display = 'flex';
        
        // Fake "Thinking" delay for effect
        await new Promise(r => setTimeout(r, 1500));

        try {
            // 2. Build API Query
            const params = {
                with_genres: config.genres,
                without_genres: config.without_genres,
                with_keywords: config.keywords,
                sort_by: config.sort,
                "vote_count.gte": config.min_votes || 300,
                "vote_average.gte": config.vote_average_gte || 0,
                "vote_count.lte": config.vote_count_lte || 99999999,
                page: Math.floor(Math.random() * 5) + 1 // Randomize page for variety
            };

            // Remove undefined keys
            Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

            const res = await window.api.get('/discover/movie', params);
            
            // 3. Render Results
            loader.style.display = 'none';
            resultsContainer.style.display = 'grid';
            resultsContainer.innerHTML = '';

            const picks = res.results.slice(0, 4); // Top 4 picks

            picks.forEach((m, i) => {
                if(!m.poster_path) return;
                const div = document.createElement('div');
                div.className = 'oracle-card';
                div.innerHTML = `
                    <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
                    <div class="oracle-card-info">
                        <h4>${m.title}</h4>
                        <span>${m.vote_average.toFixed(1)} Match</span>
                    </div>
                `;
                div.onclick = () => {
                    this.close();
                    window.player.open(m, 'movie');
                };
                resultsContainer.appendChild(div);
            });

            // Stagger Animation
            gsap.from('.oracle-card', { y: 50, opacity: 0, stagger: 0.1, duration: 0.5 });

            // Add "Try Again" button
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn-link';
            resetBtn.innerHTML = '<i class="fas fa-redo"></i> Try Another Vibe';
            resetBtn.onclick = () => this.reset();
            document.querySelector('.oracle-footer').appendChild(resetBtn);

        } catch (e) {
            console.error(e);
            this.reset();
        }
    }

    reset() {
        document.getElementById('oracleResults').style.display = 'none';
        document.getElementById('oracleLoader').style.display = 'none';
        document.getElementById('oracleInputs').style.display = 'block';
        document.getElementById('oracleActionArea').style.display = 'none';
        document.querySelectorAll('.oracle-tag').forEach(b => b.classList.remove('active'));
        const footer = document.querySelector('.oracle-footer');
        if(footer.lastChild.tagName === 'BUTTON') footer.lastChild.remove();
    }
}