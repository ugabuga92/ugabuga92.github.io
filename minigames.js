// [v0.4.27]
const MiniGames = {
    // --- HACKING ---
    hacking: {
        active: false,
        words: [],
        password: "",
        attempts: 4,
        difficulty: "easy",
        logs: [],
        
        start: function(difficulty = "easy") {
            this.active = true;
            this.difficulty = difficulty;
            this.attempts = 4;
            this.logs = [];
            
            // Wortliste generieren
            const sourceWords = window.GameData.hackWords[difficulty];
            // Wähle 10 zufällige Wörter
            const shuffled = [...sourceWords].sort(() => 0.5 - Math.random());
            this.words = shuffled.slice(0, 12);
            // Wähle Passwort
            this.password = this.words[Math.floor(Math.random() * this.words.length)];
            
            UI.log("TERMINAL VERBINDUNG HERGESTELLT...", "text-green-500");
            UI.switchView('hacking');
            
            // First Time Tutorial
            if(Game.state && !Game.state.tutorialsShown) Game.state.tutorialsShown = {};
            if(Game.state && !Game.state.tutorialsShown.hacking) {
                setTimeout(() => UI.showMiniGameHelp('hacking'), 500);
                Game.state.tutorialsShown.hacking = true;
                Game.saveGame();
            }
        },
        
        checkWord: function(word) {
            if(this.attempts <= 0) return;
            
            this.attempts--;
            let match = 0;
            for(let i=0; i<word.length; i++) {
                if(word[i] === this.password[i]) match++;
            }
            
            this.logs.push(`> ${word} . . . TREFFER: ${match}/${word.length}`);
            
            if(word === this.password) {
                this.logs.push("> ZUGRIFF GEWÄHRT.");
                this.logs.push("> SYSTEM UNLOCKED.");
                setTimeout(() => this.victory(), 1500);
            } else if (this.attempts === 0) {
                this.logs.push("> SPERRUNG EINGELEITET.");
                setTimeout(() => this.fail(), 1500);
            }
            
            UI.renderHacking();
        },
        
        victory: function() {
            UI.log("Terminal gehackt! XP erhalten.", "text-green-500");
            const xp = this.difficulty === 'easy' ? 20 : (this.difficulty === 'medium' ? 50 : 100);
            Game.gainExp(xp);
            this.end();
        },
        
        fail: function() {
            UI.log("Zugriff verweigert. Terminal gesperrt.", "text-red-500");
            UI.shakeView();
            this.end();
        },
        
        end: function() {
            this.active = false;
            // FIX: Ensure clean return to city
            UI.switchView('city');
        }
    },

    // --- LOCKPICKING ---
    lockpicking: {
        active: false,
        difficulty: "easy",
        sweetSpot: 0,
        currentAngle: 0, // Bobby Pin Angle (-90 to 90)
        lockAngle: 0,    // How much the lock turned
        tolerance: 10,
        health: 100,     // Bobby pin health
        
        start: function(difficulty = "easy") {
            this.active = true;
            this.difficulty = difficulty;
            this.sweetSpot = (Math.random() * 180) - 90; // -90 bis 90 Grad
            this.currentAngle = 0;
            this.lockAngle = 0;
            this.health = 100;
            this.tolerance = difficulty === 'easy' ? 15 : (difficulty === 'medium' ? 10 : 5);
            
            UI.log("Schloss knacken gestartet...", "text-yellow-400");
            UI.switchView('lockpicking');
            
            // First Time Tutorial
            if(Game.state && !Game.state.tutorialsShown) Game.state.tutorialsShown = {};
            if(Game.state && !Game.state.tutorialsShown.lockpicking) {
                setTimeout(() => UI.showMiniGameHelp('lockpicking'), 500);
                Game.state.tutorialsShown.lockpicking = true;
                Game.saveGame();
            }
        },
        
        rotatePin: function(delta) {
            if(this.lockAngle > 0) return; // Kann nicht drehen wenn Schloss gedreht ist
            this.currentAngle += delta;
            if(this.currentAngle < -90) this.currentAngle = -90;
            if(this.currentAngle > 90) this.currentAngle = 90;
            UI.renderLockpicking();
        },
        
        rotateLock: function() {
            if(!this.active) return;
            
            // Berechne wie nah wir sind
            const diff = Math.abs(this.currentAngle - this.sweetSpot);
            const maxTurn = Math.max(0, 90 - (diff * 2)); // 90 Grad ist offen. Je weiter weg, desto weniger dreht es.
            
            // Wenn innerhalb Toleranz, geht es ganz auf
            const isSuccess = diff < this.tolerance;
            const targetAngle = isSuccess ? 90 : maxTurn;
            
            this.lockAngle += 5; // Animationsgeschwindigkeit
            
            if(this.lockAngle >= targetAngle) {
                this.lockAngle = targetAngle;
                
                if(!isSuccess) {
                    // Wackeln & Schaden
                    this.health -= 2;
                    UI.shakeView(); // Kleines Wackeln
                    if(this.health <= 0) {
                        this.breakPin();
                        return;
                    }
                } else if(this.lockAngle >= 90) {
                    this.victory();
                }
            }
            UI.renderLockpicking();
        },
        
        releaseLock: function() {
            this.lockAngle = 0;
            UI.renderLockpicking();
        },
        
        breakPin: function() {
            UI.log("Dietrich abgebrochen!", "text-red-500");
            this.health = 100; // Reset health for new pin
            // Optional: Kosten für Dietrich abziehen
            this.start(this.difficulty); // Reset position
        },

        victory: function() {
            UI.log("Schloss geknackt!", "text-green-500");
            const xp = this.difficulty === 'easy' ? 15 : (this.difficulty === 'medium' ? 40 : 80);
            Game.gainExp(xp);
            this.end();
        },
        
        end: function() {
            this.active = false;
            // FIX: Ensure clean return to city
            UI.switchView('city');
        }
    }
};
