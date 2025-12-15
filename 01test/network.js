// network.js - v0.0.8b
const Network = {
    db: null,
    myId: null,
    otherPlayers: {},
    active: false,

    // DEINE ECHTE CONFIG
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
        // Prüfen, ob die Firebase-Bibliothek in index.html geladen wurde
        if (typeof firebase !== 'undefined') {
            try {
                // Nur initialisieren, wenn noch keine App läuft
                if (!firebase.apps.length) {
                    firebase.initializeApp(this.config);
                }
                
                this.db = firebase.database();
                this.active = true;
                
                // Zufällige ID für diese Sitzung erstellen
                // Später könnten wir hier feste User-Namen nutzen
                this.myId = 'vault_survivor_' + Math.floor(Math.random() * 9999);
                
                UI.log("NETZWERK: Verbunden! ID: " + this.myId, "text-cyan-400");

                // AUTOMATISCH AUFRÄUMEN:
                // Wenn wir das Fenster schließen, lösche unseren Charakter aus der DB
                this.db.ref('players/' + this.myId).onDisconnect().remove();
                
                // HÖREN: Was machen die anderen?
                this.db.ref('players').on('value', (snapshot) => {
                    const data = snapshot.val() || {};
                    // Mich selbst aus den Daten filtern, damit ich mich nicht doppelt sehe
                    delete data[this.myId]; 
                    this.otherPlayers = data;
                    
                    // Trigger für UI Update, falls wir uns gerade nicht bewegen
                    if(Game && Game.draw) Game.draw(); 
                });
                
            } catch (e) {
                console.error("Firebase Error:", e);
                UI.log("NETZWERK FEHLER: Siehe Konsole.", "text-red-500");
            }
        } else {
            UI.log("NETZWERK: Offline (Bibliothek fehlt).", "text-gray-500");
        }
    },

    // Position senden (wird von game.js aufgerufen wenn wir laufen)
    sendMove: function(x, y, level, sector) {
        if (!this.active) return;
        
        // Wir schreiben unsere Position in die Datenbank
        this.db.ref('players/' + this.myId).set({
            x: x,
            y: y,
            lvl: level,
            sector: sector, // Wichtig: Damit wir nur Spieler im selben Sektor sehen
            lastSeen: Date.now()
        });
    }
};
