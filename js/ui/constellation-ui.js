
/*js/ui/constellation.js
   CONSTELLATION UI CONTROLLER 
   Visualizes movie connections in a graph
*/
export class ConstellationUIController {
    constructor() {
        this.container = document.getElementById('universeStage');
        this.nodeContainer = document.getElementById('nodesContainer');
        this.svg = document.getElementById('connectionLines');
        this.infoPanel = document.getElementById('nodeInfoPanel');
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
        this.currentData = null;
    }

    init() {
          if(window.Draggable) {
            window.Draggable.create(this.container, {
                type: "x,y",
                edgeResistance: 0.65,
                bounds: {minX:-1500, maxX:1500, minY:-1000, maxY:1000}, // Large bounds
                inertia: true
            });
        }
        // Init Draggable for the universe
        /*Draggable.create(this.container, {
            type: "x,y",
            edgeResistance: 0.65,
            bounds: {minX:-1000, maxX:1000, minY:-1000, maxY:1000},
            inertia: true
        });*/

        window.addEventListener('resize', () => {
            this.centerX = window.innerWidth / 2;
            this.centerY = window.innerHeight / 2;
        });
    }

    async generate(startMovie) {
        // Clear previous
        this.nodeContainer.innerHTML = '';
        this.svg.innerHTML = '';
        
        // Reset Position
        gsap.set(this.container, {x: 0, y: 0, scale: 0.5, opacity: 0});

        // 1. Create Center Node (The Sun)
        this.createNode(startMovie, this.centerX, this.centerY, 'center-node', null);

        // 2. Fetch Connections (Planets)
        // We will fetch: Similar, Recommendations, and maybe Credits to find same Director
        const connections = await this.fetchConnections(startMovie.id, startMovie.media_type || 'movie');

        // 3. Plot Connections in Orbit
        const radius = 350; // Distance from center
        const total = connections.length;
        const angleStep = (2 * Math.PI) / total;

        connections.forEach((item, index) => {
            const angle = index * angleStep;
            const x = this.centerX + radius * Math.cos(angle);
            const y = this.centerY + radius * Math.sin(angle);
            
            this.createNode(item, x, y, 'satellite', startMovie);
            this.drawConnection(this.centerX, this.centerY, x, y);
        });

        // Animation In
        gsap.to(this.container, {scale: 1, opacity: 1, duration: 1.5, ease: "expo.out"});
        gsap.from('.c-node.satellite', {
            x: this.centerX, 
            y: this.centerY, 
            opacity: 0, 
            duration: 1.2, 
            stagger: 0.05, 
            ease: "back.out(1.7)"
        });
    }

    async fetchConnections(id, type) {
        // Fetch Recommendations
        const recs = await window.api.get(`/${type}/${id}/recommendations`);
        // Fetch Credits (to find same director/cast)
        const creds = await window.api.get(`/${type}/${id}/credits`);
        
        let results = [];

        // Add Top 3 Recommendations
        if(recs.results) {
            recs.results.slice(0, 3).forEach(m => {
                m.connectionType = "Similar Vibe";
                results.push(m);
            });
        }

        // Add 2 Movies from same Director (if movie)
        if(type === 'movie' && creds.crew) {
            const director = creds.crew.find(c => c.job === 'Director');
            if(director) {
                const dirMovies = await window.api.get(`/person/${director.id}/movie_credits`);
                if(dirMovies.crew) {
                    const others = dirMovies.crew
                        .filter(m => m.job === 'Director' && m.id !== id && m.poster_path)
                        .slice(0, 2);
                    others.forEach(m => {
                        m.connectionType = `Dir. ${director.name}`;
                        results.push(m);
                    });
                }
            }
        }

        // Add 2 Movies from Lead Actor
        if(creds.cast && creds.cast.length > 0) {
            const lead = creds.cast[0];
            const leadMovies = await window.api.get(`/person/${lead.id}/movie_credits`);
            if(leadMovies.cast) {
                const others = leadMovies.cast
                    .filter(m => m.id !== id && m.poster_path)
                    .sort((a,b) => b.popularity - a.popularity) // Get popular ones
                    .slice(0, 2);
                others.forEach(m => {
                    m.connectionType = `Starring ${lead.name}`;
                    results.push(m);
                });
            }
        }

        // Fill rest with similar if array is small
        if(results.length < 6 && recs.results) {
             recs.results.slice(3, 8).forEach(m => {
                 if(!results.find(r => r.id === m.id)) {
                     m.connectionType = "Aether Algorithm";
                     results.push(m);
                 }
             });
        }

        return results;
    }

    createNode(data, x, y, className, parentData) {
        const el = document.createElement('div');
        el.className = `c-node ${className}`;
        const img = data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : '';
        el.style.backgroundImage = `url(${img})`;
        el.style.left = `${x - (className.includes('center')?80:45)}px`; // offset by half width
        el.style.top = `${y - (className.includes('center')?80:45)}px`;

        // Label
        el.innerHTML = `<div class="c-node-label">${data.title || data.name}</div>`;

        // Hover Events
        el.onmouseenter = () => this.showInfo(data);
        el.onmouseleave = () => this.hideInfo();

        // Click Event
        if(className === 'satellite') {
            el.onclick = (e) => {
                e.stopPropagation();
                // Warp Effect
                this.warpToNode(data);
            };
        } else {
             // Center node click -> Open Details
             el.onclick = () => window.app.go('detail', {id: data.id, type: data.media_type || 'movie'});
        }

        this.nodeContainer.appendChild(el);
    }

    drawConnection(x1, y1, x2, y2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.classList.add("connection-path");
        this.svg.appendChild(line);
    }

    showInfo(data) {
        document.getElementById('nodeTitle').innerText = data.title || data.name;
        document.getElementById('nodeReason').innerText = data.connectionType || 'Selected';
        document.getElementById('nodeYear').innerText = (data.release_date || data.first_air_date || '').split('-')[0];
        document.getElementById('nodeRating').innerText = data.vote_average?.toFixed(1);
        this.infoPanel.classList.add('active');
    }

    hideInfo() {
        this.infoPanel.classList.remove('active');
    }

    warpToNode(data) {
        // Animation to simulate moving to new galaxy
        gsap.to('.c-node', {scale: 0, opacity:0, duration: 0.4, stagger: 0.05});
        gsap.to(this.svg, {opacity: 0, duration: 0.3});
        
        setTimeout(() => {
            this.generate(data);
        }, 500);
    }
    
    resetZoom() {
        gsap.to(this.container, {x:0, y:0, scale:1, duration: 0.8, ease:"power2.out"});
    }
}