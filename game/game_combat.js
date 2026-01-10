// [TIMESTAMP] 2026-01-10 23:30:00 - game_combat.js - Clean Logic for Tactical HUD

window.Combat = {
    enemy: null,
    turn: 'player', 
    logData: [], 
    selectedPart: 1, // 0=Kopf, 1=Körper, 2=Beine
    
    bodyParts: [
        { name: "KOPF", hitMod: 0.6, dmgMod: 2.0 }, 
        { name: "KÖRPER", hitMod: 1.0, dmgMod: 1.0 }, 
        { name: "BEINE", hitMod: 1.3, dmgMod: 0.8 }
    ],

    start: function(enemyEntity) {
        // Tiefe Kopie des Gegners erstellen
        Game.state.enemy = JSON.parse(JSON.stringify(enemyEntity)); 
        Game.state.enemy.maxHp = Game.state.enemy.hp; 
        this.enemy = Game.state.enemy;

        Game.state.view = 'combat';
        
        this.logData = [];
        this.turn = 'player';
        this.selectedPart = 1; // Standard: Körper
        
        this.log(`ZIELERFASSUNG: ${this.enemy.name}`, 'text-green-400 blink-red');
        
        // View wechseln und Rendering starten
        UI.switchView('combat').then(() => {
            this.render();
        });
    },

    log: function(msg, color='text-gray-300') {
        this.logData.unshift({t: msg, c: color});
        if(this.logData.length > 5) this.logData.pop(); // Max 5 Zeilen für das kompakte HUD
        this.renderLogs();
    },

    renderLogs: function() {
        const el = document.getElementById('combat-log');
        if(!el) return;
        el.innerHTML = this.logData.map(l => `<div class="${l.c}">${l.t}</div>`).join('');
    },

    // Haupt-Render-Aufruf (Delegiert an ui_combat.js)
    render: function() {
        if(typeof UI.renderCombat === 'function') UI.renderCombat();
        this.renderLogs();
    },

    // VATS Steuerung (Wird von Tasten oder Klicks gerufen)
    moveSelection: function(dir) {
        if (typeof this.selectedPart === 'undefined') this.selectedPart = 1;
        this.selectedPart += dir;
        
        // Durchschalten (Loop)
        if (this.selectedPart < 0) this.selectedPart = 2;
        if (this.selectedPart > 2) this.selectedPart = 0;

        this.render(); // UI Update erzwingen
    },
    
    // Direktwahl (für Maus/Touch im neuen HUD)
    selectPart: function(index) {
        this.selectedPart = index;
        this.render(); // UI Update erzwingen (damit Highlight wandert)
    },

    confirmSelection: function() {
        if(this.turn === 'player') {
            this.playerAttack();
        }
    },

    // Visuelles Feedback (Floating Text über dem HUD)
    triggerFeedback: function(type, value) {
        const layer = document.getElementById('combat-feedback-layer');
        if(!layer) return;

        const el = document.createElement('div');
        // Zentrierte Positionierung für das neue HUD
        el.className = "float-text absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-bold text-5xl pointer-events-none z-[100] text-shadow-black font-vt323";
        
        const offset = Math.floor(Math.random() * 60) - 30;
        const offsetY = Math.floor(Math.random() * 60) - 30;
        el.style.transform = `translate(calc(-50% + ${offset}px), calc(-50% + ${offsetY}px))`;

        if(type === 'hit') {
            el.innerHTML = `-${value}`;
            el.className += " text-yellow-400 animate-float-up"; 
        } else if(type === 'crit') {
            el.innerHTML = `CRIT -${value}`;
            el.className += " text-red-500 text-6xl blink-red animate-float-up"; 
        } else if(type === 'miss') {
            el.innerHTML = "MISS";
            el.className += " text-gray-500 text-4xl animate-fade-out opacity-70";
        } else if(type === 'damage') {
            el.innerHTML = `-${value}`;
            el.className += " text-red-600 animate-shake"; 
            
            // Screen Flash
            const flash = document.getElementById('damage-flash');
            if(flash) {
                flash.classList.remove('hidden');
                flash.style.opacity = 0.6;
                setTimeout(() => { flash.style.opacity = 0; flash.classList.add('hidden'); }, 300);
            }
        } else if(type === 'dodge') {
            el.innerHTML = "DODGE";
            el.className += " text-blue-400 text-3xl animate-fade-out";
        }

        layer.appendChild(el);
        setTimeout(() => { el.remove(); }, 1200);
    },

    getSafeWeapon: function() {
        let wpn = Game.state.equip.weapon;
        if (!wpn) return { id: 'fists', name: 'Fäuste', baseDmg: 2 };
        if (!wpn.id && wpn.name) {
            const foundId = Object.keys(Game.items).find(k => Game.items[k].name === wpn.name);
            if(foundId) wpn.id = foundId; 
            else return { id: 'fists', name: 'Fäuste', baseDmg: 2 };
        }
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
        
        const rangedKeywords = ['pistol', 'rifle', 'gun', 'shotgun', 'smg', 'minigun', 'blaster', 'sniper', 'cannon', 'gewehr', 'flinte', 'revolver'];
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

        const rangedKeywords = ['pistol', 'rifle', 'gun', 'shotgun', 'smg', 'minigun', 'blaster', 'sniper', 'cannon', 'gewehr', 'flinte', 'revolver'];
        const isRanged = rangedKeywords.some(k => wId.includes(k));
        
        if(isRanged && wId !== 'alien_blaster') { 
             const hasAmmo = Game.removeFromInventory('ammo', 1);
             if(!hasAmmo) {
                 this.log("⚠️ KEINE MUNITION!", "text-red-500 font-bold");
                 if(typeof UI.showCombatEffect === 'function') UI.showCombatEffect("* CLICK *", "NO AMMO", "red", 1000);
                 
                 setTimeout(() => {
                     if (typeof Game.switchToBestMelee === 'function') {
                         Game.switchToBestMelee();
                         this.log("Wechsle zu Nahkampf...", "text-yellow-400 italic");
                     }
                 }, 500);
                 return; 
             }
        }

        const roll = Math.random() * 100;
        
        // HUD Shake Effect
        const hud = document.getElementById('view-container');
        if(hud) {
            hud.classList.add('shake-anim'); 
            setTimeout(() => hud.classList.remove('shake-anim'), 200);
        }

        if(roll <= hitChance) {
            let dmg = wpn.baseDmg || 2;
            if(wpn.props && wpn.props.dmgMult) dmg *= wpn.props.dmgMult;

            if(!isRanged || wpn.id === 'rifle_butt') {
                dmg += Math.floor(Game.getStat('STR') / 2);
                const sluggerLvl = Game.getPerkLevel('slugger');
                if(sluggerLvl > 0) dmg = Math.floor(dmg * (1 + (sluggerLvl * 0.1)));
            } else {
                const gunLvl = Game.getPerkLevel('gunslinger');
                if(gunLvl > 0) dmg = Math.floor(dmg * (1 + (gunLvl * 0.1)));
            }

            dmg *= part.dmgMod;

            let isCrit = false;
            let critChance = Game.state.critChance || 5; 
            
            if(Math.random() * 100 <= critChance) {
                dmg *= 2;
                isCrit = true;
                this.log(">> CRITICAL HIT <<", "text-yellow-400 font-bold");
                if (Game.getPerkLevel('mysterious_stranger') > 0) {
                    this.log("Mysterious Stranger greift ein!", "text-gray-400 text-xs italic");
                }
            }

            dmg = Math.floor(dmg);
            this.enemy.hp -= dmg;
            
            this.log(`Treffer: ${dmg} Schaden`, 'text-green-400');
            this.triggerFeedback(isCrit ? 'crit' : 'hit', dmg);

            // Enemy HUD Flicker on Hit
            const enemyImg = document.getElementById('enemy-img');
            if(enemyImg) {
                enemyImg.style.opacity = 0.5;
                setTimeout(() => enemyImg.style.opacity = 1, 100);
            }

            if(this.enemy.hp <= 0) {
                this.win();
                return;
            }
        } else {
            this.log("Ziel verfehlt.", 'text-gray-500');
            this.triggerFeedback('miss');
        }

        this.turn = 'enemy';
        this.render(); 
        setTimeout(() => this.enemyTurn(), 1000);
    },

    enemyTurn: function() {
        if(!this.enemy || this.enemy.hp <= 0) return;
        
        const agi = Game.getStat('AGI');
        const enemyHitChance = 85 - (agi * 3); 
        const roll = Math.random() * 100;

        if(roll <= enemyHitChance) {
            let dmg = this.enemy.dmg;
            let armor = 0;
            const slots = ['body', 'head', 'legs', 'feet', 'arms'];
            slots.forEach(s => {
                if(Game.state.equip[s]) {
                    if (Game.state.equip[s].def) armor += Game.state.equip[s].def;
                    if (Game.state.equip[s].props?.bonus?.DEF) armor += Game.state.equip[s].props.bonus.DEF;
                }
            });
            
            let dmgTaken = Math.max(1, dmg - Math.floor(armor / 2));
            Game.state.hp -= dmgTaken;
            
            this.log(`${this.enemy.name} trifft: -${dmgTaken} HP`, 'text-red-500');
            this.triggerFeedback('damage', dmgTaken);
            
            if(Game.state.hp <= 0) {
                Game.state.isGameOver = true;
                if(UI && UI.showGameOver) UI.showGameOver();
                return;
            }
        } else {
            this.log(`Angriff ausgewichen.`, 'text-blue-300');
            this.triggerFeedback('dodge');
        }

        this.turn = 'player';
        UI.update(); 
        this.render();
    },

    win: function() {
        this.log(`ZIEL ELIMINIERT.`, 'text-yellow-400 font-bold');
        
        const xpBase = Array.isArray(this.enemy.xp) ? (this.enemy.xp[0] + Math.floor(Math.random()*(this.enemy.xp[1]-this.enemy.xp[0]))) : this.enemy.xp;
        Game.gainExp(xpBase);
        
        if(this.enemy.loot > 0) {
            let caps = Math.floor(Math.random() * this.enemy.loot) + 1;
            Game.state.caps += caps;
            this.log(`Beute: ${caps} KK`, 'text-yellow-200');
        }
        
        if(this.enemy.drops) {
            this.enemy.drops.forEach(d => {
                if(Math.random() < d.c) Game.addToInventory(d.id, 1);
            });
        }

        if(Game.state.kills === undefined) Game.state.kills = 0;
        Game.state.kills++;
        
        let mobId = null;
        if(Game.monsters) {
            for(let k in Game.monsters) {
                if(Game.monsters[k].name === this.enemy.name.replace('Legendäre ', '').replace('★', '').trim()) {
                    mobId = k;
                    break;
                }
            }
        }
        if(mobId && typeof Game.updateQuestProgress === 'function') {
            Game.updateQuestProgress('kill', mobId, 1);
        }

        Game.saveGame();

        // --- LEGENDARY LOOT CHANCE ---
        if (this.enemy.isLegendary && Math.random() < 0.33) {
             console.log("[COMBAT] Legendary Luck! Dice Game triggered.");
             setTimeout(() => {
                 Game.state.enemy = null; 
                 if (typeof UI.startMinigame === 'function') {
                     UI.startMinigame('dice');
                 } else {
                     UI.switchView('map');
                 }
             }, 1500);
             return; 
        }

        setTimeout(() => {
            Game.state.enemy = null;
            UI.switchView('map');
        }, 1500);
    },

    flee: function() {
        if(Math.random() < 0.5) {
            this.log("RÜCKZUG ERFOLGREICH.", 'text-green-400');
            this.triggerFeedback('dodge'); 
            setTimeout(() => {
                Game.state.enemy = null;
                UI.switchView('map');
            }, 800);
        } else {
            this.log("RÜCKZUG GESCHEITERT!", 'text-red-500');
            this.turn = 'enemy';
            setTimeout(() => this.enemyTurn(), 800);
        }
    }
};
