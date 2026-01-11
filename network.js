// [TIMESTAMP] 2026-01-09 19:25:00 - network.js - Added sendBugReport to RTDB

const Network = {
    db: null,
    auth: null,
    myId: null,
    myDisplayName: null,
    otherPlayers: {},
    active: false,
    heartbeatInterval: null,

    config: {
        apiKey: "AIzaSyCgSK4nJ3QOVMBd7m9RSmURflSRWN4ejBY",
        authDomain: "pipboy-rpg.firebaseapp.com",
        databaseURL: "https://pipboy-rpg-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "pipboy-rpg",
        storageBucket: "pipboy-rpg.firebasestorage.app",
        messagingSenderId: "1023458799306",
        appId: "1:1023458799306:web:2d8c1abc23b02beac14e33",
        measurementId: "G-DYGLZTMWWT"
    },

    init: function() {
        this.active = true;
        if (typeof firebase !== 'undefined' && !this.db) {
            try {
                if (!firebase.apps.length) firebase.initializeApp(this.config);
                this.db = firebase.database();
                this.auth = firebase.auth();
            } catch (e) {
                console.error("Firebase Init Error:", e);
                this.active = false;
            }
        }
    },

    register: async function(email, password, name) {
        if(!this.active) throw new Error("Netzwerk nicht aktiv (Init Failed)");
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await user.updateProfile({ displayName: name });
            this.myId = user.uid;
            this.myDisplayName = name;
            return {}; 
        } catch(e) {
            throw e;
        }
    },

    login: async function(email, password) {
        this.init(); 
        if (!this.active) throw new Error("Verbindung zu Vault-Tec unterbrochen.");
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            this.myId = user.uid;
            this.myDisplayName = user.displayName || "Unknown";
            const snapshot = await this.db.ref('saves/' + this.myId).once('value');
            return snapshot.val() || {}; 
        } catch(e) {
            console.error("Auth Error:", e);
            throw e;
        }
    },
    
    // --- HIGHSCORE SYSTEM ---
    updateHighscore: function(gameState) {
        if(!this.active || !this.myId || !gameState) return;
        const safeName = (gameState.playerName || "Unknown").replace(/[.#$/[\]]/g, "_");
        const entry = {
            name: gameState.playerName || "Unknown",
            lvl: gameState.lvl,
            kills: gameState.kills || 0,
            xp: gameState.xp + (gameState.lvl * 1000), 
            status: 'alive',
            owner: this.myId,
            timestamp: Date.now()
        };
        
        this.db.ref(`leaderboard/${safeName}`).update(entry);
    },

    registerDeath: function(gameState) {
        if(!this.active || !gameState) return;
        const safeName = (gameState.playerName || "Unknown").replace(/[.#$/[\]]/g, "_");
        
        const entry = {
            name: gameState.playerName || "Unknown",
            lvl: gameState.lvl,
            kills: gameState.kills || 0,
            xp: gameState.xp + (gameState.lvl * 1000),
            status: 'dead', 
            owner: this.myId,
            deathTime: Date.now()
        };
        this.db.ref(`leaderboard/${safeName}`).set(entry);
    },

    checkAndRemoveDeadChar: async function(charName) {
        if(!this.active) return;
        const safeName = charName.replace(/[.#$/[\]]/g, "_");
        const ref = this.db.ref(`leaderboard/${safeName}`);
        
        const snap = await ref.once('value');
        if(snap.exists()) {
            const val = snap.val();
            if(val.owner === this.myId && val.status === 'dead') {
                await ref.remove();
            }
        }
    },

    getHighscores: async function() {
        if(!this.active) return [];
        const snap = await this.db.ref('leaderboard').once('value');
        const list = [];
        snap.forEach(child => {
            list.push(child.val());
        });
        return list;
    },
    // -------------------------

    saveToSlot: function(slotIndex, gameState) {
        if(!this.active || !this.myId) return;
        const saveObj = JSON.parse(JSON.stringify(gameState));
        
        // [v2.7] E-Mail für Admin-Zwecke mitspeichern
        if(this.auth && this.auth.currentUser && this.auth.currentUser.email) {
            saveObj._userEmail = this.auth.currentUser.email;
        }
        // Timestamp für "Zuletzt online"
        saveObj._lastSeen = Date.now();

        const updates = {};
        updates[`saves/${this.myId}/${slotIndex}`] = saveObj;
        this.db.ref().update(updates)
            .then(() => { if(typeof UI !== 'undefined') UI.log("SLOT " + (slotIndex+1) + " GESPEICHERT.", "text-cyan-400"); })
            .catch(e => console.error("Save Error:", e));
    },
    
// [2026-01-11 08:52] network.js - Adjusted deleteSave to use state.saveSlot

// ... (Suche die deleteSave Funktion am Ende der Datei)

    deleteSave: function() {
        if(!this.active || !this.myId) return;
        // Nutze saveSlot aus dem state
        if (typeof Game !== 'undefined' && Game.state && Game.state.saveSlot !== undefined) {
            this.deleteSlot(Game.state.saveSlot);
        } else {
            console.warn("deleteSave: Kein aktiver Slot im Game.state gefunden.");
        }
    },

// ...



    startPresence: function() {
        if(!this.myId) return;
        this.db.ref('players/' + this.myId).onDisconnect().remove();
        this.db.ref('players').on('value', (snapshot) => {
            const rawData = snapshot.val() || {};
            const now = Date.now();
            const cleanData = {};
            for (let pid in rawData) {
                if (pid === this.myId) continue;
                const p = rawData[pid];
                if (p.lastSeen && (now - p.lastSeen > 120000)) continue; 
                cleanData[p.name || pid] = p;
            }
            this.otherPlayers = cleanData;
            if(typeof UI !== 'undefined') {
                const el = document.getElementById('val-players');
                if(el) el.textContent = `${Object.keys(this.otherPlayers).length + 1}`; 
                if(UI.els.spawnScreen && UI.els.spawnScreen.style.display !== 'none') {
                    UI.renderSpawnList(this.otherPlayers);
                }
                UI.updatePlayerList();
            }
            if(typeof Game !== 'undefined' && Game.draw) Game.draw();
        });
        
        if(typeof UI !== 'undefined') {
            UI.setConnectionState('online');
            const charName = (typeof Game !== 'undefined' && Game.state && Game.state.playerName) ? Game.state.playerName : this.myDisplayName;
            UI.log(`TERMINAL LINK: ${charName}`, "text-green-400 font-bold");
        }
        
        if(this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 5000);
        this.sendHeartbeat();
    },

    save: function(gameState) {
        if (typeof Game !== 'undefined' && Game.state && Game.state.saveSlot !== undefined) {
            this.saveToSlot(Game.state.saveSlot, gameState);
        } else {
            console.error("No Save Slot defined!");
        }
    },
    
    deleteSave: function() {
        if(!this.active || !this.myId) return;
        if (typeof Game !== 'undefined' && Game.state && Game.state.saveSlot !== undefined) {
            this.deleteSlot(Game.state.saveSlot);
        }
    },

    disconnect: function() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.auth) this.auth.signOut();
        this.active = false;
        this.myId = null;
    },

    sendHeartbeat: function() {
        if (!this.active || !this.myId) return;
        if(typeof Game !== 'undefined' && Game.state && Game.state.view === 'map') {
             this.db.ref('players/' + this.myId).update({
                lastSeen: Date.now(),
                name: Game.state.playerName || this.myDisplayName,
                x: Game.state.player.x,
                y: Game.state.player.y,
                sector: Game.state.sector,
                lvl: Game.state.lvl
            });
        }
    },
    
    sendMove: function(x, y, level, sector) {
        this.sendHeartbeat();
    },

    // [NEU] Bug Report senden (für Realtime DB)
    sendBugReport: async function(reportData) {
        if (!this.db) {
            console.error("Datenbank nicht verbunden.");
            return false;
        }
        try {
            // Push erstellt einen neuen Eintrag mit eindeutiger ID unter 'bug_reports'
            await this.db.ref("bug_reports").push(reportData);
            console.log("Bug Report erfolgreich an Firebase gesendet.");
            return true;
        } catch (e) {
            console.error("Fehler beim Senden des Bug Reports:", e);
            return false;
        }
    }
};
