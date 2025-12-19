const Network = {
    db: null,
    myId: null,
    otherPlayers: {},
    active: false,
    initialJoinDone: false,

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
                this.active = true;
            } catch (e) {
                console.error("Firebase Init Error:", e);
                this.active = false;
            }
        }
    },

    login: async function(userId) {
        if (!this.active) return null;
        this.myId = userId;
        try {
            // NEU: Check ob Spieler bereits online ist
            const playerRef = this.db.ref('players/' + this.myId);
            const pSnap = await playerRef.once('value');
            if (pSnap.exists()) {
                const pData = pSnap.val();
                // Wenn lastSeen weniger als 2 Minuten her ist -> Login verweigern
                if (pData.lastSeen && Date.now() - pData.lastSeen < 120000) {
                    throw new Error("ALREADY_ONLINE");
                }
                // Ansonsten: Überschreiben erlaubt (Zombie-Session)
            }

            const snapshot = await this.db.ref('saves/' + this.myId).once('value');
            const saveData = snapshot.val();
            console.log("DB LOAD:", this.myId, saveData ? "FOUND" : "NULL");
            this.startPresence();
            return saveData; 
        } catch(e) {
            console.error("Login Error:", e);
            throw e;
        }
    },

    startPresence: function() {
        // Disconnect Handler setzen
        this.db.ref('players/' + this.myId).onDisconnect().remove();
        
        this.db.ref('players').on('value', (snapshot) => {
            const rawData = snapshot.val() || {};
            const now = Date.now();
            const cleanData = {};

            // NEU: Ghost Filter & Datenbereinigung
            for (let pid in rawData) {
                // Filter mich selbst raus
                if (pid === this.myId) continue;

                const p = rawData[pid];
                // Wenn lastSeen existiert und älter als 5 Minuten ist -> Ignorieren (Ghost)
                if (p.lastSeen && (now - p.lastSeen > 300000)) {
                    continue; 
                }
                cleanData[pid] = p;
            }

            this.otherPlayers = cleanData;

            if(typeof UI !== 'undefined') {
                const el = document.getElementById('val-players');
                if(el) el.textContent = `${Object.keys(this.otherPlayers).length + 1} ONLINE`; // +1 für mich
                
                if(UI.els.spawnScreen && UI.els.spawnScreen.style.display !== 'none') {
                    UI.renderSpawnList(this.otherPlayers);
                }
            }

            if(typeof Game !== 'undefined' && Game.draw) Game.draw();
        });
        
        if(typeof UI !== 'undefined') {
            UI.setConnectionState('online');
            UI.log(`TERMINAL LINK: ID ${this.myId}`, "text-green-400 font-bold");
        }
        
        // Initialen Ping senden
        this.sendMove(20, 20, 1, {x:0, y:0}); 
    },

    save: function(gameState) {
        if(!this.active || !this.myId) {
            console.error("Save failed: No network or ID");
            return;
        }
        const saveObj = JSON.parse(JSON.stringify(gameState));
        this.db.ref('saves/' + this.myId).set(saveObj)
            .then(() => { if(typeof UI !== 'undefined') UI.log("SPIEL GESPEICHERT.", "text-cyan-400"); })
            .catch(e => console.error("Save Error:", e));
    },

    deleteSave: function() {
        if(!this.active || !this.myId) return;
        this.db.ref('saves/' + this.myId).remove();
        this.db.ref('players/' + this.myId).remove();
    },

    disconnect: function() {
        if(this.myId && this.db) {
            this.db.ref('players/' + this.myId).remove();
            this.db.ref('players').off(); 
        }
        this.active = false;
        this.myId = null;
    },

    sendMove: function(x, y, level, sector) {
        if (!this.active || !this.myId) return;
        // NEU: lastSeen wird immer aktualisiert für Ghost-Erkennung
        this.db.ref('players/' + this.myId).set({
            x: x, y: y, lvl: level, sector: sector, lastSeen: Date.now()
        });
    }
};
