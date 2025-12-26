// [v0.5.0]
const Combat = {
    enemy: null,
    log: [],
    
    start: function(enemy) {
        this.enemy = enemy;
        Game.state.enemy = enemy;
        this.log = [`KAMPF GEGEN ${enemy.name.toUpperCase()} GESTARTET!`];
        Game.state.view = 'combat'; // Force View state
        
        UI.switchView('combat').then(() => {
            this.updateLog();
            UI.renderCombat();
        });
    },

    playerAttack: function() {
        if(!this.enemy || this.enemy.hp <= 0) return;
        
        // Player DMG Calculation
        let dmg = 1; 
        const wpn = Game.state.equip.weapon;
        if(wpn) dmg = wpn.baseDmg || 2;
        
        // Stats Bonus (STR)
        const str = Game.getStat('STR');
        dmg += Math.floor(str * 0.5);
        
        // Crit Chance (LUC)
        const luc = Game.getStat('LUC');
        const isCrit = Math.random() < (luc * 0.02); // 2% per Luck point
        if(isCrit) {
            dmg *= 2;
            this.log.push(`> KRITISCHER TREFFER! ${dmg} Schaden.`);
        } else {
            this.log.push(`> Du triffst für ${dmg} Schaden.`);
        }

        this.enemy.hp -= dmg;
        UI.shakeView();

        if(this.enemy.hp <= 0) {
            this.victory();
        } else {
            setTimeout(() => this.enemyTurn(), 600);
        }
        
        UI.renderCombat();
        this.updateLog();
    },

    enemyTurn: function() {
        if(!this.enemy || this.enemy.hp <= 0) return;
        
        // Enemy DMG
        let dmg = this.enemy.dmg || 2;
        // Defense Calculation (END + Armor)
        const end = Game.getStat('END');
        let def = Math.floor(end * 0.2); 
        if(Game.state.equip.body && Game.state.equip.body.bonus && Game.state.equip.body.bonus.END) {
            def += Game.state.equip.body.bonus.END;
        }
        
        dmg = Math.max(1, dmg - def);
        
        Game.state.hp -= dmg;
        this.log.push(`> ${this.enemy.name} greift an: -${dmg} HP`);
        
        if(Game.state.hp <= 0) {
            Game.state.hp = 0;
            this.defeat();
        }
        
        UI.renderCombat();
        this.updateLog();
        UI.update(); // Update HP Bars in HUD
    },

    victory: function() {
        this.log.push(`> ${this.enemy.name} besiegt!`);
        this.updateLog();

        // XP & Stats
        let xpGain = 10;
        if(this.enemy.xp) {
            xpGain = Array.isArray(this.enemy.xp) ? 
                Math.floor(Math.random() * (this.enemy.xp[1] - this.enemy.xp[0] + 1)) + this.enemy.xp[0] 
                : this.enemy.xp;
        }
        Game.gainExp(xpGain);
        if(Game.state.kills === undefined) Game.state.kills = 0;
        Game.state.kills++;
        
        // --- LOOT GENERATION (v0.5.0) ---
        // Regel: Im Wasteland (Open World) nur Schrott oder rostige Waffen.
        // In Dungeons oder bei Bossen besseres Zeug.
        const inDungeon = Game.state.dungeonLevel && Game.state.dungeonLevel > 0;
        
        // 1. Caps
        const caps = Math.floor(Math.random() * (this.enemy.loot || 5)) + 1;
        Game.state.caps += caps;
        this.log.push(`> Beute: ${caps} Kronkorken`);

        // 2. Items
        const dropChance = 0.4 + (Game.getStat('LUC') * 0.02); // 40% + Luck Bonus
        if(Math.random() < dropChance) {
            let itemKey = null;
            const roll = Math.random();

            if (inDungeon) {
                // Dungeon Loot Table (Better)
                if(roll < 0.5) itemKey = 'stimpack';
                else if(roll < 0.8) itemKey = 'ammo'; // Placeholder logic, requires item logic
                else if(roll < 0.95) itemKey = 'pistol_10mm'; 
                else itemKey = 'combat_armor';
            } else {
                // Wasteland Loot Table (Rusty/Junk)
                if(roll < 0.4) itemKey = 'junk_metal';
                else if(roll < 0.7) itemKey = 'duct_tape';
                else if(roll < 0.9) itemKey = 'rusty_knife';
                else itemKey = 'rusty_pistol';
            }

            // Fallback & Add
            if(itemKey) {
                if(itemKey === 'ammo') {
                    const am = Math.floor(Math.random()*5)+1;
                    Game.state.ammo += am;
                    this.log.push(`> Gefunden: ${am}x Munition`);
                } else {
                    Game.addToInventory(itemKey, 1);
                    const iName = Game.items[itemKey] ? Game.items[itemKey].name : itemKey;
                    this.log.push(`> Gefunden: ${iName}`);
                }
            }
        }

        // --- LEGENDARY GAMBLE (v0.5.0) ---
        // Nur 10% Chance bei Legendaries
        if(this.enemy.isLegendary) {
            if(Math.random() < 0.10) {
                 setTimeout(() => {
                    const sum = Math.floor(Math.random() * 20) + 1;
                    if(Game.gambleLegendaryLoot) Game.gambleLegendaryLoot(sum);
                 }, 1000);
            } else {
                // Trostpreis für Legendary ohne Gamble
                Game.state.caps += 50;
                this.log.push("> Bonus: 50 KK (Legendär)");
            }
        }

        Game.saveGame();
        
        // Button ändern
        setTimeout(() => {
             const btn = document.getElementById('combat-action-btn');
             if(btn) {
                 btn.textContent = "WEITER";
                 btn.onclick = () => {
                     UI.switchView('map');
                 };
                 btn.classList.remove('bg-red-900');
                 btn.classList.add('bg-green-700', 'animate-pulse');
             }
        }, 500);
    },

    defeat: function() {
        this.log.push("> DU BIST GESTORBEN.");
        this.updateLog();
        Game.state.isGameOver = true;
        
        // Permadeath Handling in UI/Game Core
        if(typeof Network !== 'undefined') Network.registerDeath(Game.state);
        
        setTimeout(() => {
             if(UI.els.gameOver) UI.els.gameOver.classList.remove('hidden');
        }, 1000);
    },

    moveSelection: function(dir) {
        // Simple combat usually only has "Attack" or "Flee"
        // For now, we assume standard attack is always selected or just press Space
    },

    confirmSelection: function() {
        if(Game.state.hp > 0 && this.enemy.hp > 0) {
            this.playerAttack();
        } else if (this.enemy.hp <= 0) {
            UI.switchView('map');
        }
    },

    updateLog: function() {
        const logEl = document.getElementById('combat-log');
        if(logEl) {
            logEl.innerHTML = this.log.map(l => `<div class="mb-1 border-b border-green-900/30">${l}</div>`).join('');
            logEl.scrollTop = logEl.scrollHeight;
        }
    }
};
