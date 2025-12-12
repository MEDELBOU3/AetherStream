import { getAccountProfiles, createProfile, deleteProfile, setActiveProfile } from "../firebase/profiles.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export class ProfileGateUI {
    constructor() {
        this.container = document.getElementById('profileGateView');
        this.grid = document.getElementById('profileGateGrid');
        this.isManaging = false;
    }

    async init() {
        const auth = getAuth();
        if (!auth.currentUser) return;

        // Force display flex
        this.container.style.display = 'flex';
        this.container.classList.add('active');

        await this.loadProfiles(auth.currentUser.uid);
    }

    async loadProfiles(uid) {
        const profiles = await getAccountProfiles(uid);
        this.renderGrid(profiles);
    }

    renderGrid(profiles) {
        this.grid.innerHTML = '';

        // 1. Render Existing Profiles
        profiles.forEach(p => {
            const el = document.createElement('div');
            el.className = 'gate-profile';
            
            // Kids get a Blue Border
            const borderCol = p.isKids ? '#00A8E8' : 'transparent';
            
            el.innerHTML = `
                <div class="gate-avatar-wrapper" style="border-color:${borderCol}">
                    <img src="${p.avatar}" alt="${p.name}">
                    <div class="gate-overlay"><i class="fas fa-trash"></i></div>
                </div>
                <div class="gate-name">${p.name}</div>
            `;
            
            el.onclick = () => {
                if(this.isManaging) {
                    // Prevent deleting Admin
                    if(p.name === 'Admin') {
                        alert("Cannot delete main Admin profile.");
                        return;
                    }
                    this.deleteProfileHandler(p.id);
                } else {
                    this.selectProfile(p);
                }
            };
            this.grid.appendChild(el);
        });

        // 2. Render "Add Profile" Button ONLY if profiles < 5
        if (profiles.length < 5) {
            const addBtn = document.createElement('div');
            addBtn.className = 'gate-profile add-profile-btn';
            addBtn.innerHTML = `
                <div class="gate-avatar-wrapper add-icon">
                    <i class="fas fa-plus-circle"></i>
                </div>
                <div class="gate-name">Add Profile</div>
            `;
            addBtn.onclick = () => this.openAddModal();
            this.grid.appendChild(addBtn);
        }
    }

    selectProfile(profile) {
        // Animation out
        gsap.to(this.container, {
            opacity: 0,
            scale: 1.1,
            duration: 0.4,
            onComplete: () => {
                this.container.classList.remove('active');
                this.container.style.display = 'none'; // Hide completely
                setActiveProfile(profile);
            }
        });
    }

    toggleManageMode() {
        this.isManaging = !this.isManaging;
        const btn = document.getElementById('manageProfilesBtn');
        btn.innerText = this.isManaging ? "Done" : "Manage Profiles";
        btn.classList.toggle('active');
        this.grid.classList.toggle('managing');
    }

    async deleteProfileHandler(profileId) {
        if (confirm("Delete this profile? History will be lost.")) {
            const uid = getAuth().currentUser.uid;
            await deleteProfile(uid, profileId);
            this.loadProfiles(uid); // Refresh
        }
    }

    // --- MODAL LOGIC ---

    openAddModal() {
        const modal = document.getElementById('addProfileModal');
        if (modal) {
            modal.classList.add('active');
            gsap.fromTo(modal.querySelector('.auth-card'), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });

            // Reset
            document.getElementById('newProfileName').value = '';
            document.getElementById('newProfileIsKids').checked = false;
            this.toggleNewProfileMode();
        } else {
            console.error("Add Profile Modal HTML missing.");
        }
    }

    closeAddModal() {
        document.getElementById('addProfileModal').classList.remove('active');
    }

    toggleNewProfileMode() {
        const isKids = document.getElementById('newProfileIsKids').checked;
        const img = document.getElementById('newProfileAvatarPreview');

        if (isKids) {
            // Cute Kid Avatar
            img.src = "https://videos.openai.com/az/vg-assets/task_01kc9qgxq2eczv2j84v5f8zn38%2F1765558290_img_1.webp?se=2025-12-14T00%3A00%3A00Z&sp=r&sv=2024-08-04&sr=b&skoid=cfbc986b-d2bc-4088-8b71-4f962129715b&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-12-12T01%3A09%3A13Z&ske=2025-12-19T01%3A14%3A13Z&sks=b&skv=2024-08-04&sig=uDC%2BAbw1SLvCpNuKkMTNil37MJaQvBYh4P7o5Cj4N7A%3D&ac=oaivgprodscus2";
        } else {
            // Standard Adult Avatar
            img.src = "https://i.pinimg.com/736x/ff/a6/42/ffa6421da8b8b6b345f26bc1f8a90139.jpg";
        }
    }

    async submitNewProfile() {
        const nameInput = document.getElementById('newProfileName');
        const name = nameInput.value.trim();
        const isKids = document.getElementById('newProfileIsKids').checked;

        if (!name) {
            alert("Please enter a name");
            return;
        }

        const auth = getAuth();
        if (!auth.currentUser) return;

        // Visual Feedback
        const btn = event.target;
        const oldText = btn.innerText;
        btn.innerText = "Creating...";
        btn.disabled = true;

        // Define Avatar based on Type
        let avatarUrl;
        if (isKids) {
            avatarUrl = "https://videos.openai.com/az/vg-assets/task_01kc9qgxq2eczv2j84v5f8zn38%2F1765558290_img_1.webp?se=2025-12-14T00%3A00%3A00Z&sp=r&sv=2024-08-04&sr=b&skoid=cfbc986b-d2bc-4088-8b71-4f962129715b&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-12-12T01%3A09%3A13Z&ske=2025-12-19T01%3A14%3A13Z&sks=b&skv=2024-08-04&sig=uDC%2BAbw1SLvCpNuKkMTNil37MJaQvBYh4P7o5Cj4N7A%3D&ac=oaivgprodscus2";
        } else {
            const avatars = [
                "https://i.pinimg.com/736x/ff/a6/42/ffa6421da8b8b6b345f26bc1f8a90139.jpg",
                "https://i.pinimg.com/736x/fd/a7/9a/fda79a9471d43a39d2d8eabc8720f8aa.jpg",
                "https://i.pinimg.com/1200x/8b/c4/ba/8bc4babefe6475305f198f37a282f810.jpg"
            ];
            avatarUrl = avatars[Math.floor(Math.random() * avatars.length)];
        }

        const theme = isKids ? 'kids' : 'dark';

        try {
            await createProfile(auth.currentUser.uid, name, avatarUrl, theme, isKids);
            this.closeAddModal();
            this.loadProfiles(auth.currentUser.uid); // Refresh grid
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    }
}