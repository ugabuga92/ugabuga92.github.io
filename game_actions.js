// [v1.3.3] - 2025-12-30 15:55 (Fix Rest in Camp & Item Safety)
// ------------------------------------------------
// - Bugfix: Fehlende Funktion 'restInCamp' hinzugefügt.
// - Bugfix: Absturzschutz beim Item-Wechsel (Undefined checks).

Object.assign(Game, {
    
    // Helper: Strahlung hinzufügen/entfernen
    addRadiation: function(amount) {
        if(!this.state) return;
        if(typeof this.state.rads === 'undefined') this.state.rads = 0;
        
        this.state.rads = Math.min(this.state.maxHp, Math.max(0, this.state.rads + amount));
        
        if(amount > 0) UI.log(`+${amount} RADS!`, "text-red-500 font-bold animate-pulse");
        else UI.log(`${Math.abs(amount)} RADS entfernt.`, "text-green-300");

        const effectiveMax = this.state.maxHp - this.state.rads;
        if(this.state.hp > effectiveMax) {
            this.state.hp = effectiveMax;
        }

        if(this.state.hp <= 0 && amount > 0) {
            this.state.hp = 0;
            this.state.isGameOver = true;
            if(UI && UI.showGameOver) UI.showGameOver();
        }
        UI.update();
    },

    // --- BASIC ACTIONS ---
    rest: function() { 
        if(!this.state) return;
        const effectiveMax = this.state.maxHp - (this.state.rads || 0);
        this.state.hp = effectiveMax; 
        UI.log("Ausgeruht. HP voll (soweit möglich).", "text-blue-400"); 
        UI.update(); 
    },

    // [v1.3.3] Added missing restInCamp function
    restInCamp: function() {
        if(!this.state || !this.state.camp) return;
        
        const lvl = this.state.camp.level || 1;
        const effectiveMax = this.state.maxHp - (this.state.rads || 0);
        
        let healAmount = 0;
        
        if(lvl === 1) {
            // Level 1: Heilt 50% der Max HP
            healAmount = Math.floor(effectiveMax * 0.5);
            this.state.hp = Math.min(effectiveMax, this.state.hp + healAmount);
            UI.log("Ausgeruht (Basis-Zelt). +50% HP.", "text-blue-400");
        } else {
            // Level 2+: Heilt 100%
            this.state.hp = effectiveMax;
            UI.log("Ausgeruht (Komfort-Zelt). HP voll.", "text-green-400 font-bold");
        }
        
        UI.update();
        // Refresh Camp View to show updated HP/Status
        if(typeof UI.renderCamp === 'function') UI.renderCamp();
    },

    heal: function() { 
        if(this.state.caps >= 25) { 
            this.state.caps -= 25; 
            this.state.rads = 0; 
            this.state.hp = this.state.maxHp; 
            UI.log("Dr. Zimmermann: 'Alles wieder gut!' (-RADS, +HP)", "text-green-400");
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

    addToInventory: function(idOrItem, count=1) { 
        if(!this.state.inventory) this.state.inventory = []; 
        let itemId, props = null;

        if(typeof idOrItem === 'object') {
            itemId = idOrItem.id;
            props = idOrItem.props;
            count = idOrItem.count || 1;
        } else {
            itemId = idOrItem;
        }

        const itemDef = this.items[itemId];
        
        if (props) {
            this.state.inventory.push({ id: itemId, count: count, props: props, isNew: true });
            const colorClass = props.color ? props.color.split(' ')[0] : "text-green-400";
            UI.log(`+ ${props.name}`, colorClass);
        } else {
            const existing = this.state.inventory.find(i => i.id === itemId && !i.props); 
            if(existing) {
                existing.count += count; 
                existing.isNew = true; 
            }
            else {
                this.state.inventory.push({id: itemId, count: count, isNew: true});
            }
            const itemName = itemDef ? itemDef.name : itemId;
            UI.log(`+ ${itemName} (${count})`, "text-green-400"); 
        }
        
        if(itemDef && (itemDef.type === 'weapon' || itemDef.type === 'body')) {
            if(typeof UI !== 'undefined' && UI.triggerInventoryAlert) UI.triggerInventoryAlert();
        }
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

    useItem: function(invIndexOrId) { 
        let invItem, index;
        if(typeof invIndexOrId === 'string') {
            index = this.state.inventory.findIndex(i => i.id === invIndexOrId);
        } else {
            index = invIndexOrId;
        }

        if(index === -1 || !this.state.inventory[index]) return;
        invItem = this.state.inventory[index];
        const itemDef = this.items[invItem.id];
        
        if(invItem.id === 'camp_kit') { this.deployCamp(index); return; }

        if(invItem.id === 'nuka_cola') {
            const effectiveMax = this.state.maxHp - (this.state.rads || 0);
            this.state.hp = Math.min(this.state.hp + 15, effectiveMax);
            this.state.caps += 1;
            this.addRadiation(5);
            UI.log("Nuka Cola: Erfrischend... und strahlend.", "text-blue-400");
            this.removeFromInventory('nuka_cola', 1);
            UI.update();
            return;
        }

        if(invItem.id === 'radaway') {
            this.addRadiation(-50); 
            UI.log("RadAway verwendet. Strahlung sinkt.", "text-green-300 font-bold");
            this.removeFromInventory('radaway', 1);
            UI.update();
            return;
        }

        if(itemDef.type === 'blueprint') {
            if(!this.state.knownRecipes.includes(itemDef.recipeId)) {
                this.state.knownRecipes.push(itemDef.recipeId);
                UI.log(`Gelernt: ${itemDef.name}`, "text-cyan-400 font-bold");
                invItem.count--;
                if(invItem.count <= 0) this.state.inventory.splice(index, 1);
            } else {
                UI.log("Du kennst diesen Bauplan bereits.", "text-gray-500");
            }
            return;
        }
        else if(itemDef.type === 'consumable') { 
            if(itemDef.effect === 'heal') { 
                let healAmt = itemDef.val; 
                if(this.state.perks && this.state.perks.includes('medic')) {
                    healAmt = Math.floor(healAmt * 1.5);
                }
                const effectiveMax = this.state.maxHp - (this.state.rads || 0);
                if(this.state.hp >= effectiveMax) { UI.log("Gesundheit voll (Strahlung blockiert mehr).", "text-gray-500"); return; } 
                
                this.state.hp = Math.min(effectiveMax, this.state.hp + healAmt); 
                UI.log(`Verwendet: ${itemDef.name} (+${healAmt} HP)`, "text-blue-400"); 
                invItem.count--; 
                if(invItem.count <= 0) this.state.inventory.splice(index, 1);
            } 
        } 
        else if (itemDef.type === 'weapon' || itemDef.type === 'body') { 
            const slot = itemDef.slot;
            let oldEquip = this.state.equip[slot];
            
            // [v1.3.3] EXTRA SAFETY CHECK HERE
            if(oldEquip && oldEquip.name !== "Fäuste" && oldEquip.name !== "Vault-Anzug") {
                const existsInInv = this.state.inventory.some(i => {
                    // Props check first
                    if(i.props) return i.props.name === oldEquip.name;
                    
                    // Safety check for item definition
                    // If item ID is invalid/removed from DB, this.items[i.id] is undefined
                    const def = this.items[i.id];
                    if (def) return def.name === oldEquip.name;
                    
                    return false;
                });

                if(!existsInInv) {
                    if(oldEquip._fromInv) this.addToInventory(oldEquip._fromInv);
                    else {
                        const oldKey = Object.keys(this.items).find(k => this.items[k].name === oldEquip.name);
                        if(oldKey) this.addToInventory(oldKey, 1);
                    }
                }
            } 
            
            const equipObject = { ...itemDef, ...invItem.props, _fromInv: invItem }; 
            this.state.equip[slot] = equipObject;
            
            const displayName = invItem.props ? invItem.props.name : itemDef.name;
            UI.log(`Ausgerüstet: ${displayName}`, "text-yellow-400"); 
            
            if(slot === 'body') { 
                const oldMax = this.state.maxHp; 
                this.state.maxHp = this.calculateMaxHP(this.getStat('END')); 
                this.state.hp += (this.state.maxHp - oldMax); 
            }
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
        
        const dLvl = this.state.dungeonLevel || 0;
        let difficultyMult = 1 + (dLvl * 0.2);

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
        
        if(pool.length === 0) pool = [this.monsters.radRoach]; 

        const template = pool[Math.floor(Math.random()*pool.length)]; 
        let enemy = { ...template }; 
        
        if(isNaN(difficultyMult)) difficultyMult = 1;

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
            if(Math.random() < 0.5) { this.state.caps += 50; UI.log("Gewinn: 50 Kronkorken", "text-green-400"); } 
            else { this.state.ammo += 10; UI.log("Gewinn: 10x Munition", "text-green-400"); }
        }
        else if(sum <= 15) {
            this.state.caps += 150;
            this.addToInventory('stimpack', 1);
            this.addToInventory('screws', 5);
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

    deployCamp: function(invIndex) {
        if(this.state.camp) { UI.log("Lager existiert bereits!", "text-red-500"); return; }
        if(this.state.zone.includes("Stadt") || this.state.dungeonLevel > 0) { UI.log("Hier nicht möglich!", "text-red-500"); return; }
        
        const cost = 100;
        if(this.state.caps < cost) {
            UI.log(`Benötigt ${cost} Kronkorken für Aufbau.`, "text-red-500");
            return;
        }

        this.state.caps -= cost;
        
        this.state.camp = { 
            sector: { x: this.state.sector.x, y: this.state.sector.y }, 
            x: this.state.player.x, 
            y: this.state.player.y, 
            level: 1 
        };
        
        UI.log(`Lager aufgeschlagen! (-${cost} KK)`, "text-green-400 font-bold");
        UI.switchView('camp');
        this.saveGame();
    },

    packCamp: function() {
        if(!this.state.camp) return;
        this.state.camp = null;
        UI.log("Lager eingepackt.", "text-yellow-400");
        UI.switchView('map');
        this.saveGame();
    },

    upgradeCamp: function() {
        if(!this.state.camp) return;
        const lvl = this.state.camp.level;
        let costScrap = (lvl === 1) ? 10 : 25;
        const scrapItem = this.state.inventory.find(i => i.id === 'junk_metal');
        
        if(!scrapItem || scrapItem.count < costScrap) { UI.log(`Benötigt ${costScrap}x Schrott.`, "text-red-500"); return; }
        scrapItem.count -= costScrap;
        if(scrapItem.count <= 0) this.state.inventory = this.state.inventory.filter(i => i.id !== 'junk_metal');

        this.state.camp.level++;
        UI.log(`Lager verbessert (Level ${this.state.camp.level})!`, "text-yellow-400 font-bold");
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
