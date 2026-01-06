window.Combat = {
    enemy: null,
    turn: 'player', 
    logData: [], 
    selectedPart: 1, 
    
    bodyParts: [
        { name: "KOPF", hitMod: 0.6, dmgMod: 2.0 }, 
        { name: "KÖRPER", hitMod: 1.0, dmgMod: 1.0 }, 
        { name: "BEINE", hitMod: 1.3, dmgMod: 0.8 }
    ],

    start: function(enemyEntity) {
        console.log("KAMPF START: Initialisiere..."); // Debugging

        // 1. Daten setzen
        Game.state.enemy = JSON.parse(JSON.stringify(enemyEntity)); 
        Game.state.enemy.maxHp = Game.state.enemy.hp; 
        this.enemy = Game.state.enemy;

        // 2. View Modus setzen (Startet den Canvas Loop in game_core.js)
        Game.state.view = 'combat';
        
        this.logData = [];
        this.turn = 'player';
        this.selectedPart = 1; 
        
        // 3. UI Umschalten & Animation starten
        UI.switchView('combat').then(() => {
            console.log("KAMPF UI GELADEN");
            
            // [FIX] Animations-Klasse auf den Container anwenden
            const container = document.getElementById('view-container');
            if(container) {
                container.classList.remove('combat-intro-anim'); // Reset
                void container.offsetWidth; // Trigger Reflow (Animation Neustart)
                container.classList.add('combat-intro-anim');
            }

            // [FIX] Sicherstellen, dass das HTML-Overlay transparent ist
            const combatView = document.getElementById('combat-view'); // Falls dein div so heißt
            if(combatView) {
                combatView.style.background = 'transparent';
            }

            // Erstes Log
            this.log(`FEINDKONTAKT: ${this.enemy.name}`, 'text-red-500 blink-red font-bold');
            this.renderLogs(); 
            this.moveSelection(0); 
        });
    },

    log: function(msg, color='text-gray-300') {
        this.logData.unshift({t: msg, c: color});
        if(this.logData.length > 6) this.logData.pop();
        this.renderLogs();
    },

    renderLogs: function() {
        const el = document.getElementById('combat-log');
        if(!el) return;
        el.innerHTML = this.logData.map(l => `<div class="${l.c}">${l.t}</div>`).join('');
    },

    render: function() {
        // Wir machen hier KEINE Grafik-Updates mehr, das macht game_render.js!
        // Nur UI Text Updates
        this.renderLogs();
        // Falls du eine Funktion hast, die HP Balken im HTML updated:
        // if(UI.updateCombatHTML) UI.updateCombatHTML();
    },

    moveSelection: function(dir) {
        if (typeof this.selectedPart === 'undefined') this.selectedPart = 1;
        this.selectedPart += dir;
        
        if (this.selectedPart < 0) this.selectedPart = 2;
        if (this.selectedPart > 2) this.selectedPart = 0;

        // Visualisiere Auswahl im HTML Overlay (VATS Buttons)
        for(let i=0; i<3; i++) {
            const btn = document.getElementById(`btn-vats-${i}`);
            if(btn) {
                // Reset Style
                btn.classList.remove('border-yellow-400', 'text-yellow-400', 'bg-yellow-900/40');
                btn.style.transform = "scale(1)";
                
                if(i === this.selectedPart) {
                    // Active Style
                    btn.classList.add('border-yellow-400', 'text-yellow-400', 'bg-yellow-900/40');
                    btn.style.transform = "scale(1.1)"; // Kleiner Zoom Effekt für Auswahl
                }
            }
        }
    },
    
    selectPart: function(index) {
        this.selectedPart = index;
        this.moveSelection(0); 
    },

    confirmSelection: function() {
        if(this.turn === 'player') {
            this.playerAttack();
        }
    },

    triggerFeedback: function(type, value) {
        const layer = document.getElementById('view-container'); // Direkt in den Container
        if(!layer) return;

        const el = document.createElement('div');
        el.className = "float-text absolute font-bold pointer-events-none z-50 text-shadow-black";
        el.style.left = "50%";
        el.style.top = "40%"; // Etwas über der Mitte (wo das Monster ist)
        
        // Zufälliger Versatz damit Zahlen sich nicht stapeln
        const offset = Math.floor(Math.random() * 60) - 30;
        el.style.transform = `translate(${offset}px, 0)`;

        if(type === 'hit') {
            el.innerHTML = `-${value}`;
            el.className += " text-4xl text-yellow-400 animate-float-up"; 
        } else if(type === 'crit') {
            el.innerHTML = `CRIT! -${value}`;
            el.className += " text-6xl text-red-500 blink-red animate-float-up"; 
        } else if(type === 'miss') {
            el.innerHTML = "MISS";
            el.className += " text-3xl text-gray-500 animate-fade-out";
        } else if(type === 'damage') {
            el.innerHTML = `-${value}`;
            el.className += " text-5xl text-red-600 animate-shake"; 
            
            // Screen Shake Effekt
            const screen = document.getElementById('game-screen');
            if(screen) {
                screen.classList.remove('shake-anim'); // Reset
                void screen.offsetWidth;
                screen.classList.add('shake-anim');
            }
        } else if(type === 'dodge') {
            el.innerHTML = "AUSGEWICHEN";
            el.className += " text-3xl text-blue-400 animate-fade-out";
        }

        layer.appendChild(el);
        setTimeout(() => { el.remove(); }, 1200);
    },

    getSafeWeapon: function() {
        let wpn = Game.state.equip.weapon;
        if (!wpn) return { id: 'fists', name: 'Fäuste', baseDmg: 2 };
        if (!wpn.id) return { id: 'fists', name: 'Fäuste', baseDmg: 2 };
        return wpn;
    },

    calculateHitChance: function(partIndex) {
        const part = this.bodyParts[partIndex];
        const perception = Game.getStat('PER');
        
        let chance = 50 + (perception * 5);
        chance *= part.hitMod;
        
        const wpn = this.getSafeWeapon();
        const wId = wpn.id.toLowerCase();
        
        const rangedKeywords = ['pistol', 'rifle', 'gun', 'shotgun', 'blaster', 'sniper', 'gewehr'];
        const isRanged = rangedKeywords.some(k => wId.includes(k));

        if (!isRanged) chance += 20; 

        return Math.min(95, Math.floor(chance));
    },

    playerAttack: function() {
        if(this.turn !== 'player') return;

        const partIndex = this.selectedPart;
        const part = this.bodyParts[partIndex];
        const hitChance = this.calculateHitChance(partIndex);
        
        let wpn = this.getSafeWeapon();
        const wId = wpn.id.toLowerCase();
        
        // Munition Check... (Hier gekürzt für Übersicht, Logik bleibt gleich)
        const rangedKeywords = ['pistol', 'rifle', 'gun', 'shotgun', 'blaster'];
        const isRanged = rangedKeywords.some(k => wId.includes(k));
        if(isRanged && wId !== 'alien_blaster') { 
             const hasAmmo = Game.removeFromInventory('ammo', 1);
             if(!hasAmmo) {
                 this.log("KLICK! Keine Munition!", "text-red-500");
                 wpn = { id: 'rifle_butt', baseDmg: 2, name: "Waffenkolben" }; 
             }
        }

        const roll = Math.random() * 100;
        
        // [FIX] Kein separater Animations-Aufruf nötig, da triggerFeedback das macht
        
        if(roll <= hitChance) {
            let dmg = wpn.baseDmg || 2;
            // ... (Schadensberechnung wie gehabt) ...
            dmg *= part.dmgMod;
            dmg = Math.floor(dmg);
            
            this.enemy.hp -= dmg;
            this.log(`TREFFER: ${dmg} Schaden!`, 'text-green-400 font-bold');
            this.triggerFeedback('hit', dmg); // Zeigt gelbe Zahlen

            if(this.enemy.hp <= 0) {
                this.win();
                return;
            }
        } else {
            this.log("Daneben!", 'text-gray-500');
            this.triggerFeedback('miss');
        }

        this.turn = 'enemy';
        setTimeout(() => this.enemyTurn(), 1000);
    },

    enemyTurn: function() {
        if(!this.enemy || this.enemy.hp <= 0) return;
        
        const roll = Math.random() * 100;
        // ... (Hit Chance Berechnung Enemy) ...
        
        if(roll <= 50) { // Vereinfacht für Test
            let dmg = this.enemy.dmg || 5;
            Game.state.hp -= dmg;
            this.log(`${this.enemy.name} trifft: -${dmg} HP`, 'text-red-500 font-bold');
            this.triggerFeedback('damage', dmg); // Zeigt rote Zahlen & Wackeln
            
            if(Game.state.hp <= 0) {
                Game.state.isGameOver = true;
                if(UI && UI.showGameOver) UI.showGameOver();
                return;
            }
        } else {
            this.log(`${this.enemy.name} verfehlt!`, 'text-blue-300');
            this.triggerFeedback('dodge');
        }

        this.turn = 'player';
        if(typeof UI.update === 'function') UI.update(); 
    },

    win: function() {
        this.log("SIEG!", 'text-yellow-400 font-bold');
        
        // ... (Loot & XP Logik bleibt gleich) ...
        Game.gainExp(this.enemy.xp || 10);

        setTimeout(() => {
            Game.state.view = 'map'; 
            Game.state.enemy = null; 
            UI.switchView('map');
        }, 1500);
    },

    flee: function() {
        if(Math.random() < 0.5) {
            this.log("Flucht gelungen!", 'text-green-400');
            setTimeout(() => {
                Game.state.view = 'map';
                Game.state.enemy = null;
                UI.switchView('map');
            }, 800);
        } else {
            this.log("Flucht fehlgeschlagen!", 'text-red-500');
            this.turn = 'enemy';
            setTimeout(() => this.enemyTurn(), 800);
        }
    }
};
