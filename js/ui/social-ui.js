import {
    getUserProfile,
    getFriendsList,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
} from "../firebase/social.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class SocialUIController {
    constructor() {
        this.currentTab = 'profile';
        this.currentUser = null;
        this.friends = [];
    }

    async init() {
        console.log("Social UI Initializing...");
        const auth = getAuth();
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.loadSocialData();
                this.setupEventListeners();
            }
        });
    }

    async loadSocialData() {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;

        // 1. Load Profile
        const result = await getUserProfile(uid);
        if (result.success) {
            this.currentUser = result.profile;
            this.renderProfileHeader(result.profile);

            // 2. Load Friends & Requests
            this.loadFriends();
            this.loadRequests();
        }
    }

    /* --- TAB SWITCHING --- */
    switchTab(tabName) {
        // 1. Update Buttons
        document.querySelectorAll('.social-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (event && event.currentTarget) event.currentTarget.classList.add('active');

        // 2. Hide All Content
        document.querySelectorAll('.social-tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // 3. Show Target Content
        const target = document.getElementById(`tab-${tabName}`);
        if (target) {
            target.style.display = 'block';
            // Animation
            if (window.gsap) gsap.fromTo(target, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.2 });
        }

        this.currentTab = tabName;

        // 4. Refresh Data specific to tab
        if (tabName === 'friends') this.loadFriends();
        if (tabName === 'requests') this.loadRequests();
    }

    /* --- RENDERERS --- */
    renderProfileHeader(profile) {
        // Update Profile Tab UI
        const nameEl = document.getElementById('profileName');
        if (nameEl) nameEl.textContent = profile.displayName || 'User';

        const emailEl = document.getElementById('profileEmail');
        if (emailEl) emailEl.textContent = profile.email;

        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) avatarEl.src = profile.photoURL || 'https://via.placeholder.com/120';

        // Update Counts
        const fCount = document.getElementById('statFriends');
        if (fCount) fCount.textContent = profile.friends?.length || 0;

        const badgeContainer = document.getElementById('passportBadges'); // Add this DIV to your HTML
        if (badgeContainer && profile.badges) {
            badgeContainer.innerHTML = '';

            // Map of ID to Icons (Should ideally be imported from config)
            const ICONS = { 'scifi_fan': '🚀', 'night_owl': '🦉', 'binge_watcher': '🍿' };

            profile.badges.forEach(bid => {
                const badge = document.createElement('span');
                badge.className = 'passport-stamp';
                badge.innerHTML = ICONS[bid] || '🏅';
                badge.title = bid;
                badgeContainer.appendChild(badge);
            });
        }
    }

    async loadFriends() {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;

        const res = await getFriendsList(uid);
        const container = document.getElementById('friendsList');
        if (!container) return;

        container.innerHTML = '';

        if (!res.friends || res.friends.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No friends yet.</p></div>`;
            return;
        }

        const template = document.getElementById('friendCardTemplate');
        res.friends.forEach(f => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.friend-avatar').src = f.photoURL || 'https://via.placeholder.com/80';
            clone.querySelector('.friend-name').textContent = f.displayName;
            clone.querySelector('.friend-status').textContent = 'Online'; // Mock

            const removeBtn = clone.querySelector('.danger');
            if (removeBtn) removeBtn.onclick = () => this.removeFriend(f.uid);

            container.appendChild(clone);
        });

        // Update Count in Header
        const countEl = document.getElementById('friendsCount');
        if (countEl) countEl.textContent = `${res.friends.length} friends`;
    }

    async loadRequests() {
        const uid = getAuth().currentUser?.uid;
        const res = await getUserProfile(uid); // Re-fetch to get request array
        const requests = res.profile?.friendRequests || [];

        const container = document.getElementById('requestsList');
        if (!container) return;

        container.innerHTML = '';

        const badge = document.getElementById('requestsBadge');
        if (badge) badge.textContent = requests.length;

        if (requests.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No pending requests</p></div>`;
            return;
        }

        const template = document.getElementById('requestCardTemplate');
        requests.forEach(req => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('.request-avatar').src = req.fromPhoto || 'https://via.placeholder.com/60';
            clone.querySelector('.request-name').textContent = req.fromName || 'User';

            clone.querySelector('.accept').onclick = () => this.respondToRequest(req.from, true);
            clone.querySelector('.reject').onclick = () => this.respondToRequest(req.from, false);

            container.appendChild(clone);
        });
    }

    /* --- ACTIONS --- */
    async searchUsers(query) {
        const container = document.getElementById('searchUsersList');
        if (!container) return;

        if (query.length < 3) {
            container.innerHTML = '<div class="empty-state"><p>Type to search...</p></div>';
            return;
        }

        container.innerHTML = '<div class="loading">Searching...</div>';
        const result = await searchUsers(query);
        container.innerHTML = '';

        if (!result.users || result.users.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No users found.</p></div>';
            return;
        }

        const template = document.getElementById('searchResultTemplate');
        result.users.forEach(u => {
            if (u.uid === this.currentUser.uid) return; // Skip self

            const clone = template.content.cloneNode(true);
            clone.querySelector('.result-avatar').src = u.photoURL || 'https://via.placeholder.com/60';
            clone.querySelector('.result-name').textContent = u.displayName;
            clone.querySelector('.result-email').textContent = u.email;

            // Check if already friend
            const isFriend = this.currentUser.friends?.includes(u.uid);
            const btn = clone.querySelector('#actionBtn');

            if (isFriend) {
                btn.textContent = "Friends";
                btn.disabled = true;
                btn.classList.add('btn-outline');
            } else {
                btn.onclick = () => this.sendRequest(u.uid, btn);
            }

            container.appendChild(clone);
        });
    }

    async sendRequest(uid, btn) {
        const myUid = getAuth().currentUser?.uid;
        btn.textContent = "...";
        await sendFriendRequest(myUid, uid);
        btn.textContent = "Sent";
        btn.disabled = true;
    }

    async respondToRequest(fromUid, accept) {
        const myUid = getAuth().currentUser?.uid;
        if (accept) await acceptFriendRequest(myUid, fromUid);
        else await rejectFriendRequest(myUid, fromUid);

        // Reload to update UI
        this.loadRequests();
        this.loadFriends();
    }

    async removeFriend(uid) {
        if (!confirm("Remove friend?")) return;
        const myUid = getAuth().currentUser?.uid;
        await removeFriend(myUid, uid);
        this.loadFriends();
    }
}