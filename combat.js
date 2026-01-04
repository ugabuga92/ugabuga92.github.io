// [v2.0.2] - 2026-01-05 01:55pm (Combat Logic V2)
// - Fix: Replaced .includes() checks with Game.getPerkRank() for Perk System 2.0.
// - Logic: Integrated Perk Logic (Crit, Damage) from Game Actions.

window.Combat = {
    loopId: null,
    turn: 'player', 
    logs: [],
    selectedPart: 1, // Default Torso

    start: function(enemy) {
        Game.state.view = 'combat';
        Game.state.enemy = JSON.parse(JSON.stringify(enemy)); 
        Game.state.enemy.maxHp = Game.state.enemy.hp;
        
        this.logs = [];
        this.turn = 'player';
        this.selectedPart = 1; // Reset selection
        
        this.log(`Kampf gestartet gegen: ${enemy.name}`, 'text-yellow-400');
        UI.switchView('combat').then(() => {
            this.render();
            this.moveSelection(0); // Highlight initial selection
        });
    },

    log: function(msg, color='text-gray-300') {
        this.logs.unshift({t: msg, c: color});
        if(this.logs.length > 6) this.logs.pop();
        this.renderLogs();
    },

    renderLogs: function() {
        const el = document.getElementById('combat-log');
        if(!el) return;
        el.innerHTML = this.logs.map(l => `<div class="${l.c}">${l.t}</div>`).join('');
    },

    render: function() {
        UI.renderCombat();
        this.renderLogs();
    },

    moveSelection: function(dir) {
        if (typeof this.selectedPart === 'undefined') this.selectedPart = 1;
        this.selectedPart += dir;
        
        // Wrap around 0-2 (Head, Torso, Legs)
        if (this.selectedPart < 0) this.selectedPart = 2;
        if (this.selectedPart > 2) this.selectedPart = 0;

        // Visual Feedback
        for(let i=0; i<3; i++) {
            const btn = document.getElementById(`btn-vats-${i}`);
            if(btn) {
                // Remove old highlight classes
                btn.classList.remove('border-yellow-400', 'text-yellow-400', 'bg-yellow-900/40');
                
                // Add highlight to selected
                if(i === this.selectedPart) {
                    btn.classList.add('border-yellow-400', 'text-yellow-400', 'bg-yellow-900/40');
                }
            }
        }
    },

    // VISUAL FEEDBACK SYSTEM
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
            el.className += " text-yellow-400"; 
        } else if(type === 'crit') {
            el.innerHTML = `CRIT! -${value}`;
            el.className += " text-red-500 text-6xl blink-red"; 
        } else if(type === 'miss') {
            el.innerHTML = "MISS";
            el.className += " text-gray-500 text-2xl";
        } else if(type === 'damage') {
            el.innerHTML = `-${value}`;
            el.className += " text-red-600"; 
            
            const flash = document.getElementById('damage-flash');
            if(flash) {
                flash.classList.remove('hidden');
                flash.style.opacity = 0.5;
                setTimeout(() => { flash.style.opacity = 0; flash.classList.add('hidden'); }, 300);
            }
        } else if(type === 'dodge') {
            el.innerHTML = "AUSGEWICHEN";
            el.className += " text-blue-400 text-2xl";
        }

        layer.appendChild(el);
        setTimeout(() => { el.remove(); }, 1000);
    },

    // ACTIONS
    attack: function(partIndex) {
        if(this.turn !== 'player') return;

        let wpn = Game.state.equip.weapon || {name: "Fäuste"}; 
        
        // AMMO CHECK
        if(wpn.usesAmmo) {
            const hasAmmo = Game.removeFromInventory('ammo', 1);
            if(!hasAmmo) {
                this.log("Klick! Munition leer.", "text-red-500");
                Game.unequipItem('weapon');
                const newWpn = Game.state.equip.weapon || {name: "Fäuste"};
                if(!newWpn.usesAmmo) {
                    this.log("Waffe abgelegt - Nahkampf!", "text-yellow-400 font-bold");
                    wpn = newWpn; 
                } else {
                    this.log("Kein Platz zum Ablegen!", "text-red-500 font-bold");
                    this.triggerFeedback('miss');
                    return; 
                }
            }
        }
        
        const enemy = Game.state.enemy;
        const hitChance = this.calculateHitChance(partIndex);
        const roll = Math.random() * 100;

        const screen = document.getElementById('game-screen');
        if(screen) {
            screen.classList.add('shake');
            setTimeout(() => screen.classList.remove('shake'), 200);
        }

        if(roll <= hitChance) {
            // HIT
            let dmg = this.calculatePlayerDamage();
            let isCrit = false;
            
            // [FIX V2.0] Critical Hit Calculation (Luck + Perks)
            const commandoRank = Game.getPerkRank('commando'); 
            const critChance = (Game.getStat('LUC') * 0.02) + (commandoRank * 0.05);

            if(Math.random() < critChance) {
                dmg = Math.floor(dmg * 2);
                isCrit = true;
            }

            enemy.hp -= dmg;
            this.log(`Du triffst ${this.getBodyPartName(partIndex)} für ${dmg} Schaden! ${isCrit?'CRIT!':''}`, 'text-green-400 font-bold');
            this.triggerFeedback(isCrit ? 'crit' : 'hit', dmg);

            if(enemy.hp <= 0) {
                this.win();
                return;
            }
        } else {
            this.log("Du hast verfehlt!", 'text-gray-500');
            this.triggerFeedback('miss');
        }

        this.turn = 'enemy';
        UI.renderCombat();
        setTimeout(() => this.enemyTurn(), 1000);
    },

    enemyTurn: function() {
        if(!Game.state.enemy || Game.state.enemy.hp <= 0) return;
        
        const enemy = Game.state.enemy;
        const roll = Math.random();
        
        let dmg = enemy.dmg;
        // Armor reduction (Endurance * 0.5)
        let def = Game.getStat('END') * 0.5; 
        
        dmg = Math.max(1, Math.floor(dmg - def));
        
        if(roll < 0.8) { 
            Game.state.hp -= dmg;
            this.log(`${enemy.name} trifft dich für ${dmg} Schaden!`, 'text-red-500');
            this.triggerFeedback('damage', dmg);
            
            if(Game.state.hp <= 0) {
                Game.state.isGameOver = true;
                if(UI && UI.showGameOver) UI.showGameOver();
                return;
            }
        } else {
            this.log(`${enemy.name} verfehlt dich!`, 'text-blue-300');
            this.triggerFeedback('dodge');
        }

        this.turn = 'player';
        UI.update(); 
        UI.renderCombat();
    },

    win: function() {
        const enemy = Game.state.enemy;
        this.log(`${enemy.name} besiegt!`, 'text-yellow-400 font-bold');
        
        const xp = Array.isArray(enemy.xp) ? Math.floor(Math.random() * (enemy.xp[1]-enemy.xp[0]) + enemy.xp[0]) : enemy.xp;
        Game.addXP(xp); // Assuming addXP alias exists or use gainExp
        this.log(`Erhalten: ${xp} XP`);

        if(enemy.loot > 0) {
            // [FIX V2.0] Fortune Finder Logic using getPerkRank
            const fortuneRank = Game.getPerkRank('fortune_finder');
            let lootAmount = enemy.loot;
            if (fortuneRank > 0) {
                lootAmount = Math.floor(lootAmount * (1 + (fortuneRank * 0.1))); // +10% per Rank
            }
            Game.state.caps += lootAmount;
            this.log(`Gefunden: ${lootAmount} Kronkorken`, 'text-yellow-200');
        }
        
        // Item Drops
        if(enemy.drops) {
            enemy.drops.forEach(d => {
                if(Math.random() < d.c) {
                    Game.addToInventory(d.id, 1);
                }
            });
        }

        // Quest Trigger
        let mobId = null;
        if(Game.monsters) {
            for(let k in Game.monsters) {
                if(Game.monsters[k].name === enemy.name.replace('Legendäre ', '')) {
                    mobId = k;
                    break;
                }
            }
        }
        if(mobId && typeof Game.updateQuestProgress === 'function') {
            Game.updateQuestProgress('kill', mobId, 1);
        } else if (mobId && typeof Game.updateQuest === 'function') {
             // Fallback for older quest system
             Game.state.activeQuests.forEach(q => {
                if(q.type === 'kill' && (q.target === mobId)) {
                    Game.updateQuest(q.id, 1);
                }
            });
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
    },

    // Utils
    calculateHitChance: function(partIndex) {
        // 0=Head, 1=Torso, 2=Legs
        const per = Game.getStat('PER');
        const base = 50 + (per * 5);
        if(partIndex === 0) return Math.min(95, base - 25); 
        if(partIndex === 1) return Math.min(95, base);      
        if(partIndex === 2) return Math.min(95, base - 10); 
        return 0;
    },

    calculatePlayerDamage: function() {
        const wpn = Game.state.equip.weapon || {baseDmg: 2};
        let dmg = wpn.baseDmg;
        
        // Weapon Prop Mult
        if(wpn.props && wpn.props.dmgMult) dmg *= wpn.props.dmgMult;
        
        // Strength Bonus
        dmg += (Game.getStat('STR') * 0.5);
        
        // [FIX V2.0] Gun Nut Perk using getPerkRank
        if (['weapon'].includes(wpn.type)) { 
             const gunNutRank = Game.getPerkRank('gun_nut');
             if (gunNutRank > 0) {
                 dmg *= (1 + (gunNutRank * 0.1)); // +10% per Rank
             }
        }
        
        return Math.floor(dmg);
    },

    getBodyPartName: function(i) {
        return ['Kopf', 'Körper', 'Beine'][i];
    },
    
    selectPart: function(partIndex) {
        this.selectedPart = partIndex;
        this.moveSelection(0);
    },
    
    confirmSelection: function() {
        if(this.selectedPart === undefined) this.selectedPart = 1; 
        this.attack(this.selectedPart);
    }
};
