// network.js - v0.0.10a
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

    // Initialisiert nur Firebase, verbindet aber noch nicht den Spieler
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

    // Der eigentliche Login Prozess
    login: async function(userId) {
        if (!this.active) return null;
        
        this.myId = userId;
        
        try {
            // Versuche Savegame zu laden
            const snapshot = await this.db.ref('saves/' + this.myId).once('value');
            const saveData = snapshot.val();
            
            // Starte Presence System (Bewegung sichtbar machen)
            this.startPresence();
            
            return saveData; // Gibt null zurück wenn kein Save existiert
        } catch(e) {
            console.error("Login Error:", e);
            throw e;
        }
    },

    startPresence: function() {
        // Beim Schließen löschen (nur die Position, nicht das Savegame!)
        this.db.ref('players/' + this.myId).onDisconnect().remove();
        
        // Andere Spieler hören
        this.db.ref('players').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            
            // UI Counter
            if(typeof UI !== 'undefined') {
                const el = document.getElementById('val-players');
                if(el) el.textContent = `${Object.keys(data).length} ONLINE`;
            }

            // Auto-Teleport (Jump to Buddy) beim ersten Start
            if (!this.initialJoinDone && Object.keys(data).length > 1) {
                this.initialJoinDone = true;
                const ids = Object.keys(data);
                for(let id of ids) {
                    if(id !== this.myId) {
                        const buddy = data[id];
                        if(buddy.sector && buddy.x) {
                            if(typeof Game !== 'undefined') {
                                setTimeout(() => Game.teleportTo(buddy.sector, buddy.x, buddy.y), 500);
                            }
                            break;
                        }
                    }
                }
            } else if (!this.initialJoinDone) {
                this.initialJoinDone = true;
            }

            delete data[this.myId];
            this.otherPlayers = data;
            if(typeof Game !== 'undefined' && Game.draw) Game.draw();
        });
        
        if(typeof UI !== 'undefined') {
            UI.setConnectionState('online');
            UI.log(`TERMINAL LINK: ID ${this.myId}`, "text-green-400 font-bold");
        }
    },

    // Spielstand speichern (dauerhaft)
    save: function(gameState) {
        if(!this.active || !this.myId) return;
        this.db.ref('saves/' + this.myId).set(gameState)
            .then(() => { if(typeof UI !== 'undefined') UI.log("SPIEL GESPEICHERT.", "text-cyan-400"); })
            .catch(e => console.error("Save Error:", e));
    },

    // Position senden (flüchtig)
    sendMove: function(x, y, level, sector) {
        if (!this.active || !this.myId) return;
        this.db.ref('players/' + this.myId).set({
            x: x, y: y, lvl: level, sector: sector, lastSeen: Date.now()
        });
    }
};
