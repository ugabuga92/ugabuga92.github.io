// [2026-01-10 01:54:00] combat.js - Adjusted FX Durations (2.3s Click / 1.5s Crit)

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
        Game.state.enemy = JSON.parse(JSON.stringify(enemyEntity)); 
        Game.state.enemy.maxHp = Game.state.enemy.hp; 
        this.enemy = Game.state.enemy;

        Game.state.view = 'combat';
        
        this.logData = [];
        this.turn = 'player';
        this.selectedPart = 1; 
        
        this.log(`Kampf gestartet gegen: ${this.enemy.name}`, 'text-yellow-400 blink-red');
        UI.switchView('combat').then(() => {
            this.render();
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
        UI.renderCombat();
        this.renderLogs();
    },

    moveSelection: function(dir) {
        if (typeof this.selectedPart === 'undefined') this.selectedPart = 1;
        this.selectedPart += dir;
        
        if (this.selectedPart < 0) this.selectedPart = 2;
        if (this.selectedPart > 2) this.selectedPart = 0;

        for(let i=0; i<3; i++) {
            const btn = document.getElementById(`btn-vats-${i}`);
            if(btn) {
                btn.classList.remove('border-yellow-400', 'text-yellow-400', 'bg-yellow-900/40');
                if(i === this.selectedPart) {
                    btn.classList.add('border-yellow-400', 'text-yellow-400', 'bg-yellow-900/40');
                }
            }
        }
        UI.renderCombat(); 
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
        const layer = document.getElementById('combat-feedback-layer');
        if(!layer) return;

        const el = document.createElement('div');
        el.className = "float-text absolute font-bold text-4xl pointer-events-none z-50 text-shadow-black";
        
        const offset = Math.floor(Math.random() * 40) - 20;
        const offsetY = Math.floor(Math.random() * 40) - 20;
        el.style.transform = `translate(${offset}px, ${offsetY}px)`;

        if(type === 'hit') {
            el.innerHTML = `-${value}`;
            el.className += " text-yellow-400 animate-float-up"; 
        } else if(type === 'crit') {
            el.innerHTML = `CRIT! -${value}`;
            el.className += " text-red-500 text-6xl blink-red animate-float-up"; 
        } else if(type === 'miss') {
            el.innerHTML = "MISS";
            el.className += " text-gray-500 text-2xl animate-fade-out";
        } else if(type === 'damage') {
            el.innerHTML = `-${value}`;
            el.className += " text-red-600 animate-shake"; 
            
            const flash = document.getElementById('damage-flash');
            if(flash) {
                flash.classList.remove('hidden');
                flash.style.opacity = 0.5;
                setTimeout(() => { flash.style.opacity = 0; flash.classList.add('hidden'); }, 300);
            }
        } else if(type === 'dodge') {
            el.innerHTML = "AUSGEWICHEN";
            el.className += " text-blue-400 text-2xl animate-fade-out";
        }

        layer.appendChild(el);
        setTimeout(() => { el.remove(); }, 1000);
    },

    // --- SAFETY HELPER: REPAIR WEAPON ID ---
    getSafeWeapon: function() {
        let wpn = Game.state.equip.weapon;
        if (!wpn) return { id: 'fists', name: 'Fäuste', baseDmg: 2 };

        if (!wpn.id && wpn.name) {
            const foundId = Object.keys(Game.items).find(k => Game.items[k].name === wpn.name);
            if(foundId) wpn.id = foundId; 
            else return { id: 'fists', name: 'Fäuste (Fallback)', baseDmg: 2 };
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
        
        // Erweiterte Keywords für neue Waffen
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
        
        // --- AMMO CHECK & AUTO SWITCH ---
        let wpn = this.getSafeWeapon();
        const wId = wpn.id.toLowerCase();

        const rangedKeywords = ['pistol', 'rifle', 'gun', 'shotgun', 'smg', 'minigun', 'blaster', 'sniper', 'cannon', 'gewehr', 'flinte', 'revolver'];
        const isRanged = rangedKeywords.some(k => wId.includes(k));
        
        // Nur Munition verbrauchen, wenn Fernkampf UND nicht Alien Blaster (oder andere Ausnahmen)
        if(isRanged && wId !== 'alien_blaster') { 
             const hasAmmo = Game.removeFromInventory('ammo', 1);
             if(!hasAmmo) {
                 // [UPDATE] 2300ms Duration für KLICK (2,3 Sekunden)
                 if(typeof UI.showCombatEffect === 'function') {
                     UI.showCombatEffect("* KLICK *", "MUNITION LEER!", "red", 2300);
                 }
                 this.log("WAFFE LEER! *KLICK*", "text-red-500 font-bold text-xl");
                 
                 // Automatischer Wechsel zur besten Nahkampfwaffe
                 setTimeout(() => {
                     if (typeof Game.switchToBestMelee === 'function') {
                         Game.switchToBestMelee();
                     } else {
                         this.log("Manuell wechseln!", "text-yellow-400");
                     }
                 }, 800);
                 
                 return; 
             }
        }

        const roll = Math.random() * 100;
        
        const screen = document.getElementById('game-screen');
        if(screen) {
            screen.classList.add('shake-anim'); 
            setTimeout(() => screen.classList.remove('shake-anim'), 200);
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
                this.log(">> KRITISCHER TREFFER! <<", "text-yellow-400 font-bold animate-pulse");
                // [UPDATE] 1500ms Duration für CRIT (1,5 Sekunden)
                if(typeof UI.showCombatEffect === 'function') UI.showCombatEffect("CRITICAL!", "DOPPELTER SCHADEN", "yellow", 1500);
                
                if (Game.getPerkLevel('mysterious_stranger') > 0) {
                    this.log("Der Fremde hilft dir...", "text-gray-400 text-xs");
                }
            }

            dmg = Math.floor(dmg);
            this.enemy.hp -= dmg;
            
            this.log(`Treffer: ${part.name} für ${dmg} Schaden!`, 'text-green-400 font-bold');
            this.triggerFeedback(isCrit ? 'crit' : 'hit', dmg);

            const el = document.getElementById('enemy-img'); 
            if(el) {
                el.classList.add('animate-pulse');
                setTimeout(() => el.classList.remove('animate-pulse'), 200);
            }

            if(this.enemy.hp <= 0) {
                this.win();
                return;
            }
        } else {
            this.log("Daneben!", 'text-gray-500');
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
                    if (Game.state.equip[s].props && Game.state.equip[s].props.bonus && Game.state.equip[s].props.bonus.DEF) {
                        armor += Game.state.equip[s].props.bonus.DEF;
                    }
                }
            });
            
            let dmgTaken = Math.max(1, dmg - Math.floor(armor / 2));
            
            Game.state.hp -= dmgTaken;
            this.log(`${this.enemy.name} trifft dich: -${dmgTaken} HP`, 'text-red-500 font-bold');
            this.triggerFeedback('damage', dmgTaken);

// [2026-01-11 09:30] game_combat.js - FIXED: Correct slot reference (saveSlot) and deletion order

// ... (vorheriger Code bleibt gleich bis zum HP Check in enemyTurn)

        if(Game.state.hp <= 0) {
            Game.state.hp = 0;
            Game.state.isGameOver = true;
            
            console.log("☠️ PERMADEATH: Player died. Initiating deletion...");
            
            // 1. Korrekten Slot-Index aus dem State sichern
            const slotToDelete = Game.state.saveSlot;
            
            // 2. Tod im Highscore registrieren
            if(typeof Network !== 'undefined' && Network.active) {
                Network.registerDeath(Game.state);
            }
            
            // 3. Slot in Firebase löschen, bevor der lokale State genullt wird
            if (typeof Network !== 'undefined' && slotToDelete !== undefined && slotToDelete !== null && slotToDelete !== -1) {
                Network.deleteSlot(slotToDelete)
                    .then(() => console.log(`✅ Slot ${slotToDelete} permanent entfernt.`))
                    .catch(err => console.error("❌ Firebase Delete Error:", err));
            }
            
            // 4. UI anzeigen
            if(typeof UI !== 'undefined' && UI.showGameOver) {
                UI.showGameOver();
            }
            
            // 5. Slot entwerten, um automatische Autosaves zu verhindern
            Game.state.saveSlot = -1; 
            
            // 6. State verzögert aufräumen
            setTimeout(() => { 
                Game.state = null; 
                localStorage.removeItem('pipboy_save'); // Fallback für LocalStorage
            }, 1000);
            return;
        }

// ... (Rest bleibt gleich)

            
        } else {
            this.log(`${this.enemy.name} verfehlt dich!`, 'text-blue-300');
            this.triggerFeedback('dodge');
        }

        this.turn = 'player';
        UI.update(); 
        this.render();
    },

    win: function() {
        this.log(`${this.enemy.name} besiegt!`, 'text-yellow-400 font-bold');
        
        const xpBase = Array.isArray(this.enemy.xp) ? (this.enemy.xp[0] + Math.floor(Math.random()*(this.enemy.xp[1]-this.enemy.xp[0]))) : this.enemy.xp;
        Game.gainExp(xpBase);
        
        if(this.enemy.loot > 0) {
            let caps = Math.floor(Math.random() * this.enemy.loot) + 1;
            Game.state.caps += caps;
            this.log(`Gefunden: ${caps} Kronkorken`, 'text-yellow-200');
        }
        
        if(this.enemy.drops) {
            this.enemy.drops.forEach(d => {
                if(Math.random() < d.c) {
                    Game.addToInventory(d.id, 1);
                }
            });
        }

        let mobId = null;
        if(Game.monsters) {
            for(let k in Game.monsters) {
                if(Game.monsters[k].name === this.enemy.name.replace('Legendäre ', '')) {
                    mobId = k;
                    break;
                }
            }
        }
        if(mobId && typeof Game.updateQuestProgress === 'function') {
            Game.updateQuestProgress('kill', mobId, 1);
        }

        if(Game.state.kills === undefined) Game.state.kills = 0;
        Game.state.kills++;
        Game.saveGame();

        setTimeout(() => {
            Game.state.enemy = null;
            UI.switchView('map');
        }, 1500);
    },

    flee: function() {
        if(Math.random() < 0.5) {
            this.log("Flucht gelungen!", 'text-green-400');
            this.triggerFeedback('dodge'); 
            setTimeout(() => {
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
