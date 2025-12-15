const Game = {
    TILE: 30, MAP_W: 40, MAP_H: 40,
    
    colors: { 
        'V':'#39ff14', // Vault
        'C':'#eab308', // City Hub (Händler)
        'G':'#00ffff', // Sektor-Tor
        'S':'#ff0000', // Supermarkt (Dungeon)
        'H':'#4a4a4a', // Höhle (Dungeon) - NEU
        
        '.':'#5d5345', // Ödland
        '_':'#eecfa1', // Wüste
        ',':'#1a3300', // Dschungel
        '=':'#333333', // Straße
        
        'T':'#1a4d1a', // Baum
        'R':'#5c544d', // Stein
        '~':'#224f80', // Wasser
        'B':'#1a1a1a', // Gebäude
        '#':'#000000'  // Wand
    },

    // ERWEITERTE MONSTER LISTE
    monsters: {
        moleRat: { name: "Maulwurfsratte", hp: 25, dmg: 4, xp: [15, 25], loot: 3, minLvl: 1 },
        radRoach: { name: "Rad-Kakerlake", hp: 15, dmg: 2, xp: [10, 15], loot: 1, minLvl: 1 },
        raider: { name: "Raider", hp: 60, dmg: 12, loot: 20, xp: [50, 70], minLvl: 2 },
        ghoul: { name: "Wilder Ghul", hp: 50, dmg: 10, loot: 5, xp: [40, 60], minLvl: 2 }, // NEU
        radScorpion: { name: "Radskorpion", hp: 90, dmg: 18, loot: 15, xp: [80, 100], minLvl: 3 }, // NEU
        mutantRose: { name: "Mutanten-Pflanze", hp: 45, dmg: 15, loot: 15, xp: [45, 60], minLvl: 1 },
        superMutant: { name: "Supermutant", hp: 150, dmg: 25, loot: 40, xp: [150, 200], minLvl: 5 }, // NEU
        deathclaw: { name: "Todesklaue", hp: 350, dmg: 60, loot: 150, xp: [500, 700], minLvl: 8 } // HÄRTER & SELTENER
    },

    items: {
        fists: { name: "Fäuste", slot: 'weapon', baseDmg: 2, bonus: {}, cost: 0, requiredLevel: 0, isRanged: false },
        vault_suit: { name: "Vault-Anzug", slot: 'body', bonus: { END: 1 }, cost: 0, requiredLevel: 0 },
        knife: { name: "Messer", slot: 'weapon', baseDmg: 6, bonus: { STR: 1 }, cost: 15, requiredLevel: 1, isRanged: false },
        pistol: { name: "10mm Pistole", slot: 'weapon', baseDmg: 14, bonus: { AGI: 1 }, cost: 50, requiredLevel: 1, isRanged: true },
        leather_armor: { name: "Lederharnisch", slot: 'body', bonus: { END: 2 }, cost: 30, requiredLevel: 1 },
        shotgun: { name: "Kampfschrotflinte", slot: 'weapon', baseDmg: 22, bonus: { STR: 1 }, cost: 120, requiredLevel: 3, isRanged: true }, // NEU
        laser_rifle: { name: "Laser-Gewehr", slot: 'weapon', baseDmg: 30, bonus: { PER: 2 }, cost: 300, requiredLevel: 5, isRanged: true },
        combat_armor: { name: "Kampf-Rüstung", slot: 'body', bonus: { END: 4 }, cost: 150, requiredLevel: 5 }
    },

    state: null, worldData: {}, ctx: null, loopId: null, camera: { x: 0, y: 0 },
    cacheCanvas: null, cacheCtx: null,

    init: function() {
        this.worldData = {};
        this.initCache();

        const startSecX = Math.floor(Math.random() * 8);
        const startSecY = Math.floor(Math.random() * 8);

        this.state = {
            sector: {x: startSecX, y: startSecY}, 
            startSector: {x: startSecX, y: startSecY},
            player: {x: 20, y: 20},
            stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 },
            equip: { weapon: this.items.fists, body: this.items.vault_suit },
            hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0,
            view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, explored: {}, 
            tempStatIncrease: {}, buffEndTime: 0,
            quests: [ { id: "q1", title: "Der Weg nach Hause", text: "Du hast die Vault verlassen.\nErkunde die Welt. Suche Städte ('C') für Handel und Höhlen ('H') für Beute.", read: false } ],
            startTime: Date.now()
        };
        
        this.state.hp = this.calculateMaxHP(this.getStat('END'));
        this.state.maxHp = this.state.hp;
        
        this.loadSector(this.state.sector.x, this.state.sector.y);
        
        UI.switchView('map').then(() => {
            if(UI.els.gameOver) UI.els.gameOver.classList.add('hidden');
            UI.log(`System gestartet. Sektor ${startSecX},${startSecY}.`, "text-green-400");
            UI.log("TIPP: Städte sind gelb 'C', Höhlen grau 'H'.", "text-yellow-400");
        });
    },

    initCache: function() {
        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = this.MAP_W * this.TILE;
        this.cacheCanvas.height = this.MAP_H * this.TILE;
        this.cacheCtx = this.cacheCanvas.getContext('2d');
    },

    calculateMaxHP: function(end) { return 100 + (end - 5) * 10; },
    getStat: function(k) {
        let val = this.state.stats[k] || 0;
        for(let slot in this.state.equip) if(this.state.equip[slot]?.bonus[k]) val += this.state.equip[slot].bonus[k];
        if(this.state.tempStatIncrease.key === k) val += 1;
        if(Date.now() < this.state.buffEndTime) val += Math.floor(this.state.lvl * 0.8);
        return val;
    },
    expToNextLevel: function(l) { return 100 * l; },

    gainExp: function(amount) {
        this.state.xp += amount;
        UI.log(`+${amount} EXP.`, 'text-blue-400');
        let need = this.expToNextLevel(this.state.lvl);
        while(this.state.xp >= need) {
            this.state.lvl++; this.state.statPoints++; this.state.xp -= need;
            need = this.expToNextLevel(this.state.lvl);
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            this.state.hp = this.state.maxHp;
            UI.log(`LEVEL UP! LVL ${this.state.lvl}`, 'text-yellow-400 font-bold');
        }
    },

    loadSector: function(sx, sy, isInterior = false, dungeonType = "market") {
        const key = `${sx},${sy}`;
        
        if (isInterior) {
            this.generateDungeon(dungeonType);
            this.state.zone = dungeonType === "cave" ? "Dunkle Höhle (Gefahr!)" : "Supermarkt Ruine (Gefahr!)";
            this.renderStaticMap(); 
            return;
        }

        if(!this.worldData[key]) {
            let biome = 'wasteland';
            // Biome Verteilung etwas natürlicher
            if (sx < 3 && sy < 3) biome = 'jungle';
            else if (sx > 5 && sy > 5) biome = 'desert';
            else if (Math.random() < 0.25) biome = 'city'; // 25% Chance auf Stadt-Sektor

            let gc = '.';
            if(biome === 'desert') gc = '_';
            if(biome === 'jungle') gc = ',';
            if(biome === 'city') gc = '=';

            let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill(gc));
            
            // Map Ränder blockieren
            for(let i=0; i<this.MAP_W; i++) { map[0][i] = '^'; map[this.MAP_H-1][i] = '^'; }
            for(let i=0; i<this.MAP_H; i++) { map[i][0] = '^'; map[i][this.MAP_W-1] = '^'; }

            // Inhalt generieren
            if (biome === 'wasteland') { 
                this.addClusters(map, 'T', 15, 2); 
                this.addClusters(map, 'R', 10, 2); 
            } 
            else if (biome === 'jungle') { 
                this.addClusters(map, 'T', 40, 4); 
                this.addClusters(map, '~', 10, 3); 
            }
            else if (biome === 'desert') { 
                this.addClusters(map, 'R', 20, 1); 
                // Höhlen in der Wüste!
                if(Math.random() > 0.3) this.addClusters(map, 'H', 2, 0); 
            }
            else if (biome === 'city') { 
                this.generateCityLayout(map); 
            }

            // Startpunkt = Vault
            if(sx === this.state.startSector.x && sy === this.state.startSector.y) {
                map[20][20] = 'V';
            }

            // Tore zu anderen Sektoren
            if(sy>0) this.clearGate(map, Math.floor(this.MAP_W/2), 0, 'G', gc);
            if(sy<9) this.clearGate(map, Math.floor(this.MAP_W/2), this.MAP_H-1, 'G', gc);
            if(sx>0) this.clearGate(map, 0, Math.floor(this.MAP_H/2), 'G', gc);
            if(sx<9) this.clearGate(map, this.MAP_W-1, Math.floor(this.MAP_H/2), 'G', gc);

            this.worldData[key] = { layout: map, explored: {}, biome: biome };
        }
        
        const data = this.worldData[key];
        this.state.currentMap = data.layout;
        this.state.explored = data.explored;
        
        let zn = "Ödland";
        if(data.biome === 'city') zn = "Ruinenstadt";
        if(data.biome === 'desert') zn = "Glühende Wüste";
        if(data.biome === 'jungle') zn = "Überwucherte Zone";
        this.state.zone = `${zn} (${sx},${sy})`;
        
        this.renderStaticMap();
    },

    renderStaticMap: function() {
        const ctx = this.cacheCtx; const ts = this.TILE;
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height);
        for(let y=0; y<this.MAP_H; y++) for(let x=0; x<this.MAP_W; x++) this.drawTile(ctx, x, y, this.state.currentMap[y][x]);
    },

    generateCityLayout: function(map) {
        // Straßen Raster
        for(let x=4; x<this.MAP_W; x+=8) for(let y=1; y<this.MAP_H-1; y++) map[y][x] = '=';
        for(let y=4; y<this.MAP_H; y+=8) for(let x=1; x<this.MAP_W-1; x++) map[y][x] = '=';
        
        // Gebäude füllen
        for(let y=1; y<this.MAP_H-1; y++) {
            for(let x=1; x<this.MAP_W-1; x++) {
                if(map[y][x] !== '=') {
                    map[y][x] = 'B';
                }
            }
        }
        
        // Features setzen (Markt & Dungeon)
        // 1. Markt ('C') - Sicherer Ort
        let placedC = false;
        while(!placedC) {
            let rx = Math.floor(Math.random() * (this.MAP_W-4)) + 2;
            let ry = Math.floor(Math.random() * (this.MAP_H-4)) + 2;
            if(map[ry][rx] === 'B') { map[ry][rx] = 'C'; placedC = true; }
        }

        // 2. Dungeon ('S') - Supermarkt/Ruine
        if(Math.random() < 0.7) { // 70% Chance auf Dungeon in City
            let placedS = false;
            let attempts = 0;
            while(!placedS && attempts < 100) {
                attempts++;
                let rx = Math.floor(Math.random() * (this.MAP_W-4)) + 2;
                let ry = Math.floor(Math.random() * (this.MAP_H-4)) + 2;
                if(map[ry][rx] === 'B') { map[ry][rx] = 'S'; placedS = true; }
            }
        }
    },

    generateDungeon: function(type) {
        let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('B')); // Wände/Dunkelheit
        let floorChar = type === "cave" ? '.' : '='; // Höhlenboden vs Fliesen
        
        // Simpler Raum-Generator
        for(let i=0; i<8; i++) {
            let rx = Math.floor(Math.random() * 20) + 5;
            let ry = Math.floor(Math.random() * 20) + 5;
            let w = Math.floor(Math.random() * 8) + 3;
            let h = Math.floor(Math.random() * 8) + 3;
            for(let y=ry; y<ry+h; y++) for(let x=rx; x<rx+w; x++) {
                if(y<this.MAP_H-1 && x<this.MAP_W-1) map[y][x] = floorChar;
            }
        }
        
        // Ausgang
        map[35][20] = 'G'; 
        
        this.state.currentMap = map;
        this.state.player.x = 20; 
        this.state.player.y = 34;
        
        // Alles erkunden im Dungeon (oder dunkel lassen, hier: dunkel lassen)
        this.state.explored = {}; 
        this.reveal(20, 34);
    },

    addClusters: function(map, type, count, size) {
        for(let k=0; k<count; k++) {
            let cx = Math.floor(Math.random() * (this.MAP_W-4)) + 2;
            let cy = Math.floor(Math.random() * (this.MAP_H-4)) + 2;
            if (size === 0) { // Einzelner Spot (z.B. Höhle)
                 if(['.', '_', ','].includes(map[cy][cx])) map[cy][cx] = type;
            } else {
                for(let y=cy-size; y<=cy+size; y++) {
                    for(let x=cx-size; x<=cx+size; x++) {
                        if(x>1 && x<this.MAP_W-2 && y>1 && y<this.MAP_H-2) {
                            if(Math.random() > 0.4 && Math.hypot(x-cx, y-cy) <= size) {
                                if(['.', '_', ','].includes(map[y][x])) map[y][x] = type;
                            }
                        }
                    }
                }
            }
        }
    },

    clearGate: function(map, x, y, char, ground) { map[y][x] = char; for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++) { let ny = y+dy, nx = x+dx; if(ny>0 && ny<this.MAP_H-1 && nx>0 && nx<this.MAP_W-1) if(map[ny][nx] !== 'V') map[ny][nx] = ground; } },
    initCanvas: function() { const cvs = document.getElementById('game-canvas'); if(!cvs) return; const viewContainer = document.getElementById('view-container'); cvs.width = viewContainer.offsetWidth; cvs.height = viewContainer.offsetHeight; this.ctx = cvs.getContext('2d'); if(this.loopId) cancelAnimationFrame(this.loopId); this.drawLoop(); },
    drawLoop: function() { if(this.state.view !== 'map' || this.state.isGameOver) return; this.draw(); this.loopId = requestAnimationFrame(() => this.drawLoop()); },
    
    draw: function() { 
        if(!this.ctx || !this.cacheCanvas) return; const ctx = this.ctx; const cvs = ctx.canvas; 
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width; const maxCamY = (this.MAP_H * this.TILE) - cvs.height; 
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX)); this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY)); 
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cvs.width, cvs.height); 
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        ctx.save(); ctx.translate(-this.camera.x, -this.camera.y); 
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; 
        const startX = Math.floor(this.camera.x / this.TILE); const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        for(let y=startY; y<endY; y++) { for(let x=startX; x<endX; x++) { if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { 
            const t = this.state.currentMap[y][x]; 
            if(['V', 'S', 'C', 'G', 'H'].includes(t)) { this.drawTile(ctx, x, y, t, pulse); } 
        } } } 
        const px = this.state.player.x * this.TILE + this.TILE/2; const py = this.state.player.y * this.TILE + this.TILE/2; 
        ctx.fillStyle = "#ff3914"; ctx.beginPath(); ctx.arc(px, py, this.TILE/3, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke(); 
        ctx.restore(); 
    },
    
    drawTile: function(ctx, x, y, type, pulse = 1) { 
        const ts = this.TILE; const px = x * ts; const py = y * ts; 
        let bg = this.colors['.']; 
        if(type === '_') bg = this.colors['_']; 
        if(type === ',') bg = this.colors[',']; 
        if(type === '=' || type === 'B' || type === 'S' || type === 'C') bg = this.colors['=']; 
        if(type === '#') bg = this.colors['#']; 
        
        if (type !== '~') { ctx.fillStyle = bg; ctx.fillRect(px, py, ts, ts); } 
        
        switch(type) { 
            case '^': ctx.fillStyle = "#222"; ctx.fillRect(px, py, ts, ts); ctx.strokeStyle = "#555"; ctx.strokeRect(px, py, ts, ts); break; 
            case 'T': ctx.fillStyle = "#1b5e20"; if(bg === this.colors['_']) ctx.fillStyle = "#2e7d32"; ctx.beginPath(); ctx.moveTo(px+ts/2, py+2); ctx.lineTo(px+ts-2, py+ts-2); ctx.lineTo(px+2, py+ts-2); ctx.fill(); break; 
            case '~': ctx.fillStyle = this.colors['~']; ctx.fillRect(px, py, ts, ts); break; 
            case 'R': ctx.fillStyle = this.colors['R']; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle="#333"; ctx.lineWidth=1; ctx.stroke(); break; 
            case 'B': ctx.fillStyle = "#333"; ctx.fillRect(px+2, py+2, ts-4, ts-4); ctx.fillStyle = "#000"; ctx.fillRect(px+5, py+5, ts-10, ts-10); break; 
            
            // Special Tiles
            case 'S': ctx.globalAlpha = pulse; ctx.fillStyle = "#ef4444"; ctx.fillRect(px, py, ts, ts); ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.font="bold 20px monospace"; ctx.fillText("M", px+10, py+28); break; 
            case 'C': ctx.globalAlpha = pulse; ctx.fillStyle = "#eab308"; ctx.beginPath(); ctx.moveTo(px+ts/2, py+2); ctx.lineTo(px+ts-2, py+ts-2); ctx.lineTo(px+2, py+ts-2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.font="bold 16px monospace"; ctx.fillText("$", px+11, py+22); break;
            case 'V': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['V']; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle="#fff"; ctx.stroke(); ctx.globalAlpha = 1; break; 
            case 'G': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['G']; ctx.fillRect(px+5, py+5, ts-10, ts-10); ctx.globalAlpha = 1; break; 
            case 'H': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['H']; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/2.5, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle="#000"; ctx.stroke(); ctx.globalAlpha = 1; break;
        } 
    },
    
    move: function(dx, dy) {
        if(this.state.inDialog || this.state.isGameOver) return;
        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        if(nx < 0 || nx >= this.MAP_W || ny < 0 || ny >= this.MAP_H) return;
        const tile = this.state.currentMap[ny][nx];
        
        if(['^', 'T', '~', 'R', 'B'].includes(tile)) { UI.log("Weg blockiert.", "text-gray-500"); return; }
        
        this.state.player.x = nx;
        this.state.player.y = ny;
        this.reveal(nx, ny);
        
        // INTERAKTIONEN
        if(tile === 'G') {
            if(this.state.zone.includes("Gefahr!")) { // Raus aus Dungeon
                this.loadSector(this.state.sector.x, this.state.sector.y);
                UI.log("Zurück an der Oberfläche.", "text-green-400");
                if(this.state.sector.x === this.state.startSector.x && this.state.sector.y === this.state.startSector.y) {
                    this.state.player.x = 20; this.state.player.y = 20;
                } else this.findSafeSpawn();
            } else this.changeSector(nx, ny);
        }
        else if(tile === 'S') UI.enterSupermarket();
        else if(tile === 'H') UI.enterCave(); // NEU
        else if(tile === 'C') UI.renderCity(); // NEU: Direkt in Stadt-Ansicht
        else if(tile === 'V') UI.enterVault();
        
        // Kampf-Chance (geringer in Städten)
        else if(Math.random() < (this.state.zone.includes("Ruinenstadt") ? 0.05 : 0.1) && tile !== 'C') {
            this.startCombat();
        }
        
        UI.update();
    },

    reveal: function(px, py) { for(let y=py-2; y<=py+2; y++) for(let x=px-2; x<=px+2; x++) if(x>=0 && x<this.MAP_W && y>=0 && y<this.MAP_H) this.state.explored[`${x},${y}`] = true; },
    changeSector: function(px, py) { let sx=this.state.sector.x, sy=this.state.sector.y; if(py===0) sy--; else if(py===this.MAP_H-1) sy++; if(px===0) sx--; else if(px===this.MAP_W-1) sx++; if(sx < 0 || sx > 7 || sy < 0 || sy > 7) { UI.log("Ende der Weltkarte.", "text-red-500"); this.state.player.x -= (px===0 ? -1 : 1); return; } this.state.sector = {x: sx, y: sy}; this.loadSector(sx, sy); if(py===0) this.state.player.y=this.MAP_H-2; else if(py===this.MAP_H-1) this.state.player.y=1; if(px===0) this.state.player.x=this.MAP_W-2; else if(px===this.MAP_W-1) this.state.player.x=1; this.findSafeSpawn(); this.reveal(this.state.player.x, this.state.player.y); UI.log(`Sektorwechsel: ${sx},${sy}`, "text-blue-400"); },
    findSafeSpawn: function() { const tile = this.state.currentMap[this.state.player.y][this.state.player.x]; if(['^', 'T', '~', 'R', 'B'].includes(tile)) { this.state.player.x = 20; this.state.player.y = 20; } },
    
    // VERBESSERTE KAMPF LOGIK
    startCombat: function() {
        let pool = [];
        let lvl = this.state.lvl;
        let biome = this.worldData[`${this.state.sector.x},${this.state.sector.y}`]?.biome || 'wasteland';
        let zone = this.state.zone;

        // Pool basierend auf Biome/Zone
        if(zone.includes("Supermarkt")) {
            pool = [this.monsters.raider, this.monsters.ghoul];
            if(lvl >= 4) pool.push(this.monsters.superMutant);
        } else if (zone.includes("Höhle")) {
            pool = [this.monsters.moleRat, this.monsters.radScorpion];
            if(lvl >= 3) pool.push(this.monsters.ghoul);
        } else if(biome === 'city') {
            pool = [this.monsters.raider, this.monsters.ghoul];
            if(lvl >= 5) pool.push(this.monsters.superMutant);
        } else if(biome === 'desert') {
            pool = [this.monsters.radScorpion, this.monsters.raider];
        } else { // Wasteland/Jungle
            pool = [this.monsters.moleRat, this.monsters.radRoach];
            if(biome === 'jungle') pool.push(this.monsters.mutantRose);
            if(lvl >= 2) pool.push(this.monsters.raider);
        }

        // Todesklaue: Special Chance ab Level 8 oder extrem selten (1%)
        if(lvl >= 8 && Math.random() < 0.1) pool = [this.monsters.deathclaw];
        else if (Math.random() < 0.01) pool = [this.monsters.deathclaw]; // Bad luck spawn

        const template = pool[Math.floor(Math.random()*pool.length)];
        let enemy = { ...template };
        
        const isLegendary = Math.random() < 0.15;
        if(isLegendary) {
            enemy.isLegendary = true;
            enemy.name = "Legendäre " + enemy.name;
            enemy.hp *= 2; enemy.maxHp = enemy.hp; enemy.dmg = Math.floor(enemy.dmg*1.5);
            enemy.loot *= 3; 
            if(Array.isArray(enemy.xp)) enemy.xp = [enemy.xp[0]*3, enemy.xp[1]*3];
        } else enemy.maxHp = enemy.hp;
        
        this.state.enemy = enemy;
        this.state.inDialog = true;
        
        if(Date.now() < this.state.buffEndTime) UI.log("⚡ S.P.E.C.I.A.L. OVERDRIVE aktiv!", "text-yellow-400");
        
        UI.switchView('combat').then(() => UI.renderCombat());
        UI.log(isLegendary ? "LEGENDÄRER GEGNER!" : "Kampf gestartet!", isLegendary ? "text-yellow-400" : "text-red-500");
    },

    getRandomXP: function(xpData) { if (Array.isArray(xpData)) return Math.floor(Math.random() * (xpData[1] - xpData[0] + 1)) + xpData[0]; return xpData; },
    combatAction: function(act) { if(this.state.isGameOver) return; if(!this.state.enemy) return; if(act === 'attack') { const wpn = this.state.equip.weapon; if(wpn.isRanged) { if(this.state.ammo > 0) this.state.ammo--; else { UI.log("Keine Munition! Fäuste.", "text-red-500"); this.state.equip.weapon = this.items.fists; this.enemyTurn(); return; } } if(Math.random() > 0.3) { const baseDmg = wpn.baseDmg || 2; const dmg = Math.floor(baseDmg + (this.getStat('STR') * 1.5)); this.state.enemy.hp -= dmg; UI.log(`Treffer: ${dmg} Schaden.`, "text-green-400"); if(this.state.enemy.hp <= 0) { this.state.caps += this.state.enemy.loot; UI.log(`Sieg! ${this.state.enemy.loot} Kronkorken.`, "text-yellow-400"); this.gainExp(this.getRandomXP(this.state.enemy.xp)); if(this.state.enemy.isLegendary) { UI.showDiceOverlay(); } else { this.endCombat(); } return; } } else UI.log("Verfehlt!", "text-gray-500"); this.enemyTurn(); } else if (act === 'flee') { if(Math.random() < 0.4 + (this.getStat('AGI')*0.05)) { UI.log("Geflohen.", "text-green-400"); this.endCombat(); } else { UI.log("Flucht gescheitert!", "text-red-500"); this.enemyTurn(); } } UI.update(); if(this.state.view === 'combat') UI.renderCombat(); },
    rollLegendaryLoot: function() { const result = Math.floor(Math.random() * 16) + 3; let msg = "", type = ""; if(result <= 7) { type = "CAPS"; const amt = this.state.lvl * 80; this.state.caps += amt; msg = `KRONKORKEN REGEN: +${amt} Caps!`; } else if (result <= 12) { type = "AMMO"; const amt = this.state.lvl * 25; this.state.ammo += amt; msg = `MUNITIONS JACKPOT: +${amt} Schuss!`; } else { type = "BUFF"; this.state.buffEndTime = Date.now() + 300000; msg = `S.P.E.C.I.A.L. OVERDRIVE! (5 Min)`; } return { val: result, msg: msg, type: type }; },
    enemyTurn: function() { if(this.state.enemy.hp <= 0) return; if(Math.random() < 0.8) { const armor = (this.getStat('END') * 0.5); const dmg = Math.max(1, Math.floor(this.state.enemy.dmg - armor)); this.state.hp -= dmg; UI.log(`Schaden erhalten: ${dmg}`, "text-red-400"); this.checkDeath(); } else UI.log("Gegner verfehlt.", "text-gray-500"); },
    checkDeath: function() { if(this.state.hp <= 0) { this.state.hp = 0; this.state.isGameOver = true; UI.update(); UI.showGameOver(); } },
    endCombat: function() { this.state.enemy = null; this.state.inDialog = false; UI.switchView('map'); },
    rest: function() { this.state.hp = this.state.maxHp; UI.log("Ausgeruht. HP voll.", "text-blue-400"); UI.update(); },
    heal: function() { if(this.state.caps >= 25) { this.state.caps -= 25; this.rest(); } else UI.log("Zu wenig Kronkorken.", "text-red-500"); },
    buyAmmo: function() { if(this.state.caps >= 10) { this.state.caps -= 10; this.state.ammo += 10; UI.log("Munition gekauft.", "text-green-400"); UI.update(); } else UI.log("Zu wenig Kronkorken.", "text-red-500"); },
    buyItem: function(key) { const item = this.items[key]; if(this.state.caps >= item.cost) { this.state.caps -= item.cost; this.state.equip[item.slot] = item; this.state.maxHp = this.calculateMaxHP(this.getStat('END')); if(this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp; UI.log(`Gekauft: ${item.name}`, "text-green-400"); UI.renderCity(); UI.update(); } else UI.log("Zu wenig Kronkorken.", "text-red-500"); },
    upgradeStat: function(key) { if(this.state.statPoints > 0) { this.state.stats[key]++; this.state.statPoints--; if(key === 'END') this.state.maxHp = this.calculateMaxHP(this.getStat('END')); UI.renderChar(); UI.update(); } }
};
