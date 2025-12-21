const Combat = {
    // V.A.T.S. Konfiguration
    VATS: [
        { id: 'head', name: 'KOPF', hitMod: -25, dmgMult: 2.5, label: "CRITICAL" },
        { id: 'torso', name: 'TORSO', hitMod: 0, dmgMult: 1.0, label: "STANDARD" },
        { id: 'legs', name: 'BEINE', hitMod: -10, dmgMult: 0.8, label: "SLOW" }
    ],

    active: false,
    selectedPartIndex: 1, // Start bei Torso (Index 1)

    start: function(enemy) {
        if(!Game.state) return;
        Game.state.enemy = enemy;
        Game.state.inDialog = true;
        this.active = true;
        this.selectedPartIndex = 1; // Reset auf Torso

        if(Date.now() < Game.state.buffEndTime) UI.log("⚡ S.P.E.C.I.A.L. OVERDRIVE aktiv!", "text-yellow-400");
        
        UI.switchView('combat').then(() => {
            this.render();
        });

        UI.log(enemy.isLegendary ? "LEGENDÄRER GEGNER!" : "Kampf gestartet!", enemy.isLegendary ? "text-yellow-400" : "text-red-500");
    },

    calcHitChance: function(partIndex) {
        const part = this.VATS[partIndex];
        const per = Game.getStat('PER');
        let baseChance = 60 + (per * 4); 
        if(part.hitMod) baseChance += part.hitMod;
        return Math.min(95, Math.max(5, baseChance));
    },

    // Neue Controls
    moveSelection: function(dir) {
        this.selectedPartIndex += dir;
        if(this.selectedPartIndex < 0) this.selectedPartIndex = this.VATS.length - 1;
        if(this.selectedPartIndex >= this.VATS.length) this.selectedPartIndex = 0;
        this.render();
    },

    confirmSelection: function() {
        const part = this.VATS[this.selectedPartIndex];
        this.playerAttack(part.id);
    },

    // Manuelles Setzen per Maus
    selectPart: function(index) {
        this.selectedPartIndex = index;
        this.render();
    },

    playerAttack: function(partId) {
        if(!Game.state.enemy || Game.state.isGameOver) return;

        const enemy = Game.state.enemy;
        const wpn = Game.state.equip.weapon;
        
        if(wpn.isRanged) { 
            if(Game.state.ammo > 0) Game.state.ammo--; 
            else { 
                UI.log("Keine Munition! Wechsel auf Fäuste.", "text-red-500"); 
                Game.state.equip.weapon = Game.items.fists; 
                this.enemyTurn(); 
                return; 
            } 
        }

        const partIndex = this.VATS.findIndex(p => p.id === partId);
        const chance = this.calcHitChance(partIndex);
        const roll = Math.random() * 100;
        const partConfig = this.VATS[partIndex];

        if(roll <= chance) {
            const baseDmg = wpn.baseDmg || 2;
            const strBonus = Game.getStat('STR') * 1.5;
            let dmg = Math.floor((baseDmg + strBonus) * partConfig.dmgMult);
            
            Game.state.enemy.hp -= dmg;
            
            let effectTxt = "";
            if(partConfig.id === 'head') effectTxt = " (CRIT!)";
            if(partConfig.id === 'legs') effectTxt = " (Verkrüppelt!)";

            UI.log(`Treffer [${partConfig.name}]: ${dmg} Schaden${effectTxt}`, "text-green-400 font-bold");
            UI.shakeView();

            if(Game.state.enemy.hp <= 0) {
                this.victory();
                return;
            }
        } else {
            UI.log(`Verfehlt [${partConfig.name}]! (${Math.floor(chance)}%)`, "text-gray-500");
        }

        this.enemyTurn();
        this.render(); 
    },

    flee: function() {
        if(Math.random() < 0.4 + (Game.getStat('AGI')*0.05)) { 
            UI.log("Geflohen.", "text-green-400"); 
            this.end(); 
        } else { 
            UI.log("Flucht gescheitert!", "text-red-500"); 
            this.enemyTurn(); 
        }
        this.render();
    },

    enemyTurn: function() {
        if(!Game.state.enemy || Game.state.enemy.hp <= 0) return;
        
        if(Math.random() < 0.8) { 
            const armor = (Game.getStat('END') * 0.5); 
            const dmg = Math.max(1, Math.floor(Game.state.enemy.dmg - armor)); 
            Game.state.hp -= dmg; 
            UI.log(`Gegner trifft: ${dmg} Schaden`, "text-red-400"); 
            
            if(Game.state.hp <= 0) { 
                Game.state.hp = 0; 
                Game.state.isGameOver = true; 
                if(typeof Network !== 'undefined') Network.deleteSave(); 
                UI.update(); 
                UI.showGameOver(); 
            }
        } else {
            UI.log("Gegner verfehlt.", "text-gray-500"); 
        }
        UI.update();
    },

    victory: function() {
        const enemy = Game.state.enemy; 
        Game.state.caps += enemy.loot; 
        UI.log(`Sieg! ${enemy.loot} Kronkorken.`, "text-yellow-400"); 
        
        if(Game.gainExp) Game.gainExp(this.getRandomXP(enemy.xp)); 
        
        if(enemy.isLegendary) { 
            Game.addToInventory('legendary_part', 1); 
            UI.log("★ DROP: Legendäres Modul", "text-yellow-400 font-bold"); 
            if(Math.random() < 0.5) { 
                const bonusCaps = Game.state.lvl * 50; 
                Game.state.caps += bonusCaps; 
                UI.log(`★ BONUS: ${bonusCaps} KK`, "text-yellow-400"); 
            } 
        } 
        
        if(enemy.drops) { 
            enemy.drops.forEach(drop => { 
                if(Math.random() < drop.c) { 
                    Game.addToInventory(drop.id, 1); 
                } 
            }); 
        } 
        this.end();
    },

    end: function() {
        Game.state.enemy = null; 
        Game.state.inDialog = false; 
        this.active = false;
        UI.switchView('map'); 
        Game.saveGame();
    },

    getRandomXP: function(xpData) { 
        if (Array.isArray(xpData)) return Math.floor(Math.random() * (xpData[1] - xpData[0] + 1)) + xpData[0]; 
        return xpData; 
    },

    // UI Helper
    render: function() {
        if (!this.active || !Game.state.enemy) return;
        
        const enemy = Game.state.enemy;
        
        // FIX: Namen setzen!
        const nameEl = document.getElementById('enemy-name');
        if(nameEl) nameEl.textContent = enemy.name;

        const hpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
        
        const hpBar = document.getElementById('enemy-hp-bar');
        if(hpBar) hpBar.style.width = `${hpPct}%`;
        
        const hpText = document.getElementById('enemy-hp-text');
        if(hpText) hpText.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`;

        // Buttons updaten
        this.VATS.forEach((part, index) => {
            const btn = document.getElementById(`btn-vats-${index}`);
            const chanceEl = document.getElementById(`chance-vats-${index}`);
            
            if(btn && chanceEl) {
                const chance = this.calcHitChance(index);
                chanceEl.textContent = Math.floor(chance) + "%";
                
                // Active State Styling
                if(index === this.selectedPartIndex) {
                    btn.classList.add('bg-green-500', 'text-black', 'border-black');
                    btn.classList.remove('bg-green-900/20', 'text-green-500', 'border-green-500');
                } else {
                    btn.classList.remove('bg-green-500', 'text-black', 'border-black');
                    btn.classList.add('bg-green-900/20', 'text-green-500', 'border-green-500');
                }
            }
        });
    }
};
