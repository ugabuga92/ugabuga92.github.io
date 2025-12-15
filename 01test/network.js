// network.js - v0.0.9a
const Network = {
    db: null,
    myId: null,
    otherPlayers: {},
    active: false,
    initialJoinDone: false, // Damit wir nur EINMAL am Anfang springen

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
        if (typeof firebase !== 'undefined') {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(this.config);
                }
                
                this.db = firebase.database();
                this.active = true;
                this.myId = 'survivor_' + Math.floor(Math.random() * 9999);
                
                if(typeof UI !== 'undefined') {
                    UI.setConnectionState('online');
                    UI.log(`TERMINAL LINK ESTABLISHED: ID ${this.myId}`, "text-green-400 font-bold");
                }

                this.db.ref('players/' + this.myId).onDisconnect().remove();
                
                // DATA LISTENER
                this.db.ref('players').on('value', (snapshot) => {
                    const data = snapshot.val() || {};
                    
                    // 1. UPDATE PLAYER COUNT (inklusive mir selbst)
                    const count = Object.keys(data).length;
                    if(typeof UI !== 'undefined') {
                        const el = document.getElementById('val-players');
                        if(el) el.textContent = `${count} ONLINE`;
                    }

                    // 2. INITIAL TELEPORT (Jump to Buddy)
                    // Wenn ich gerade erst reingekommen bin (initialJoinDone = false)
                    // UND es gibt andere Spieler...
                    if (!this.initialJoinDone && count > 1) {
                        this.initialJoinDone = true;
                        
                        // Finde den ersten anderen Spieler
                        const ids = Object.keys(data);
                        for(let id of ids) {
                            if(id !== this.myId) {
                                const buddy = data[id];
                                if(buddy.sector && buddy.x) {
                                    UI.log(`>> Signal gefunden! Teleportiere zu ${id}...`, "text-cyan-400");
                                    // Teleport Game Function aufrufen
                                    if(typeof Game !== 'undefined') {
                                        Game.teleportTo(buddy.sector, buddy.x, buddy.y);
                                    }
                                    break; // Nur zum ersten springen
                                }
                            }
                        }
                    } else if (!this.initialJoinDone) {
                        // Ich bin der Erste
                        this.initialJoinDone = true;
                        UI.log(">> Keine anderen Signale. Du bist der Host.", "text-gray-500");
                    }

                    // 3. STORE OTHERS
                    delete data[this.myId]; 
                    this.otherPlayers = data;
                    if(Game && Game.draw) Game.draw(); 
                });
                
            } catch (e) {
                console.error("Firebase Error:", e);
                if(typeof UI !== 'undefined') UI.setConnectionState('offline');
            }
        } else {
            if(typeof UI !== 'undefined') UI.setConnectionState('offline');
        }
    },

    sendMove: function(x, y, level, sector) {
        if (!this.active) return;
        this.db.ref('players/' + this.myId).set({
            x: x,
            y: y,
            lvl: level,
            sector: sector,
            lastSeen: Date.now()
        });
    }
};
