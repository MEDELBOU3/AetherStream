/**
 * js/gamification/ChallengeEngine.js
 * Handles XP, Leveling, Daily Resets, and Quest Tracking.
 */

import { db } from "../firebase/config.js";
import { doc, getDoc, updateDoc, setDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class ChallengeEngine {
    constructor(user) {
        this.user = user;
        this.ref = doc(db, "users", user.uid);
        this.questPool = [
            { id: 'q_movie_1', title: "Cinema Buff", desc: "Watch 1 Movie", type: "watch_movie", target: 1, reward: 200 },
            { id: 'q_movie_3', title: "Marathoner", desc: "Watch 3 Movies", type: "watch_movie", target: 3, reward: 500 },
            { id: 'q_ep_3', title: "Binge Mode", desc: "Watch 3 TV Episodes", type: "watch_episode", target: 3, reward: 300 },
            { id: 'q_ep_5', title: "Series Addict", desc: "Watch 5 TV Episodes", type: "watch_episode", target: 5, reward: 600 },
            { id: 'q_horror', title: "Fearless", desc: "Watch a Horror Movie", type: "watch_movie", requirement: 27, target: 1, reward: 400 },
            { id: 'q_comedy', title: "Laugh Track", desc: "Watch a Comedy", type: "watch_movie", requirement: 35, target: 1, reward: 250 },
            { id: 'q_action', title: "Adrenaline", desc: "Watch an Action Movie", type: "watch_movie", requirement: 28, target: 1, reward: 250 },
            { id: 'q_scifi', title: "Futurist", desc: "Watch a Sci-Fi Title", type: "watch_movie", requirement: 878, target: 1, reward: 300 }
        ];
    }

    // 1. INITIALIZE / SYNC USER STATS
    async init() {
        if (!this.user) return;

        try {
            const snap = await getDoc(this.ref);
            let data = snap.data();

            // A. Create fields if new user
            if (!data || !data.gamification) {
                const initialStats = {
                    xp: 0,
                    level: 1,
                    streak: 0,
                    lastLogin: serverTimestamp(),
                    lastQuestReset: new Date().toDateString(),
                    dailyQuests: this.pickRandomQuests()
                };
                
                // If data doesn't exist at all, set it, otherwise update
                if(!data) await setDoc(this.ref, { gamification: initialStats }, { merge: true });
                else await updateDoc(this.ref, { gamification: initialStats });
                
                return initialStats;
            }

            // B. Check for Daily Reset (New Day = New Quests)
            const stats = data.gamification;
            const today = new Date().toDateString();
            
            if (stats.lastQuestReset !== today) {
                console.log("🌞 New Day Detected! Generating Daily Quests...");
                stats.dailyQuests = this.pickRandomQuests();
                stats.lastQuestReset = today;
                // Note: We don't save yet, we save at the end of init
            }

            // C. Check Login Streak
            await this.checkStreak(stats);

            // D. Save any changes made during init (reset or streak update)
            await updateDoc(this.ref, { gamification: stats });
            
            return stats;

        } catch (e) {
            console.error("Gamification Init Error:", e);
        }
    }

    // 2. STREAK LOGIC
    async checkStreak(stats) {
        if(!stats.lastLogin) {
            stats.lastLogin = serverTimestamp();
            stats.streak = 1;
            return;
        }

        const now = new Date();
        const last = stats.lastLogin.toDate ? stats.lastLogin.toDate() : new Date(stats.lastLogin.seconds * 1000); // Handle Timestamp vs Date
        const diffHours = (now - last) / (1000 * 60 * 60);

        if (diffHours < 24) {
            // Same day login, do nothing
            return;
        } else if (diffHours >= 24 && diffHours < 48) {
            // Perfect streak continuation
            stats.streak += 1;
            this.showToast(`🔥 Streak! ${stats.streak} Days`);
            
            // Bonus XP for maintaining streak
            const bonus = 50 + (stats.streak * 10);
            stats.xp += bonus; 
        } else {
            // Missed a day
            stats.streak = 1;
        }
        
        // Update timestamp for next check
        stats.lastLogin = now;
    }

    // 3. XP & LEVELING
    async addXP(amount) {
        // Fetch current state to ensure accuracy
        const snap = await getDoc(this.ref);
        const stats = snap.data().gamification;

        stats.xp += amount;
        
        // Level Calc (Linear: Level * 1000)
        // Example: Lvl 1 needs 1000, Lvl 2 needs 2000
        const xpNeeded = stats.level * 1000;

        let leveledUp = false;
        if (stats.xp >= xpNeeded) {
            stats.level += 1;
            stats.xp = stats.xp - xpNeeded; // Carry over excess XP
            leveledUp = true;
        }

        // Save to DB
        await updateDoc(this.ref, { "gamification": stats });

        // Feedback
        this.showToast(`+${amount} XP`);
        
        if (leveledUp) {
            this.showLevelUpModal(stats.level);
        }

        // Refresh UI immediately
        if (window.missionUI) window.missionUI.refresh();
    }

    // 4. QUEST PROGRESS TRIGGER
    async trackAction(actionType, metadata = {}) {
        const snap = await getDoc(this.ref);
        const stats = snap.data().gamification;
        let quests = stats.dailyQuests || [];
        let updated = false;

        // Loop through quests
        quests = quests.map(q => {
            if (q.completed) return q; // Skip done quests

            // Check matching logic
            if (q.type === actionType) {
                // If quest has a specific requirement (like Genre ID)
                if (q.requirement) {
                    // If metadata doesn't match requirement, skip
                    if (parseInt(q.requirement) !== parseInt(metadata.genreId)) return q;
                }
                
                // Increment Progress
                q.progress += 1;
                updated = true;
                
                // Check Completion
                if (q.progress >= q.target) {
                    q.completed = true;
                    // We call addXP separate from this loop to handle db write cleanly
                    // But to avoid race conditions, we'll calculate total reward at end
                }
            }
            return q;
        });

        if (updated) {
            // Calculate total rewards from just-completed quests
            let xpReward = 0;
            const completedNow = quests.filter(q => q.completed && q.progress === q.target); // Just hit target
            
            // Note: The logic above implies we need to flag them as "reward_claimed" to avoid double paying
            // For simplicity, we assume trackAction is linear. 
            // Better approach: Calculate XP delta manually or trust the loop.
            
            // Re-save quests
            await updateDoc(this.ref, { "gamification.dailyQuests": quests });
            
            // Award XP for newly finished quests
            // We iterate again to find ones that just finished (hacky but works for simple apps)
            // Ideally, the map above would return an object { quest, xpGained }
            
            // Let's just do a manual check of completion in the map loop next time.
            // For now, we manually check which ones triggered completion in the map above? 
            // Actually, let's fix the XP issue:
            
            // FIX:
            for (let q of quests) {
                if(q.completed && !q.rewarded) {
                    await this.addXP(q.reward);
                    this.showToast(`✅ Quest Complete: ${q.title}`);
                    q.rewarded = true; // Mark as paid
                    await updateDoc(this.ref, { "gamification.dailyQuests": quests }); // Update "rewarded" flag
                }
            }

            if (window.missionUI) window.missionUI.refresh();
        }
    }

    // 5. HELPER: PICK 3 RANDOM QUESTS
    pickRandomQuests() {
        // Shuffle array
        const shuffled = this.questPool.sort(() => 0.5 - Math.random());
        // Pick first 3
        const selected = shuffled.slice(0, 3);
        
        // Add progress fields
        return selected.map(q => ({
            ...q,
            progress: 0,
            completed: false,
            rewarded: false
        }));
    }

    // 6. UI FEEDBACK
    showToast(msg) {
        const div = document.createElement('div');
        div.className = 'xp-toast';
        div.innerHTML = `
            <div style="margin-right:10px; background:gold; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; color:#000; font-size:10px;">★</div>
            ${msg}
        `;
        // Styling injected via JS or CSS
        div.style.cssText = `
            position: fixed; bottom: 30px; right: 30px;
            background: rgba(20,20,20,0.95); color: #fff;
            padding: 12px 20px; border-radius: 50px;
            border: 1px solid rgba(255,215,0,0.3);
            font-weight: 600; font-size: 14px;
            display: flex; align-items: center;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            z-index: 10000; animation: slideUpFade 0.4s ease forwards;
        `;
        document.body.appendChild(div);

        // Remove after 3s
        setTimeout(() => {
            gsap.to(div, {opacity: 0, y: 10, duration: 0.3, onComplete: () => div.remove()});
        }, 3000);
    }

    showLevelUpModal(level) {
        // Create a simple overlay
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.8);
            z-index: 10001; display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(10px);
        `;
        div.innerHTML = `
            <div style="text-align:center; transform: scale(0.8); opacity: 0;" id="lvlModalCard">
                <h1 style="font-size: 80px; margin: 0; color: gold; text-shadow: 0 0 30px orange;">${level}</h1>
                <h2 style="font-family: 'Playfair Display'; color: #fff; margin: 10px 0;">LEVEL UP</h2>
                <p style="color: #aaa;">You are now a higher being.</p>
                <button onclick="this.parentElement.parentElement.remove()" 
                    style="margin-top:20px; padding:10px 30px; background:white; border:none; border-radius:30px; font-weight:bold; cursor:pointer;">
                    CONTINUE
                </button>
            </div>
        `;
        document.body.appendChild(div);
        
        // Animate
        gsap.to("#lvlModalCard", {scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)"});
    }
}