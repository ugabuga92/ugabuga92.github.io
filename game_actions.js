// [v3.6] - 2026-01-03 06:10am (Camp & Actions Update)
// - Feature: destroyItem (Mülleimer) hinzugefügt.
// - Logic: Camp Aufbau verbraucht Bausatz nicht (Permanent-Item).
// - Full Code Restore.

Object.assign(Game, {
    
    addRadiation: function(amount) {
        if(!this.state) return;
        if(typeof this.state.rads === 'undefined') this.state.rads = 0;
        this.state.rads = Math.min(this.state.maxHp, Math.max(0, this.state.rads + amount));
        if(amount > 0) UI.log(`+${amount} RADS!`, "text-red-500 font-bold animate-pulse");
        else UI.log(`${Math.abs(amount)} RADS entfernt.`, "text-green-300");
        const effectiveMax = this.state.maxHp - this.state.rads;
        if(this.state.hp > effectiveMax) { this.state.hp = effectiveMax; }
        if(this.state.hp <= 0 && amount > 0) {
            this.state.hp = 0; this.state.isGameOver = true;
            if(UI && UI.showGameOver) UI.showGameOver();
        }
        UI.update();
    },

    rest: function() { 
        if(!this.state) return;
        
        // [v3.3b] Full radiation penalty for sleeping on ground
        this.addRadiation(10);
        UI.log("Ungeschützt geschlafen: +10 RADS", "text-red-500 font-bold");

        const effectiveMax = this.state.maxHp - (this.state.rads || 0);
        this.state.hp = effectiveMax; 
        UI.log("Ausgeruht. HP voll (soweit möglich).", "text-blue-400"); 
        UI.update(); 
    },

    restInCamp: function() {
        if(!this.state || !this.state.camp) return;
        const lvl = this.state.camp.level || 1;
        
        // [v3.3b] Partial radiation penalty for tent sleeping
        this.addRadiation(5);
        UI.log("Im Zelt geschlafen: +5 RADS", "text-orange-400 font-bold");

        const effectiveMax = this.state.maxHp - (this.state.rads || 0);
        let healAmount = 0;
        if(lvl === 1) {
            healAmount = Math.floor(effectiveMax * 0.5);
            this.state.hp = Math.min(effectiveMax, this.state.hp + healAmount);
            UI.log("Ausgeruht (Basis-Zelt). +50% HP.", "text-blue-400");
        } else {
            this.state.hp = effectiveMax;
            UI.log("Ausgeruht (Komfort-Zelt). HP voll.", "text-green-400 font-bold");
        }
        UI.update();
        if(typeof UI.renderCamp === 'function') UI.renderCamp();
    },

    heal: function() { 
        if(this.state.caps >= 25) { 
            this.state.caps -= 25; 
            this.state.rads = 0; 
            this.state.hp = this.state.maxHp; 
            UI.log("Dr. Zimmermann: 'Alles wieder gut!' (-RADS, +HP)", "text-green-400");
            UI.update(); 
        } else { UI.log("Zu wenig Kronkorken.", "text-red-500"); }
    },
    
    buyAmmo: function(mode = 1) { 
        this.buyItem('ammo', mode);
    },
    
    buyItem: function(key, mode = 1) { 
        const item = this.items[key]; 
        if(!item) return;

        let stock = 0;
        if(key === 'ammo') {
             stock = this.state.shop.ammoStock || 0;
        } else {
             stock = (this.state.shop.stock && this.state.shop.stock[key]) ? this.state.shop.stock[key] : 0;
        }

        if(stock <= 0) {
            UI.log("Dieser Artikel ist ausverkauft.", "text-red-500");
            return;
        }

        let amount = 1;
        let costPerUnit = (key === 'ammo') ? 10 : item.cost; 

        if (mode === 'max') {
            const maxAfford = Math.floor(this.state.caps / costPerUnit);
            amount = Math.min(stock, maxAfford);
        } else {
            amount = mode;
        }

        if(amount <= 0) {
            if(this.state.caps < costPerUnit) UI.log("Zu wenig Kronkorken.", "text-red-500");
            return;
        }

        if(amount > stock) amount = stock;
        const totalCost = amount * costPerUnit;

        if (key === 'camp_kit') {
            const hasCamp = this.state.inventory && this.state.inventory.some(i => i.id === 'camp_kit');
            if (hasCamp) { UI.log("Du besitzt bereits einen Zeltbausatz!", "text-orange-500"); return; }
            if (amount > 1) amount = 1; 
        }

        if(this.state.caps >= totalCost) { 
            let successCount = 0;
            let countToAdd = (key === 'ammo') ? 10 : 1;
            
            const isStackable = (this.getStackLimit(key) > 1);
            
            if(isStackable) {
                if(this.addToInventory(key, countToAdd * amount)) {
                    successCount = amount;
                }
            } else {
                for(let i=0; i<amount; i++) {
                    if(this.addToInventory(key, 1)) successCount++;
                    else break; 
                }
            }

            if(successCount > 0) {
                const finalCost = successCount * costPerUnit;
                this.state.caps -= finalCost;
                
                if(key === 'ammo') {
                    this.state.shop.ammoStock -= successCount;
                } else {
                    if(this.state.shop.stock[key]) this.state.shop.stock[key] -= successCount;
                }

                UI.log(`Gekauft: ${successCount}x ${item.name} (-${finalCost} KK)`, "text-green-400");
                
                const con = document.getElementById('shop-list');
                if(con) {
                    if(typeof UI.renderShopBuy === 'function') UI.renderShopBuy();
                    else UI.renderShop(con);
                }
                UI.update();
            }
        } else { UI.log("Zu wenig Kronkorken.", "text-red-500"); } 
    },

    sellItem: function(invIndex, mode = 1) {
        if(!this.state.inventory[invIndex]) return;
        const item = this.state.inventory[invIndex];
        const def = this.items[item.id];
        if(!def) return;

        let valMult = 1;
        if(item.props && item.props.valMult) valMult = item.props.valMult;
        let sellPrice = Math.floor((def.cost * 0.25) * valMult);
        if(sellPrice < 1) sellPrice = 1;

        let amount = 1;
        if (mode === 'max') {
            const maxAfford = Math.floor(this.state.shop.merchantCaps / sellPrice);
            amount = Math.min(item.count, maxAfford);
        } else {
            amount = mode;
        }

        if(amount > item.count) amount = item.count;
        
        if(amount <= 0 && this.state.shop.merchantCaps < sellPrice) {
            UI.log("Händler: 'Ich habe nicht genug Kronkorken!'", "text-red-500");
            return;
        }
        if(amount <= 0) return; 

        const totalEarned = amount * sellPrice;

        if(this.state.shop.merchantCaps < totalEarned) {
             UI.log("Händler: 'Ich habe nicht genug Kronkorken für diese Menge!'", "text-red-500");
             return;
        }

        this.state.caps += totalEarned;
        this.state.shop.merchantCaps -= totalEarned;
        
        item.count -= amount;
        if(item.count <= 0) {
            this.state.inventory.splice(invIndex, 1);
        }
        if(item.id === 'ammo') this.syncAmmo();

        UI.log(`Verkauft: ${amount}x ${def.name} (+${totalEarned} KK)`, "text-yellow-400");
        
        if(typeof UI !== 'undefined' && UI.renderShopSell) UI.renderShopSell();
        this.saveGame();
    },

    addToInventory: function(idOrItem, count=1) { 
        if(!this.state.inventory) this.state.inventory = []; 
        let itemId, props = null;

        if(typeof idOrItem === 'object') {
            itemId = idOrItem.id;
            props = idOrItem.props;
            count = idOrItem.count || 1;
        } else { itemId = idOrItem; }

        if (itemId === 'camp_kit') {
            const hasCamp = this.state.inventory.some(i => i.id === 'camp_kit');
            if (hasCamp) return false; 
        }

        const limit = this.getStackLimit(itemId);
        let remaining = count;
        let added = false;

        if (!props) {
            for (let item of this.state.inventory) {
                if (item.id === itemId && !item.props && item.count < limit) {
                    const space = limit - item.count;
                    const take = Math.min(space, remaining);
                    item.count += take;
                    remaining -= take;
                    added = true;
                    if (remaining <= 0) break;
                }
            }
        }

        if (remaining > 0) {
            const maxSlots = this.getMaxSlots();
            while (remaining > 0) {
                if (this.getUsedSlots() >= maxSlots) {
                    UI.log("INVENTAR VOLL!", "text-red-500 font-bold blink-red");
                    if (added && itemId === 'ammo') this.syncAmmo(); 
                    return false; 
                }
                const take = Math.min(limit, remaining);
                const newItem = { id: itemId, count: take, isNew: true };
                if (props) newItem.props = props;
                this.state.inventory.push(newItem);
                remaining -= take;
                added = true;
            }
        }

        if (added) {
            const itemDef = this.items[itemId];
            const name = (props && props.name) ? props.name : (itemDef ? itemDef.name : itemId);
            const color = (props && props.color) ? props.color.split(' ')[0] : "text-green-400";
            
            if(itemId !== 'ammo' || count < 10) {
                UI.log(`+ ${name} (${count})`, color);
            } else {
                UI.log(`+ ${count} Munition`, "text-green-400");
            }
            
            if (itemId === 'ammo') this.syncAmmo();
            
            if(itemDef && (['weapon','body','head','legs','feet','arms','back'].includes(itemDef.type))) {
                if(typeof UI !== 'undefined' && UI.triggerInventoryAlert) UI.triggerInventoryAlert();
            }
            return true;
        }
        return false;
    }, 
    
    removeFromInventory: function(itemId, amount=1) {
        if(!this.state) return false;
        let remaining = amount;
        
        for (let i = 0; i < this.state.inventory.length; i++) {
            const item = this.state.inventory[i];
            if (item.id === itemId) {
                const take = Math.min(item.count, remaining);
                item.count -= take;
                remaining -= take;
                if (item.count <= 0) {
                    this.state.inventory.splice(i, 1);
                    i--;
                }
                if (remaining <= 0) break;
            }
        }
        if(itemId === 'ammo') this.syncAmmo();
        return remaining === 0;
    },

    // [NEU v3.5a/v3.6] - Zerstört Items aus dem Inventar
    destroyItem: function(invIndex) {
        if(!this.state.inventory || !this.state.inventory[invIndex]) return;
        const item = this.state.inventory[invIndex];
        const def = this.items[item.id];
        
        let name = (item.props && item.props.name) ? item.props.name : def.name;

        // Item entfernen
        this.state.inventory.splice(invIndex, 1);
        
        if(item.id === 'ammo') this.syncAmmo();
        
        UI.log(`${name} weggeworfen.`, "text-red-500 italic");
        
        UI.update();
        if(this.state.view === 'inventory') UI.renderInventory();
        this.saveGame();
    },

    unequipItem: function(slot) {
        if(!this.state.equip[slot]) return;
        const item = this.state.equip[slot];

        if(item.name === "Fäuste" || item.name === "Vault-Anzug") {
             UI.log("Das kann nicht abgelegt werden.", "text-gray-500");
             return;
        }

        if(this.getUsedSlots() >= this.getMaxSlots()) {
             UI.log("Inventar voll! Ablegen nicht möglich.", "text-red-500");
             return;
        }

        let itemToAdd = item._fromInv || item.id;
        if (!itemToAdd && item.id) itemToAdd = item.id;
        let objToAdd = itemToAdd;
        if (!item._fromInv && item.props) objToAdd = { id: item.id, count: 1, props: item.props };
        else if (typeof itemToAdd === 'string') objToAdd = { id: itemToAdd, count: 1 };

        this.state.inventory.push(objToAdd);
        
        if(slot === 'weapon') this.state.equip.weapon = this.items.fists;
        else if(slot === 'body') {
            this.state.equip.body = this.items.vault_suit;
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            if(this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
        }
        else {
            this.state.equip[slot] = null; 
        }

        UI.log(`${item.name} abgelegt.`, "text-yellow-400");
        if(typeof UI !== 'undefined' && this.state.view === 'char') UI.renderChar(); 
        
        this.saveGame();
    },

    useItem: function(invIndexOrId, mode = 1) { 
        let invItem, index;
        if(typeof invIndexOrId === 'string') {
            index = this.state.inventory.findIndex(i => i.id === invIndexOrId);
        } else { index = invIndexOrId; }

        if(index === -1 || !this.state.inventory[index]) return;
        invItem = this.state.inventory[index];
        const itemDef = this.items[invItem.id];
        
        if (itemDef.type === 'back') {
            const slot = 'back';
            let oldEquip = this.state.equip[slot];
            this.state.inventory.splice(index, 1);
            if(oldEquip) {
                const oldItem = { id: oldEquip.id, count: 1, props: oldEquip.props, isNew: true };
                this.state.inventory.push(oldItem);
            }
            this.state.equip[slot] = { ...itemDef, ...invItem.props };
            UI.log(`Rucksack angelegt: ${itemDef.name}`, "text-yellow-400");
            if(this.getUsedSlots() > this.getMaxSlots()) UI.log("WARNUNG: Überladen!", "text-red-500 blink-red");
            UI.update();
            if(this.state.view === 'inventory') UI.renderInventory();
            this.saveGame();
            return;
        }

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
            } else { UI.log("Du kennst diesen Bauplan bereits.", "text-gray-500"); }
            return;
        }
        else if(itemDef.type === 'consumable') { 
            if(itemDef.effect === 'heal' || itemDef.effect === 'heal_rad') { 
                let healAmt = itemDef.val; 
                if(this.state.perks && this.state.perks.includes('medic')) {
                    healAmt = Math.floor(healAmt * 1.5);
                }
                const effectiveMax = this.state.maxHp - (this.state.rads || 0);
                if(this.state.hp >= effectiveMax) { UI.log("Gesundheit voll.", "text-gray-500"); return; } 
                
                let countToUse = 1;
                if (mode === 'max') {
                    const missing = effectiveMax - this.state.hp;
                    if (missing > 0) {
                        countToUse = Math.ceil(missing / healAmt);
                        if (countToUse > invItem.count) countToUse = invItem.count;
                    } else { countToUse = 0; }
                }

                if (countToUse > 0) {
                    const totalHeal = healAmt * countToUse;
                    this.state.hp = Math.min(effectiveMax, this.state.hp + totalHeal); 
                    if(itemDef.effect === 'heal_rad' && itemDef.rad) {
                        this.addRadiation(itemDef.rad * countToUse);
                    }
                    UI.log(`Verwendet: ${countToUse}x ${itemDef.name} (+${totalHeal} HP)`, "text-blue-400"); 
                    this.removeFromInventory(invItem.id, countToUse);
                }
            } 
        } 
        else {
            const validSlots = ['weapon', 'body', 'head', 'legs', 'feet', 'arms'];
            if(validSlots.includes(itemDef.type)) {
                const slot = itemDef.slot || itemDef.type;
                let oldEquip = this.state.equip[slot];
                
                if(oldEquip && oldEquip.name !== "Fäuste" && oldEquip.name !== "Vault-Anzug") {
                    const existsInInv = this.state.inventory.some(i => {
                        if(i.props) return i.props.name === oldEquip.name;
                        const def = this.items[i.id];
                        if (def) return def.name === oldEquip.name;
                        return false;
                    });

                    if(!existsInInv) {
                        if(oldEquip._fromInv) this.state.inventory.push(oldEquip._fromInv);
                        else {
                            const oldKey = Object.keys(this.items).find(k => this.items[k].name === oldEquip.name);
                            if(oldKey) this.state.inventory.push({id: oldKey, count: 1, isNew: true});
                        }
                    }
                } 
                
                this.state.inventory.splice(index, 1);
                const equipObject = { ...itemDef, ...invItem.props, _fromInv: invItem }; 
                this.state.equip[slot] = equipObject;
                
                const displayName = invItem.props ? invItem.props.name : itemDef.name;
                UI.log(`Ausgerüstet: ${displayName}`, "text-yellow-400"); 
                
                const oldMax = this.state.maxHp; 
                this.state.maxHp = this.calculateMaxHP(this.getStat('END')); 
                if(this.state.maxHp > oldMax) {
                     this.state.hp += (this.state.maxHp - oldMax); 
                }
                if(this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
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
        
        if(recipe.out === "AMMO") { 
            this.addToInventory('ammo', recipe.count);
        } else { 
            this.addToInventory(recipe.out, recipe.count); 
        }
        
        UI.log(`Hergestellt: ${recipe.count}x ${recipe.out === "AMMO" ? "Munition" : this.items[recipe.out].name}`, "text-green-400 font-bold");

        if(recipe.type === 'cooking') {
            if(typeof UI.renderCampCooking === 'function') UI.renderCampCooking();
        } else {
            if(typeof UI !== 'undefined') UI.renderCrafting(); 
        }
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
        
        if(typeof Combat !== 'undefined') { Combat.start(enemy); } 
        else { console.error("Combat module missing!"); }
    },
    
    gambleLegendaryLoot: function(sum) {
        UI.log(`🎲 Wasteland Gamble: ${sum}`, "text-yellow-400 font-bold");
        if(sum <= 9) {
            if(Math.random() < 0.5) { this.state.caps += 50; UI.log("Gewinn: 50 Kronkorken", "text-green-400"); } 
            else { this.addToInventory('ammo', 10); UI.log("Gewinn: 10x Munition", "text-green-400"); }
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
        if(this.state.caps < cost) { UI.log(`Benötigt ${cost} Kronkorken für Aufbau.`, "text-red-500"); return; }
        this.state.caps -= cost;
        this.state.camp = { 
            sector: { x: this.state.sector.x, y: this.state.sector.y }, 
            x: this.state.player.x, y: this.state.player.y, level: 1 
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

    toggleRadio: function() { 
        this.state.radio.on = !this.state.radio.on; 
        if(Game.Audio) {
            Game.Audio.toggle(this.state.radio.on, this.state.radio.station);
        }
        UI.renderRadio(); 
    },

    tuningRadio: function(dir) {
        if(!this.state.radio.on) return;
        let next = this.state.radio.station + dir;
        if(next < 0) next = this.radioStations.length - 1;
        if(next >= this.radioStations.length) next = 0;
        this.state.radio.station = next;
        this.state.radio.trackIndex = 0;
        
        if(Game.Audio && this.state.radio.on) {
            Game.Audio.playStation(next);
        }
        UI.renderRadio();
    }
});
