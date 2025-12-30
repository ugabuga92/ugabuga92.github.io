// [v0.9.13] - Combat with Quest Trigger & Selection Fix
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

    // [v0.9.13] Added moveSelection to fix crash
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

    // ACTIONS
    attack: function(partIndex) {
        if(this.turn !== 'player') return;
        
        const enemy = Game.state.enemy;
        const hitChance = this.calculateHitChance(partIndex);
        const roll = Math.random() * 100;

        // Player Animation
        const screen = document.getElementById('game-screen');
        if(screen) {
            screen.classList.add('shake');
            setTimeout(() => screen.classList.remove('shake'), 200);
        }

        if(roll <= hitChance) {
            // HIT
            let dmg = this.calculatePlayerDamage();
            let isCrit = false;
            
            // Critical Hit (Luck based)
            if(Math.random() < (Game.getStat('LUC') * 0.02) + (Game.state.perks.includes('mysterious_stranger') ? 0.1 : 0)) {
                dmg = Math.floor(dmg * 2);
                isCrit = true;
            }

            enemy.hp -= dmg;
            this.log(`Du triffst ${this.getBodyPartName(partIndex)} für ${dmg} Schaden! ${isCrit?'CRIT!':''}`, 'text-green-400 font-bold');
            
            if(enemy.hp <= 0) {
                this.win();
                return;
            }
        } else {
            this.log("Du hast verfehlt!", 'text-gray-500');
        }

        this.turn = 'enemy';
        UI.renderCombat();
        setTimeout(() => this.enemyTurn(), 1000);
    },

    enemyTurn: function() {
        if(!Game.state.enemy || Game.state.enemy.hp <= 0) return;
        
        const enemy = Game.state.enemy;
        const roll = Math.random();
        
        // Simple Enemy AI
        let dmg = enemy.dmg;
        // Armor reduction (Endurance + Armor Bonus)
        let def = Game.getStat('END') * 0.5; // Base def
        // Real armor values logic could go here
        
        dmg = Math.max(1, Math.floor(dmg - def));
        
        if(roll < 0.8) { // 80% Hit Chance for Enemy
            Game.state.hp -= dmg;
            this.log(`${enemy.name} trifft dich für ${dmg} Schaden!`, 'text-red-500');
            
            if(Game.state.hp <= 0) {
                Game.state.isGameOver = true;
                if(UI && UI.showGameOver) UI.showGameOver();
                return;
            }
        } else {
            this.log(`${enemy.name} verfehlt dich!`, 'text-blue-300');
        }

        this.turn = 'player';
        UI.update(); // Update HP Bars in HUD
        UI.renderCombat();
    },

    win: function() {
        const enemy = Game.state.enemy;
        this.log(`${enemy.name} besiegt!`, 'text-yellow-400 font-bold');
        
        // Rewards
        const xp = Array.isArray(enemy.xp) ? Math.floor(Math.random() * (enemy.xp[1]-enemy.xp[0]) + enemy.xp[0]) : enemy.xp;
        Game.gainExp(xp);
        
        if(enemy.loot > 0) {
            Game.state.caps += enemy.loot;
            this.log(`Gefunden: ${enemy.loot} Kronkorken`, 'text-yellow-200');
        }
        
        // Item Drops
        if(enemy.drops) {
            enemy.drops.forEach(d => {
                if(Math.random() < d.c) {
                    Game.addToInventory(d.id, 1);
                }
            });
        }

        // [v0.9.12] QUEST TRIGGER (Generic Mapping)
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
        if(partIndex === 0) return Math.min(95, base - 25); // Head hard
        if(partIndex === 1) return Math.min(95, base);      // Torso normal
        if(partIndex === 2) return Math.min(95, base - 10); // Legs medium
        return 0;
    },

    calculatePlayerDamage: function() {
        const wpn = Game.state.equip.weapon || {baseDmg: 2};
        let dmg = wpn.baseDmg;
        if(wpn.props && wpn.props.dmgMult) dmg *= wpn.props.dmgMult;
        
        // Strength Bonus for Melee (simple check: if no ammo cost/type logic yet, assume melee for fists/knife)
        // For now: Just add STR/2
        dmg += (Game.getStat('STR') * 0.5);
        
        return Math.floor(dmg);
    },

    getBodyPartName: function(i) {
        return ['Kopf', 'Körper', 'Beine'][i];
    },
    
    // UI Helpers mapped to buttons
    selectPart: function(partIndex) {
        this.selectedPart = partIndex;
        // Update visual feedback manually if clicked
        this.moveSelection(0);
    },
    
    confirmSelection: function() {
        if(this.selectedPart === undefined) this.selectedPart = 1; 
        this.attack(this.selectedPart);
    }
};
