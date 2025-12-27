// [v0.7.0]
Object.assign(Game, {
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

    addToInventory: function(id, count=1) { 
        if(!this.state.inventory) this.state.inventory = []; 
        const existing = this.state.inventory.find(i => i.id === id); 
        if(existing) existing.count += count; 
        else this.state.inventory.push({id: id, count: count}); 
        
        const itemDef = this.items[id];
        const itemName = itemDef ? itemDef.name : id;
        UI.log(`+ ${itemName} (${count})`, "text-green-400"); 

        if(itemDef && (itemDef.type === 'weapon' || itemDef.type === 'body')) {
            if(typeof UI !== 'undefined' && UI.triggerInventoryAlert) UI.triggerInventoryAlert();
        }
    }, 
    
    useItem: function(id) { 
        const itemDef = this.items[id]; 
        const invItem = this.state.inventory.find(i => i.id === id); 
        if(!invItem || invItem.count <= 0) return; 
        
        // --- BLUEPRINT LOGIC (NEU) ---
        if(itemDef.type === 'blueprint') {
            if(!this.state.knownRecipes.includes(itemDef.recipeId)) {
                this.state.knownRecipes.push(itemDef.recipeId);
                UI.log(`Rezept gelernt: ${itemDef.name.replace('Bauplan: ', '')}`, "text-cyan-400 font-bold");
                invItem.count--;
            } else {
                UI.log("Du kennst diesen Bauplan bereits.", "text-gray-500");
                // Nicht verbrauchen
                return;
            }
        }
        else if(itemDef.type === 'consumable') { 
            if(itemDef.effect === 'heal') { 
                const healAmt = itemDef.val; 
                if(this.state.hp >= this.state.maxHp) { UI.log("Gesundheit voll.", "text-gray-500"); return; } 
                this.state.hp = Math.min(this.state.maxHp, this.state.hp + healAmt); 
                UI.log(`Verwendet: ${itemDef.name}`, "text-blue-400"); 
                invItem.count--; 
            } 
        } else if (itemDef.type === 'weapon' || itemDef.type === 'body') { 
            const oldItemName = this.state.equip[itemDef.slot].name; 
            const oldItemKey = Object.keys(this.items).find(key => this.items[key].name === oldItemName); 
            if(oldItemKey && oldItemKey !== 'fists' && oldItemKey !== 'vault_suit') { this.addToInventory(oldItemKey, 1); } 
            this.state.equip[itemDef.slot] = itemDef; 
            invItem.count--; 
            UI.log(`Ausgerüstet: ${itemDef.name}`, "text-yellow-400"); 
            if(itemDef.slot === 'body') { 
                const oldMax = this.state.maxHp; 
                this.state.maxHp = this.calculateMaxHP(this.getStat('END')); 
                this.state.hp += (this.state.maxHp - oldMax); 
            } 
        } 
        if(invItem.count <= 0) { this.state.inventory = this.state.inventory.filter(i => i.id !== id); } 
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
            let hasEquipped = false;
            if (this.state.equip.weapon && Object.keys(this.items).find(k => this.items[k].name === this.state.equip.weapon.name) === reqId) hasEquipped = true;
            if (this.state.equip.body && Object.keys(this.items).find(k => this.items[k].name === this.state.equip.body.name) === reqId) hasEquipped = true;
            if (hasEquipped || !invItem || invItem.count < countNeeded) { UI.log(`Material fehlt: ${this.items[reqId].name}`, "text-red-500"); return; }
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
            this.addToInventory('legendary_part', 1);
            this.state.caps += 300;
            const rare = this.items['plasma_rifle'] ? 'plasma_rifle' : 'hunting_rifle';
            this.addToInventory(rare, 1);
            UI.log("JACKPOT! Modul + 300 KK + Waffe!", "text-yellow-400 font-bold animate-pulse");
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
    }
});
