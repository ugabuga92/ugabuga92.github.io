const Game = {
    TILE: 30, MAP_W: 40, MAP_H: 40,
    
    colors: { 
        '.':'#0a1a0a', '_':'#1a150a', ',':'#051105', '=':'#111', '#':'#000', 
        'line_default': '#2a5a2a', 'line_wall': '#39ff14', 'line_water': '#224f80', 
        'V': '#39ff14', 'C': '#eab308', 'S': '#ff0000', 'G': '#00ffff', 'H': '#888888', 
        '^': '#111', 'v':'#111', '<':'#111', '>':'#111',
        'M': '#3e2723', 'W': '#0d47a1', 't': '#1b5e20', '#': '#424242', 'U': '#212121', '~': '#001133'
    },
    
    monsters: { 
        moleRat: { name: "Maulwurfsratte", hp: 25, dmg: 4, xp: [15, 25], loot: 3, minLvl: 1 }, 
        radRoach: { name: "Rad-Kakerlake", hp: 15, dmg: 2, xp: [10, 15], loot: 1, minLvl: 1 }, 
        raider: { name: "Raider", hp: 60, dmg: 12, loot: 20, xp: [50, 70], minLvl: 2 }, 
        ghoul: { name: "Wilder Ghul", hp: 50, dmg: 10, loot: 5, xp: [40, 60], minLvl: 2 }, 
        radScorpion: { name: "Radskorpion", hp: 90, dmg: 18, loot: 15, xp: [80, 100], minLvl: 3 }, 
        mutantRose: { name: "Mutanten-Pflanze", hp: 45, dmg: 15, loot: 15, xp: [45, 60], minLvl: 1 }, 
        superMutant: { name: "Supermutant", hp: 150, dmg: 25, loot: 40, xp: [150, 200], minLvl: 5 }, 
        deathclaw: { name: "Todesklaue", hp: 350, dmg: 60, loot: 150, xp: [500, 700], minLvl: 8 } 
    },
    
    items: { 
        stimpack: { name: "Stimpack", type: "consumable", effect: "heal", val: 50, cost: 25 },
        scrap: { name: "Schrott", type: "junk", cost: 0 },
        fists: { name: "Fäuste", slot: 'weapon', type: 'weapon', baseDmg: 2, bonus: {}, cost: 0, requiredLevel: 0, isRanged: false }, 
        vault_suit: { name: "Vault-Anzug", slot: 'body', type: 'body', bonus: { END: 1 }, cost: 0, requiredLevel: 0 }, 
        knife: { name: "Messer", slot: 'weapon', type: 'weapon', baseDmg: 6, bonus: { STR: 1 }, cost: 15, requiredLevel: 1, isRanged: false }, 
        pistol: { name: "10mm Pistole", slot: 'weapon', type: 'weapon', baseDmg: 14, bonus: { AGI: 1 }, cost: 50, requiredLevel: 1, isRanged: true }, 
        leather_armor: { name: "Lederharnisch", slot: 'body', type: 'body', bonus: { END: 2 }, cost: 30, requiredLevel: 1 }, 
        shotgun: { name: "Kampfschrotflinte", slot: 'weapon', type: 'weapon', baseDmg: 22, bonus: { STR: 1 }, cost: 120, requiredLevel: 3, isRanged: true }, 
        laser_rifle: { name: "Laser-Gewehr", slot: 'weapon', type: 'weapon', baseDmg: 30, bonus: { PER: 2 }, cost: 300, requiredLevel: 5, isRanged: true }, 
        combat_armor: { name: "Kampf-Rüstung", slot: 'body', type: 'body', bonus: { END: 4 }, cost: 150, requiredLevel: 5 } 
    },

    state: null, worldData: {}, ctx: null, loopId: null, camera: { x: 0, y: 0 }, cacheCanvas: null, cacheCtx: null,

    initCache: function() { this.cacheCanvas = document.createElement('canvas'); this.cacheCanvas.width = this.MAP_W * this.TILE; this.cacheCanvas.height = this.MAP_H * this.TILE; this.cacheCtx = this.cacheCanvas.getContext('2d'); }, 
    calculateMaxHP: function(end) { return 100 + (end - 5) * 10; }, 
    getStat: function(k) { if(!this.state || !this.state.stats) return 5; let val = this.state.stats[k] || 0; if(this.state.equip) { for(let slot in this.state.equip) { const item = this.state.equip[slot]; if(item && item.bonus && item.bonus[k]) val += item.bonus[k]; } } if(this.state.tempStatIncrease && this.state.tempStatIncrease.key === k) val += 1; if(Date.now() < this.state.buffEndTime) val += Math.floor(this.state.lvl * 0.8); return val; }, 
    expToNextLevel: function(l) { return 100 * l; }, 
    gainExp: function(amount) { this.state.xp += amount; UI.log(`+${amount} EXP.`, 'text-blue-400'); let need = this.expToNextLevel(this.state.lvl); while(this.state.xp >= need) { this.state.lvl++; this.state.statPoints++; this.state.xp -= need; need = this.expToNextLevel(this.state.lvl); this.state.maxHp = this.calculateMaxHP(this.getStat('END')); this.state.hp = this.state.maxHp; UI.log(`LEVEL UP! LVL ${this.state.lvl}`, 'text-yellow-400 font-bold'); } }, 
    teleportTo: function(targetSector, tx, ty) { this.state.sector = targetSector; this.loadSector(targetSector.x, targetSector.y); this.state.player.x = tx; this.state.player.y = ty; this.reveal(tx, ty); if(typeof Network !== 'undefined') Network.sendMove(tx, ty, this.state.lvl, this.state.sector); UI.update(); UI.log(`Teleport erfolgreich.`, "text-green-400"); }, 
    getPseudoRandomGate: function(val1, val2, max) { const seed = (val1 * 9301 + val2 * 49297) % 233280; return 3 + (seed % (max - 6)); },

    renderStaticMap: function() { const ctx = this.cacheCtx; const ts = this.TILE; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height); for(let y=0; y<this.MAP_H; y++) for(let x=0; x<this.MAP_W; x++) this.drawTile(ctx, x, y, this.state.currentMap[y][x]); },

    init: function(saveData, spawnTarget=null) {
        this.worldData = {};
        this.initCache();
        try {
            if (saveData) {
                this.state = saveData;
                if(!this.state.equip) this.state.equip = { weapon: this.items.fists, body: this.items.vault_suit };
                if(!this.state.equip.weapon) this.state.equip.weapon = this.items.fists;
                if(!this.state.equip.body) this.state.equip.body = this.items.vault_suit;
                if(!this.state.inventory) this.state.inventory = [];
                if(!this.state.view) this.state.view = 'map';
                UI.log(">> Spielstand geladen.", "text-cyan-400");
            } else {
                let startSecX = Math.floor(Math.random() * 8);
                let startSecY = Math.floor(Math.random() * 8);
                let startX = 20;
                let startY = 20;
                if (spawnTarget && spawnTarget.sector) {
                    startSecX = spawnTarget.sector.x;
                    startSecY = spawnTarget.sector.y;
                    startX = spawnTarget.x;
                    startY = spawnTarget.y;
                    UI.log(`>> Spawn bei Signal: ${startSecX},${startSecY}`, "text-yellow-400");
                }
                this.state = {
                    sector: {x: startSecX, y: startSecY}, startSector: {x: startSecX, y: startSecY}, 
                    player: {x: startX, y: startY, rot: 0},
                    stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 }, 
                    equip: { weapon: this.items.fists, body: this.items.vault_suit },
                    inventory: [], 
                    hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0, 
                    view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, explored: {}, 
                    tempStatIncrease: {}, buffEndTime: 0,
                    quests: [ { id: "q1", title: "Der Weg nach Hause", text: "Suche Zivilisation.", read: false } ], 
                    startTime: Date.now()
                };
                this.addToInventory('stimpack', 1);
                this.state.hp = this.calculateMaxHP(this.getStat('END')); 
                this.state.maxHp = this.state.hp;
                if(!spawnTarget) UI.log(">> Neuer Charakter erstellt.", "text-green-400");
                this.saveGame(); 
            }
            this.loadSector(this.state.sector.x, this.state.sector.y);
            UI.switchView('map').then(() => { 
                if(UI.els.gameOver) UI.els.gameOver.classList.add('hidden'); 
                if(typeof Network !== 'undefined') Network.sendMove(this.state.player.x, this.state.player.y, this.state.lvl, this.state.sector);
            });
        } catch(e) {
            console.error(e);
            if(UI.error) UI.error("GAME INIT FAIL: " + e.message);
        }
    },

    move: function(dx, dy) {
        if(this.state.isGameOver || this.state.view !== 'map' || this.state.inDialog) return;
        
        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        
        if(nx < 0 || nx >= this.MAP_W || ny < 0 || ny >= this.MAP_H) {
            this.changeSector(nx, ny);
            return;
        }

        const tile = this.state.currentMap[ny][nx];
        
        if(['M', 'W', '#', 'U', 't'].includes(tile)) { 
            UI.log("Weg blockiert.", "text-gray-500");
            return; 
        }
        
        this.state.player.x = nx;
        this.state.player.y = ny;
        
        // FIX: Rotation korrigiert für Dreieck das nach OBEN zeigt
        if(dx === 1) this.state.player.rot = Math.PI / 2;  // Rechts
        if(dx === -1) this.state.player.rot = -Math.PI / 2; // Links
        if(dy === 1) this.state.player.rot = Math.PI;      // Unten
        if(dy === -1) this.state.player.rot = 0;           // Oben

        this.reveal(nx, ny);
        
        if(typeof Network !== 'undefined') Network.sendMove(nx, ny, this.state.lvl, this.state.sector);

        if(tile === 'V') { UI.enterVault(); return; }
        if(tile === 'S') { UI.enterSupermarket(); return; }
        if(tile === 'H') { UI.enterCave(); return; }
        if(tile === 'C') { UI.switchView('city'); return; } 
        
        if(['.', ',', '_'].includes(tile)) {
            if(Math.random() < 0.04) { 
                this.startCombat();
                return;
            }
        }
        
        UI.update();
    },

    addToInventory: function(id, count=1) { if(!this.state.inventory) this.state.inventory = []; const existing = this.state.inventory.find(i => i.id === id); if(existing) existing.count += count; else this.state.inventory.push({id: id, count: count}); UI.log(`Erhalten: ${this.items[id].name} (${count})`, "text-green-400"); }, 
    useItem: function(id) { const itemDef = this.items[id]; const invItem = this.state.inventory.find(i => i.id === id); if(!invItem || invItem.count <= 0) return; if(itemDef.type === 'consumable') { if(itemDef.effect === 'heal') { const healAmt = itemDef.val; if(this.state.hp >= this.state.maxHp) { UI.log("Gesundheit bereits voll.", "text-gray-500"); return; } this.state.hp = Math.min(this.state.maxHp, this.state.hp + healAmt); UI.log(`Verwendet: ${itemDef.name}. +${healAmt} HP.`, "text-blue-400"); invItem.count--; } } else if (itemDef.type === 'weapon' || itemDef.type === 'body') { const oldItemName = this.state.equip[itemDef.slot].name; const oldItemKey = Object.keys(this.items).find(key => this.items[key].name === oldItemName); if(oldItemKey && oldItemKey !== 'fists' && oldItemKey !== 'vault_suit') { this.addToInventory(oldItemKey, 1); } this.state.equip[itemDef.slot] = itemDef; invItem.count--; UI.log(`Ausgerüstet: ${itemDef.name}`, "text-yellow-400"); if(itemDef.slot === 'body') { const oldMax = this.state.maxHp; this.state.maxHp = this.calculateMaxHP(this.getStat('END')); this.state.hp += (this.state.maxHp - oldMax); } } if(invItem.count <= 0) { this.state.inventory = this.state.inventory.filter(i => i.id !== id); } UI.update(); if(this.state.view === 'inventory') UI.renderInventory(); this.saveGame(); }, 
    saveGame: function(manual = false) { if(!this.state) return; if(manual) UI.log("Speichere...", "text-gray-500"); if(typeof Network !== 'undefined') Network.save(this.state); }, 

    loadSector: function(sx_in, sy_in, isInterior = false, dungeonType = "market") { 
        const sx = parseInt(sx_in);
        const sy = parseInt(sy_in);
        const key = `${sx},${sy}`; 
        
        const mapSeed = (sx + 1) * 5323 + (sy + 1) * 8237 + 9283;
        if(typeof WorldGen !== 'undefined') WorldGen.setSeed(mapSeed);
        const rng = () => { return typeof WorldGen !== 'undefined' ? WorldGen.rand() : Math.random(); };

        if (isInterior) { 
            this.generateDungeon(dungeonType); 
            this.state.zone = dungeonType === "cave" ? "Dunkle Höhle (Gefahr!)" : "Supermarkt Ruine (Gefahr!)"; 
            this.renderStaticMap(); 
            return; 
        } 
        
        if(!this.worldData[key]) { 
            let biome = 'wasteland'; 
            if (sx < 3 && sy < 3) biome = 'jungle'; 
            else if (sx > 5 && sy > 5) biome = 'desert'; 
            else if (rng() < 0.35) biome = 'city'; 
            
            let poiList = [];
            
            if(sx === this.state.startSector.x && sy === this.state.startSector.y) poiList.push({x:20, y:20, type:'V'}); 
            
            if(rng() < 0.35) { 
                let type = 'C'; const r = rng(); if(r < 0.3) type = 'S'; else if(r < 0.6) type = 'H';
                poiList.push({x: Math.floor(rng()*(this.MAP_W-6))+3, y: Math.floor(rng()*(this.MAP_H-6))+3, type: type});
            }

            if(sy > 0) poiList.push({x: this.getPseudoRandomGate(sx, sy, this.MAP_W), y: 0, type: 'G'}); 
            if(sy < 7) poiList.push({x: this.getPseudoRandomGate(sx, sy+1, this.MAP_W), y: this.MAP_H-1, type: 'G'}); 
            if(sx > 0) poiList.push({x: 0, y: this.getPseudoRandomGate(sy, sx, this.MAP_H), type: 'G'}); 
            if(sx < 7) poiList.push({x: this.MAP_W-1, y: this.getPseudoRandomGate(sy, sx+1, this.MAP_H), type: 'G'}); 

            if(typeof WorldGen !== 'undefined') {
                const map = WorldGen.createSector(this.MAP_W, this.MAP_H, biome, poiList);
                this.worldData[key] = { layout: map, explored: {}, biome: biome };
            } else {
                let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('.'));
                this.worldData[key] = { layout: map, explored: {}, biome: biome };
            }
        } 
        
        const data = this.worldData[key]; 
        this.state.currentMap = data.layout; 
        
        this.fixMapBorders(this.state.currentMap);
        this.state.explored = data.explored; 
        let zn = "Ödland"; if(data.biome === 'city') zn = "Ruinenstadt"; if(data.biome === 'desert') zn = "Glühende Wüste"; if(data.biome === 'jungle') zn = "Überwucherte Zone"; 
        this.state.zone = `${zn} (${sx},${sy})`; 
        
        this.findSafeSpawn();
        this.renderStaticMap(); 
    },

    findSafeSpawn: function() {
        const startX = this.state.player.x;
        const startY = this.state.player.y;
        if (this.isValidSpawn(startX, startY)) return; 
        for (let r = 1; r <= 6; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const nx = startX + dx;
                    const ny = startY + dy;
                    if (this.isValidSpawn(nx, ny)) {
                        this.state.player.x = nx;
                        this.state.player.y = ny;
                        return; 
                    }
                }
            }
        }
        this.state.player.x = 20; this.state.player.y = 20; 
    },

    isValidSpawn: function(x, y) {
        if(x < 1 || x >= this.MAP_W-1 || y < 1 || y >= this.MAP_H-1) return false;
        const t = this.state.currentMap[y][x];
        return ['.', '_', ',', '=', '#'].includes(t);
    },

    fixMapBorders: function(map) {
        for(let i=0; i<this.MAP_W; i++) { 
            if(map[0][i] !== 'G' && map[0][i] !== 'V') map[0][i] = '^'; 
            if(map[this.MAP_H-1][i] !== 'G') map[this.MAP_H-1][i] = 'v'; 
        } 
        for(let i=0; i<this.MAP_H; i++) { 
            if(map[i][0] !== 'G') map[i][0] = '<'; 
            if(map[i][this.MAP_W-1] !== 'G') map[i][this.MAP_W-1] = '>'; 
        } 
    },

    draw: function() { 
        if(!this.ctx || !this.cacheCanvas) return; 
        const ctx = this.ctx; const cvs = ctx.canvas; 
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width; const maxCamY = (this.MAP_H * this.TILE) - cvs.height; 
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX)); this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY)); 
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cvs.width, cvs.height); 
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        ctx.save(); ctx.translate(-this.camera.x, -this.camera.y); 
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; 
        const startX = Math.floor(this.camera.x / this.TILE); const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        for(let y=startY; y<endY; y++) { for(let x=startX; x<endX; x++) { if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { const t = this.state.currentMap[y][x]; if(['V', 'S', 'C', 'G', 'H', '^', 'v', '<', '>'].includes(t)) { this.drawTile(ctx, x, y, t, pulse); } } } } 
        if(typeof Network !== 'undefined' && Network.otherPlayers) { for(let pid in Network.otherPlayers) { const p = Network.otherPlayers[pid]; if(p.sector && (p.sector.x !== this.state.sector.x || p.sector.y !== this.state.sector.y)) continue; const ox = p.x * this.TILE + this.TILE/2; const oy = p.y * this.TILE + this.TILE/2; ctx.fillStyle = "#00ffff"; ctx.shadowBlur = 5; ctx.shadowColor = "#00ffff"; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI*2); ctx.fill(); ctx.font = "10px monospace"; ctx.fillStyle = "white"; ctx.fillText("P", ox+6, oy); ctx.shadowBlur = 0; } } 
        const px = this.state.player.x * this.TILE + this.TILE/2; const py = this.state.player.y * this.TILE + this.TILE/2; ctx.translate(px, py); ctx.rotate(this.state.player.rot); ctx.translate(-px, -py); ctx.fillStyle = "#39ff14"; ctx.shadowBlur = 10; ctx.shadowColor = "#39ff14"; ctx.beginPath(); ctx.moveTo(px, py - 8); ctx.lineTo(px + 6, py + 8); ctx.lineTo(px, py + 5); ctx.lineTo(px - 6, py + 8); ctx.fill(); ctx.shadowBlur = 0; ctx.restore(); 
    },

    drawTile: function(ctx, x, y, type, pulse = 1) { 
        const ts = this.TILE; const px = x * ts; const py = y * ts; 
        let bg = this.colors['.']; if(type === '_') bg = this.colors['_']; if(type === ',') bg = this.colors[',']; if(type === '=') bg = this.colors['=']; if(type === 'W') bg = this.colors['W']; if(type === 'M') bg = this.colors['M']; if(type === '#') bg = this.colors['#'];
        if (type !== '~' && !['^','v','<','>'].includes(type)) { ctx.fillStyle = bg; ctx.fillRect(px, py, ts, ts); } 
        if(!['^','v','<','>','M','W'].includes(type)) { ctx.strokeStyle = "rgba(40, 90, 40, 0.1)"; ctx.lineWidth = 1; ctx.strokeRect(px, py, ts, ts); } 
        
        // FIX: Ränder Pfeile korrigiert
        if(['^', 'v', '<', '>'].includes(type)) { 
            ctx.fillStyle = "#000"; ctx.fillRect(px, py, ts, ts); 
            ctx.fillStyle = "#1aff1a"; ctx.strokeStyle = "#000"; ctx.beginPath(); 
            if (type === '^') { ctx.moveTo(px + ts/2, py + 5); ctx.lineTo(px + ts - 5, py + ts - 5); ctx.lineTo(px + 5, py + ts - 5); } 
            else if (type === 'v') { ctx.moveTo(px + ts/2, py + ts - 5); ctx.lineTo(px + ts - 5, py + 5); ctx.lineTo(px + 5, py + 5); } 
            else if (type === '<') { ctx.moveTo(px + 5, py + ts/2); ctx.lineTo(px + ts - 5, py + 5); ctx.lineTo(px + ts - 5, py + ts - 5); } 
            else if (type === '>') { ctx.moveTo(px + ts - 5, py + ts/2); ctx.lineTo(px + 5, py + 5); ctx.lineTo(px + 5, py + ts - 5); } 
            ctx.fill(); ctx.stroke(); return; 
        }

        ctx.beginPath(); 
        switch(type) { 
            case 't': ctx.fillStyle = this.colors['t']; ctx.moveTo(px + ts/2, py + 2); ctx.lineTo(px + ts - 4, py + ts - 2); ctx.lineTo(px + 4, py + ts - 2); ctx.fill(); break;
            case 'M': ctx.fillStyle = "#5d4037"; ctx.moveTo(px + ts/2, py + 2); ctx.lineTo(px + ts, py + ts); ctx.lineTo(px, py + ts); ctx.fill(); break;
            case 'W': ctx.strokeStyle = "#4fc3f7"; ctx.lineWidth = 2; ctx.moveTo(px+5, py+15); ctx.lineTo(px+15, py+10); ctx.lineTo(px+25, py+15); ctx.stroke(); break;
            case '=': ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2; ctx.moveTo(px, py+5); ctx.lineTo(px+ts, py+5); ctx.moveTo(px, py+25); ctx.lineTo(px+ts, py+25); ctx.stroke(); break;
            case 'U': ctx.fillStyle = "#000"; ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI, true); ctx.fill(); break;
            case 'G': ctx.globalAlpha = pulse; ctx.strokeStyle = this.colors['G']; ctx.lineWidth = 3; ctx.moveTo(px+ts/2, py+4); ctx.lineTo(px+ts/2, py+26); ctx.moveTo(px+10, py+10); ctx.lineTo(px+ts/2, py+4); ctx.lineTo(px+20, py+10); ctx.stroke(); break;
            case 'V': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['V']; ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#000"; ctx.font="bold 12px monospace"; ctx.fillText("101", px+5, py+20); break; 
            case 'C': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['C']; ctx.fillRect(px+6, py+14, 18, 12); ctx.beginPath(); ctx.moveTo(px+4, py+14); ctx.lineTo(px+15, py+4); ctx.lineTo(px+26, py+14); ctx.fill(); break; 
            case 'S': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['S']; ctx.arc(px+ts/2, py+12, 6, 0, Math.PI*2); ctx.fill(); ctx.fillRect(px+10, py+18, 10, 6); break; 
            case 'H': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['H']; ctx.arc(px+ts/2, py+ts/2, ts/2.5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/4, 0, Math.PI*2); ctx.fill(); break; 
        } 
        ctx.globalAlpha = 1; 
    },
    
    generateCityLayout: function(map) {}, generateDungeon: function(type) { let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('B')); let floorChar = type === "cave" ? '.' : '='; for(let i=0; i<8; i++) { let rx = Math.floor(Math.random() * 20) + 5; let ry = Math.floor(Math.random() * 20) + 5; let w = Math.floor(Math.random() * 8) + 3; let h = Math.floor(Math.random() * 8) + 3; for(let y=ry; y<ry+h; y++) for(let x=rx; x<rx+w; x++) { if(y<this.MAP_H-1 && x<this.MAP_W-1) map[y][x] = floorChar; } } map[35][20] = 'G'; this.state.currentMap = map; this.state.player.x = 20; this.state.player.y = 34; this.state.explored = {}; this.reveal(20, 34); },
    addClusters: function(map, type, count, size) {}, clearGate: function(map, x, y, char, ground) {},
    initCanvas: function() { const cvs = document.getElementById('game-canvas'); if(!cvs) return; const viewContainer = document.getElementById('view-container'); cvs.width = viewContainer.offsetWidth; cvs.height = viewContainer.offsetHeight; this.ctx = cvs.getContext('2d'); if(this.loopId) cancelAnimationFrame(this.loopId); this.drawLoop(); },
    drawLoop: function() { if(this.state.view !== 'map' || this.state.isGameOver) return; this.draw(); this.loopId = requestAnimationFrame(() => this.drawLoop()); },
    reveal: function(px, py) { for(let y=py-2; y<=py+2; y++) for(let x=px-2; x<=px+2; x++) if(x>=0 && x<this.MAP_W && y>=0 && y<this.MAP_H) this.state.explored[`${x},${y}`] = true; },
    changeSector: function(px, py) { let sx=this.state.sector.x, sy=this.state.sector.y; if(py===0) sy--; else if(py===this.MAP_H-1) sy++; if(px===0) sx--; else if(px===this.MAP_W-1) sx++; if(sx < 0 || sx > 7 || sy < 0 || sy > 7) { UI.log("Ende der Weltkarte.", "text-red-500"); this.state.player.x -= (px===0 ? -1 : 1); return; } this.state.sector = {x: sx, y: sy}; this.loadSector(sx, sy); if(py===0) this.state.player.y=this.MAP_H-2; else if(py===this.MAP_H-1) this.state.player.y=1; if(px===0) this.state.player.x=this.MAP_W-2; else if(px===this.MAP_W-1) this.state.player.x=1; this.findSafeSpawn(); this.reveal(this.state.player.x, this.state.player.y); UI.log(`Sektorwechsel: ${sx},${sy}`, "text-blue-400"); },
    startCombat: function() { let pool = []; let lvl = this.state.lvl; let biome = this.worldData[`${this.state.sector.x},${this.state.sector.y}`]?.biome || 'wasteland'; let zone = this.state.zone; if(zone.includes("Supermarkt")) { pool = [this.monsters.raider, this.monsters.ghoul]; if(lvl >= 4) pool.push(this.monsters.superMutant); } else if (zone.includes("Höhle")) { pool = [this.monsters.moleRat, this.monsters.radScorpion]; if(lvl >= 3) pool.push(this.monsters.ghoul); } else if(biome === 'city') { pool = [this.monsters.raider, this.monsters.ghoul]; if(lvl >= 5) pool.push(this.monsters.superMutant); } else if(biome === 'desert') { pool = [this.monsters.radScorpion, this.monsters.raider]; } else { pool = [this.monsters.moleRat, this.monsters.radRoach]; if(biome === 'jungle') pool.push(this.monsters.mutantRose); if(lvl >= 2) pool.push(this.monsters.raider); } if(lvl >= 8 && Math.random() < 0.1) pool = [this.monsters.deathclaw]; else if (Math.random() < 0.01) pool = [this.monsters.deathclaw]; const template = pool[Math.floor(Math.random()*pool.length)]; let enemy = { ...template }; const isLegendary = Math.random() < 0.15; if(isLegendary) { enemy.isLegendary = true; enemy.name = "Legendäre " + enemy.name; enemy.hp *= 2; enemy.maxHp = enemy.hp; enemy.dmg = Math.floor(enemy.dmg*1.5); enemy.loot *= 3; if(Array.isArray(enemy.xp)) enemy.xp = [enemy.xp[0]*3, enemy.xp[1]*3]; } else enemy.maxHp = enemy.hp; this.state.enemy = enemy; this.state.inDialog = true; if(Date.now() < this.state.buffEndTime) UI.log("⚡ S.P.E.C.I.A.L. OVERDRIVE aktiv!", "text-yellow-400"); UI.switchView('combat').then(() => UI.renderCombat()); UI.log(isLegendary ? "LEGENDÄRER GEGNER!" : "Kampf gestartet!", isLegendary ? "text-yellow-400" : "text-red-500"); },
    getRandomXP: function(xpData) { if (Array.isArray(xpData)) return Math.floor(Math.random() * (xpData[1] - xpData[0] + 1)) + xpData[0]; return xpData; },
    combatAction: function(act) { 
        if(this.state.isGameOver) return; 
        if(!this.state.enemy) return; 
        if(this.state.enemy.hp <= 0) return;

        if(act === 'attack') { 
            const wpn = this.state.equip.weapon; 
            if(wpn.isRanged) { 
                if(this.state.ammo > 0) this.state.ammo--; 
                else { 
                    UI.log("Keine Munition! Fäuste.", "text-red-500"); 
                    this.state.equip.weapon = this.items.fists; 
                    this.enemyTurn(); 
                    return; 
                } 
            } 
            if(Math.random() > 0.3) { 
                const baseDmg = wpn.baseDmg || 2; 
                const dmg = Math.floor(baseDmg + (this.getStat('STR') * 1.5)); 
                this.state.enemy.hp -= dmg; 
                UI.log(`Treffer: ${dmg} Schaden.`, "text-green-400"); 
                if(this.state.enemy.hp <= 0) { 
                    this.state.caps += this.state.enemy.loot; 
                    UI.log(`Sieg! ${this.state.enemy.loot} Kronkorken.`, "text-yellow-400"); 
                    this.gainExp(this.getRandomXP(this.state.enemy.xp)); 
                    if(this.state.enemy.isLegendary) { 
                        UI.showDiceOverlay(); 
                    } else { 
                        this.endCombat(); 
                    } 
                    return; 
                } 
            } else UI.log("Verfehlt!", "text-gray-500"); 
            this.enemyTurn(); 
        } else if (act === 'flee') { 
            if(Math.random() < 0.4 + (this.getStat('AGI')*0.05)) { 
                UI.log("Geflohen.", "text-green-400"); 
                this.endCombat(); 
            } else { 
                UI.log("Flucht gescheitert!", "text-red-500"); 
                this.enemyTurn(); 
            } 
        } 
        UI.update(); 
        if(this.state.view === 'combat') UI.renderCombat(); 
    },
    rollLegendaryLoot: function() { const result = Math.floor(Math.random() * 16) + 3; let msg = "", type = ""; if(result <= 7) { type = "CAPS"; const amt = this.state.lvl * 80; this.state.caps += amt; msg = `KRONKORKEN REGEN: +${amt} Caps!`; } else if (result <= 12) { type = "AMMO"; const amt = this.state.lvl * 25; this.state.ammo += amt; msg = `MUNITIONS JACKPOT: +${amt} Schuss!`; } else { type = "BUFF"; this.state.buffEndTime = Date.now() + 300000; msg = `S.P.E.C.I.A.L. OVERDRIVE! (5 Min)`; } return { val: result, msg: msg, type: type }; },
    enemyTurn: function() { if(this.state.enemy.hp <= 0) return; if(Math.random() < 0.8) { const armor = (this.getStat('END') * 0.5); const dmg = Math.max(1, Math.floor(this.state.enemy.dmg - armor)); this.state.hp -= dmg; UI.log(`Schaden erhalten: ${dmg}`, "text-red-400"); this.checkDeath(); } else UI.log("Gegner verfehlt.", "text-gray-500"); },
    checkDeath: function() { if(this.state.hp <= 0) { this.state.hp = 0; this.state.isGameOver = true; if(typeof Network !== 'undefined') Network.deleteSave(); UI.update(); UI.showGameOver(); } },
    endCombat: function() { this.state.enemy = null; this.state.inDialog = false; UI.switchView('map'); this.saveGame(); },
    rest: function() { this.state.hp = this.state.maxHp; UI.log("Ausgeruht. HP voll.", "text-blue-400"); UI.update(); this.saveGame(); },
    heal: function() { if(this.state.caps >= 25) { this.state.caps -= 25; this.rest(); } else UI.log("Zu wenig Kronkorken.", "text-red-500"); },
    buyAmmo: function() { if(this.state.caps >= 10) { this.state.caps -= 10; this.state.ammo += 10; UI.log("Munition gekauft.", "text-green-400"); UI.update(); } else UI.log("Zu wenig Kronkorken.", "text-red-500"); },
    buyItem: function(key) { const item = this.items[key]; if(this.state.caps >= item.cost) { this.state.caps -= item.cost; this.addToInventory(key, 1); UI.log(`Gekauft: ${item.name}`, "text-green-400"); UI.renderCity(); UI.update(); this.saveGame(); } else { UI.log("Zu wenig Kronkorken.", "text-red-500"); } },
    hardReset: function() { 
        if(typeof Network !== 'undefined') Network.deleteSave(); 
        this.state = null; 
        location.reload(); 
    },
    upgradeStat: function(key) { if(this.state.statPoints > 0) { this.state.stats[key]++; this.state.statPoints--; if(key === 'END') this.state.maxHp = this.calculateMaxHP(this.getStat('END')); UI.renderChar(); UI.update(); this.saveGame(); } }
};
