import { getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class MissionUI {
    constructor() {
        this.overlay = document.getElementById('missionOverlay');
    }

    open() {
        if (!this.overlay) return;

        // 1. Prepare for Animation (Set Initial States)
        this.overlay.style.display = 'block';
        
        // Refresh data BEFORE animating so values aren't empty
        this.refresh().then(() => {
            
            // 2. GSAP ENTRANCE TIMELINE
            const tl = gsap.timeline();

            // Background Fade
            tl.to(this.overlay, { opacity: 1, duration: 0.4 });

            // Header Elements (Slide Down)
            tl.fromTo(".mission-header > div", 
                { y: -30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.7)" },
                "-=0.2"
            );

            // Animate Circle Stroke
            const circle = document.querySelector('.level-circle .progress');
            if(circle) {
                // Temporarily set to 0 to animate it filling up
                const targetOffset = circle.style.strokeDashoffset;
                gsap.fromTo(circle, 
                    { strokeDashoffset: 283 },
                    { strokeDashoffset: targetOffset, duration: 1.5, ease: "power2.out" },
                    "-=0.5"
                );
            }

            // Animate XP Bar
            const bar = document.getElementById('userXpBar');
            if(bar) {
                const targetWidth = bar.style.width;
                gsap.fromTo(bar, 
                    { width: "0%" }, 
                    { width: targetWidth, duration: 1, ease: "power2.out" },
                    "-=1"
                );
            }

            // Stagger in Quests (Slide Up)
            tl.fromTo(".quest-card", 
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: "power2.out" },
                "-=0.8"
            );

            // Stagger in Badges (Pop)
            tl.fromTo(".ach-badge", 
                { scale: 0, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, stagger: 0.05, ease: "back.out(1.5)" },
                "-=0.5"
            );
        });
    }

    close() {
        if (!this.overlay) return;
        
        // GSAP Exit
        gsap.to(this.overlay, { 
            opacity: 0, 
            duration: 0.3, 
            onComplete: () => {
                this.overlay.style.display = 'none';
            }
        });
    }

    async refresh() {
        if (!window.challengeSystem) return;
        
        const snap = await getDoc(window.challengeSystem.ref);
        if(!snap.exists()) return;

        const data = snap.data().gamification;
        if(!data) return;

        // --- UPDATE STATS ---
        document.getElementById('userLevelDisplay').innerText = `LVL ${data.level}`;
        document.getElementById('userStreak').innerText = data.streak;
        
        const nextLevelXP = data.level * 1000;
        const percentage = (data.xp / nextLevelXP) * 100;
        
        // We set styles directly so GSAP can grab them in the open() function
        const bar = document.getElementById('userXpBar');
        if(bar) bar.style.width = `${percentage}%`;
        
        document.getElementById('xpText').innerText = `${data.xp} / ${nextLevelXP} XP`;
        
        const circle = document.querySelector('.level-circle .progress');
        if(circle) {
            const offset = 283 - (283 * percentage / 100);
            circle.style.strokeDashoffset = offset;
        }

        // --- RENDER QUESTS ---
        const list = document.getElementById('dailyQuestsList');
        list.innerHTML = '';
        data.dailyQuests.forEach(q => {
            const pct = (q.progress / q.target) * 100;
            const card = document.createElement('div');
            card.className = `quest-card ${q.completed ? 'completed' : ''}`;
            
            // Add tooltip logic if needed
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <h4 style="margin:0; color:#fff; font-size:16px;">
                        ${q.completed ? '<i class="fas fa-check-circle" style="color:gold; margin-right:5px;"></i>' : ''} 
                        ${q.title}
                    </h4>
                    <span style="color:${q.completed ? 'gold' : 'var(--accent)'}; font-weight:700; font-size:12px;">+${q.reward} XP</span>
                </div>
                <p style="margin:0 0 10px; font-size:13px; color:#aaa;">${q.desc}</p>
                
                <div class="quest-progress-track">
                    <div class="quest-progress-fill" style="width:${pct}%"></div>
                </div>
                <div style="text-align:right; font-size:11px; margin-top:5px; color:#666; font-weight:600;">
                    ${q.progress} / ${q.target}
                </div>
            `;
            list.appendChild(card);
        });

        // --- RENDER ACHIEVEMENTS ---
        const grid = document.getElementById('achievementsList');
        grid.innerHTML = '';
        const badges = [
            { lvl: 1, icon: 'fa-user-astronaut', title: "Traveler" },
            { lvl: 5, icon: 'fa-film', title: "Cinephile" },
            { lvl: 10, icon: 'fa-video', title: "Streamer" },
            { lvl: 20, icon: 'fa-crown', title: "Royalty" },
            { lvl: 50, icon: 'fa-dragon', title: "Legend" }
        ];

        badges.forEach(b => {
            const isUnlocked = data.level >= b.lvl;
            const el = document.createElement('div');
            el.className = `ach-badge ${isUnlocked ? 'unlocked' : ''}`;
            // Add title for hover
            el.setAttribute('title', isUnlocked ? b.title : `Unlock at Level ${b.lvl}`);
            el.innerHTML = `<i class="fas ${b.icon}"></i>`;
            grid.appendChild(el);
        });
    }
}

// Initialize Global
window.missionUI = new MissionUI();