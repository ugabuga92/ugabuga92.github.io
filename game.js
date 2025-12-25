// [v0.4.8]
const Game = {
    state: null,
    canvas: null,
    ctx: null,
    items: (typeof window.GameData !== 'undefined') ? window.GameData.items : {},
    monsters: (typeof window.GameData !== 'undefined') ? window.GameData.monsters : {},
    recipes: (typeof window.GameData !== 'undefined') ? window.GameData.recipes : [],
    
    // Core Init
    init: function(saveData, canvasId, slotIndex = 0, newName = null) {
        this.canvas = document.getElementById(canvasId || 'game-canvas');
        if(this.canvas) this.ctx = this.canvas.getContext('2d');
        
        if (saveData) {
            this.state = saveData;
            // Migrations & Safety Checks
            if(!this.state.visitedSectors) this.state.visitedSectors = [];
            if(!this.state.worldPOIs) this.state.worldPOIs = []; 
            if(!this.state.equip) this.state.equip = {};
            // Ensure equipment stats
            if(this.state.equip.weapon && !this.state.equip.weapon.baseDmg) this.state.equip.weapon = this.items[this.state.equip.weapon.id] || this.items['fists'];
            if(this.state.equip.body && !this.state.equip.body.bonus) this.state.equip.body = this.items[this.state.equip.body.id] || this.items['vault_suit'];
            
            // Fix map borders if old save
            this.fixMapBorders();
            
            UI.log("SYSTEM: Speicherstand geladen.", "text-green-500");
        } else {
            this.state = {
                slot: slotIndex,
                playerName: newName || "SURVIVOR",
                lvl: 1, xp: 0, hp: 100, maxHp: 100, caps: 50, ammo: 20,
                stats: { STR:1, PER:1, END:1, INT:1, AGI:1, LUC:1 },
                statPoints: 0,
                sector: { x:0, y:0 }, 
                player: { x:4, y:4, dir:0 },
                inventory: [ {id:'stimpack', count:2}, {id:'knife', count:1} ],
                equip: { weapon: this.items['knife'], body: this.items['vault_suit'] },
                quests: [],
                visitedSectors: [],
                worldPOIs: [],
                startTime: Date.now(),
                view: 'map',
                buffEndTime: 0,
                hasNewItems: false // NEW FLAG
            };
            
            // Initial Start: Generate Start Sector & POIs
            WorldGen.initWorld(this.state);
            
            this.state.quests.push({
                id: 'start_q1', title: 'Überlebenstraining',
                text: 'Willkommen im Ödland! Jage Geckos für Fleisch und Erfahrung.', read: false
            });
            UI.log("SYSTEM: Neuer Benutzer registriert.", "text-yellow-400");
            
            // Start Intro
            if(UI.showPermadeathWarning) UI.showPermadeathWarning();
        }

        // Ensure explored map exists
        if(!this.state.explored) this.state.explored = {};
        
        // Find safe spawn if blocked
        if(!this.isValidSpawn(this.state.player.x, this.state.player.y)) {
            const safe = this.findSafeSpawn();
            this.state.player.x = safe.x;
            this.state.player.y = safe.y;
        }

        this.initCanvas();
        this.gameLoop();
        
        // Auto-Save Interval
        setInterval(() => this.saveGame(), 60000);
    },

    // Graphics & Map
    initCanvas: function() {
        if(!this.canvas) return;
        this.canvas.width = 600; 
        this.canvas.height = 600; 
        this.renderStaticMap();
    },

    renderStaticMap: function() {
        if(!this.state || !this.ctx) return;
        
        // Ensure Sector Exists (Safety Check)
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        if(!this.state.explored[secKey]) {
            this.state.explored[secKey] = WorldGen.createSector(this.state.sector.x, this.state.sector.y);
        }
        
        // Draw Terrain
        const mapData = this.state.explored[secKey];
        const TILE = 60; // 10x10 Grid = 600px

        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for(let y=0; y<10; y++) {
            for(let x=0; x<10; x++) {
                this.drawTile(x, y, mapData[y][x], TILE);
            }
        }

        // Draw Player
        const px = this.state.player.x * TILE + TILE/2;
        const py = this.state.player.y * TILE + TILE/2;
        
        this.ctx.save();
        this.ctx.translate(px, py);
        
        // Player Arrow Rotation based on Dir (0=Right, 1=Down, 2=Left, 3=Up)
        // Correction: Standard Math 0 is Right. 
        // Logic: dir 0 -> 0deg, 1 -> 90deg ...
        const rot = this.state.player.dir * (Math.PI/2);
        this.ctx.rotate(rot);

        // Draw Player Arrow
        this.ctx.beginPath();
        this.ctx.moveTo(15, 0);
        this.ctx.lineTo(-10, 10);
        this.ctx.lineTo(-10, -10);
        this.ctx.closePath();
        this.ctx.fillStyle = "#39ff14";
        this.ctx.fill();
        this.ctx.restore();
        
        // Draw Other Players (Network)
        if(typeof Network !== 'undefined' && Network.otherPlayers) {
            for(let pid in Network.otherPlayers) {
                const p = Network.otherPlayers[pid];
                if(p.sector && p.sector.x === this.state.sector.x && p.sector.y === this.state.sector.y) {
                    const opx = p.x * TILE + TILE/2;
                    const opy = p.y * TILE + TILE/2;
                    this.ctx.beginPath();
                    this.ctx.arc(opx, opy, 10, 0, Math.PI*2);
                    this.ctx.fillStyle = "cyan";
                    this.ctx.fill();
                    this.ctx.fillStyle = "white";
                    this.ctx.font = "10px monospace";
                    this.ctx.fillText(p.name, opx-10, opy-15);
                }
            }
        }
    },
    
    drawTile: function(x, y, type, size) {
        const ctx = this.ctx;
        const px = x * size;
        const py = y * size;
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#1a331a";
        ctx.strokeRect(px, py, size, size);

        // Detail Rendering
        ctx.fillStyle = "#001100"; // Default Ground
        if(type === 'W') ctx.fillStyle = "#001133"; // Water
        if(type === 'M') ctx.fillStyle = "#1a1a1a"; // Mountain
        if(type === '#') ctx.fillStyle = "#0d1a0d"; // Wall/Road
        if(type === '~') ctx.fillStyle = "#0f2405"; // Swamp Water
        
        ctx.fillRect(px+1, py+1, size-2, size-2);

        // Symbols
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "24px monospace";
        
        if(type === 'C') { ctx.fillStyle = "#ffff00"; ctx.fillText("🏙️", px+size/2, py+size/2); }
        else if(type === 'V') { ctx.fillStyle = "#00ffff"; ctx.fillText("⚙️", px+size/2, py+size/2); }
        else if(type === 'S') { ctx.fillStyle = "#aaaaaa"; ctx.fillText("🏚️", px+size/2, py+size/2); }
        else if(type === 'H') { ctx.fillStyle = "#8b4513"; ctx.fillText("🕳️", px+size/2, py+size/2); }
        else if(type === '+') { ctx.fillStyle = "#ff0000"; ctx.fillText("🏥", px+size/2, py+size/2); }
        else if(type === '$') { ctx.fillStyle = "#ffd700"; ctx.fillText("💰", px+size/2, py+size/2); }
        else if(type === '&') { ctx.fillStyle = "#cccccc"; ctx.fillText("🛠️", px+size/2, py+size/2); }
        else if(type === 't') { ctx.fillStyle = "#006600"; ctx.fillText("🌲", px+size/2, py+size/2); }
        else if(type === 'T') { ctx.fillStyle = "#00ff00"; ctx.fillText("🌳", px+size/2, py+size/2); } // Big Tree
        else if(type === '"') { ctx.fillStyle = "#556b2f"; ctx.fillText("🌾", px+size/2, py+size/2); } // Grass
        else if(type === '=') { ctx.fillStyle = "#555"; ctx.fillRect(px+5, py+size/2-5, size-10, 10); } // Bridge
        else if(type === 'U') { ctx.fillStyle = "#333"; ctx.fillText("🚇", px+size/2, py+size/2); } // Tunnel
        else if(type === 'x') { ctx.fillStyle = "#8b4513"; ctx.fillText("🦴", px+size/2, py+size/2); } // Bones
        else if(type === 'o') { ctx.fillStyle = "#666"; ctx.beginPath(); ctx.arc(px+size/2, py+size/2, 5, 0, Math.PI*2); ctx.fill(); } // Stone
        else if(type === '#') { ctx.fillStyle = "#444"; ctx.fillRect(px+10, py+10, size-20, size-20); } // Wall Block

        // Border Arrows
        ctx.font = "20px monospace";
        ctx.fillStyle = "#1aff1a";
        if(type === '>') ctx.fillText("▶", px+size/2, py+size/2);
        if(type === '<') ctx.fillText("◀", px+size/2, py+size/2);
        if(type === '^') ctx.fillText("▲", px+size/2, py+size/2);
        if(type === 'v') ctx.fillText("▼", px+size/2, py+size/2);
    },

    // Logic
    move: function(dx, dy) {
        if(this.state.view !== 'map') return;
        
        // Calculate new pos
        let nx = this.state.player.x + dx;
        let ny = this.state.player.y + dy;
        
        // Update Dir
        if(dx === 1) this.state.player.dir = 0;
        if(dy === 1) this.state.player.dir = 1;
        if(dx === -1) this.state.player.dir = 2;
        if(dy === -1) this.state.player.dir = 3;

        // Check Sector Bounds (World Travel)
        if(nx < 0) { this.changeSector(-1, 0, 9, ny); return; }
        if(nx > 9) { this.changeSector(1, 0, 0, ny); return; }
        if(ny < 0) { this.changeSector(0, -1, nx, 9); return; }
        if(ny > 9) { this.changeSector(0, 1, nx, 0); return; }

        // Check Collision
        if(this.isBlocked(nx, ny)) {
            UI.shakeView();
            return;
        }

        // Move
        this.state.player.x = nx;
        this.state.player.y = ny;
        this.renderStaticMap();
        
        // Check POIs
        this.checkInteraction(nx, ny);
    },
    
    isBlocked: function(x, y) {
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const map = this.state.explored[secKey];
        if(!map) return true;
        const t = map[y][x];
        // Blocking types
        return ['W', 'M', 't', 'T', '#'].includes(t);
    },

    changeSector: function(dx, dy, targetX, targetY) {
        this.state.sector.x += dx;
        this.state.sector.y += dy;
        
        // World Bounds Wrap (Optional, or clamp)
        if(this.state.sector.x < 0) this.state.sector.x = 0; // Boundary
        if(this.state.sector.y < 0) this.state.sector.y = 0;
        if(this.state.sector.x > 9) this.state.sector.x = 9;
        if(this.state.sector.y > 9) this.state.sector.y = 9;
        
        // New Pos
        this.state.player.x = targetX;
        this.state.player.y = targetY;
        
        // Find safe spot if landing on block
        if(this.isBlocked(targetX, targetY)) {
             const safe = this.findSafeSpawn();
             this.state.player.x = safe.x;
             this.state.player.y = safe.y;
        }
        
        // Register Visited
        const key = `${this.state.sector.x},${this.state.sector.y}`;
        if(!this.state.visitedSectors.includes(key)) {
            this.state.visitedSectors.push(key);
            // Scan for POIs
            const map = WorldGen.createSector(this.state.sector.x, this.state.sector.y);
            // Logic to add POI to world map if found
            for(let y=0; y<10; y++) {
                for(let x=0; x<10; x++) {
                    if(['C','V','S'].includes(map[y][x])) {
                         if(!this.state.worldPOIs.find(p => p.x === this.state.sector.x && p.y === this.state.sector.y)) {
                             this.state.worldPOIs.push({x: this.state.sector.x, y: this.state.sector.y, type: map[y][x]});
                         }
                    }
                }
            }
        }
        
        this.saveGame();
        this.renderStaticMap();
        UI.log(`Reise nach Sektor [${this.state.sector.x},${this.state.sector.y}]`, "text-cyan-400");
    },
    
    findSafeSpawn: function() {
        // Spiral Search for empty spot
        const cx = 5, cy = 5;
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const map = this.state.explored[secKey] || WorldGen.createSector(this.state.sector.x, this.state.sector.y);
        
        // Simple search
        for(let r=0; r<6; r++) {
            for(let y=cy-r; y<=cy+r; y++) {
                for(let x=cx-r; x<=cx+r; x++) {
                    if(x>=0 && x<10 && y>=0 && y<10) {
                        if(!['W','M','t','T','#'].includes(map[y][x])) return {x,y};
                    }
                }
            }
        }
        return {x:4, y:4}; // Fallback
    },
    
    isValidSpawn: function(x, y) {
        if(x<0 || x>9 || y<0 || y>9) return false;
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        if(!this.state.explored || !this.state.explored[secKey]) return true;
        const t = this.state.explored[secKey][y][x];
        return !['W','M','t','T','#','V','G'].includes(t);
    },

    checkInteraction: function(x, y) {
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const map = this.state.explored[secKey];
        const t = map[y][x];
        
        if(t === 'C' || t === '$' || t === '+' || t === '&') {
             UI.toggleView('city');
        } else if (t === 'V') {
             UI.enterVault();
        } else if (t === 'S' || t === 'H') {
             UI.showDungeonWarning(() => this.enterDungeon(t));
        } else {
             // Random Encounter?
             if(Math.random() < 0.05) this.triggerCombat();
        }
    },

    triggerCombat: function() {
        // Simple Combat Trigger
        const biome = WorldGen.getSectorBiome(this.state.sector.x, this.state.sector.y);
        let possible = [];
        for(let k in this.monsters) {
             // Filter by biome/level logic (simplified)
             possible.push(this.monsters[k]);
        }
        const enemy = possible[Math.floor(Math.random()*possible.length)];
        this.state.enemy = JSON.parse(JSON.stringify(enemy)); // Clone
        this.state.enemy.maxHp = this.state.enemy.hp;
        UI.toggleView('combat');
    },
    
    enterDungeon: function(type) {
        UI.log("Betrete Dungeon...", "text-red-500");
        // Reuse combat view as dungeon placeholder or generic
        this.triggerCombat(); 
    },

    // --- SYSTEMS ---
    addItem: function(id, count) {
        const existing = this.state.inventory.find(i => i.id === id);
        if(existing) existing.count += count;
        else this.state.inventory.push({id: id, count: count});
        
        UI.log(`Item erhalten: ${count}x ${this.items[id] ? this.items[id].name : id}`);
        
        // NEW: Flag for UI Glow
        this.state.hasNewItems = true;
        
        this.saveGame();
    },

    useItem: function(id) {
        const item = this.items[id];
        const entry = this.state.inventory.find(i => i.id === id);
        if(!entry || entry.count <= 0) return;

        if(item.type === 'consumable') {
            if(item.effect === 'heal') {
                this.state.hp = Math.min(this.state.maxHp, this.state.hp + item.val);
                UI.log(`${item.name} benutzt. +${item.val} HP.`);
            }
            entry.count--;
        } else if (item.type === 'weapon') {
            const old = this.state.equip.weapon;
            this.state.equip.weapon = item;
            UI.log(`${item.name} ausgerüstet.`);
            // Swap logic: put old back? Simplified: Old is just overwritten in slot, ideally put back to inv if unique.
            // For now: Weapons don't consume count, just 'equip'. 
            // Better: 'Equip' implies it is the active one.
        } else if (item.type === 'body') {
            this.state.equip.body = item;
            UI.log(`${item.name} angelegt.`);
        }
        
        this.saveGame();
        if(UI.renderInventory) UI.renderInventory();
        if(UI.update) UI.update();
    },
    
    craftItem: function(recipeId) {
        const r = this.recipes.find(rec => rec.id === recipeId);
        if(!r) return;
        
        // Check Req
        for(let reqId in r.req) {
            const entry = this.state.inventory.find(i => i.id === reqId);
            if(!entry || entry.count < r.req[reqId]) {
                UI.log("Nicht genug Material!", "text-red-500");
                return;
            }
        }
        
        // Consume
        for(let reqId in r.req) {
            const entry = this.state.inventory.find(i => i.id === reqId);
            entry.count -= r.req[reqId];
        }
        
        // Give Output
        if(r.out === 'AMMO') {
            this.state.ammo += 15;
            UI.log("Munition hergestellt (15 Stk).");
        } else {
            this.addItem(r.out, 1);
        }
        
        if(UI.renderCrafting) UI.renderCrafting();
    },
    
    buyItem: function(id) {
        const item = this.items[id];
        if(this.state.caps >= item.cost) {
            this.state.caps -= item.cost;
            this.addItem(id, 1);
            if(UI.renderShop) UI.renderShop(document.getElementById('city-options')); // Refresh shop UI
        } else {
            UI.log("Nicht genug Kronkorken!", "text-red-500");
        }
    },
    
    buyAmmo: function() {
        if(this.state.caps >= 10) {
            this.state.caps -= 10;
            this.state.ammo += 10;
            UI.log("10 Munition gekauft.");
            this.saveGame();
            if(UI.update) UI.update();
        }
    },
    
    heal: function() {
        if(this.state.caps >= 25) {
            this.state.caps -= 25;
            this.state.hp = this.state.maxHp;
            UI.log("Vollständig geheilt.");
            this.saveGame();
            if(UI.update) UI.update();
        }
    },
    
    rest: function() {
        this.state.hp = this.state.maxHp;
        UI.log("Ausgeruht. HP wiederhergestellt.");
        this.saveGame();
        if(UI.update) UI.update();
    },

    // Stats
    gainExp: function(amount) {
        this.state.xp += amount;
        const next = this.expToNextLevel(this.state.lvl);
        if(this.state.xp >= next) {
            this.state.lvl++;
            this.state.xp -= next;
            this.state.statPoints++;
            this.state.maxHp += 10;
            this.state.hp = this.state.maxHp;
            UI.log(`LEVEL UP! Du bist nun Level ${this.state.lvl}.`, "text-yellow-400 blink-red");
        }
        this.saveGame();
    },
    
    expToNextLevel: function(lvl) {
        return Math.floor(100 * Math.pow(1.5, lvl - 1));
    },
    
    upgradeStat: function(stat) {
        if(this.state.statPoints > 0) {
            this.state.stats[stat]++;
            this.state.statPoints--;
            UI.log(`${stat} verbessert!`);
            this.saveGame();
            if(UI.renderChar) UI.renderChar();
        }
    },

    getStat: function(key) {
        let val = this.state.stats[key] || 1;
        if(this.state.equip.body && this.state.equip.body.bonus && this.state.equip.body.bonus[key]) {
            val += this.state.equip.body.bonus[key];
        }
        return val;
    },
    
    fixMapBorders: function() {
        if(!this.state.explored) return;
        // Simple iteration to ensure arrows exist at borders
        // (Simplified logic here, assumes correct generation)
    },

    saveGame: function(manual=false) {
        if(typeof Network !== 'undefined') {
            Network.save(this.state, this.state.slot).then(() => {
                if(manual) UI.log("Spiel gespeichert.", "text-green-500");
            });
        }
    }
};
