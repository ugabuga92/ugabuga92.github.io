// [v0.9.9]
// Actions & Interactions
Object.assign(Game, {
    // [v0.9.9] Helper for Radiation
    addRadiation: function(amount) {
        if(!this.state) return;
        this.state.rads = Math.min(this.state.maxHp, this.state.rads + amount);
        
        // UI Feedback
        if(amount > 0) UI.log(`+${amount} RADS!`, "text-red-500 font-bold animate-pulse");
        else UI.log(`${amount} RADS entfernt.`, "text-green-300");

        // Cap HP if rads exceed current HP space
        const effectiveMax = this.state.maxHp - this.state.rads;
        if(this.state.hp > effectiveMax) {
            this.state.hp = effectiveMax;
        }

        // Check Death by Radiation? (Optional, currently just 1 HP min)
        if(this.state.hp <= 0) {
            this.state.hp = 0;
            this.state.isGameOver = true;
            UI.showGameOver();
        }
        UI.update();
    },

    addToInventory: function(itemId, amount=1) {
        if(!this.state) return;
        const existing = this.state.inventory.find(i => i.id === itemId);
        if(existing) {
            existing.count += amount;
        } else {
            // Check if item def exists
            let def = this.items[itemId];
            if(!def) {
                // Fallback for custom/generated items if passed as object
                if(typeof itemId === 'object') {
                     this.state.inventory.push(itemId);
                     UI.log(`Erhalten: ${itemId.props.name} x${itemId.count || 1}`, "text-green-400");
                     return;
                }
                console.warn("Item unknown:", itemId);
                return;
            }
            this.state.inventory.push({ id: itemId, count: amount });
        }
        const iName = (this.items && this.items[itemId]) ? this.items[itemId].name : itemId;
        UI.log(`Erhalten: ${iName} x${amount}`, "text-green-400");
    },

    removeFromInventory: function(itemId, amount=1) {
        if(!this.state) return false;
        const idx = this.state.inventory.findIndex(i => i.id === itemId);
        if(idx === -1) return false;
        
        if(this.state.inventory[idx].count > amount) {
            this.state.inventory[idx].count -= amount;
            return true;
        } else if(this.state.inventory[idx].count === amount) {
            this.state.inventory.splice(idx, 1);
            return true;
        }
        return false;
    },

    useItem: function(index) {
        if(!this.state || !this.state.inventory[index]) return;
        const item = this.state.inventory[index];
        const def = this.items[item.id];
        
        if(!def) return;

        // [v0.9.9] Logic: Nuka Cola & RadAway
        if(item.id === 'nuka_cola') {
            this.state.hp = Math.min(this.state.hp + 15, this.state.maxHp - this.state.rads);
            this.state.caps += 1;
            this.addRadiation(5); // Nuka gives rads
            UI.log("Nuka Cola getrunken! (+15 HP, +5 RADS)", "text-blue-400");
            this.removeFromInventory('nuka_cola', 1);
            UI.update();
            return;
        }

        if(item.id === 'rad_away') {
            this.state.rads = Math.max(0, this.state.rads - 40); // Remove 40 Rads
            UI.log("RadAway injiziert. -40 RADS", "text-green-300 font-bold");
            this.removeFromInventory('rad_away', 1);
            UI.update();
            return;
        }

        if(def.type === 'consumable') {
            if(def.effect === 'heal') {
                // PERK: Medic
                let healAmount = def.value;
                if(this.state.perks.includes('medic')) healAmount = Math.floor(healAmount * 1.5);
                
                // [v0.9.9] Heal Limit by Rads
                const effectiveMax = this.state.maxHp - this.state.rads;
                
                if(this.state.hp >= effectiveMax) {
                     UI.log("HP durch Strahlung begrenzt!", "text-red-500");
                     return; 
                }

                this.state.hp = Math.min(this.state.hp + healAmount, effectiveMax);
                UI.log(`${def.name} verwendet. +${healAmount} HP`, "text-green-400");
                this.removeFromInventory(item.id, 1);
            }
        } else if(def.type === 'weapon' || def.type === 'armor') {
            this.equipItem(index);
        } else if(def.id === 'camp_kit') {
            this.deployCamp(index);
        }

        UI.update();
    },

    equipItem: function(invIndex) {
        const item = this.state.inventory[invIndex];
        const def = this.items[item.id];
        if(!item || !def) return;

        let slot = 'weapon';
        if(def.type === 'armor') slot = 'body';

        // Swap
        const current = this.state.equip[slot];
        
        // Remove from inv
        this.state.inventory.splice(invIndex, 1);
        
        // Return old to inv
        if(current && current.id !== 'fists' && current.id !== 'vault_suit') {
            this.state.inventory.push(current);
        }

        this.state.equip[slot] = item;
        UI.log(`${item.props ? item.props.name : def.name} ausgerüstet!`, "text-yellow-400");
        UI.update();
    },

    deployCamp: function(invIndex) {
        if(this.state.camp) {
            UI.log("Du hast bereits ein Lager aufgeschlagen!", "text-red-500");
            return;
        }
        if(this.state.zone.includes("Stadt") || this.state.dungeonLevel > 0) {
            UI.log("Hier kannst du nicht lagern!", "text-red-500");
            return;
        }

        // Remove Kit
        this.removeFromInventory('camp_kit', 1);
        
        // Set Camp
        this.state.camp = {
            sx: this.state.sector.x,
            sy: this.state.sector.y,
            x: this.state.player.x,
            y: this.state.player.y
        };
        
        UI.log("Lager aufgeschlagen!", "text-green-400 font-bold");
        UI.switchView('camp'); // [v0.9.2] Direct entry on build
    },

    // [v0.9.2] Camp Logic
    packCamp: function() {
        if(!this.state.camp) return;
        this.state.camp = null;
        this.addToInventory('camp_kit', 1);
        UI.log("Lager eingepackt.", "text-yellow-400");
        UI.switchView('map');
    },

    restInCamp: function() {
        const effectiveMax = this.state.maxHp - this.state.rads;
        if(this.state.hp >= effectiveMax) {
            UI.log("Du bist ausgeruht (soweit die Strahlung es zulässt).", "text-gray-400");
            return;
        }
        
        const heal = Math.floor(this.state.maxHp * 0.5);
        this.state.hp = Math.min(this.state.hp + heal, effectiveMax);
        
        UI.log("Du ruhst dich am Feuer aus... HP wiederhergestellt.", "text-green-400 animate-pulse");
        UI.update();
    },

    startCombat: function() {
        this.state.inCombat = true;
        // Simple mock combat start
        UI.switchView('combat');
    },

    // --- OTHER ACTIONS (REST/HEAL) ---
    rest: function() { 
        if(!this.state) return;
        const effectiveMax = this.state.maxHp - this.state.rads;
        this.state.hp = effectiveMax; 
        UI.log("Ausgeruht.", "text-blue-400"); 
        UI.update(); 
    },

    heal: function() { 
        if(this.state.caps >= 25) { 
            this.state.caps -= 25; 
            // Doctor heals RADS too!
            this.state.rads = 0;
            this.state.hp = this.state.maxHp;
            UI.log("Dr. Zimmermann: 'Wie neu!' (HP & Rads geheilt)", "text-green-400");
            UI.update(); 
        } else {
            UI.log("Zu wenig Kronkorken.", "text-red-500"); 
        }
    },
    
    buyAmmo: function() { 
        if(this.state.caps >= 10) { 
            this.state.caps -= 10; 
            this.state.ammo += 10; 
            UI.log("Munition gekauft.", "text-green-400"); 
            UI.update(); 
        } else {
            UI.log("Zu wenig Kronkorken.", "text-red-500"); 
        }
    },
    
    buyItem: function(key) { 
        const item = this.items[key]; 
        if(this.state.caps >= item.cost) { 
            this.state.caps -= item.cost; 
            this.addToInventory(key, 1); 
            UI.log(`Gekauft: ${item.name}`, "text-green-400"); 
            const con = document.getElementById('shop-list');
            if(con) UI.renderShop(con);
            UI.update(); 
        } else { 
            UI.log("Zu wenig Kronkorken.", "text-red-500"); 
        } 
    },

    craftItem: function(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if(!recipe) return;
        if(this.state.lvl < recipe.lvl) { UI.log(`Benötigt Level ${recipe.lvl}!`, "text-red-500"); return; }
        
        for(let reqId in recipe.req) {
            const countNeeded = recipe.req[reqId];
            const invItem = this.state.inventory.find(i => i.id === reqId);
            if (!invItem || invItem.count < countNeeded) { UI.log(`Material fehlt: ${this.items[reqId].name}`, "text-red-500"); return; }
        }
        for(let reqId in recipe.req) {
            const countNeeded = recipe.req[reqId];
            const invItem = this.state.inventory.find(i => i.id === reqId);
            invItem.count -= countNeeded;
            if(invItem.count <= 0) this.state.inventory = this.state.inventory.filter(i => i.id !== reqId);
        }
        if(recipe.out === "AMMO") { this.state.ammo += recipe.count; UI.log(`Hergestellt: ${recipe.count} Munition`, "text-green-400 font-bold"); } 
        else { this.addToInventory(recipe.out, recipe.count); UI.log(`Hergestellt: ${this.items[recipe.out].name}`, "text-green-400 font-bold"); }
        
        if(typeof UI !== 'undefined') UI.renderCrafting(); 
    },
    
    gambleLegendaryLoot: function(sum) {
        UI.log(`🎲 Wasteland Gamble: ${sum}`, "text-yellow-400 font-bold");
        if(sum <= 9) {
            if(Math.random() < 0.5) {
                this.state.caps += 50;
                UI.log("Gewinn: 50 Kronkorken", "text-green-400");
            } else {
                this.state.ammo += 10;
                UI.log("Gewinn: 10x Munition", "text-green-400");
            }
        }
        else if(sum <= 15) {
            this.state.caps += 150;
            this.addToInventory('stimpack', 1);
            const comp = this.items['screws'] ? 'screws' : 'junk_metal';
            this.addToInventory(comp, 5);
            UI.log("Gewinn: 150 KK + Stimpack + Schrott", "text-blue-400");
        }
        else {
            const rareId = this.items['plasma_rifle'] ? 'plasma_rifle' : 'hunting_rifle';
            const item = Game.generateLoot(rareId);
            item.props = { prefix: 'legendary', name: `Legendäres ${this.items[rareId].name}`, dmgMult: 1.5, valMult: 3.0, bonus: {LUC: 2}, color: 'text-yellow-400 font-bold' };
            this.addToInventory(item);
            this.state.caps += 300;
            UI.log("JACKPOT! Legendäre Waffe + 300 KK!", "text-yellow-400 font-bold animate-pulse");
        }
        this.saveGame();
    },

    upgradeStat: function(key, e) { 
        if(e) e.stopPropagation(); 
        if(this.state.statPoints > 0) { 
            this.state.stats[key]++; 
            this.state.statPoints--; 
            if(key === 'END') this.state.maxHp = this.calculateMaxHP(this.getStat('END')); 
            UI.renderChar(); 
            UI.update(); 
            this.saveGame(); 
        } 
    },

    choosePerk: function(perkId) {
        if(this.state.perkPoints > 0 && !this.state.perks.includes(perkId)) {
            const perk = this.perkDefs.find(p => p.id === perkId);
            if(!perk) return;
            this.state.perks.push(perkId);
            this.state.perkPoints--;
            UI.log(`Perk gelernt: ${perk.name}`, "text-yellow-400 font-bold");
            if(perkId === 'toughness') {
                this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
                this.state.hp += 20;
            }
            UI.renderChar();
            UI.update();
            this.saveGame();
        }
    },
    
    upgradeCamp: function() {
        if(!this.state.camp) return;
        const lvl = this.state.camp.level;
        let costScrap = 0;
        if(lvl === 1) { costScrap = 10; }
        else if(lvl === 2) { costScrap = 25; } 
        const scrapItem = this.state.inventory.find(i => i.id === 'junk_metal');
        if(!scrapItem || scrapItem.count < costScrap) {
            UI.log(`Benötigt ${costScrap}x Schrott.`, "text-red-500");
            return;
        }
        scrapItem.count -= costScrap;
        if(scrapItem.count <= 0) this.state.inventory = this.state.inventory.filter(i => i.id !== 'junk_metal');
        this.state.camp.level++;
        UI.log(`Lager auf Level ${this.state.camp.level} verbessert!`, "text-yellow-400 font-bold");
        this.saveGame();
        UI.renderCamp();
    },

    toggleRadio: function() { this.state.radio.on = !this.state.radio.on; UI.renderRadio(); },
    tuningRadio: function(dir) {
        if(!this.state.radio.on) return;
        let next = this.state.radio.station + dir;
        if(next < 0) next = this.radioStations.length - 1;
        if(next >= this.radioStations.length) next = 0;
        this.state.radio.station = next;
        this.state.radio.trackIndex = 0;
        UI.renderRadio();
    }
});
