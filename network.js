const Network = {
    db: null,
    auth: null,
    myId: null, // This is now the Firebase UID
    myDisplayName: null, // "Survivor Name"
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
        if (typeof firebase !== 'undefined' && !this.db) {
            try {
                if (!firebase.apps.length) firebase.initializeApp(this.config);
                this.db = firebase.database();
                this.auth = firebase.auth();
                this.active = true;
            } catch (e) {
                console.error("Firebase Init Error:", e);
                this.active = false;
            }
        }
    },

    register: async function(email, password, name) {
        if(!this.active) throw new Error("Netzwerkfehler");
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Profil updaten mit Namen
            await user.updateProfile({ displayName: name });
            
            this.myId = user.uid;
            this.myDisplayName = name;
            
            // Initiale Datenbankeinträge
            await this.db.ref('players/' + this.myId).set({
                name: name,
                x: 20, y: 20, lvl: 1, sector: {x:0, y:0}, lastSeen: Date.now()
            });
            
            return null; // Kein Savegame vorhanden, neues Spiel
        } catch(e) {
            throw e;
        }
    },

    login: async function(email, password) {
        if (!this.active) throw new Error("Netzwerkfehler");
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            this.myId = user.uid;
            this.myDisplayName = user.displayName || "Unknown";

            // Lade Savegame
            const snapshot = await this.db.ref('saves/' + this.myId).once('value');
            const saveData = snapshot.val();
            
            this.startPresence();
            return saveData; 
        } catch(e) {
            console.error("Auth Error:", e);
            throw e;
        }
    },

    startPresence: function() {
        // Disconnect Handler
        this.db.ref('players/' + this.myId).onDisconnect().remove();
        
        // Listener für andere
        this.db.ref('players').on('value', (snapshot) => {
            const rawData = snapshot.val() || {};
            const now = Date.now();
            const cleanData = {};

            for (let pid in rawData) {
                if (pid === this.myId) continue;
                const p = rawData[pid];
                if (p.lastSeen && (now - p.lastSeen > 120000)) continue; 
                cleanData[p.name || pid] = p; // Nutze Namen als Key für UI wenn möglich, oder UID
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
            UI.log(`TERMINAL LINK: ${this.myDisplayName}`, "text-green-400 font-bold");
        }
        
        // Heartbeat
        if(this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 5000);
        
        // Initial Ping
        this.sendHeartbeat();
    },

    save: function(gameState) {
        if(!this.active || !this.myId) return;
        // Speichere den Namen im Save, falls mal gebraucht
        gameState.playerName = this.myDisplayName;
        
        const saveObj = JSON.parse(JSON.stringify(gameState));
        this.db.ref('saves/' + this.myId).set(saveObj)
            .then(() => { if(typeof UI !== 'undefined') UI.log("SPIEL GESPEICHERT.", "text-cyan-400"); })
            .catch(e => console.error("Save Error:", e));
    },

    deleteSave: function() {
        if(!this.active || !this.myId) return;
        this.db.ref('saves/' + this.myId).remove();
        // Spielerdaten behalten wir evtl. kurz
    },

    disconnect: function() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.auth) this.auth.signOut();
        this.active = false;
        this.myId = null;
    },

    sendHeartbeat: function() {
        if (!this.active || !this.myId) return;
        // Wir updaten lastSeen. Wenn Game läuft, auch Position.
        let updateData = { lastSeen: Date.now(), name: this.myDisplayName };
        
        if(typeof Game !== 'undefined' && Game.state && Game.state.player) {
            updateData.x = Game.state.player.x;
            updateData.y = Game.state.player.y;
            updateData.sector = Game.state.sector;
            updateData.lvl = Game.state.lvl;
        }
        
        this.db.ref('players/' + this.myId).update(updateData);
    },
    
    // Alias für alte Calls, leitet an Heartbeat weiter da Position jetzt dort ist
    sendMove: function(x, y, level, sector) {
        this.sendHeartbeat();
    }
};
