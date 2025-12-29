// [v0.9.1]
// Map Logic, Movement & Transitions
Object.assign(Game, {
    reveal: function(px, py) { 
        if(!this.state) return;
        if(!this.state.explored) this.state.explored = {}; 
        
        const radius = 2; 
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        
        for(let y = py - radius; y <= py + radius; y++) {
            for(let x = px - radius; x <= px + radius; x++) {
                if(x >= 0 && x < this.MAP_W && y >= 0 && y < this.MAP_H) {
                    const tileKey = `${secKey}_${x},${y}`;
                    this.state.explored[tileKey] = true;
                }
            }
        }
    },

    move: function(dx, dy) {
        if(!this.state || this.state.isGameOver || this.state.view !== 'map' || this.state.inDialog) return;
        
        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        
        if(nx < 0 || nx >= this.MAP_W || ny < 0 || ny >= this.MAP_H) {
            this.changeSector(nx, ny);
            return;
        }

        const tile = this.state.currentMap[ny][nx];
        const posKey = `${nx},${ny}`;

        // --- HIDDEN ITEM CHECK ---
        if(this.state.hiddenItems && this.state.hiddenItems[posKey]) {
            const itemId = this.state.hiddenItems[posKey];
            this.addToInventory(itemId, 1);
            // Safety check for display name
            const iName = (this.items && this.items[itemId]) ? this.items[itemId].name : itemId;
            UI.log(`Gefunden: ${iName}!`, "text-yellow-400 font-bold animate-pulse");
            UI.shakeView(); 
            delete this.state.hiddenItems[posKey]; 
        }

        // --- INTERAKTIONEN ---
        if (tile === '$') { UI.switchView('shop'); return; }
        if (tile === '&') { UI.switchView('crafting'); return; }
        if (tile === 'P') { UI.switchView('clinic'); return; }
        if (tile === 'E') { this.leaveCity(); return; }
        if (tile === 'X') { this.openChest(nx, ny); return; } 
        if (tile === 'v') { this.descendDungeon(); return; }

        // --- KOLLISION [v0.9.1] ---
        // 'M' (Berg) und 'T' (Baum) sind jetzt echte Hindernisse ohne Ausnahme. 'R' bleibt Ausnahme (Raider Base).
        if(['M', 'W', '#', 'U', 't', 'o', 'Y', '|', 'F', 'T', 'R'].includes(tile) && tile !== 'R') { 
            // Sonderfall: Suche im Objekt
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
        
        // --- BEWEGUNG ---
        this.state.player.x = nx;
        this.state.player.y = ny;
        
        if(dx === 1) this.state.player.rot = Math.PI / 2;
        if(dx === -1) this.state.player.rot = -Math.PI / 2;
        if(dy === 1) this.state.player.rot = Math.PI;
        if(dy === -1) this.state.player.rot = 0;

        this.reveal(nx, ny);
        if(typeof Network !== 'undefined') Network.sendHeartbeat();

        // --- POI EVENTS [v0.9.1] ---
        if(tile === 'V') { UI.switchView('vault'); return; }
        if(tile === 'C') { this.enterCity(); return; } 
        if(tile === 'S') { this.tryEnterDungeon("market"); return; }
        if(tile === 'H') { this.tryEnterDungeon("cave"); return; }
        // NEW IDS: A = Army, K = Kommunikation/Tower
        if(tile === 'A') { this.tryEnterDungeon("military"); return; }
        if(tile === 'R') { this.tryEnterDungeon("raider"); return; }
        if(tile === 'K') { this.tryEnterDungeon("tower"); return; }
        
        if(['.', ',', '_', ';', '"', '+', 'x', 'B'].includes(tile)) {
            if(Math.random() < 0.04) { 
                this.startCombat();
                return;
            }
        }
        UI.update();
    },

    changeSector: function(px, py) { 
        let sx=this.state.sector.x, sy=this.state.sector.y; 
        let newPx = px;
        let newPy = py;
        
        if(py < 0) { sy--; newPy = this.MAP_H - 1; newPx = this.state.player.x; }
        else if(py >= this.MAP_H) { sy++; newPy = 0; newPx = this.state.player.x; }
        if(px < 0) { sx--; newPx = this.MAP_W - 1; newPy = this.state.player.y; }
        else if(px >= this.MAP_W) { sx++; newPx = 0; newPy = this.state.player.y; }

        if(sx < 0 || sx >= this.WORLD_W || sy < 0 || sy >= this.WORLD_H) { UI.log("Ende der Weltkarte.", "text-red-500"); return; } 
        
        this.state.sector = {x: sx, y: sy}; 
        this.loadSector(sx, sy); 
        this.state.player.x = newPx;
        this.state.player.y = newPy;
        this.findSafeSpawn(); 
        this.reveal(this.state.player.x, this.state.player.y); 
        this.saveGame();
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

            if(rng() < 0.35 && !sectorPoiType) { 
                let type = null;
                const r = rng(); 
                if(r < 0.3) type = 'S'; 
                else if(r < 0.6) type = 'H';
                if(type) {
                    poiList.push({x: Math.floor(rng()*(this.MAP_W-6))+3, y: Math.floor(rng()*(this.MAP_H-6))+3, type: type});
                    sectorPoiType = type;
                }
            }

            let map;
            if(typeof WorldGen !== 'undefined') map = WorldGen.createSector(this.MAP_W, this.MAP_H, biome, poiList);
            else map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('.'));
            
            this.worldData[key] = { layout: map, biome: biome, poi: sectorPoiType };
        } 
        
        const data = this.worldData[key]; 
        this.state.currentMap = data.layout; 
        
        if(this.state.visitedSectors && !this.state.visitedSectors.includes(key)) {
            this.state.visitedSectors.push(key);
        }
        
        // --- SPAWN HIDDEN BLUEPRINTS ---
        this.state.hiddenItems = {}; 
        
        if(Math.random() < 0.3) { 
            let hiddenX, hiddenY;
            let attempts = 0;
            do {
                hiddenX = Math.floor(Math.random() * this.MAP_W);
                hiddenY = Math.floor(Math.random() * this.MAP_H);
                attempts++;
            } while(attempts < 100 && !this.isValidHiddenSpot(hiddenX, hiddenY));
            
            if(attempts < 100) {
                const bps = ['bp_ammo', 'bp_rusty_pistol', 'bp_machete', 'bp_leather_armor'];
                const bp = bps[Math.floor(Math.random() * bps.length)];
                
                // Safe check if item exists
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
        this.renderStaticMap(); 
        
        this.reveal(this.state.player.x, this.state.player.y);
    },

    isValidHiddenSpot: function(x, y) {
        const t = this.state.currentMap[y][x];
        return ['t', 'T', 'o', 'Y', '#', '"'].includes(t);
    },

    fixMapBorders: function(map, sx, sy) {
        if(sy === 0) { for(let i=0; i<this.MAP_W; i++) map[0][i] = '#'; }
        if(sy === this.WORLD_H - 1) { for(let i=0; i<this.MAP_W; i++) map[this.MAP_H-1][i] = '#'; }
        if(sx === 0) { for(let i=0; i<this.MAP_H; i++) map[i][0] = '#'; }
        if(sx === this.WORLD_W - 1) { for(let i=0; i<this.MAP_H; i++) map[i][this.MAP_W-1] = '#'; }
    },
    
    findSafeSpawn: function() {
        if(!this.state || !this.state.currentMap) return;
        const isSafe = (x, y) => {
            if(x < 0 || x >= this.MAP_W || y < 0 || y >= this.MAP_H) return false;
            const t = this.state.currentMap[y][x];
            // [v0.9.1] A and K are POIs, not unsafe obstacles per se, but better spawn near not on
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
        this.state.player.x = 20;
        this.state.player.y = 20;
    },

    tryEnterDungeon: function(type) {
        const key = `${this.state.sector.x},${this.state.sector.y}_${type}`;
        const cd = this.state.cooldowns ? this.state.cooldowns[key] : 0;
        if(cd && Date.now() < cd) {
             const minLeft = Math.ceil((cd - Date.now())/60000);
             UI.showDungeonLocked(minLeft);
             return;
        }
        UI.showDungeonWarning(() => this.enterDungeon(type));
    },

    enterDungeon: function(type, level=1) {
        if(level === 1) {
            this.state.savedPosition = { x: this.state.player.x, y: this.state.player.y };
            this.state.sectorExploredCache = JSON.parse(JSON.stringify(this.state.explored));
        }
        
        this.state.dungeonLevel = level;
        this.state.dungeonType = type;

        if(typeof WorldGen !== 'undefined') {
            WorldGen.setSeed((this.state.sector.x + 1) * (this.state.sector.y + 1) * Date.now() + level); 
            const data = WorldGen.generateDungeonLayout(this.MAP_W, this.MAP_H);
            this.state.currentMap = data.map;
            this.state.player.x = data.startX;
            this.state.player.y = data.startY;

            if(level < 3) {
                // Ensure there is an exit (stairs)
                for(let y=0; y<this.MAP_H; y++) {
                    for(let x=0; x<this.MAP_W; x++) {
                        if(this.state.currentMap[y][x] === 'X') {
                            this.state.currentMap[y][x] = 'v';
                        }
                    }
                }
            }
        }
        
        let typeName = "Dungeon";
        if(type === "cave") typeName = "Dunkle Höhle";
        if(type === "market") typeName = "Supermarkt Ruine";
        if(type === "military") typeName = "Alte Militärbasis";
        if(type === "raider") typeName = "Raider Festung";
        if(type === "tower") typeName = "Funkturm-Station";

        this.state.zone = `${typeName} (Ebene ${level})`;
        this.state.explored = {}; 
        this.reveal(this.state.player.x, this.state.player.y);
        
        this.renderStaticMap();
        UI.log(`${typeName} - Ebene ${level} betreten!`, "text-red-500 font-bold");
        UI.update();
    },

    descendDungeon: function() {
        this.enterDungeon(this.state.dungeonType, this.state.dungeonLevel + 1);
        UI.shakeView();
        UI.log("Du steigst tiefer hinab...", "text-purple-400 font-bold");
    },
    
    openChest: function(x, y) {
        this.state.currentMap[y][x] = 'B'; 
        this.renderStaticMap(); 
        
        const multiplier = this.state.dungeonLevel || 1;
        const caps = (Math.floor(Math.random() * 200) + 100) * multiplier;
        this.state.caps += caps;
        this.addToInventory('legendary_part', 1 * multiplier);
        
        // --- BLUEPRINT DROP CHANCE ---
        if(Math.random() < 0.4) { 
            const bps = ['bp_stimpack', 'bp_metal_armor', 'bp_ammo'];
            const bp = bps[Math.floor(Math.random() * bps.length)];
            
            // FIX: Check if items DB exists and item key exists
            if(this.items && this.items[bp]) {
                const rid = this.items[bp].recipeId;
                if(!this.state.knownRecipes.includes(rid)) {
                    this.addToInventory(bp, 1);
                    UI.log("BAUPLAN GEFUNDEN!", "text-cyan-400 font-bold");
                } else {
                    this.addToInventory('screws', 5);
                }
            } else {
                // Fallback if DB missing
                this.addToInventory('screws', 5);
            }
        }

        if(!this.state.cooldowns) this.state.cooldowns = {};
        const key = `${this.state.sector.x},${this.state.sector.y}_${this.state.dungeonType}`;
        this.state.cooldowns[key] = Date.now() + (10 * 60 * 1000); 

        UI.showDungeonVictory(caps, multiplier);
        
        if(Math.random() < 0.5) this.addToInventory('stimpack', 2);
        if(Math.random() < 0.5) this.addToInventory('nuclear_mat', 1);
        
        setTimeout(() => { this.leaveCity(); }, 4000);
    },

    enterCity: function() {
        this.state.savedPosition = { x: this.state.player.x, y: this.state.player.y };
        this.state.sectorExploredCache = JSON.parse(JSON.stringify(this.state.explored));

        if(typeof WorldGen !== 'undefined') {
            const map = WorldGen.generateCityLayout(this.MAP_W, this.MAP_H);
            this.state.currentMap = map;
        }
        this.state.zone = "Rusty Springs (Stadt)";
        this.state.player.x = 20;
        this.state.player.y = 38;
        this.state.player.rot = 0; 
        
        this.renderStaticMap();
        
        if(!this.state.explored) this.state.explored = {};
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        for(let y=0; y<this.MAP_H; y++) for(let x=0; x<this.MAP_W; x++) this.state.explored[`${secKey}_${x},${y}`] = true;
        
        UI.log("Betrete Rusty Springs...", "text-yellow-400");
        UI.update();
    },

    leaveCity: function() {
        if(this.state.savedPosition) {
            this.state.player.x = this.state.savedPosition.x;
            this.state.player.y = this.state.savedPosition.y;
            this.state.savedPosition = null;
        }
        this.state.dungeonLevel = 0; 
        
        this.loadSector(this.state.sector.x, this.state.sector.y);
        
        if(this.state.sectorExploredCache) {
            this.state.explored = this.state.sectorExploredCache;
            this.state.sectorExploredCache = null;
            this.reveal(this.state.player.x, this.state.player.y);
        }

        UI.log("Zurück im Ödland.", "text-green-400");
    }
});
