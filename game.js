const Game = {
    state: null,
    saveSlot: 0,
    items: {}, // FIX: Verhindert "undefined" Fehler beim UI-Start
    
    // --- INITIALISIERUNG & SAVEGUARD ---

    init: function(saveData, dbRef, slotIndex, newName) {
        this.saveSlot = slotIndex;
        console.log("Initializing Game Loop...");

        // FIX: Item-Datenbank verknüpfen (verhindert UI Fehler)
        if (typeof window.GameData !== 'undefined' && window.GameData.items) {
            this.items = window.GameData.items;
        }

        // 1. SaveGuard: Daten validieren oder neu erstellen
        if (saveData) {
            this.state = this.validateState(saveData);
            UI.log("System neu gestartet. Speicher geladen.", "text-green-500");
        } else {
            this.state = this.createNewState(newName);
            UI.log("Neue ID registriert: " + newName, "text-yellow-400");
            // Start-Equipment für neue Spieler
            this.addToInventory('vault_suit', 1);
            this.equipItem('vault_suit');
            this.addToInventory('pistol', 1); // Ein bisschen Hilfe für den Start
            this.addToInventory('AMMO', 20);
        }

        // 2. Startzeit setzen (für Timer)
        if (!this.state.startTime) this.state.startTime = Date.now();

        // 3. UI initialisieren
        UI.update();
        
        // 4. Ersten View laden (wenn im Kampf, zurück in Kampf, sonst Map)
        if (this.state.view === 'combat' && this.state.enemy && this.state.enemy.hp > 0) {
            if(typeof Combat !== 'undefined') Combat.start(this.state.enemy);
        } else {
            UI.switchView('map');
        }

        // 5. Auto-Save Interval starten (alle 60s)
        setInterval(() => this.autoSave(), 60000);
    },

    // Repariert kaputte Saves und setzt Standardwerte
    validateState: function(data) {
        const def = this.createNewState("Unknown");
        
        // Prüfe alle wichtigen Felder, falls sie im Save fehlen (durch Updates)
        if (!data.player) data.player = def.player;
        if (!data.sector) data.sector = def.sector;
        if (typeof data.hp !== 'number' || isNaN(data.hp)) data.hp = def.hp;
        if (!data.maxHp) data.maxHp = def.maxHp;
        if (!data.caps) data.caps = 0;
        if (!data.xp) data.xp = 0;
        if (!data.lvl) data.lvl = 1;
        if (!data.stats) data.stats = def.stats;
        if (!data.inventory) data.inventory = [];
        if (!data.equip) data.equip = {};
        if (!data.quests) data.quests = [];
        if (!data.visitedSectors) data.visitedSectors = ["4,4"];
        
        // Reset flags
        data.inDialog = false;
        data.isGameOver = false;
        
        return data;
    },

    createNewState: function(name) {
        return {
            playerName: name || "Vault Dweller",
            hp: 30, maxHp: 30, xp: 0, lvl: 1, caps: 50,
            stats: { STR:1, PER:1, END:1, INT:1, AGI:1, LUC:1 },
            statPoints: 0,
            inventory: [],
            equip: { weapon: null, body: null },
            sector: { x:4, y:4 }, // Start bei Vault 1337
            player: { x:1, y:1 }, // In-Map Position
            visitedSectors: ["4,4"],
            quests: [{id: "start", title: "Willkommen im Ödland", text: "Überlebe. Finde Wasser. Stirb nicht.", read: false}],
            buffEndTime: 0,
            view: 'map',
            ammo: 0
        };
    },

    // --- CORE MECHANICS (Safe Modifiers) ---

    // Zentrale Funktion für HP Änderungen (Heilung & Schaden)
    modifyHP: function(amount) {
        if (!this.state || this.state.isGameOver) return;

        const oldHp = this.state.hp;
        this.state.hp += amount;

        // Caps (Nicht über Max, nicht unter 0)
        if (this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
        
        // Death Logic
        if (this.state.hp <= 0) {
            this.state.hp = 0;
            this.handleDeath();
        }

        // Visuelles Feedback via UI
        if (amount < 0) {
            UI.shakeView();
            // Optional: Roter Screen Flash trigger via CSS class
        }
        
        UI.update();
        return this.state.hp - oldHp; // Gibt tatsächliche Änderung zurück
    },

    modifyCaps: function(amount) {
        if (!this.state) return false;
        if (this.state.caps + amount < 0) {
            UI.log("Nicht genug Kronkorken!", "text-red-500");
            return false; // Transaktion fehlgeschlagen
        }
        this.state.caps += amount;
        UI.update();
        return true;
    },

    gainExp: function(amount) {
        if (!this.state) return;
        this.state.xp += amount;
        UI.log(`+${amount} XP`, "text-yellow-400");
        
        const next = this.expToNextLevel(this.state.lvl);
        if (this.state.xp >= next) {
            this.levelUp();
        }
        UI.update();
    },

    levelUp: function() {
        this.state.lvl++;
        this.state.statPoints += 1;
        this.state.xp = 0; // Reset XP für nächstes Level (oder Übertrag behalten, Geschmackssache. Hier Reset einfachheitshalber)
        
        // Auto-Heal & MaxHP Boost
        this.recalcMaxHp();
        this.state.hp = this.state.maxHp;
        
        UI.log(`LEVEL UP! Du bist jetzt Level ${this.state.lvl}.`, "text-yellow-400 font-bold alert-glow-yellow");
        UI.log("Skillpunkt erhalten! Checke deinen Charakter.", "text-green-400");
    },

    // --- ACTIONS ---

    move: function(dx, dy) {
        if (this.state.isGameOver || this.state.inDialog) return;
        
        // Kollisions-Check (Muss WorldGen.js nutzen wenn möglich, hier vereinfacht wenn keine Map da)
        // Wir nehmen an, dass 'Game.canvasMap' aktuell gerendert ist, wenn wir im Map-Mode sind
        // Da wir das Canvas-System noch einfach halten:
        
        this.state.player.x += dx;
        this.state.player.y += dy;
        
        // Sektor-Wechsel Logik (Einfach: Wenn ausserhalb 0-30 Koordinaten)
        // Dies ist ein Platzhalter, bis wir echte Kollision haben
        
        // Zufallskampf (nur im Wasteland)
        const biome = (typeof WorldGen !== 'undefined') ? WorldGen.getSectorBiome(this.state.sector.x, this.state.sector.y) : 'wasteland';
        if (biome !== 'city' && biome !== 'vault' && Math.random() < 0.05) { // 5% Chance pro Schritt
            this.triggerRandomEncounter();
        }
        
        // Neu zeichnen (Canvas)
        if (this.drawMap) this.drawMap(); 
    },

    changeSector: function(sx, sy) {
        if (sx < 0 || sx > 7 || sy < 0 || sy > 7) return; // World Bounds
        this.state.sector = {x: sx, y: sy};
        
        const key = `${sx},${sy}`;
        if (!this.state.visitedSectors.includes(key)) {
            this.state.visitedSectors.push(key);
            this.gainExp(10); // Erkundungs-XP
            UI.log(`Sektor [${sx},${sy}] entdeckt.`, "text-cyan-400");
        }
        
        // Reset Player Pos im neuen Sektor (Mitte)
        this.state.player.x = 15; 
        this.state.player.y = 15;
        
        this.initCanvas(); // Map neu generieren
        UI.renderWorldMap(); // Globale Karte updaten
        this.saveGame();
    },

    triggerRandomEncounter: function() {
        const biome = WorldGen.getSectorBiome(this.state.sector.x, this.state.sector.y);
        const mobs = Object.values(window.GameData.monsters).filter(m => this.state.lvl >= m.minLvl);
        
        if (mobs.length === 0) return;
        
        const mobTemplate = mobs[Math.floor(Math.random() * mobs.length)];
        // Monster Instanz kopieren
        const enemy = JSON.parse(JSON.stringify(mobTemplate));
        
        // Scaling
        enemy.maxHp = Math.floor(enemy.hp * (1 + (this.state.lvl * 0.1)));
        enemy.hp = enemy.maxHp;
        enemy.dmg = Math.floor(enemy.dmg * (1 + (this.state.lvl * 0.05)));
        
        // Legendary Chance (Glück beeinflusst)
        if (Math.random() < 0.01 + (this.getStat('LUC') * 0.005)) {
            enemy.isLegendary = true;
            enemy.name = "Legendärer " + enemy.name;
            enemy.hp *= 2;
            enemy.dmg *= 1.5;
            enemy.loot *= 3;
        }

        if (typeof Combat !== 'undefined') Combat.start(enemy);
    },

    rest: function() {
        this.state.hp = this.state.maxHp;
        UI.log("Du hast dich ausgeruht. HP voll.", "text-green-400");
        this.saveGame();
        UI.update();
    },

    heal: function() {
        if (this.state.hp >= this.state.maxHp) {
            UI.log("Du bist bereits gesund.", "text-gray-500");
            return;
        }
        if (this.modifyCaps(-25)) {
            this.modifyHP(9999); // Vollheilen
            UI.log("Arzt: 'Hier, nimm das. Mach keinen Ärger.'", "text-green-400");
        }
    },

    buyAmmo: function() {
        if (this.modifyCaps(-10)) {
            this.state.ammo = (this.state.ammo || 0) + 10;
            UI.log("10 Patronen gekauft.", "text-green-400");
            UI.update(); // Inventar/Stats updaten
        }
    },

    // --- ITEM SYSTEM ---

    addToInventory: function(itemId, count=1) {
        if (!window.GameData.items[itemId]) return;
        let entry = this.state.inventory.find(i => i.id === itemId);
        if (entry) {
            entry.count += count;
        } else {
            this.state.inventory.push({ id: itemId, count: count });
        }
        
        // Special Case: Ammo wird direkt als Stat gespeichert, nicht nur im Inventar
        if (itemId === 'AMMO') {
            this.state.ammo = (this.state.ammo || 0) + (15 * count); // Ammo Packs geben 15
            // Entferne Ammo Item aus Inv, da wir es als Zahl tracken
            const idx = this.state.inventory.findIndex(i => i.id === 'AMMO');
            if(idx > -1) this.state.inventory.splice(idx, 1);
        }
        
        UI.log(`${count}x ${window.GameData.items[itemId].name} erhalten.`, "text-green-400");
        // Wenn Inventory offen ist, neu rendern
        if (this.state.view === 'inventory') UI.renderInventory();
    },

    useItem: function(itemId) {
        const item = window.GameData.items[itemId];
        const entry = this.state.inventory.find(i => i.id === itemId);
        
        if (!entry || entry.count <= 0) return;

        if (item.type === 'consumable') {
            if (item.effect === 'heal') {
                if(this.state.hp >= this.state.maxHp) {
                    UI.log("HP sind voll!", "text-gray-500");
                    return;
                }
                this.modifyHP(item.val);
                UI.log(`${item.name} benutzt. +${item.val} HP`, "text-green-400");
            }
            entry.count--;
        } 
        else if (item.type === 'weapon' || item.type === 'body') {
            this.equipItem(itemId);
        }

        // Cleanup empty items
        if (entry.count <= 0) {
            this.state.inventory = this.state.inventory.filter(i => i.count > 0);
        }
        
        UI.update();
        if (this.state.view === 'inventory') UI.renderInventory();
        if (this.state.view === 'char') UI.renderChar();
    },

    equipItem: function(itemId) {
        const item = window.GameData.items[itemId];
        if (!item) return;
        
        if (this.state.lvl < (item.requiredLevel || 0)) {
            UI.log(`Benötigt Level ${item.requiredLevel}!`, "text-red-500");
            return;
        }

        this.state.equip[item.slot] = item;
        UI.log(`${item.name} ausgerüstet.`, "text-cyan-400");
        this.recalcMaxHp();
    },

    buyItem: function(itemId) {
        const item = window.GameData.items[itemId];
        if (!item) return;
        
        if (this.modifyCaps(-item.cost)) {
            this.addToInventory(itemId, 1);
        }
    },

    craftItem: function(recipeId) {
        const r = window.GameData.recipes.find(x => x.id === recipeId);
        if(!r) return;

        // Check Items
        for(let reqId in r.req) {
            const entry = this.state.inventory.find(i => i.id === reqId);
            if(!entry || entry.count < r.req[reqId]) {
                UI.log("Nicht genug Materialien!", "text-red-500");
                return;
            }
        }

        // Remove Items
        for(let reqId in r.req) {
            const entry = this.state.inventory.find(i => i.id === reqId);
            entry.count -= r.req[reqId];
        }
        this.state.inventory = this.state.inventory.filter(i => i.count > 0);

        // Add Result
        this.addToInventory(r.out, r.count);
        UI.log("Gegenstand gefertigt!", "text-green-400");
        UI.renderCrafting();
    },

    // --- STATS & UTILS ---

    getStat: function(key) {
        let val = this.state.stats[key] || 1;
        // Add Equipment Bonus
        if (this.state.equip.body && this.state.equip.body.bonus && this.state.equip.body.bonus[key]) {
            val += this.state.equip.body.bonus[key];
        }
        if (this.state.equip.weapon && this.state.equip.weapon.bonus && this.state.equip.weapon.bonus[key]) {
            val += this.state.equip.weapon.bonus[key];
        }
        
        // Add Buffs
        if (Date.now() < this.state.buffEndTime) val += 2; // Simpler globaler Buff
        
        return val;
    },

    upgradeStat: function(key) {
        if (this.state.statPoints > 0) {
            this.state.stats[key]++;
            this.state.statPoints--;
            this.recalcMaxHp();
            UI.renderChar();
            UI.update();
        }
    },

    recalcMaxHp: function() {
        const end = this.getStat('END');
        const oldMax = this.state.maxHp;
        this.state.maxHp = 30 + (end * 5) + (this.state.lvl * 5);
        // Heile die Differenz wenn MaxHP steigt
        if (this.state.maxHp > oldMax) {
            this.state.hp += (this.state.maxHp - oldMax);
        }
    },

    expToNextLevel: function(lvl) {
        return Math.floor(100 * Math.pow(1.5, lvl - 1));
    },

    // --- SYSTEM ---

    handleDeath: function() {
        this.state.isGameOver = true;
        UI.showGameOver();
        // Hier KEIN automatisches Speichern des Todes, außer wir wollen Permadeath erzwingen.
        // Falls Permadeath an ist:
        if (typeof Network !== 'undefined') Network.deleteSlot(this.saveSlot);
    },

    hardReset: function() {
        if (typeof Network !== 'undefined') Network.deleteSlot(this.saveSlot).then(() => location.reload());
        else location.reload();
    },

    saveGame: function(manual = false) {
        if (!this.state || this.state.isGameOver) return;
        
        this.state.lastSave = Date.now();
        if (typeof Network !== 'undefined') {
            // FIX: 'Network.saveGame' existiert nicht, es muss 'Network.saveToSlot' sein
            Network.saveToSlot(this.saveSlot, this.state);
            if (manual) UI.log("Spiel gespeichert.", "text-green-500");
        }
    },

    autoSave: function() {
        // Nicht speichern während Kampf-Animationen oder Dialogen um Glitches zu vermeiden
        if (!this.state.inDialog && !this.state.isGameOver) {
            this.saveGame(false);
        }
    },

    // Placeholder für Canvas Map (wird durch ui_render/world_gen Logik ersetzt/erweitert)
    initCanvas: function() {
        // Logik kann hier rein, wenn wir die Map nicht mehr über HTML Grid rendern wollen,
        // sondern über <canvas> für bessere Performance. Aktuell nutzt worldmap.html das Grid.
        // Wir lassen es leer, damit keine Fehler kommen.
    }
};
