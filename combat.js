const Combat = {
    // V.A.T.S. Konfiguration
    VATS: {
        HEAD: { id: 'head', name: 'KOPF', hitMod: -25, dmgMult: 2.5, label: "CRITICAL" },
        TORSO: { id: 'torso', name: 'TORSO', hitMod: 0, dmgMult: 1.0, label: "STANDARD" },
        LEGS: { id: 'legs', name: 'BEINE', hitMod: -10, dmgMult: 0.8, label: "SLOW" }
    },

    active: false,

    start: function(enemy) {
        if(!Game.state) return;
        Game.state.enemy = enemy;
        Game.state.inDialog = true;
        this.active = true;

        // Intro Sound/Effekt (simuliert durch Log)
        if(Date.now() < Game.state.buffEndTime) UI.log("⚡ S.P.E.C.I.A.L. OVERDRIVE aktiv!", "text-yellow-400");
        
        // View Wechseln
        UI.switchView('combat').then(() => {
            UI.renderCombat();
        });

        UI.log(enemy.isLegendary ? "LEGENDÄRER GEGNER!" : "Kampf gestartet!", enemy.isLegendary ? "text-yellow-400" : "text-red-500");
    },

    // Berechnet Trefferchance basierend auf PER
    calcHitChance: function(partId) {
        const per = Game.getStat('PER');
        let baseChance = 60 + (per * 4); // Basis: 60% + 4% pro PER Punkt
        
        // Modifikatoren je nach Körperteil
        if(partId === 'head') baseChance += this.VATS.HEAD.hitMod;
        if(partId === 'legs') baseChance += this.VATS.LEGS.hitMod;
        
        return Math.min(95, Math.max(5, baseChance)); // Min 5%, Max 95%
    },

    // Die Aktion des Spielers
    playerAttack: function(partId) {
        if(!Game.state.enemy || Game.state.isGameOver) return;

        const enemy = Game.state.enemy;
        const wpn = Game.state.equip.weapon;
        
        // Munitionscheck
        if(wpn.isRanged) { 
            if(Game.state.ammo > 0) Game.state.ammo--; 
            else { 
                UI.log("Keine Munition! Wechsel auf Fäuste.", "text-red-500"); 
                Game.state.equip.weapon = Game.items.fists; 
                this.enemyTurn(); 
                return; 
            } 
        }

        // Treffer Berechnung
        const chance = this.calcHitChance(partId);
        const roll = Math.random() * 100;
        const partConfig = Object.values(this.VATS).find(p => p.id === partId);

        if(roll <= chance) {
            // TREFFER
            const baseDmg = wpn.baseDmg || 2;
            const strBonus = Game.getStat('STR') * 1.5;
            let dmg = Math.floor((baseDmg + strBonus) * partConfig.dmgMult);
            
            Game.state.enemy.hp -= dmg;
            
            // Effekt Text
            let effectTxt = "";
            if(partId === 'head') effectTxt = " (CRIT!)";
            if(partId === 'legs') {
                effectTxt = " (Verkrüppelt!)";
                // TODO: Gegner verlangsamen Logik für Beta 0.2
            }

            UI.log(`Treffer [${partConfig.name}]: ${dmg} Schaden${effectTxt}`, "text-green-400 font-bold");
            UI.shakeView();

            if(Game.state.enemy.hp <= 0) {
                this.victory();
                return;
            }
        } else {
            // DANEBEN
            UI.log(`Verfehlt [${partConfig.name}]! (${Math.floor(chance)}%)`, "text-gray-500");
        }

        this.enemyTurn();
        UI.renderCombat(); // Update UI (HP bars etc)
    },

    flee: function() {
        if(Math.random() < 0.4 + (Game.getStat('AGI')*0.05)) { 
            UI.log("Geflohen.", "text-green-400"); 
            this.end(); 
        } else { 
            UI.log("Flucht gescheitert!", "text-red-500"); 
            this.enemyTurn(); 
        }
        UI.renderCombat();
    },

    enemyTurn: function() {
        if(!Game.state.enemy || Game.state.enemy.hp <= 0) return;
        
        // Gegner greift an
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
        
        if(Game.gainExp) Game.gainExp(this.getRandomXP(enemy.xp)); // Nutzen der Game function
        
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
    }
};
