/**
 * js/ui/actor-ui.js
 * CASTING INTELLIGENCE
 * detailed actor profiles + user affinity calculation
 */

import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getUserData } from "../firebase/db.js";

export class ActorUIController {
  constructor() {
    this.currentActor = null;
  }

  init() {
    console.log("Actor UI Ready");
  }

  async openActorProfile(personId) {
    const modal = document.getElementById('actorModal');
    const container = document.querySelector('.actor-content');
    
    // 1. Show Loading State
    modal.classList.add('active');
    gsap.fromTo(modal.querySelector('.actor-card'), 
      { y: 100, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
    );
    
    this.resetUI();

    try {
      // 2. Fetch Person Details & Credits
      // We use append_to_response to get everything in one call
      const person = await window.api.get(`/person/${personId}`, {
        append_to_response: 'combined_credits,external_ids'
      });

      this.currentActor = person;
      this.renderProfile(person);
      this.calculateAffinity(person.combined_credits.cast);

    } catch (e) {
      console.error("Actor Load Error", e);
      modal.classList.remove('active');
    }
  }

  resetUI() {
    document.getElementById('actorName').innerText = "Loading...";
    document.getElementById('actorBio').innerText = "";
    document.getElementById('actorImage').src = "";
    document.getElementById('actorCredits').innerHTML = "";
    document.getElementById('affinityBadge').style.display = 'none';
  }

  async calculateAffinity(credits) {
    const user = getAuth().currentUser;
    if(!user) return;

    // Get User History
    const userData = await getUserData(user);
    const history = userData.history || [];
    
    // Find matches: Movies in History that match Actor's Credits
    const matches = history.filter(h => 
        credits.some(c => c.id === h.id)
    );

    if(matches.length > 0) {
        const badge = document.getElementById('affinityBadge');
        badge.style.display = 'inline-block';
        
        // Calculate "Level"
        let text = `${matches.length} titles watched`;
        let color = "var(--text-muted)";
        
        if(matches.length > 2) color = "#3b82f6"; // Blue (Fan)
        if(matches.length > 5) { text = "Super Fan"; color = "#10b981"; } // Green
        if(matches.length > 10) { text = "Obsessed"; color = "var(--accent)"; } // Red

        badge.innerHTML = `<i class="fas fa-check-circle"></i> You've seen ${matches.length} titles. <span style="color:${color}; font-weight:800">${text}</span>`;
        
        // Animate Badge
        gsap.from(badge, { scale: 0.8, opacity: 0, delay: 0.5 });
    }
  }

  renderProfile(person) {
    // Info
    document.getElementById('actorName').innerText = person.name;
    document.getElementById('actorBio').innerText = person.biography || "No biography available.";
    
    // Image
    const img = document.getElementById('actorImage');
    if(person.profile_path) {
        img.src = `https://image.tmdb.org/t/p/h632${person.profile_path}`;
    } else {
        img.src = "https://via.placeholder.com/300x450?text=No+Image";
    }

    // Meta
    const metaStr = [];
    if(person.birthday) metaStr.push(person.birthday.split('-')[0]); // Birth Year
    if(person.place_of_birth) metaStr.push(person.place_of_birth);
    document.getElementById('actorMeta').innerText = metaStr.join(' • ');

    // Filter & Sort Credits (Popularity)
    // We filter out talk shows, news, etc by checking genre_ids or vote_count
    const bestWork = person.combined_credits.cast
        .filter(c => c.vote_count > 50 && c.poster_path) // Filter junk
        .sort((a, b) => b.popularity - a.popularity) // Sort by fame
        .slice(0, 20); // Top 20

    const grid = document.getElementById('actorCredits');
    const template = document.getElementById('movieCardTemplate');

    bestWork.forEach(m => {
        const clone = template.content.cloneNode(true);
        const poster = clone.querySelector('.movie-poster-small');
        
        poster.src = `https://image.tmdb.org/t/p/w200${m.poster_path}`;
        clone.querySelector('.movie-title-small').innerText = m.title || m.name;
        
        // Character Name instead of Rating
        const charName = m.character ? `as ${m.character}` : "Cast";
        clone.querySelector('.movie-rating-small').innerText = charName;
        clone.querySelector('.movie-rating-small').style.color = "var(--accent)";

        // Click to Watch/Detail
        clone.querySelector('button').onclick = () => {
            this.close();
            const type = m.media_type || (m.title ? 'movie' : 'tv');
            window.app.go('detail', { id: m.id, type: type });
        };

        grid.appendChild(clone);
    });
  }

  close() {
    const modal = document.getElementById('actorModal');
    gsap.to(modal.querySelector('.actor-card'), {
        y: 100, opacity: 0, duration: 0.3, 
        onComplete: () => modal.classList.remove('active')
    });
  }
}