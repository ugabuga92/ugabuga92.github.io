// [v1.7.4] - 2025-12-31 (Actions Cleanup & Stock Logic)
Object.assign(window.Game, {
    
    // --- MOVEMENT & MAP ---
    changeSector: function(x, y) {
        if(x < 0 || x >= this.WORLD_W || y < 0 || y >= this.WORLD_H) return;
        this.state.sector = {x, y};
        
        // Reset Local State
        this.state.player.x = Math.floor(this.MAP_W / 2);
        this.state.player.y = Math.floor(this.MAP_H / 2);
        this.state.visitedSectors = this.state.visitedSectors || [];
        const key = `${x},${y}`;
        if(!this.state.visitedSectors.includes(key)) this.state.visitedSectors.push(key);
        
        // Check Quest Progress (Visit)
        this.updateQuestProgress('visit', `${x},${y}`);

        this.loadSector(x, y);
        this.saveGame();
    },

    loadSector: function(sx, sy) {
        if(typeof WorldGen !== 'undefined') {
            this.worldData = WorldGen.generateSector(sx, sy); 
        }
        this.initCache(); 
        if(this.renderStaticMap) this.renderStaticMap(); 
        this.reveal(this.state.player.x, this.state.player.y);
    },

    reveal: function(px, py) {
        const rad = 6;
        const key = `${this.state.sector.x},${this.state.sector.y}`;
        if(!this.state.explored[key]) this.state.explored[key] = [];
        
        for(let y = py - rad; y <= py + rad; y++) {
            for(let x = px - rad; x <= px + rad; x++) {
                if(x>=0 && x<this.MAP_W && y>=0 && y<this.MAP_H) {
                    const dist = (x-px)**2 + (y-py)**2;
                    if(dist <= rad*rad) {
                        const idx = y * this.MAP_W + x;
                        if(!this.state.explored[key].includes(idx)) {
                            this.state.explored[key].push(idx);
                        }
                    }
                }
            }
        }
    },

    // --- INVENTORY & ITEMS ---
    addToInventory: function(id, count=1, props=null) {
        let existing = null;
        if(!props) {
            existing = this.state.inventory.find(i => i.id === id && !i.props);
        }
        if(existing) {
            existing.count += count;
            existing.isNew = true; 
        } else {
            this.state.inventory.push({ id, count, props, isNew: true });
        }
        UI.triggerInventoryAlert();
    },

    removeFromInventory: function(id, count=1) {
        const idx = this.state.inventory.findIndex(i => i.id === id);
        if(idx >= 0) {
            this.state.inventory[idx].count -= count;
            if(this.state.inventory[idx].count <= 0) {
                this.state.inventory.splice(idx, 1);
            }
            return true;
        }
        return false;
    },

    equipItem: function(index) {
        const itemEntry = this.state.inventory[index];
        if(!itemEntry) return;
        const itemDef = this.items[itemEntry.id];
        if(!itemDef) return;

        if(itemDef.type === 'weapon') {
            this.state.equip.weapon = { ...itemDef, props: itemEntry.props };
            UI.log(`${itemEntry.props ? itemEntry.props.name : itemDef.name} ausgerüstet.`, "text-green-400");
        } else if (itemDef.type === 'body') {
            this.state.equip.body = { ...itemDef, props: itemEntry.props };
            UI.log(`${itemEntry.props ? itemEntry.props.name : itemDef.name} angezogen.`, "text-green-400");
        }
        
        // Recalc HP if END changed
        this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
        if(this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;

        this.saveGame();
        UI.renderInventory();
    },

    unequipItem: function(slot) {
        if(slot === 'weapon') {
            this.state.equip.weapon = this.items.fists;
            UI.log("Waffe abgelegt.", "text-yellow-200");
        } else if (slot === 'body') {
            this.state.equip.body = this.items.vault_suit;
            UI.log("Rüstung ausgezogen.", "text-yellow-200");
        }
        
        this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
        if(this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
        
        this.saveGame();
        UI.renderChar('stats'); 
    },

    useItem: function(index) {
        const entry = this.state.inventory[index];
        if(!entry) return;
        
        // --- CONSUMABLES ---
        if(entry.id === 'stimpack') {
            if(this.state.hp >= this.state.maxHp) { UI.log("Gesundheit ist voll!", "text-gray-500"); return; }
            let heal = 30;
            if(this.state.perks.includes('medic')) heal = Math.floor(heal * 1.5);
            this.state.hp = Math.min(this.state.maxHp, this.state.hp + heal);
            this.removeFromInventory('stimpack', 1);
            UI.log(`Stimpack benutzt. +${heal} HP`, "text-green-400");
        } 
        else if(entry.id === 'radaway') {
            if(this.state.rads <= 0) { UI.log("Keine Strahlung vorhanden.", "text-gray-500"); return; }
            this.state.rads = Math.max(0, this.state.rads - 50);
            this.removeFromInventory('radaway', 1);
            UI.log("RadAway benutzt. Strahlung gesunken.", "text-green-400");
        }
        else if(entry.id === 'nuka_cola') {
            this.state.hp = Math.min(this.state.maxHp, this.state.hp + 10);
            this.state.caps += 1; // Cap reward
            this.removeFromInventory('nuka_cola', 1);
            UI.log("Nuka Cola getrunken. +10 HP, +1 KK", "text-blue-300");
        }
        
        // --- TOOLS ---
        else if(entry.id === 'camp_kit') {
            if(this.state.camp) { UI.log("Du hast bereits ein Lager!", "text-red-500"); return; }
            if(this.state.zone !== 'Ödland') { UI.log("Hier kannst du nicht bauen!", "text-red-500"); return; }
            
            this.state.camp = { 
                x: this.state.player.x, y: this.state.player.y, 
                sector: { ...this.state.sector }, 
                sx: this.state.sector.x, sy: this.state.sector.y, // Backup coords
                level: 1, storage: [] 
            };
            this.removeFromInventory('camp_kit', 1);
            
            // Quest Progress
            const q = this.questDefs.find(qd => qd.type === 'craft' && qd.target === 'camp');
            if(q) this.updateQuestProgress('craft', 'camp'); // Optional custom trigger
            this.updateQuestProgress('use', 'camp_kit'); // Generic

            UI.log("C.A.M.P. erfolgreich errichtet!", "text-green-400 font-bold");
            this.saveGame();
            if(this.renderStaticMap) this.renderStaticMap(); 
        }
        
        // --- BLUEPRINTS ---
        else if(entry.id.startsWith('bp_')) {
            const recipeId = entry.id.replace('bp_', 'craft_'); // Convention: bp_machete -> craft_machete
            // Fallback map if convention fails or special cases
            let targetRecipe = recipeId; 
            
            // Check if recipe exists
            const recipeExists = this.recipes.find(r => r.id === targetRecipe);
            
            if(recipeExists) {
                if(!this.state.knownRecipes.includes(targetRecipe)) {
                    this.state.knownRecipes.push(targetRecipe);
                    this.removeFromInventory(entry.id, 1);
                    UI.log(`Bauplan gelernt: ${this.items[recipeExists.out].name}`, "text-yellow-400 font-bold");
                } else {
                    UI.log("Diesen Bauplan kennst du schon.", "text-gray-500");
                }
            } else {
                UI.log("Bauplan ist unleserlich (Datenfehler).", "text-red-500");
            }
        }
        
        this.saveGame();
        UI.renderInventory();
    },

    // --- CRAFTING ---
    craftItem: function(recipeId) {
        const r = this.recipes.find(rec => rec.id === recipeId);
        if(!r) return;
        
        // Check Requirements
        for(let reqId in r.req) {
            const needed = r.req[reqId];
            const item = this.state.inventory.find(i => i.id === reqId);
            if(!item || item.count < needed) {
                UI.log("Nicht genug Materialien!", "text-red-500");
                return;
            }
        }
        
        // Consume
        for(let reqId in r.req) {
            this.removeFromInventory(reqId, r.req[reqId]);
        }
        
        // Produce
        if(r.out === 'AMMO') {
            this.state.ammo += 15;
            UI.log("Munition (x15) hergestellt.", "text-green-400");
        } else {
            this.addToInventory(r.out, 1);
            const resItem = this.items[r.out];
            UI.log(`${resItem.name} hergestellt.`, "text-green-400");
        }
        
        // XP Reward
        this.gainExp(10);
        this.saveGame();
        UI.renderCrafting();
    },

    // --- SHOP & ECONOMY ---
    buyItem: function(key) {
        const item = this.items[key];
        if(!item) return;
        
        // Stock Check
        if(!this.state.shop.stock) this.state.shop.stock = {};
        const currentStock = this.state.shop.stock[key] || 0;
        
        if(currentStock <= 0) {
            UI.log("Dieser Gegenstand ist ausverkauft!", "text-red-500");
            return;
        }

        if(this.state.caps >= item.cost) {
            this.state.caps -= item.cost;
            this.state.shop.stock[key]--; // Reduce Stock
            this.addToInventory(key, 1);
            UI.log(`${item.name} gekauft.`, "text-yellow-200");
            
            this.saveGame();
            
            // Re-render both to update caps and lists
            if(typeof UI.renderShop === 'function') UI.renderShop();
            if(UI.els.dialog) UI.closeDialog(); // Close confirm dialog
        } else {
            UI.log("Nicht genug Kronkorken!", "text-red-500");
        }
    },
    
    buyAmmo: function() {
        const cost = 10;
        const amount = 10;
        
        // Stock Check
        if(typeof this.state.shop.ammoStock === 'undefined') this.state.shop.ammoStock = 10;
        
        if(this.state.shop.ammoStock <= 0) {
            UI.log("Munition ist ausverkauft!", "text-red-500");
            return;
        }

        if(this.state.caps >= cost) {
            this.state.caps -= cost;
            this.state.ammo += amount;
            this.state.shop.ammoStock--; // Reduce Stock packs
            UI.log(`${amount}x Munition gekauft.`, "text-yellow-200");
            this.saveGame();
            if(typeof UI.renderShop === 'function') UI.renderShop();
        } else {
            UI.log("Nicht genug Kronkorken!", "text-red-500");
        }
    },

    sellItem: function(index) {
        const entry = this.state.inventory[index];
        if(!entry) return;
        const item = this.items[entry.id];
        
        let val = Math.floor(item.cost * 0.3); // 30% resale value
        if(entry.props && entry.props.valMult) val = Math.floor(val * entry.props.valMult);
        if(val < 1) val = 1;
        
        // Barter Perk?
        if(this.state.perks.includes('fortune_finder')) val = Math.floor(val * 1.2);

        this.state.caps += val;
        this.removeFromInventory(entry.id, 1);
        UI.log(`${entry.props ? entry.props.name : item.name} verkauft (+${val} KK).`, "text-yellow-200");
        
        this.saveGame();
        
        // Close Dialog and Refresh
        if(UI.els.dialog) UI.closeDialog();
        // Since selling happens usually in Inventory view, we might want to refresh that or shop
        if(this.state.view === 'shop') UI.renderShop(); 
        else UI.renderInventory();
    },

    // --- CAMP ACTIONS ---
    enterCamp: function() {
        if(!this.state.camp) return;
        this.state.zone = 'C.A.M.P.';
        UI.switchView('camp');
    },

    restInCamp: function() {
        if(!this.state.camp) return;
        const healAmt = this.state.camp.level === 2 ? this.state.maxHp : Math.floor(this.state.maxHp * 0.5);
        
        // Only heal if needed
        if(this.state.hp < this.state.maxHp) {
            this.state.hp = Math.min(this.state.maxHp, this.state.hp + healAmt);
            UI.log("Du hast dich ausgeruht. HP wiederhergestellt.", "text-green-400");
        } else {
            UI.log("Du bist bereits ausgeruht.", "text-gray-500");
        }
        
        // Save
        this.saveGame();
        UI.renderCamp();
    },
    
    upgradeCamp: function() {
        if(!this.state.camp) return;
        if(this.state.camp.level >= 2) return;
        
        const cost = 10;
        const junk = this.state.inventory.find(i => i.id === 'junk');
        
        if(junk && junk.count >= cost) {
            this.removeFromInventory('junk', cost);
            this.state.camp.level++;
            UI.log("Lager auf Level 2 verbessert!", "text-yellow-400 font-bold");
            this.saveGame();
            UI.renderCamp();
        } else {
            UI.log(`Nicht genug Schrott! Benötigt: ${cost}`, "text-red-500");
        }
    },

    // --- HEALING ---
    heal: function() {
        if(this.state.caps >= 25) {
            this.state.caps -= 25;
            this.state.hp = this.state.maxHp;
            this.state.rads = 0;
            // Restore crippled limbs if implemented
            UI.log("Dr. Zimmermann hat dich verarztet.", "text-green-400");
            this.saveGame();
            UI.renderClinic();
        }
    },

    // --- PERKS & STATS ---
    upgradeStat: function(stat) {
        if(this.state.statPoints > 0) {
            this.state.stats[stat]++;
            this.state.statPoints--;
            
            // Recalc derived stats
            if(stat === 'END') {
                const oldMax = this.state.maxHp;
                this.state.maxHp = this.calculateMaxHP(this.state.stats.END);
                this.state.hp += (this.state.maxHp - oldMax); // Heal the difference
            }
            
            UI.log(`${stat} erhöht!`, "text-green-400");
            this.saveGame();
            UI.renderChar('stats');
        }
    },

    choosePerk: function(perkId) {
        if(this.state.perkPoints > 0 && !this.state.perks.includes(perkId)) {
            this.state.perks.push(perkId);
            this.state.perkPoints--;
            
            // Immediate Effects
            if(perkId === 'toughness') {
                this.state.maxHp += 20;
                this.state.hp += 20;
            }
            
            UI.log("Neuen Perk gelernt!", "text-yellow-400 font-bold");
            this.saveGame();
            UI.renderChar('perks');
        }
    }
});
