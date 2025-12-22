const Game = {
    state: null,
    saveSlot: 0,
    
    // Canvas Vars
    canvasMap: null,
    ctx: null,
    mapWidth: 32,
    mapHeight: 24,
    tileSize: 20, // Größe der Kacheln in Pixeln

    // --- INITIALISIERUNG & SAVEGUARD ---

    init: function(saveData, dbRef, slotIndex, newName) {
        this.saveSlot = slotIndex;
        console.log("Initializing Game Loop...");

        // 1. SaveGuard: Daten validieren oder neu erstellen
        if (saveData) {
            this.state = this.validateState(saveData);
            UI.log("System neu gestartet. Speicher geladen.", "text-green-500");
        } else {
            this.state = this.createNewState(newName);
            UI.log("Neue ID registriert: " + newName, "text-yellow-400");
            // Start-Equipment
            this.addToInventory('vault_suit', 1);
            this.equipItem('vault_suit');
            this.addToInventory('pistol', 1); 
            this.addToInventory('AMMO', 20);
        }

        // 2. Startzeit setzen
        if (!this.state.startTime) this.state.startTime = Date.now();

        // 3. UI initialisieren
        UI.update();
        
        // 4. View laden
        if (this.state.view === 'combat' && this.state.enemy && this.state.enemy.hp > 0) {
            if(typeof Combat !== 'undefined') Combat.start(this.state.enemy);
        } else {
            UI.switchView('map');
        }

        // 5. Auto-Save (60s)
        setInterval(() => this.autoSave(), 60000);
    },

    validateState: function(data) {
        const def = this.createNewState("Unknown");
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
        if (!data.localMap) data.localMap = []; // Map Data
        
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
            sector: { x:4, y:4 }, 
            player: { x:16, y:12 }, // Mitte der Map
            visitedSectors: ["4,4"],
            localMap: [],
            quests: [{id: "start", title: "Willkommen", text: "Verlasse den Vault.", read: false}],
            buffEndTime: 0,
            view: 'map',
            ammo: 0
        };
    },

    // --- RENDER & MAP LOGIC (DER FIX) ---

    initCanvas: function() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        
        this.canvasMap = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Canvas Größe setzen
        canvas.width = this.mapWidth * this.tileSize;
        canvas.height = this.mapHeight * this.tileSize;
        
        // Deaktiviere Antialiasing für Pixel-Look
        this.ctx.imageSmoothingEnabled = false;

        // Wenn keine Map im Speicher ist -> Generieren
        if (!this.state.localMap || this.state.localMap.length === 0) {
            this.generateLocalMap();
        }
        
        this.drawMap();
    },

    generateLocalMap: function() {
        if (typeof WorldGen === 'undefined') return;
        
        const biome = WorldGen.getSectorBiome(this.state.sector.x, this.state.sector.y);
        let pois = [];
        
        // Spezielle Orte setzen
        if(biome === 'city') pois.push({x: Math.floor(this.mapWidth/2), y: Math.floor(this.mapHeight/2), type: 'C'});
        if(biome === 'vault') pois.push({x: Math.floor(this.mapWidth/2), y: Math.floor(this.mapHeight/2), type: 'V'});
        
        // Map generieren
        this.state.localMap = WorldGen.createSector(this.mapWidth, this.mapHeight, biome, pois);
    },

    drawMap: function() {
        if (!this.ctx || !this.state.localMap || this.state.localMap.length === 0) return;
        
        const map = this.state.localMap;
        const colors = window.GameData.colors;
        const ts = this.tileSize;
        
        // 1. Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvasMap.width, this.canvasMap.height);
        
        // 2. Draw Terrain
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if(!map[y] || !map[y][x]) continue;
                const char = map[y][x];
                this.ctx.fillStyle = colors[char] || '#111';
                this.ctx.fillRect(x * ts, y * ts, ts, ts);
                
                // Optional: Grid Lines (leicht)
                // this.ctx.strokeStyle = '#051105';
                // this.ctx.strokeRect(x * ts, y * ts, ts, ts);
            }
        }
        
        // 3. Draw Player
        const p = this.state.player;
        this.ctx.fillStyle = '#39ff14'; // Pip-Boy Green
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#39ff14';
        this.ctx.fillRect(p.x * ts, p.y * ts, ts, ts);
        this.ctx.shadowBlur = 0; // Reset
    },

    // --- ACTIONS ---

    move: function(dx, dy) {
        if (this.state.isGameOver || this.state.inDialog || !this.state.localMap) return;
        
        let newX = this.state.player.x + dx;
        let newY = this.state.player.y + dy;
        
        // Grenzen prüfen
        if (newX < 0 || newX >= this.mapWidth || newY < 0 || newY >= this.mapHeight) {
             UI.log("Ende des Sektors.", "text-gray-500");
             // Hier könnte man den Sektorwechsel triggern
             return;
        }
        
        // Kollision prüfen
        const tile = this.state.localMap[newY][newX];
        const solidChars = ['M', 'W', '#', '|']; // Berg, Wasser, Wände
        if (solidChars.includes(tile)) {
             UI.log("Weg blockiert!", "text-red-500");
             UI.shakeView();
             return;
        }
        
        // Bewegung ausführen
        this.state.player.x = newX;
        this.state.player.y = newY;
        
        // Interaktionen
        this.checkInteraction(tile);

        // Zufallskampf
        const biome = WorldGen.getSectorBiome(this.state.sector.x, this.state.sector.y);
        if (biome !== 'city' && biome !== 'vault' && Math.random() < 0.05) { 
            this.triggerRandomEncounter();
        }
        
        this.drawMap(); 
    },

    checkInteraction: function(tile) {
        if(tile === 'C' || tile === 'E' || tile === 'F') { // City Trigger
            UI.toggleView('city');
            UI.log("Betrete Rusty Springs...", "text-cyan-400");
        }
        if(tile === 'V') { // Vault Trigger
            UI.enterVault();
        }
    },

    modifyHP: function(amount) {
        if (!this.state || this.state.isGameOver) return;
        const oldHp = this.state.hp;
        this.state.hp += amount;
        if (this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
        if (this.state.hp <= 0) {
            this.state.hp = 0;
            this.handleDeath();
        }
        if (amount < 0) UI.shakeView();
        UI.update();
        return this.state.hp - oldHp;
    },

    modifyCaps: function(amount) {
        if (!this.state) return false;
        if (this.state.caps + amount < 0) {
            UI.log("Nicht genug Kronkorken!", "text-red-500");
            return false;
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
        if (this.state.xp >= next) this.levelUp();
        UI.update();
    },

    levelUp: function() {
        this.state.lvl++;
        this.state.statPoints += 1;
        this.state.xp = 0; 
        this.recalcMaxHp();
        this.state.hp = this.state.maxHp;
        UI.log(`LEVEL UP! Level ${this.state.lvl}.`, "text-yellow-400 font-bold alert-glow-yellow");
    },

    changeSector: function(sx, sy) {
        if (sx < 0 || sx > 7 || sy < 0 || sy > 7) return; 
        this.state.sector = {x: sx, y: sy};
        const key = `${sx},${sy}`;
        if (!this.state.visitedSectors.includes(key)) {
            this.state.visitedSectors.push(key);
            this.gainExp(10);
            UI.log(`Sektor [${sx},${sy}] entdeckt.`, "text-cyan-400");
        }
        // Neue Map generieren erzwingen
        this.state.localMap = []; 
        this.state.player.x = Math.floor(this.mapWidth/2);
        this.state.player.y = Math.floor(this.mapHeight/2);
        
        this.initCanvas(); 
        UI.renderWorldMap();
        this.saveGame();
    },

    triggerRandomEncounter: function() {
        const biome = WorldGen.getSectorBiome(this.state.sector.x, this.state.sector.y);
        const mobs = Object.values(window.GameData.monsters).filter(m => this.state.lvl >= m.minLvl);
        if (mobs.length === 0) return;
        
        const mobTemplate = mobs[Math.floor(Math.random() * mobs.length)];
        const enemy = JSON.parse(JSON.stringify(mobTemplate));
        
        enemy.maxHp = Math.floor(enemy.hp * (1 + (this.state.lvl * 0.1)));
        enemy.hp = enemy.maxHp;
        enemy.dmg = Math.floor(enemy.dmg * (1 + (this.state.lvl * 0.05)));
        
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
        if (this.state.hp >= this.state.maxHp) { UI.log("Du bist gesund.", "text-gray-500"); return; }
        if (this.modifyCaps(-25)) {
            this.modifyHP(9999); 
            UI.log("Behandlung erfolgreich.", "text-green-400");
        }
    },

    buyAmmo: function() {
        if (this.modifyCaps(-10)) {
            this.state.ammo = (this.state.ammo || 0) + 10;
            UI.log("10 Patronen gekauft.", "text-green-400");
            UI.update(); 
        }
    },

    addToInventory: function(itemId, count=1) {
        if (!window.GameData.items[itemId]) return;
        let entry = this.state.inventory.find(i => i.id === itemId);
        if (entry) entry.count += count;
        else this.state.inventory.push({ id: itemId, count: count });
        
        if (itemId === 'AMMO') {
            this.state.ammo = (this.state.ammo || 0) + (15 * count); 
            const idx = this.state.inventory.findIndex(i => i.id === 'AMMO');
            if(idx > -1) this.state.inventory.splice(idx, 1);
        }
        UI.log(`${count}x ${window.GameData.items[itemId].name} erhalten.`, "text-green-400");
        if (this.state.view === 'inventory') UI.renderInventory();
    },

    useItem: function(itemId) {
        const item = window.GameData.items[itemId];
        const entry = this.state.inventory.find(i => i.id === itemId);
        if (!entry || entry.count <= 0) return;

        if (item.type === 'consumable') {
            if (item.effect === 'heal') {
                if(this.state.hp >= this.state.maxHp) { UI.log("HP sind voll!", "text-gray-500"); return; }
                this.modifyHP(item.val);
                UI.log(`${item.name} benutzt.`, "text-green-400");
            }
            entry.count--;
        } else if (item.type === 'weapon' || item.type === 'body') {
            this.equipItem(itemId);
        }

        if (entry.count <= 0) this.state.inventory = this.state.inventory.filter(i => i.count > 0);
        UI.update();
        if (this.state.view === 'inventory') UI.renderInventory();
        if (this.state.view === 'char') UI.renderChar();
    },

    equipItem: function(itemId) {
        const item = window.GameData.items[itemId];
        if (!item) return;
        if (this.state.lvl < (item.requiredLevel || 0)) { UI.log(`Level ${item.requiredLevel} benötigt!`, "text-red-500"); return; }
        this.state.equip[item.slot] = item;
        UI.log(`${item.name} ausgerüstet.`, "text-cyan-400");
        this.recalcMaxHp();
    },

    buyItem: function(itemId) {
        const item = window.GameData.items[itemId];
        if (!item) return;
        if (this.modifyCaps(-item.cost)) this.addToInventory(itemId, 1);
    },

    craftItem: function(recipeId) {
        const r = window.GameData.recipes.find(x => x.id === recipeId);
        if(!r) return;
        for(let reqId in r.req) {
            const entry = this.state.inventory.find(i => i.id === reqId);
            if(!entry || entry.count < r.req[reqId]) { UI.log("Zu wenig Material!", "text-red-500"); return; }
        }
        for(let reqId in r.req) {
            const entry = this.state.inventory.find(i => i.id === reqId);
            entry.count -= r.req[reqId];
        }
        this.state.inventory = this.state.inventory.filter(i => i.count > 0);
        this.addToInventory(r.out, r.count);
        UI.renderCrafting();
    },

    getStat: function(key) {
        let val = this.state.stats[key] || 1;
        if (this.state.equip.body && this.state.equip.body.bonus && this.state.equip.body.bonus[key]) val += this.state.equip.body.bonus[key];
        if (this.state.equip.weapon && this.state.equip.weapon.bonus && this.state.equip.weapon.bonus[key]) val += this.state.equip.weapon.bonus[key];
        if (Date.now() < this.state.buffEndTime) val += 2;
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
        if (this.state.maxHp > oldMax) this.state.hp += (this.state.maxHp - oldMax);
    },

    expToNextLevel: function(lvl) {
        return Math.floor(100 * Math.pow(1.5, lvl - 1));
    },

    handleDeath: function() {
        this.state.isGameOver = true;
        UI.showGameOver();
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
            Network.saveGame(this.saveSlot, this.state);
            if (manual) UI.log("Spiel gespeichert.", "text-green-500");
        }
    },

    autoSave: function() {
        if (!this.state.inDialog && !this.state.isGameOver) this.saveGame(false);
    },

    // Placeholder falls nicht genutzt, aber initCanvas ist oben definiert
    initCanvasProxy: function() { this.initCanvas(); }
};
