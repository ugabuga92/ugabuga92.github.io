// [2026-01-11 11:15:00] game_inv_logic.js - Fists & Vault Suit as permanent fallback (no inventory space)

Object.assign(Game, {

    getMaxSlots: function() {
        let base = 10;
        if (this.state.stats) base += (this.state.stats.STR || 1);
        
        const strongBack = this.getPerkLevel('strong_back');
        if (strongBack > 0) base += (strongBack * 5);

        if (this.state.equip && this.state.equip.back) {
            const pack = this.state.equip.back;
            let packBonus = 0;
            if (pack.bonus && pack.bonus.slots) packBonus = pack.bonus.slots;
            else if (pack.props && pack.props.bonus && pack.props.bonus.slots) packBonus = pack.props.bonus.slots;
            else if (this.items[pack.id] && this.items[pack.id].bonus && this.items[pack.id].bonus.slots) {
                packBonus = this.items[pack.id].bonus.slots;
            }
            base += packBonus;
        }
        return base;
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
        let isActuallyNew = false; 

        // 1. Stacken
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

        // 2. Neuer Slot
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
                isActuallyNew = true; 
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
            
            if(isActuallyNew && typeof UI !== 'undefined' && UI.triggerInventoryAlert) {
                UI.triggerInventoryAlert();
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

    destroyItem: function(invIndex) {
        if(!this.state.inventory || !this.state.inventory[invIndex]) return;
        const item = this.state.inventory[invIndex];
        
        // Schutz: Basis-Ausrüstung darf nicht weggeworfen werden
        if (item.id === 'fists' || item.id === 'vault_suit') {
            UI.log("Das gehört zu deiner Grundausstattung.", "text-gray-500");
            return;
        }

        const def = this.items[item.id];
        let name = (item.props && item.props.name) ? item.props.name : def.name;

        this.state.inventory.splice(invIndex, 1);
        if(item.id === 'ammo') this.syncAmmo();
        
        UI.log(`${name} weggeworfen.`, "text-red-500 italic");
        UI.update();
        if(this.state.view === 'inventory') UI.renderInventory();
        this.saveGame();
    },

    scrapItem: function(invIndex) {
        if(!this.state.inventory || !this.state.inventory[invIndex]) return;
        const item = this.state.inventory[invIndex];

        // Schutz: Basis-Ausrüstung darf nicht zerlegt werden
        if (item.id === 'fists' || item.id === 'vault_suit') {
            UI.log("Dieses Objekt kann nicht zerlegt werden!", "text-red-500");
            return;
        }

        if (this.state.view !== 'crafting') {
            UI.log("Zerlegen nur an einer Werkbank möglich!", "text-red-500");
            return;
        }

        if (item.id === 'junk_metal') {
            UI.log("Das ist bereits Schrott.", "text-orange-500");
            return;
        }
        
        const def = this.items[item.id];
        if(!def) return;
        
        let name = (item.props && item.props.name) ? item.props.name : def.name;
        let value = def.cost || 5;
        
        this.state.inventory.splice(invIndex, 1);

        let scrapAmount = Math.max(1, Math.floor(value / 10)); 
        const perkLvl = this.getPerkLevel('scrapper');
        if(perkLvl > 0) { scrapAmount += perkLvl; }

        this.addToInventory('junk_metal', scrapAmount);
        let msg = `Zerlegt: ${name} -> ${scrapAmount}x Schrott`;

        let screwChance = 0.3 + (perkLvl * 0.15); 
        const isComplex = def.type === 'weapon' || def.type === 'junk' || def.type === 'tool';

        if(isComplex && Math.random() < screwChance) {
            let screws = Math.max(1, Math.floor(value / 50));
            if (perkLvl >= 2 && Math.random() < 0.4) screws *= 2;
            this.addToInventory('screws', screws);
            msg += `, ${screws}x Schrauben`;
        }
        
        let plasticChance = 0.2 + (perkLvl * 0.15);
        if(value >= 100 && Math.random() < plasticChance) {
            let plastic = 1;
            if (perkLvl >= 3) plastic += 1;
            this.addToInventory('plastic', plastic);
            msg += `, ${plastic}x Plastik`;
        }

        UI.log(msg, "text-orange-400 font-bold");
        UI.update();
        if(typeof UI.renderCrafting === 'function') UI.renderCrafting('scrap');
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

    unequipItem: function(slot) {
        if(!this.state.equip[slot]) return;
        const item = this.state.equip[slot];

        // Fäuste und Vault-Anzug sind permanent und können nicht "ausgezogen" werden
        if(item.id === 'fists' || item.id === 'vault_suit' || item.name === "Fäuste" || item.name === "Vault-Anzug") {
             UI.log("Das gehört zu deiner Grundausstattung.", "text-gray-500");
             return;
        }

        if(this.getUsedSlots() >= this.getMaxSlots()) {
             UI.log("Inventar voll! Ablegen nicht möglich.", "text-red-500");
             return;
        }

        // Ins Inventar legen
        let itemToAdd = item._fromInv || item.id;
        if (!itemToAdd && item.id) itemToAdd = item.id;
        let objToAdd = itemToAdd;
        if (!item._fromInv && item.props) objToAdd = { id: item.id, count: 1, props: item.props };
        else if (typeof itemToAdd === 'string') objToAdd = { id: itemToAdd, count: 1 };

        this.state.inventory.push(objToAdd);
        
        // FALLBACK-Logik: Sofort wieder Standard ausrüsten
        if(slot === 'weapon') {
            this.state.equip.weapon = { id: 'fists', name: 'Fäuste', baseDmg: 2, type: 'weapon' };
            UI.log(`${item.name} abgelegt. Du nutzt nun deine Fäuste.`, "text-yellow-400");
        } else if(slot === 'body') {
            this.state.equip.body = { id: 'vault_suit', name: 'Vault-Anzug', def: 1, type: 'body' };
            UI.log(`${item.name} abgelegt. Du trägst wieder deinen Vault-Anzug.`, "text-blue-400");
        } else {
            this.state.equip[slot] = null; 
            UI.log(`${item.name} abgelegt.`, "text-yellow-400");
        }

        this.recalcStats();
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
        
        // Rucksack ausrüsten
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

        // Consumables Logic
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
            if(itemDef.effect === 'heal' || itemDef.effect === 'heal_rad' || itemDef.effect === 'buff') { 
                let healAmt = itemDef.val || 0; 
                
                const medicLvl = this.getPerkLevel('medic');
                if(medicLvl > 0 && healAmt > 0) {
                    const bonus = 1 + (medicLvl * 0.2); 
                    healAmt = Math.floor(healAmt * bonus);
                }

                const effectiveMax = this.state.maxHp - (this.state.rads || 0);
                
                if(itemDef.effect === 'heal' && this.state.hp >= effectiveMax) { 
                    UI.log("Gesundheit voll.", "text-gray-500"); return; 
                } 
                
                let countToUse = 1;
                if (mode === 'max' && healAmt > 0) {
                    const missing = effectiveMax - this.state.hp;
                    if (missing > 0) {
                        countToUse = Math.ceil(missing / healAmt);
                        if (countToUse > invItem.count) countToUse = invItem.count;
                    } else { countToUse = 0; }
                }

                if (countToUse > 0) {
                    const totalHeal = healAmt * countToUse;
                    if(totalHeal > 0) this.state.hp = Math.min(effectiveMax, this.state.hp + totalHeal); 
                    
                    if(itemDef.effect === 'heal_rad' && itemDef.rad) {
                        this.addRadiation(itemDef.rad * countToUse);
                    }
                    if(itemDef.effect === 'buff') {
                        UI.log(`${itemDef.name} konsumiert! (Effekte noch WIP)`, "text-pink-400");
                    } else {
                         UI.log(`Verwendet: ${countToUse}x ${itemDef.name} (+${totalHeal} HP)`, "text-blue-400"); 
                    }
                    this.removeFromInventory(invItem.id, countToUse);
                }
            } 
        } 
        else {
            // Ausrüstung
            const validSlots = ['weapon', 'body', 'head', 'legs', 'feet', 'arms'];
            if(validSlots.includes(itemDef.type)) {
                const slot = itemDef.slot || itemDef.type;
                let oldEquip = this.state.equip[slot];
                
                // Alten Gegenstand ins Inv zurücklegen (außer es sind Fäuste/Vault-Suit)
                if(oldEquip && oldEquip.id !== "fists" && oldEquip.id !== "vault_suit") {
                    if(oldEquip._fromInv) this.state.inventory.push(oldEquip._fromInv);
                    else {
                        const oldKey = Object.keys(this.items).find(k => this.items[k].name === oldEquip.name);
                        if(oldKey) this.state.inventory.push({id: oldKey, count: 1, isNew: true});
                    }
                } 
                
                this.state.inventory.splice(index, 1);
                const equipObject = { ...itemDef, ...invItem.props, _fromInv: invItem }; 
                this.state.equip[slot] = equipObject;
                
                const displayName = invItem.props ? invItem.props.name : itemDef.name;
                UI.log(`Ausgerüstet: ${displayName}`, "text-yellow-400"); 
                
                this.recalcStats();
                const effectiveMax = this.state.maxHp - (this.state.rads || 0);
                if(this.state.hp > effectiveMax) this.state.hp = effectiveMax;
            }
        } 
        
        UI.update(); 
        if(this.state.view === 'inventory') UI.renderInventory(); 
        this.saveGame(); 
    },

    switchToBestMelee: function() {
        const oldWeapon = this.state.equip.weapon;
        const oldName = (oldWeapon && oldWeapon.name && oldWeapon.id !== 'fists') 
            ? (oldWeapon.props?.name || oldWeapon.name) 
            : "Fernkampfwaffe";

        if(!this.state.inventory || this.state.inventory.length === 0) {
            // Fallback auf Fäuste
            this.state.equip.weapon = { id: 'fists', name: 'Fäuste', baseDmg: 2, type: 'weapon' };
            UI.log("Waffe abgelegt. Nutze Fäuste.", "text-red-500 font-bold");
            if(typeof UI.renderChar === 'function') UI.renderChar();
            return;
        }

        let bestWeapon = null;
        let bestDmg = -1;
        let bestIndex = -1;

        this.state.inventory.forEach((item, idx) => {
            const def = this.items[item.id];
            if (!def) return;

            const type = def.type ? def.type.toLowerCase() : '';
            const isWeaponType = type === 'weapon' || type === 'melee' || type === 'weapon_melee' || type.includes('weapon');
            const needsAmmo = def.ammo && def.ammo !== 'none';

            if (isWeaponType && !needsAmmo) {
                let dmg = def.dmg || 0;
                if (item.props && item.props.dmgMult) dmg *= item.props.dmgMult;
                
                if (dmg > bestDmg) {
                    bestDmg = dmg;
                    bestWeapon = item;
                    bestIndex = idx;
                }
            }
        });

        if (bestWeapon) {
            this.useItem(bestIndex); 
            const newName = bestWeapon.props?.name || this.items[bestWeapon.id].name;
            UI.log(`${newName} wurde statt ${oldName} angelegt (Munition leer)`, "text-yellow-400 blink-red");
        } else {
            // Keine Nahkampfwaffe im Inventar -> Fäuste
            this.state.equip.weapon = { id: 'fists', name: 'Fäuste', baseDmg: 2, type: 'weapon' };
            UI.log("Keine Nahkampfwaffe gefunden! Du kämpfst mit Fäusten!", "text-red-500");
        }
        if(typeof UI.renderChar === 'function') UI.renderChar();
    }
});

// Alias für Kompatibilität
Game.addItem = Game.addToInventory;
