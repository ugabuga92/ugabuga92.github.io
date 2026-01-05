// [v2.3.0] - 2026-01-05 02:45pm (XP System Fix)
// - Feature: Added addXP() method to handle leveling.
// - Fix: Merged all previous perk/map fixes into one cohesive file.

Object.assign(Game, {

    // --- XP & LEVELING (MISSING PIECE) ---
    addXP: function(amount) {
        if(!this.state) return;
        this.state.xp += amount;
        
        // Check Level Up
        let nextXp = this.expToNextLevel(this.state.lvl);
        while(this.state.xp >= nextXp) {
            this.state.xp -= nextXp;
            this.state.lvl++;
            this.state.statPoints += 1; // +1 Stat per Level
            if(this.state.lvl % 2 === 0) this.state.perkPoints += 1; // +1 Perk every 2 Levels
            
            UI.log(`LEVEL AUFSTIEG! (Lvl ${this.state.lvl})`, "text-yellow-400 font-bold animate-pulse");
            UI.triggerLevelUpEffect(); // Optional visual flair
            
            // Recalc next level threshold
            nextXp = this.expToNextLevel(this.state.lvl);
        }
        UI.update();
    },

    expToNextLevel: function(lvl) {
        return Math.floor(100 * Math.pow(1.5, lvl - 1));
    },

    // --- PERK SYSTEM HELPERS ---
    getPerkRank: function(perkId) {
        if (!this.state.perks) return 0;
        if (Array.isArray(this.state.perks)) { 
            const oldArr = this.state.perks;
            this.state.perks = {};
            oldArr.forEach(id => { this.state.perks[id] = 1; });
        }
        return this.state.perks[perkId] || 0;
    },

    choosePerk: function(perkId) {
        if (Array.isArray(this.state.perks) || !this.state.perks) this.getPerkRank('dummy');

        const currentRank = this.state.perks[perkId] || 0;
        const perkDef = this.perkDefs.find(p => p.id === perkId);
        
        if (!perkDef) return;

        if (this.state.perkPoints > 0 && currentRank < perkDef.maxRank) {
            this.state.perkPoints--;
            this.state.perks[perkId] = currentRank + 1;
            const newRank = this.state.perks[perkId];

            UI.log(`Perk verbessert: ${perkDef.name} (Rang ${newRank})`, "text-yellow-400 font-bold");

            if (perkId === 'toughness') {
                this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
                this.state.hp += 20; 
            }
            if (perkId === 'strong_back') {
                UI.log("Inventarplatz erhöht!", "text-green-300");
            }

            UI.renderChar(); 
            UI.update(); 
            this.saveGame();
        }
    },

    // --- MAP LOGIC ---
    reveal: function(px, py) { 
        if(!this.state || !this.state.currentMap) return;
        if(!this.state.explored) this.state.explored = {}; 
        
        const radius = 2; 
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const h = this.state.currentMap.length;
        const w = this.state.currentMap[0].length;

        for(let y = py - radius; y <= py + radius; y++) {
            for(let x = px - radius; x <= px + radius; x++) {
                if(x >= 0 && x < w && y >= 0 && y < h) {
                    const tileKey = `${secKey}_${x},${y}`;
                    this.state.explored[tileKey] = true;
                }
            }
        }
    },

    move: function(dx, dy) {
        if(!this.state || this.state.isGameOver || this.state.view !== 'map' || this.state.inDialog) return;
        
        if (!this.state.currentMap || this.state.currentMap.length === 0) {
            this.loadSector(this.state.sector.x, this.state.sector.y);
            return;
        }

        const mapH = this.state.currentMap.length;
        const mapW = this.state.currentMap[0].length;

        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        
        if(nx < 0 || nx >= mapW || ny < 0 || ny >= mapH) {
            this.changeSector(nx, ny);
            return;
        }

        const tile = this.state.currentMap[ny][nx];
        const posKey = `${nx},${ny}`;

        if(this.state.hiddenItems && this.state.hiddenItems[posKey]) {
            const itemId = this.state.hiddenItems[posKey];
            this.addToInventory(itemId, 1);
            const iName = (this.items && this.items[itemId]) ? this.items[itemId].name : itemId;
            UI.log(`Gefunden: ${iName}!`, "text-yellow-400 font-bold animate-pulse");
            UI.shakeView(); 
            delete this.state.hiddenItems[posKey]; 
        }

        if (tile === '$') { UI.switchView('shop'); return; }
        if (tile === '&') { UI.switchView('crafting'); return; }
        if (tile === 'P') { UI.switchView('clinic'); return; }
        if (tile === 'E') { this.leaveCity(); return; }
        if (tile === 'X') { this.openChest(nx, ny); return; } 
        if (tile === 'v') { this.descendDungeon(); return; }

        if(['M', 'W', '#', 'U', 't', 'o', 'Y', '|', 'F', 'T', 'R', 'A', 'K', 'S', 'H', 'C', 'V'].includes(tile)) { 
            if (tile === 'V') { UI.switchView('vault'); return; }
            if (tile === 'C') { this.enterCity(); return; } 
            if (tile === 'S') { this.tryEnterDungeon("market"); return; }
            if (tile === 'H') { this.tryEnterDungeon("cave"); return; }
            if (tile === 'A') { this.tryEnterDungeon("military"); return; }
            if (tile === 'R') { this.tryEnterDungeon("raider"); return; }
            if (tile === 'K') { this.tryEnterDungeon("tower"); return; }

            if(this.state.hiddenItems && this.state.hiddenItems[posKey]) {
                 const itemId = this.state.hiddenItems[posKey];
                 this.addToInventory(itemId, 1);
                 const iName = (this.items && this.items[itemId]) ? this.items[itemId].name : itemId;
                 UI.log(`Im Objekt gefunden: ${iName}!`, "text-yellow-400 font-bold");
                 delete this.state.hiddenItems[posKey];
                 return; 
            }
            UI.shakeView();
            return; 
        }
        
        this.state.player.x = nx;
        this.state.player.y = ny;
        
        if(dx === 1) this.state.player.rot = Math.PI / 2;
        if(dx === -1) this.state.player.rot = -Math.PI / 2;
        if(dy === 1) this.state.player.rot = Math.PI;
        if(dy === -1) this.state.player.rot = 0;

        this.reveal(nx, ny);
        if(typeof Network !== 'undefined') Network.sendHeartbeat();

        if(['.', ',', '_', ';', '"', '+', 'x', 'B'].includes(tile)) {
            if(Math.random() < 0.04) { 
                this.startCombat();
                return;
            }
        }
        
        if(window.GameMap && window.GameMap.render) window.GameMap.render();
        UI.update();
    },

    changeSector: function(px, py) { 
        let sx=this.state.sector.x, sy=this.state.sector.y; 
        let newPx = px;
        let newPy = py;
        
        const curW = this.state.currentMap[0].length;
        const curH = this.state.currentMap.length;

        if(py < 0) { sy--; newPy = curH - 1; newPx = this.state.player.x; }
        else if(py >= curH) { sy++; newPy = 0; newPx = this.state.player.x; }
        if(px < 0) { sx--; newPx = curW - 1; newPy = this.state.player.y; }
        else if(px >= curW) { sx++; newPx = 0; newPy = this.state.player.y; }

        this.state.sector = {x: sx, y: sy}; 
        this.loadSector(sx, sy); 
        this.state.player.x = newPx;
        this.state.player.y = newPy;
        this.findSafeSpawn(); 
        this.reveal(this.state.player.x, this.state.player.y); 
        this.saveGame();
        
        if(typeof this.updateQuestProgress === 'function') {
             this.updateQuestProgress('visit', `${sx},${sy}`, 1);
        }
        
        UI.log(`Sektorwechsel: ${sx},${sy}`, "text-blue-400"); 
    },

    loadSector: function(sx_in, sy_in) { 
        const sx = parseInt(sx_in);
        const sy = parseInt(sy_in);
        const key = `${sx},${sy}`; 
        
        const mapSeed = (sx + 1) * 5323 + (sy + 1) * 8237 + 9283;
        if(typeof WorldGen !== 'undefined') WorldGen.setSeed(mapSeed);
        const rng = () => { return typeof WorldGen !== 'undefined' ? WorldGen.rand() : Math.random(); };
        
        if(!this.worldData[key]) { 
            let biome = 'wasteland';
            if(typeof WorldGen !== 'undefined') biome = WorldGen.getSectorBiome(sx, sy);
            
            let poiList = [];
            let sectorPoiType = null;

            if(this.state.worldPOIs) {
                this.state.worldPOIs.forEach(poi => {
                    if(poi.x === sx && poi.y === sy) {
                        poiList.push({x: 20, y: 20, type: poi.type});
                        sectorPoiType = poi.type;
                    }
                });
            }

            if(rng() < 0.35 && !sectorPoiType && sx !== 4 && sy !== 4) { 
                let type = null;
                const r = rng(); 
                if(r < 0.3) type = 'S'; 
                else if(r < 0.6) type = 'H';
                if(type) {
                    poiList.push({x: Math.floor(rng()*(25-6))+3, y: Math.floor(rng()*(25-6))+3, type: type});
                    sectorPoiType = type;
                }
            }

            let map;
            if(typeof WorldGen !== 'undefined') map = WorldGen.createSector(25, 25, biome, poiList);
            else map = Array(25).fill().map(() => Array(25).fill('.'));
            
            this.worldData[key] = { layout: map, biome: biome, poi: sectorPoiType };
        } 
        
        const data = this.worldData[key]; 
        this.state.currentMap = data.layout; 
        
        if(this.state.visitedSectors && !this.state.visitedSectors.includes(key)) {
            this.state.visitedSectors.push(key);
        }
        
        this.state.hiddenItems = {}; 
        if(Math.random() < 0.3) { 
            let hiddenX, hiddenY;
            let attempts = 0;
            const h = this.state.currentMap.length;
            const w = this.state.currentMap[0].length;
            do {
                hiddenX = Math.floor(Math.random() * w);
                hiddenY = Math.floor(Math.random() * h);
                attempts++;
            } while(attempts < 100 && !this.isValidHiddenSpot(hiddenX, hiddenY));
            
            if(attempts < 100) {
                const bps = ['bp_ammo', 'bp_rusty_pistol', 'bp_machete', 'bp_leather_armor'];
                const bp = bps[Math.floor(Math.random() * bps.length)];
                if(this.items && this.items[bp]) {
                    const recipeId = this.items[bp].recipeId;
                    if(!this.state.knownRecipes.includes(recipeId)) {
                        this.state.hiddenItems[`${hiddenX},${hiddenY}`] = bp;
                    }
                }
            }
        }

        this.fixMapBorders(this.state.currentMap, sx, sy);
        if(!this.state.explored) this.state.explored = {};
        
        let zn = "Ödland"; 
        if(data.biome === 'city') zn = "Ruinenstadt"; 
        if(data.biome === 'desert') zn = "Aschewüste"; 
        if(data.biome === 'jungle') zn = "Dschungel"; 
        if(data.biome === 'swamp') zn = "Sumpf";
        this.state.zone = `${zn} (${sx},${sy})`; 
        
        this.findSafeSpawn();
        
        if(window.GameMap && window.GameMap.render) window.GameMap.render();
        
        this.reveal(this.state.player.x, this.state.player.y);
    },

    isValidHiddenSpot: function(x, y) {
        if(!this.state.currentMap || !this.state.currentMap[y]) return false;
        const t = this.state.currentMap[y][x];
        return ['t', 'T', 'o', 'Y', '#', '"'].includes(t);
    },

    fixMapBorders: function(map, sx, sy) {
        const h = map.length;
        const w = map[0].length;
        const WORLD_MAX = 100;
        if(sy === 0) { for(let i=0; i<w; i++) map[0][i] = '#'; }
        if(sy === WORLD_MAX - 1) { for(let i=0; i<w; i++) map[h-1][i] = '#'; }
        if(sx === 0) { for(let i=0; i<h; i++) map[i][0] = '#'; }
        if(sx === WORLD_MAX - 1) { for(let i=0; i<h; i++) map[i][w-1] = '#'; }
    },
    
    findSafeSpawn: function() {
        if(!this.state || !this.state.currentMap) return;
        const h = this.state.currentMap.length;
        const w = this.state.currentMap[0].length;

        const isSafe = (x, y) => {
            if(x < 0 || x >= w || y < 0 || y >= h) return false;
            const t = this.state.currentMap[y][x];
            return !['M', 'W', '#', 'U', 't', 'T', 'o', 'Y', '|', 'F', 'R', 'A', 'K'].includes(t);
        };
        
        if(isSafe(this.state.player.x, this.state.player.y)) return;
        
        const rMax = 6;
        for(let r=1; r<=rMax; r++) {
            for(let dy=-r; dy<=r; dy++) {
                for(let dx=-r; dx<=r; dx++) {
                    const tx = this.state.player.x + dx;
                    const ty = this.state.player.y + dy;
                    if(isSafe(tx, ty)) {
                        this.state.player.x = tx;
                        this.state.player.y = ty;
                        return;
                    }
                }
            }
        }
        this.state.player.x = Math.floor(w/2);
        this.state.player.y = Math.floor(h/2);
    },

    // --- SHARED ACTIONS ---
    getMaxSlots: function() {
        const base = 10;
        const strBonus = this.getStat('STR') * 1; 
        const perkBonus = this.getPerkRank('strong_back') * 2; 
        return base + strBonus + perkBonus;
    },

    calculateMaxHP: function(end) {
        const base = 100;
        const statBonus = end * 10;
        const perkBonus = this.getPerkRank('toughness') * 20;
        return base + statBonus + perkBonus;
    },

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
    
    addRadiation: function(amount) {
        if(!this.state) return;
        if(typeof this.state.rads === 'undefined') this.state.rads = 0;
        
        let finalAmount = amount;
        if (amount > 0) {
            const resRank = this.getPerkRank('rad_resistant');
            if(resRank > 0) finalAmount = Math.ceil(amount * (1 - (resRank * 0.1)));
        }

        this.state.rads = Math.min(this.state.maxHp, Math.max(0, this.state.rads + finalAmount));
        if(finalAmount > 0) UI.log(`+${finalAmount} RADS!`, "text-red-500 font-bold animate-pulse");
        else UI.log(`${Math.abs(finalAmount)} RADS entfernt.`, "text-green-300");
        
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
        UI.log("Ausgeruht. HP voll.", "text-blue-400"); 
        UI.update(); 
    },

    restInCamp: function() {
        if(!this.state || !this.state.camp) return;
        const lvl = this.state.camp.level || 1;
        this.addRadiation(5); 

        const effectiveMax = this.state.maxHp - (this.state.rads || 0);
        const survRank = this.getPerkRank('survivalist');
        let perkBonus = survRank * 10;

        let healPct = 30 + ((lvl - 1) * 8) + perkBonus; 
        if(lvl >= 10) healPct = 100 + perkBonus;
        if(healPct > 100) healPct = 100;

        const healAmount = Math.floor(effectiveMax * (healPct / 100));
        const oldHp = this.state.hp;
        
        this.state.hp = Math.min(effectiveMax, this.state.hp + healAmount);
        const healed = Math.floor(this.state.hp - oldHp);

        UI.log(`Geschlafen (Lager Lvl ${lvl}).`, "text-blue-300");
        UI.log(`Regeneration: ${Math.floor(healPct)}% (+${healed} TP) / +5 RADS`, "text-green-400 font-bold");

        UI.update();
        if(typeof UI.renderCamp === 'function') UI.renderCamp();
    },

    heal: function() { 
        if(this.state.caps >= 25) { 
            this.state.caps -= 25; 
            this.state.rads = 0; 
            this.state.hp = this.state.maxHp; 
            UI.log("Behandlung erfolgreich! (-RADS, +HP)", "text-green-400");
            UI.update(); 
        } else { UI.log("Zu wenig Kronkorken.", "text-red-500"); }
    },
    
    buyAmmo: function(mode = 1) { this.buyItem('ammo', mode); },
    
    buyItem: function(key, mode = 1) { 
        const item = this.items[key]; 
        if(!item) return;

        let stock = 0;
        if(key === 'ammo') stock = this.state.shop.ammoStock || 0;
        else stock = (this.state.shop.stock && this.state.shop.stock[key]) ? this.state.shop.stock[key] : 0;

        if(stock <= 0) { UI.log("Ausverkauft.", "text-red-500"); return; }

        let amount = 1;
        let costPerUnit = (key === 'ammo') ? 10 : item.cost; 

        if (mode === 'max') {
            const maxAfford = Math.floor(this.state.caps / costPerUnit);
            amount = Math.min(stock, maxAfford);
        } else { amount = mode; }

        if(amount <= 0) { if(this.state.caps < costPerUnit) UI.log("Zu wenig Kronkorken.", "text-red-500"); return; }
        if(amount > stock) amount = stock;
        const totalCost = amount * costPerUnit;

        if (key === 'camp_kit') {
            if (this.state.inventory.some(i => i.id === 'camp_kit')) { UI.log("Du hast schon ein Zelt!", "text-orange-500"); return; }
            if (amount > 1) amount = 1; 
        }

        if(this.state.caps >= totalCost) { 
            let countToAdd = (key === 'ammo') ? 10 : 1;
            let finalAmount = countToAdd * amount;
            
            if(this.addToInventory(key, finalAmount)) {
                this.state.caps -= totalCost;
                if(key === 'ammo') this.state.shop.ammoStock -= amount;
                else if(this.state.shop.stock[key]) this.state.shop.stock[key] -= amount;

                UI.log(`Gekauft: ${amount}x ${item.name} (-${totalCost} KK)`, "text-green-400");
                if(typeof UI.renderShopBuy === 'function') UI.renderShopBuy();
                else if(document.getElementById('shop-list') && typeof UI.renderShop === 'function') UI.renderShop(document.getElementById('shop-list'));
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
        
        const barterRank = this.getPerkRank('barter');
        const barterBonus = 1 + (barterRank * 0.1); 

        let sellPrice = Math.floor((def.cost * 0.25 * barterBonus) * valMult);
        if(sellPrice < 1) sellPrice = 1;

        let amount = 1;
        if (mode === 'max') {
            const maxAfford = Math.floor(this.state.shop.merchantCaps / sellPrice);
            amount = Math.min(item.count, maxAfford);
        } else { amount = mode; }

        if(amount > item.count) amount = item.count;
        if(amount <= 0 && this.state.shop.merchantCaps < sellPrice) { UI.log("Händler ist pleite!", "text-red-500"); return; }
        if(amount <= 0) return; 

        const totalEarned = amount * sellPrice;
        if(this.state.shop.merchantCaps < totalEarned) { UI.log("Händler hat nicht genug KK!", "text-red-500"); return; }

        this.state.caps += totalEarned;
        this.state.shop.merchantCaps -= totalEarned;
        
        item.count -= amount;
        if(item.count <= 0) this.state.inventory.splice(invIndex, 1);
        if(item.id === 'ammo') this.syncAmmo();

        UI.log(`Verkauft: ${amount}x ${def.name} (+${totalEarned} KK)`, "text-yellow-400");
        if(typeof UI.renderShopSell === 'function') UI.renderShopSell();
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
            if (this.state.inventory.some(i => i.id === 'camp_kit')) return false; 
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
            if (itemId === 'ammo') this.syncAmmo();
            const itemDef = this.items[itemId];
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
        const item = this.state.inventory[invIndex];
        const def = this.items[item.id];
        if(!def) return;

        let name = (item.props && item.props.name) ? item.props.name : def.name;
        let value = def.cost || 10;
        
        this.state.inventory.splice(invIndex, 1);

        const scrapperRank = this.getPerkRank('scrapper');
        let scrapAmount = Math.max(1, Math.floor(value / 25)) + scrapperRank; 

        this.addToInventory('junk_metal', scrapAmount);
        let msg = `Zerlegt: ${name} -> ${scrapAmount}x Schrott`;

        let rareChance = 0.5 + (scrapperRank * 0.05);
        if(value >= 100 && Math.random() < rareChance) {
            let screws = Math.max(1, Math.floor(value / 100));
            this.addToInventory('screws', screws);
            msg += `, ${screws}x Schrauben`;
        }
        if(value >= 200 && Math.random() < (0.3 + scrapperRank*0.05)) {
            this.addToInventory('plastic', 1);
            msg += `, 1x Plastik`;
        }

        UI.log(msg, "text-orange-400 font-bold");
        UI.update();
        if(this.state.view === 'crafting' && typeof UI.renderCrafting === 'function') UI.renderCrafting('scrap');
        else if(this.state.view === 'inventory') UI.renderInventory();
        this.saveGame();
    },

    unequipItem: function(slot) {
        if(!this.state.equip[slot]) return;
        const item = this.state.equip[slot];
        if(item.name === "Fäuste" || item.name === "Vault-Anzug") return;

        if(this.getUsedSlots() >= this.getMaxSlots()) { UI.log("Inventar voll!", "text-red-500"); return; }

        let itemToAdd = item._fromInv || { id: item.id, count: 1, props: item.props };
        if(!item._fromInv && !item.id) { 
             const key = Object.keys(this.items).find(k => this.items[k].name === item.name);
             if(key) itemToAdd = { id: key, count: 1 };
        }

        this.state.inventory.push(itemToAdd);
        
        if(slot === 'weapon') this.state.equip.weapon = this.items.fists;
        else if(slot === 'body') {
            this.state.equip.body = this.items.vault_suit;
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            const effectiveMax = this.state.maxHp - (this.state.rads || 0);
            if(this.state.hp > effectiveMax) this.state.hp = effectiveMax;
        }
        else { this.state.equip[slot] = null; }

        UI.log(`${item.name} abgelegt.`, "text-yellow-400");
        if(typeof UI.renderChar === 'function' && this.state.view === 'char') UI.renderChar(); 
        if(typeof UI.renderInventory === 'function' && this.state.view === 'inventory') UI.renderInventory(); 
        this.saveGame();
    },

    useItem: function(invIndexOrId, mode = 1) { 
        let invItem, index;
        if(typeof invIndexOrId === 'string') index = this.state.inventory.findIndex(i => i.id === invIndexOrId);
        else index = invIndexOrId;

        if(index === -1 || !this.state.inventory[index]) return;
        invItem = this.state.inventory[index];
        const itemDef = this.items[invItem.id];
        
        if (itemDef.type === 'back') {
            const slot = 'back';
            let oldEquip = this.state.equip[slot];
            this.state.inventory.splice(index, 1);
            if(oldEquip && oldEquip.props) {
                this.state.inventory.push({ id: oldEquip.id, count: 1, props: oldEquip.props, isNew: true });
            }
            this.state.equip[slot] = { ...itemDef, ...invItem.props };
            UI.log(`Rucksack angelegt: ${itemDef.name}`, "text-yellow-400");
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
            UI.log("Nuka Cola: Erfrischend...", "text-blue-400");
            this.removeFromInventory('nuka_cola', 1);
            UI.update();
            return;
        }

        if(invItem.id === 'radaway') {
            this.addRadiation(-50); 
            UI.log("RadAway verwendet.", "text-green-300 font-bold");
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
                
                const medicRank = this.getPerkRank('medic');
                if (medicRank > 0) healAmt = Math.floor(healAmt * (1 + (medicRank * 0.2)));

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

        const fortuneRank = this.getPerkRank('fortune_finder');
        if (fortuneRank > 0) {
            enemy.loot = Math.floor(enemy.loot * (1 + (fortuneRank * 0.1)));
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
            if(key === 'END') this.state.maxHp = this.calculateMaxHP(this.getStat('END')); 
            UI.renderChar(); 
            UI.update(); 
            this.saveGame(); 
        } 
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
