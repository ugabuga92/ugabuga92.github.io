// [TIMESTAMP] 2026-01-10 06:00:00 - game_actions.js - Cleaned & Glow Logic Ready

Object.assign(Game, {

    getCampUpgradeCost: function(currentLevel) {
        switch(currentLevel) {
            case 1: return { id: 'junk_metal', count: 25, name: 'Schrott' };
            case 2: return { id: 'cloth', count: 10, name: 'Stoff' };
            case 3: return { id: 'duct_tape', count: 5, name: 'Klebeband' };
            case 4: return { id: 'screws', count: 10, name: 'Schrauben' };
            case 5: return { id: 'gears', count: 10, name: 'Zahnräder' };
            case 6: return { id: 'adhesive', count: 5, name: 'Kleber' };
            case 7: return { id: 'springs', count: 5, name: 'Federn' };
            case 8: return { id: 'circuit', count: 5, name: 'Schaltkreise' };
            case 9: return { id: 'nuclear_mat', count: 3, name: 'Nukleares Material' };
            default: return null;
        }
    },

    // Berechnet Inventarplätze (Basis + Stärke + Perks + Rucksack)
    getMaxSlots: function() {
        let base = 10;
        
        // Bonus durch Stärke
        if (this.state.stats) {
            base += (this.state.stats.STR || 1);
        }
        
        // Bonus durch Perk "Strong Back"
        const strongBack = this.getPerkLevel('strong_back');
        if (strongBack > 0) base += (strongBack * 5);

        // Bonus durch Rucksack (Back Slot)
        if (this.state.equip && this.state.equip.back) {
            const pack = this.state.equip.back;
            let packBonus = 0;

            // 1. Prüfen ob im Item-Objekt direkt gespeichert
            if (pack.bonus && pack.bonus.slots) packBonus = pack.bonus.slots;
            // 2. Prüfen ob in den Props gespeichert
            else if (pack.props && pack.props.bonus && pack.props.bonus.slots) packBonus = pack.props.bonus.slots;
            // 3. Fallback: Nachschlagen in der Datenbank
            else if (this.items[pack.id] && this.items[pack.id].bonus && this.items[pack.id].bonus.slots) {
                packBonus = this.items[pack.id].bonus.slots;
            }

            base += packBonus;
        }

        return base;
    },
    
    // Automatischer Waffenwechsel - Verbesserte Erkennung
    switchToBestMelee: function() {
        const oldWeapon = this.state.equip.weapon;
        const oldName = (oldWeapon && oldWeapon.name && oldWeapon.name !== 'Fäuste') 
            ? (oldWeapon.props?.name || oldWeapon.name) 
            : "Fernkampfwaffe";

        if(!this.state.inventory || this.state.inventory.length === 0) {
            this.state.equip.weapon = this.items.fists;
            UI.log("Waffe abgelegt.", "text-red-500 font-bold");
            if(typeof UI.renderChar === 'function') UI.renderChar();
            return;
        }

        let bestWeapon = null;
        let bestDmg = -1;
        let bestIndex = -1;

        // Suche beste Nahkampfwaffe (ohne Munitionsbedarf)
        this.state.inventory.forEach((item, idx) => {
            const def = this.items[item.id];
            if (!def) return;

            // Kriterium 1: Es muss eine Waffe sein
            const type = def.type ? def.type.toLowerCase() : '';
            const isWeaponType = type === 'weapon' || type === 'melee' || type === 'weapon_melee' || type.includes('weapon');

            // Kriterium 2: Es darf KEINE Munition verbrauchen
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
            UI.log(`${newName} wurde statt ${oldName} angelegt, deine Munition ist leer`, "text-yellow-400 blink-red");
        } else {
            if (this.state.equip.weapon && this.state.equip.weapon.name !== "Fäuste") {
                this.unequipItem('weapon'); 
                UI.log("Keine Nahkampfwaffe gefunden! Fäuste!", "text-red-500");
            } else {
                UI.log("Keine Munition mehr!", "text-red-500");
            }
        }

        if(typeof UI.renderChar === 'function') UI.renderChar();
    },

    addRadiation: function(amount) {
        if(!this.state) return;
        if(typeof this.state.rads === 'undefined') this.state.rads = 0;
        
        let finalAmount = amount;
        if (amount > 0) {
            const perkLvl = this.getPerkLevel('rad_resistant');
            if (perkLvl > 0) {
                const reduction = perkLvl * 0.10; // -10% per level
                finalAmount = Math.ceil(amount * (1 - reduction));
            }
        }

        this.state.rads = Math.min(this.state.maxHp, Math.max(0, this.state.rads + finalAmount));
        
        if(finalAmount > 0) UI.log(`+${finalAmount} RADS!`, "text-red-500 font-bold animate-pulse");
        else if(finalAmount < 0) UI.log(`${Math.abs(finalAmount)} RADS entfernt.`, "text-green-300");
        
        const effectiveMax = this.state.maxHp - this.state.rads;
        if(this.state.hp > effectiveMax) { this.state.hp = effectiveMax; }
        
        if(this.state.hp <= 0 && finalAmount > 0) {
            this.state.hp = 0; this.state.isGameOver = true;
            if(UI && UI.showGameOver) UI.showGameOver();
        }
        UI.update();
    },

    rest: function() { 
        if(!this.state) return;
        
        const isSafe = (this.state.view === 'vault' || this.state.view === 'city' || this.state.view === 'clinic' ||
                        (this.state.zone && (this.state.zone.includes("Vault") || this.state.zone.includes("Stadt") || this.state.zone.includes("City"))));

        if(!isSafe) {
            this.addRadiation(10);
            UI.log("Ungeschützt geschlafen: +10 RADS", "text-red-500 font-bold");
        } else {
            UI.log("Sicher geschlafen. Kein RAD Zuwachs.", "text-green-400");
        }

        const effectiveMax = this.state.maxHp - (this.state.rads || 0);
        this.state.hp = effectiveMax; 
        UI.log("Ausgeruht. HP voll (soweit möglich).", "text-blue-400"); 
        UI.update(); 
    },

    restInCamp: function() {
        if(!this.state || !this.state.camp) return;
        const lvl = this.state.camp.level || 1;
        
        this.addRadiation(5); 

        const effectiveMax = this.state.maxHp - (this.state.rads || 0);
        let healPct = 30 + ((lvl - 1) * 8); 
        if(lvl >= 10) healPct = 100;
        if(healPct > 100) healPct = 100;

        const healAmount = Math.floor(effectiveMax * (healPct / 100));
        const oldHp = this.state.hp;
        
        this.state.hp = Math.min(effectiveMax, this.state.hp + healAmount);
        const healed = Math.floor(this.state.hp - oldHp);

        UI.log(`Geschlafen (Lager Stufe ${lvl}).`, "text-blue-300");
        UI.log(`Regeneration: ${healPct}% (+${healed} TP) / +5 RADS`, "text-green-400 font-bold");

        UI.update();
        if(typeof UI.renderCamp === 'function') UI.renderCamp();
    },

    heal: function() { 
        if(this.state.caps >= 25) { 
            this.state.caps -= 25; 
            this.state.rads = 0; 
            this.state.hp = this.state.maxHp; 
            UI.log("BEHANDLUNG ERFOLGREICH: Alle RADS entfernt, Gesundheit vollständig wiederhergestellt.", "text-green-400 font-bold");
            UI.update(); 
            setTimeout(() => {
                if (Game.state.view === 'clinic') {
                    if(typeof UI.renderCity === 'function') UI.renderCity();
                }
            }, 1500); 
        } else { UI.log("Zu wenig Kronkorken.", "text-red-500"); }
    },
    
    // Wrapper für Munition (ruft die Hauptfunktion auf)
    buyAmmo: function(qty) { 
        this.buyItem('ammo', qty);
    },
    
    // [FIXED] GENERISCHE KAUF-FUNKTION (Mit Munitions-Pack-Logik)
    buyItem: function(id, qtyMode = 1) {
        const item = Game.items[id];
        if (!item) {
            if(typeof UI !== 'undefined') UI.error("Item-Daten fehlen für: " + id);
            return;
        }

        // --- 1. PREISE & MENGEN DEFINIEREN ---
        let stock = 0;
        let pricePerUnit = item.cost; 
        let itemsPerUnit = 1; // Normalerweise kriegt man 1 Item pro Kauf

        // SPEZIALFALL: MUNITION
        // Munition wird im UI als "10x Munition" für "10 KK" verkauft.
        if (id === 'ammo') {
            stock = this.state.shop.ammoStock || 0; // Greift auf ammoStock zu!
            itemsPerUnit = 10; // Ein "Kauf" gibt 10 Kugeln
            pricePerUnit = 10; // Ein "Kauf" kostet 10 KK (Sonderpreis Paket)
        } else {
            // Normales Item
            stock = (this.state.shop.stock && this.state.shop.stock[id] !== undefined) ? this.state.shop.stock[id] : 0;
        }

        // --- 2. LAGER CHECK ---
        // Wenn Händler weniger hat als ein Paket (z.B. weniger als 10 Kugeln), kann man das Paket nicht kaufen
        if (stock < itemsPerUnit) { 
             if(typeof UI !== 'undefined') UI.error("Händler hat das nicht mehr vorrätig.");
             return;
        }

        // --- 3. MENGEN-BERECHNUNG (Wie viele PAKETE/STÜCK kaufe ich?) ---
        let packsToBuy = 1; // Standard: 1 mal drücken = 1 Paket/Stück kaufen

        if (typeof qtyMode === 'number') {
            packsToBuy = qtyMode;
        } else if (qtyMode === 'max') {
            // Wie viele Pakete kann ich mir leisten?
            const maxAffordable = Math.floor(Game.state.caps / pricePerUnit);
            
            // Wie viele Pakete hat der Händler?
            const maxInStock = Math.floor(stock / itemsPerUnit);
            
            packsToBuy = Math.min(maxAffordable, maxInStock);
            
            // Begrenzen auf sinnvolle Menge (damit Inventar nicht explodiert, z.B. 100 Pakete max)
            if(packsToBuy > 100) packsToBuy = 100;
            if(packsToBuy < 1) packsToBuy = 1; // Versucht zumindest 1 zu kaufen (schlägt dann bei Geld fehl)
        }

        // --- 4. VALIDIERUNG ---
        const totalCost = packsToBuy * pricePerUnit;
        const totalItemsReceived = packsToBuy * itemsPerUnit;

        // Hat der Händler genug für diese Menge?
        if (totalItemsReceived > stock) {
            if(typeof UI !== 'undefined') UI.error("Händler hat nicht genug auf Lager.");
            return;
        }

        // Habe ich genug Geld?
        if (Game.state.caps < totalCost) {
            if(typeof UI !== 'undefined') UI.error("Nicht genug Kronkorken! (" + totalCost + " benötigt)");
            return;
        }

        // Zelt-Logik: Nur eins erlaubt
        if (id === 'camp_kit') {
            const hasKit = Game.state.inventory.some(i => i.id === 'camp_kit');
            const hasBuilt = !!Game.state.camp;
            if (hasKit || hasBuilt) {
                if(typeof UI !== 'undefined') UI.error("Du hast bereits ein Zelt!");
                return;
            }
        }

        // --- 5. TRANSAKTION DURCHFÜHREN ---
        Game.state.caps -= totalCost;
        Game.state.shop.merchantCaps += totalCost; 
        
        // Lager reduzieren
        if (id === 'ammo') {
            Game.state.shop.ammoStock -= totalItemsReceived;
        } else {
            Game.state.shop.stock[id] -= packsToBuy;
        }

        // Item zum Inventar hinzufügen
        // Wir nutzen addToInventory, da addItem oft nur ein Alias ist der fehlen könnte
        Game.addToInventory(id, totalItemsReceived); 

        if(typeof UI !== 'undefined') {
            UI.log(`Gekauft: ${packsToBuy}x ${itemsPerUnit > 1 ? 'Paket ' : ''}${item.name} (-${totalCost} KK).`);
            // UI Update erzwingen
            if (Game.state.view === 'shop') UI.renderShop('buy'); 
        }
        
        Game.saveGame();
    },

    // Generische Verkauf-Funktion
    sellItem: function(invIndex, qtyMode = 1) {
        const entry = Game.state.inventory[invIndex];
        if (!entry) return;

        const item = Game.items[entry.id];
        if (!item) return;

        // Preis berechnen (25% vom Wert)
        let valMult = entry.props && entry.props.valMult ? entry.props.valMult : 1;
        let unitPrice = Math.floor((item.cost * 0.25) * valMult);
        if (unitPrice < 1) unitPrice = 1;

        // Menge berechnen
        let amount = 1;
        if (typeof qtyMode === 'number') {
            amount = qtyMode;
        } else if (qtyMode === 'max') {
            amount = entry.count;
            // Begrenzen durch Händler-Geld
            const maxMerchantCanBuy = Math.floor(Game.state.shop.merchantCaps / unitPrice);
            if (amount > maxMerchantCanBuy) amount = maxMerchantCanBuy;
        }

        if (amount > entry.count) amount = entry.count;
        if (amount <= 0) {
             if(typeof UI !== 'undefined') UI.error("Der Händler ist pleite!");
             return;
        }

        const totalValue = unitPrice * amount;

        if (Game.state.shop.merchantCaps < totalValue) {
            if(typeof UI !== 'undefined') UI.error("Der Händler hat nicht genug Kronkorken.");
            return;
        }

        // --- TRANSAKTION ---
        Game.state.caps += totalValue;
        Game.state.shop.merchantCaps -= totalValue;

        Game.removeFromInventory(entry.id, amount); 
        
        // Item ins Händler-Lager
        if (entry.id === 'ammo') {
             // Ammo landet nicht im normalen Stock, sondern verschwindet oder füllt ammoStock auf?
             // Sagen wir, er verkauft es weiter:
             Game.state.shop.ammoStock = (Game.state.shop.ammoStock || 0) + amount;
        } else {
             if (!Game.state.shop.stock[entry.id]) Game.state.shop.stock[entry.id] = 0;
             Game.state.shop.stock[entry.id] += amount;
        }

        if(typeof UI !== 'undefined') {
            UI.log(`Verkauft: ${amount}x ${item.name} (+${totalValue} KK).`);
            if (Game.state.view === 'shop') UI.renderShop('sell');
        }
        
        Game.saveGame();
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
        let isActuallyNew = false; // [NEU] Merker für Alert

        // 1. Versuchen auf bestehende Stacks zu packen (Das ist KEIN neues Item für den Alert)
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

        // 2. Neuer Slot benötigt (Das IST ein neues Item)
        if (remaining > 0) {
            const maxSlots = this.getMaxSlots();
            while (remaining > 0) {
                if (this.getUsedSlots() >= maxSlots) {
                    UI.log("INVENTAR VOLL!", "text-red-500 font-bold blink-red");
                    if (added && itemId === 'ammo') this.syncAmmo(); 
                    return false; 
                }
                const take = Math.min(limit, remaining);
                
                // Hier setzen wir isNew: true
                const newItem = { id: itemId, count: take, isNew: true };
                if (props) newItem.props = props;
                
                this.state.inventory.push(newItem);
                remaining -= take;
                added = true;
                isActuallyNew = true; // Markieren für Alert
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
            
            // [UPDATE] Alert nur auslösen, wenn wirklich ein neuer Slot belegt wurde (isActuallyNew)
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
        if (this.state.view !== 'crafting') {
            UI.log("Zerlegen nur an einer Werkbank möglich!", "text-red-500");
            return;
        }

        const item = this.state.inventory[invIndex];
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
        if(typeof UI.renderCrafting === 'function') {
            UI.renderCrafting('scrap');
        }
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
        else if(slot === 'body') this.state.equip.body = this.items.vault_suit;
        else this.state.equip[slot] = null; 

        UI.log(`${item.name} abgelegt.`, "text-yellow-400");
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
                
                const medicLvl = this.getPerkLevel('medic');
                if(medicLvl > 0) {
                    const bonus = 1 + (medicLvl * 0.2); 
                    healAmt = Math.floor(healAmt * bonus);
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
                
                this.recalcStats();
                const effectiveMax = this.state.maxHp - (this.state.rads || 0);
                if(this.state.hp > effectiveMax) this.state.hp = effectiveMax;
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
            if(typeof UI.renderCampCooking === 'function') {
                UI.renderCampCooking();
            }
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

        const fortuneLvl = this.getPerkLevel('fortune_finder');
        if(fortuneLvl > 0) {
            enemy.loot = Math.floor(enemy.loot * (1 + (fortuneLvl * 0.1)));
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
        else if(sum <= 14) { 
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
            this.recalcStats();
            UI.renderChar(); 
            UI.update(); 
            this.saveGame(); 
        } 
    },

    choosePerk: function(perkId) {
        if(this.state.perkPoints <= 0) {
            UI.log("Keine Perk-Punkte verfügbar!", "text-red-500");
            return;
        }

        const perkDef = this.perkDefs.find(p => p.id === perkId);
        if(!perkDef) return;

        if (Array.isArray(this.state.perks)) {
            const oldPerks = this.state.perks;
            this.state.perks = {};
            oldPerks.forEach(id => this.state.perks[id] = 1);
        }
        if (!this.state.perks) this.state.perks = {};

        const currentLvl = this.state.perks[perkId] || 0;
        const maxLvl = perkDef.max || 1;

        if (currentLvl >= maxLvl) {
            UI.log(`${perkDef.name} ist bereits auf Max-Level!`, "text-yellow-500");
            return;
        }

        this.state.perkPoints--;
        this.state.perks[perkId] = currentLvl + 1;
        
        UI.log(`Perk gelernt: ${perkDef.name} (Stufe ${this.state.perks[perkId]})`, "text-green-400 font-bold");
        
        this.recalcStats();
        this.saveGame();
        
        if(typeof UI.renderChar === 'function') UI.renderChar('perks');
    },

    deployCamp: function(invIndex, confirmed=false) {
        if(this.state.camp) { UI.log("Lager existiert bereits!", "text-red-500"); return; }
        if(this.state.zone.includes("Stadt") || this.state.dungeonLevel > 0) { UI.log("Hier nicht möglich!", "text-red-500"); return; }
        
        const cost = 100;
        if(this.state.caps < cost) { UI.log(`Benötigt ${cost} Kronkorken für Aufbau.`, "text-red-500"); return; }

        if(!confirmed) {
             if(typeof UI !== 'undefined' && UI.els.dialog) {
                 UI.els.dialog.style.display = 'flex';
                 UI.els.dialog.innerHTML = `
                    <div class="bg-black/95 border-2 border-yellow-400 p-6 rounded-lg shadow-[0_0_20px_#ffd700] text-center max-w-sm pointer-events-auto relative z-50">
                        <div class="text-4xl mb-4">⛺</div>
                        <h3 class="text-xl font-bold text-yellow-400 mb-2">LAGER ERRICHTEN?</h3>
                        <p class="text-gray-300 text-sm mb-6 leading-relaxed">Der Aufbau kostet Material im Wert von <span class="text-yellow-400 font-bold">${cost} Kronkorken</span>.</p>
                        <div class="flex gap-4 justify-center">
                            <button onclick="Game.deployCamp(${invIndex}, true); UI.els.dialog.style.display='none'; UI.els.dialog.innerHTML='';" class="border-2 border-green-500 bg-green-900/40 text-green-400 px-6 py-2 rounded font-bold hover:bg-green-500 hover:text-black transition-all">BAUEN</button>
                            <button onclick="UI.els.dialog.style.display='none'; UI.els.dialog.innerHTML='';" class="border-2 border-red-500 bg-red-900/40 text-red-400 px-6 py-2 rounded font-bold hover:bg-red-500 hover:text-black transition-all">ABBRECHEN</button>
                        </div>
                    </div>
                 `;
             }
             return;
        }

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
        
        if(lvl >= 10) {
            UI.log("Lager ist bereits auf Maximalstufe (10)!", "text-yellow-400");
            return;
        }

        const cost = this.getCampUpgradeCost(lvl);
        if(!cost) {
            UI.log("Kein weiteres Upgrade verfügbar.", "text-gray-500");
            return;
        }

        const scrapItem = this.state.inventory.find(i => i.id === cost.id);
        if(!scrapItem || scrapItem.count < cost.count) {
             UI.log(`Upgrade benötigt: ${cost.count}x ${cost.name}`, "text-red-500");
             return;
        }

        scrapItem.count -= cost.count;
        if(scrapItem.count <= 0) {
             this.state.inventory = this.state.inventory.filter(i => i.id !== cost.id);
        }

        this.state.camp.level++;
        UI.log(`Lager verbessert auf Stufe ${this.state.camp.level}!`, "text-green-400 font-bold animate-pulse");
        
        this.saveGame();
        
        if(typeof UI.renderCamp === 'function') UI.renderCamp();
    }
});
// Add helper just in case
Game.addItem = Game.addToInventory;
