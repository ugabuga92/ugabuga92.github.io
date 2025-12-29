// [v0.9.3]
Object.assign(Game, {
    
    // --- BASIC ACTIONS ---
    rest: function() { 
        if(!this.state) return;
        this.state.hp = this.state.maxHp; 
        UI.log("Ausgeruht. HP voll.", "text-blue-400"); 
        UI.update(); 
    },

    heal: function() { 
        if(this.state.caps >= 25) { 
            this.state.caps -= 25; 
            this.rest(); 
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

    // [v0.9.0] Updated: Supports item objects with props (Unique Loot)
    addToInventory: function(idOrItem, count=1) { 
        if(!this.state.inventory) this.state.inventory = []; 
        
        let itemId, props = null;

        if(typeof idOrItem === 'object') {
            // Es ist ein komplexes Item (Loot)
            itemId = idOrItem.id;
            props = idOrItem.props;
            count = idOrItem.count || 1;
        } else {
            // Normaler ID String
            itemId = idOrItem;
        }

        const itemDef = this.items[itemId];
        
        if (props) {
            // Unique Items stapeln nicht -> Einfach hinzufügen
            this.state.inventory.push({ id: itemId, count: count, props: props });
            const colorClass = props.color ? props.color.split(' ')[0] : "text-green-400"; // Simple extract
            UI.log(`+ ${props.name}`, colorClass);
        } else {
            // Standard Item -> Stapeln
            const existing = this.state.inventory.find(i => i.id === itemId && !i.props); 
            if(existing) existing.count += count; 
            else this.state.inventory.push({id: itemId, count: count});
            
            const itemName = itemDef ? itemDef.name : itemId;
            UI.log(`+ ${itemName} (${count})`, "text-green-400"); 
        }
        
        if(itemDef && (itemDef.type === 'weapon' || itemDef.type === 'body')) {
            if(typeof UI !== 'undefined' && UI.triggerInventoryAlert) UI.triggerInventoryAlert();
        }
    }, 
    
    // [v0.9.0] Updated: Handles Inventory Index for unique items
    useItem: function(invIndexOrId) { 
        let invItem, index;
        
        // Wenn String übergeben wird (Quick Slots/Shop/Legacy), suchen wir das erste passende
        if(typeof invIndexOrId === 'string') {
            index = this.state.inventory.findIndex(i => i.id === invIndexOrId);
        } else {
            index = invIndexOrId;
        }

        if(index === -1 || !this.state.inventory[index]) return;
        invItem = this.state.inventory[index];
        
        const itemDef = this.items[invItem.id];
        
        // --- CAMP LOGIC ---
        if(invItem.id === 'camp_kit') { this.buildCamp(); return; }

        if(itemDef.type === 'blueprint') {
            if(!this.state.knownRecipes.includes(itemDef.recipeId)) {
                this.state.knownRecipes.push(itemDef.recipeId);
                UI.log(`Rezept gelernt: ${itemDef.name.replace('Bauplan: ', '')}`, "text-cyan-400 font-bold");
                invItem.count--;
            } else {
                UI.log("Du kennst diesen Bauplan bereits.", "text-gray-500");
                return;
            }
        }
        else if(itemDef.type === 'consumable') { 
            if(itemDef.effect === 'heal') { 
                let healAmt = itemDef.val; 
                if(this.state.perks && this.state.perks.includes('medic')) {
                    healAmt = Math.floor(healAmt * 1.5);
                    UI.log("Sanitäter Perk: +50% Heilung", "text-blue-300 text-xs");
                }
                if(this.state.hp >= this.state.maxHp) { UI.log("Gesundheit voll.", "text-gray-500"); return; } 
                this.state.hp = Math.min(this.state.maxHp, this.state.hp + healAmt); 
                UI.log(`Verwendet: ${itemDef.name} (+${healAmt} HP)`, "text-blue-400"); 
                invItem.count--; 
            } 
        } 
        else if (itemDef.type === 'weapon' || itemDef.type === 'body') { 
            const slot = itemDef.slot;
            
            // Altes Item zurücklegen
            let oldEquip = this.state.equip[slot];
            
            if(oldEquip && oldEquip.name !== "Fäuste" && oldEquip.name !== "Vault-Anzug") {
                if(oldEquip._fromInv) {
                    // Unique Item zurückgeben
                    this.addToInventory(oldEquip._fromInv);
                } else {
                    // Legacy Item zurückgeben
                    const oldKey = Object.keys(this.items).find(k => this.items[k].name === oldEquip.name);
                    if(oldKey) this.addToInventory(oldKey, 1);
                }
            } 
            
            // Neues Item ausrüsten (mit Props speichern)
            const equipObject = { ...itemDef, ...invItem.props, _fromInv: invItem }; 
            this.state.equip[slot] = equipObject;
            
            const displayName = invItem.props ? invItem.props.name : itemDef.name;
            UI.log(`Ausgerüstet: ${displayName}`, "text-yellow-400"); 
            
            if(slot === 'body') { 
                const oldMax = this.state.maxHp; 
                this.state.maxHp = this.calculateMaxHP(this.getStat('END')); 
                this.state.hp += (this.state.maxHp - oldMax); 
            }
            invItem.count--; 
        } 
        
        // Item entfernen wenn leer
        if(invItem.count <= 0) { 
            this.state.inventory.splice(index, 1); 
        } 
        
        UI.update(); 
        if(this.state.view === 'inventory') UI.renderInventory(); 
        this.saveGame(); 
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

    startCombat: function() { 
        let pool = []; 
        let lvl = this.state.lvl; 
        
        let difficultyMult = 1;
        if(this.state.dungeonLevel) {
            difficultyMult = 1 + (this.state.dungeonLevel * 0.2); 
        }

        let biome = this.worldData[`${this.state.sector.x},${this.state.sector.y}`]?.biome || 'wasteland'; 
        let zone = this.state.zone; 
        
        if(zone.includes("Supermarkt")) { pool = [this.monsters.raider, this.monsters.ghoul, this.monsters.wildDog]; if(lvl >= 4) pool.push(this.monsters.superMutant); } 
        else if (zone.includes("Höhle")) { pool = [this.monsters.moleRat, this.monsters.radScorpion, this.monsters.bloatfly]; if(lvl >= 3) pool.push(this.monsters.ghoul); } 
        else if(biome === 'city') { pool = [this.monsters.raider, this.monsters.ghoul, this.monsters.protectron]; if(lvl >= 5) pool.push(this.monsters.superMutant); if(lvl >= 7) pool.push(this.monsters.sentryBot); } 
        else if(biome === 'desert') { pool = [this.monsters.radScorpion, this.monsters.raider, this.monsters.moleRat]; } 
        else if(biome === 'jungle') { pool = [this.monsters.bloatfly, this.monsters.mutantRose, this.monsters.yaoGuai]; } 
        else if(biome === 'swamp') { pool = [this.monsters.mirelurk, this.monsters.bloatfly]; if(lvl >= 5) pool.push(this.monsters.ghoul); } 
        else { pool = [this.monsters.moleRat, this.monsters.radRoach, this.monsters.bloatfly]; if(lvl >= 2) pool.push(this.monsters.raider); if(lvl >= 3) pool.push(this.monsters.wildDog); } 
        
        if(lvl >= 8 && Math.random() < 0.1) pool = [this.monsters.deathclaw]; 
        else if (Math.random() < 0.01) pool = [this.monsters.deathclaw]; 
        
        const template = pool[Math.floor(Math.random()*pool.length)]; 
        let enemy = { ...template }; 
        
        enemy.hp = Math.floor(enemy.hp * difficultyMult);
        enemy.maxHp = enemy.hp;
        enemy.dmg = Math.floor(enemy.dmg * difficultyMult);
        enemy.loot = Math.floor(enemy.loot * difficultyMult);

        if(this.state.perks && this.state.perks.includes('fortune_finder')) {
            enemy.loot = Math.floor(enemy.loot * 1.5);
        }

        const isLegendary = Math.random() < 0.05; 
        if(isLegendary) { 
            enemy.isLegendary = true; 
            enemy.name = "Legendäre " + enemy.name; 
            enemy.hp *= 2; 
            enemy.maxHp = enemy.hp; 
            enemy.dmg = Math.floor(enemy.dmg*1.5); 
            enemy.loot *= 3; 
            if(Array.isArray(enemy.xp)) enemy.xp = [enemy.xp[0]*3, enemy.xp[1]*3]; 
        } else {
             enemy.maxHp = enemy.hp; 
        }
        
        if(typeof Combat !== 'undefined') {
            Combat.start(enemy);
        } else {
            console.error("Combat module missing!");
        }
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
            // [v0.9.0] Jackpot Drop Update
            const rareId = this.items['plasma_rifle'] ? 'plasma_rifle' : 'hunting_rifle';
            
            // Generate Legendary Item
            const item = Game.generateLoot(rareId);
            item.props = { 
                prefix: 'legendary', 
                name: `Legendäres ${this.items[rareId].name}`, 
                dmgMult: 1.5, 
                valMult: 3.0, 
                bonus: {LUC: 2}, 
                color: 'text-yellow-400 font-bold' 
            };
            
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

    // --- CAMP ACTIONS ---
    buildCamp: function() {
        if(this.state.camp) {
            UI.log(`Du hast bereits ein Lager bei [${this.state.camp.sector.x},${this.state.camp.sector.y}].`, "text-red-500");
            return;
        }

        const currentBiome = this.worldData[`${this.state.sector.x},${this.state.sector.y}`]?.biome;
        if(currentBiome === 'city' || currentBiome === 'vault') {
             UI.log("Hier ist kein Platz für ein Lager.", "text-red-500");
             return;
        }

        this.state.camp = {
            x: this.state.player.x,
            y: this.state.player.y,
            sector: { ...this.state.sector },
            level: 1,
            storage: []
        };

        const kit = this.state.inventory.find(i => i.id === 'camp_kit');
        if(kit) {
            kit.count--;
            if(kit.count <= 0) this.state.inventory = this.state.inventory.filter(i => i.id !== 'camp_kit');
        }

        UI.log("⛺ Lager errichtet!", "text-green-400 font-bold");
        UI.switchView('camp'); // Direkt betreten
        this.saveGame();
    },

    enterCamp: function() {
        if(!this.state.camp) return;
        const c = this.state.camp;
        if(c.sector.x !== this.state.sector.x || c.sector.y !== this.state.sector.y) {
            UI.log("Dein Lager ist in einem anderen Sektor.", "text-red-500");
            return;
        }
        UI.switchView('camp');
    },

    restInCamp: function() {
        if(!this.state.camp) return;
        
        let healPct = 0.5;
        if(this.state.camp.level >= 2) healPct = 1.0;

        const amount = Math.floor(this.state.maxHp * healPct);
        const missing = this.state.maxHp - this.state.hp;
        
        if(missing <= 0) {
            UI.log("Du bist bereits ausgeruht.", "text-gray-500");
            return;
        }

        this.state.hp = Math.min(this.state.maxHp, this.state.hp + amount);
        UI.log(`Ausgeruht am Feuer... +${amount} HP.`, "text-green-400 animate-pulse");
        
        this.saveGame();
        UI.update();
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
        UI.renderCamp(); // Falls renderCamp genutzt wird
    },

    // [v0.9.3] Replaces breakCamp with packCamp (Guaranteed return)
    packCamp: function() {
        if(!this.state.camp) return;
        
        this.state.camp = null;
        this.addToInventory('camp_kit', 1);
        
        UI.log("Zelt zusammengepackt und verstaut.", "text-yellow-400");
        UI.switchView('map');
        this.saveGame();
    },

    // --- RADIO ACTIONS (NEU) ---
    toggleRadio: function() {
        this.state.radio.on = !this.state.radio.on;
        UI.renderRadio();
    },
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
