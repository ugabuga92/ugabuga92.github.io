const Game = {
    TILE: 30, MAP_W: 40, MAP_H: 40,
    colors: { 
        'V':'#39ff14', // Vault (Schimmert)
        'C':'#eab308', // Stadt (Schimmert)
        'G':'#00ffff', // Tor (Schimmert)
        'S':'#ff0000', // Supermarkt (Schimmert)
        '.':'#111111', // Boden (Dunkler für Kontrast)
        '_':'#a05a2c', // Wüste (Sandbraun statt Gelb)
        ',':'#0f280f', // Gras
        '=':'#333333', // Straße
        'T':'#1a4d1a', // Baum
        'R':'#666666', // Stein (Heller mit Rand)
        '~':'#224f80', // Wasser
        'B':'#222222', // Gebäude
        '#':'#000000'  // Wand
    },

    monsters: {
        moleRat: { name: "Maulwurfsratte", hp: 30, dmg: 5, xp: [20, 30], loot: 5, minLvl: 1 },
        mutantRose: { name: "Mutanten Rose", hp: 45, dmg: 15, loot: 15, xp: [45, 60], minLvl: 1 },
        raider: { name: "Raider", hp: 70, dmg: 15, loot: 25, xp: [70, 90], minLvl: 2 },
        deathclaw: { name: "Todesklaue", hp: 200, dmg: 50, loot: 100, xp: [450, 550], minLvl: 5 }
    },

    items: {
        fists: { name: "Fäuste", slot: 'weapon', baseDmg: 2, bonus: {}, cost: 0, requiredLevel: 0, isRanged: false },
        vault_suit: { name: "Vault-Anzug", slot: 'body', bonus: { END: 1 }, cost: 0, requiredLevel: 0 },
        knife: { name: "Messer", slot: 'weapon', baseDmg: 6, bonus: { STR: 1 }, cost: 15, requiredLevel: 1, isRanged: false },
        pistol: { name: "10mm Pistole", slot: 'weapon', baseDmg: 14, bonus: { AGI: 1 }, cost: 50, requiredLevel: 1, isRanged: true },
        leather_armor: { name: "Lederharnisch", slot: 'body', bonus: { END: 2 }, cost: 30, requiredLevel: 1 },
        laser_rifle: { name: "Laser-Gewehr", slot: 'weapon', baseDmg: 25, bonus: { PER: 2 }, cost: 300, requiredLevel: 5, isRanged: true },
        combat_armor: { name: "Kampf-Rüstung", slot: 'body', bonus: { END: 4 }, cost: 150, requiredLevel: 5 }
    },

    state: null, worldData: {}, ctx: null, loopId: null, camera: { x: 0, y: 0 },
    cacheCanvas: null, cacheCtx: null,

    init: function() {
        this.worldData = {};
        this.initCache();

        // 1. ZUFÄLLIGER START SEKTOR
        const startSecX = Math.floor(Math.random() * 8);
        const startSecY = Math.floor(Math.random() * 8);

        this.state = {
            sector: {x: startSecX, y: startSecY}, 
            startSector: {x: startSecX, y: startSecY}, // Merken für Map Gen
            player: {x: 20, y: 20}, // Starten immer in der Mitte des Sektors
            stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 },
            equip: { weapon: this.items.fists, body: this.items.vault_suit },
            hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0,
            view: 'map', zone: 'Ödland (Vault Umgebung)', inDialog: false, isGameOver: false, explored: {}, 
            tempStatIncrease: {},
            buffEndTime: 0, // Zeitstempel für Overdrive
            quests: [ { id: "q1", title: "Der Weg nach Hause", text: "Du hast die Vault verlassen.\nDie Welt ist riesig und zufällig generiert.\nSuche Zivilisation.", read: false } ],
            startTime: Date.now()
        };
        
        this.state.hp = this.calculateMaxHP(this.getStat('END'));
        this.state.maxHp = this.state.hp;
        
        this.loadSector(this.state.sector.x, this.state.sector.y);
        
        UI.switchView('map').then(() => {
            if(UI.els.gameOver) UI.els.gameOver.classList.add('hidden');
            UI.log(`System gestartet. Sektor ${startSecX},${startSecY}.`, "text-green-400");
            UI.log("TIPP: 'V' ist die Vault - dein sicherer Hafen.", "text-yellow-400");
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
        
        // OVERDRIVE CHECK
        if(Date.now() < this.state.buffEndTime) {
            // Level * 0.8 Bonus
            val += Math.floor(this.state.lvl * 0.8);
        }
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

    loadSector: function(sx, sy, isInterior = false) {
        const key = `${sx},${sy}`;
        if (isInterior) {
            this.generateDungeon();
            this.state.zone = "Supermarkt (Gefahr!)";
            this.renderStaticMap(); 
            return;
        }
        if(!this.worldData[key]) {
            let biome = 'wasteland';
            if (sx < 3 && sy < 3) biome = 'jungle';
            else if (sx > 6 && sy > 6) biome = 'desert';
            else if (Math.random() < 0.3) biome = 'city';

            let gc = '.';
            if(biome === 'desert') gc = '_';
            if(biome === 'jungle') gc = ',';
            if(biome === 'city') gc = '=';

            let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill(gc));
            for(let i=0; i<this.MAP_W; i++) { map[0][i] = '^'; map[this.MAP_H-1][i] = '^'; }
            for(let i=0; i<this.MAP_H; i++) { map[i][0] = '^'; map[i][this.MAP_W-1] = '^'; }

            if (biome === 'wasteland') { this.addClusters(map, 'T', 15, 2); this.addClusters(map, 'R', 10, 2); } 
            else if (biome === 'jungle') { this.addClusters(map, 'T', 40, 4); this.addClusters(map, '~', 10, 3); }
            else if (biome === 'desert') { this.addClusters(map, 'R', 20, 1); if(Math.random() > 0.5) this.addClusters(map, 'T', 5, 1); }
            else if (biome === 'city') { this.generateCityLayout(map); }

            // 2. VAULT PLATZIERUNG
            // Wenn wir im Startsektor sind, platzieren wir die Vault bei 20,20
            if(sx === this.state.startSector.x && sy === this.state.startSector.y) {
                map[20][20] = 'V';
            }

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
        const ctx = this.cacheCtx;
        const ts = this.TILE;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height);

        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                this.drawTile(ctx, x, y, this.state.currentMap[y][x]);
            }
        }
    },

    // ... (generateCityLayout, generateDungeon, addClusters, clearGate bleiben gleich) ...
    generateCityLayout: function(map) {
        for(let x=4; x<this.MAP_W; x+=8) for(let y=1; y<this.MAP_H-1; y++) map[y][x] = '=';
        for(let y=4; y<this.MAP_H; y+=8) for(let x=1; x<this.MAP_W-1; x++) map[y][x] = '=';
        for(let y=1; y<this.MAP_H-1; y++) {
            for(let x=1; x<this.MAP_W-1; x++) {
                if(map[y][x] !== '=') map[y][x] = 'B';
                else if(Math.random() < 0.1) map[y][x] = 'R'; 
            }
        }
        let placed = false;
        let attempts = 0;
        while(!placed && attempts < 100) {
            attempts++;
            let rx = Math.floor(Math.random() * (this.MAP_W-4)) + 2;
            let ry = Math.floor(Math.random() * (this.MAP_H-4)) + 2;
            if(map[ry][rx] === 'B' && (map[ry+1][rx]==='=' || map[ry-1][rx]==='=')) { map[ry][rx] = 'S'; placed = true; }
        }
    },
    generateDungeon: function() {
        let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('B'));
        for(let y=10; y<30; y++) for(let x=10; x<30; x++) map[y][x] = '#';
        map[29][20] = 'G'; 
        this.state.currentMap = map;
        this.state.player.x = 20; this.state.player.y = 28;
        this.state.explored = {}; 
        for(let y=0; y<this.MAP_H; y++) for(let x=0; x<this.MAP_W; x++) this.state.explored[`${x},${y}`] = true;
    },
    addClusters: function(map, type, count, size) {
        for(let k=0; k<count; k++) {
            let cx = Math.floor(Math.random() * (this.MAP_W-4)) + 2;
            let cy = Math.floor(Math.random() * (this.MAP_H-4)) + 2;
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
    },
    clearGate: function(map, x, y, char, ground) {
        map[y][x] = char;
        for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++) {
            let ny = y+dy, nx = x+dx;
            if(ny>0 && ny<this.MAP_H-1 && nx>0 && nx<this.MAP_W-1) if(map[ny][nx] !== 'V') map[ny][nx] = ground;
        }
    },

    initCanvas: function() {
        const cvs = document.getElementById('game-canvas');
        if(!cvs) return;
        const viewContainer = document.getElementById('view-container');
        cvs.width = viewContainer.offsetWidth;
        cvs.height = viewContainer.offsetHeight;
        this.ctx = cvs.getContext('2d');
        if(this.loopId) cancelAnimationFrame(this.loopId);
        this.drawLoop();
    },

    drawLoop: function() {
        if(this.state.view !== 'map' || this.state.isGameOver) return;
        this.draw();
        this.loopId = requestAnimationFrame(() => this.drawLoop());
    },

    draw: function() {
        if(!this.ctx || !this.cacheCanvas) return;
        const ctx = this.ctx; const cvs = ctx.canvas;
        
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2);
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2);
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width;
        const maxCamY = (this.MAP_H * this.TILE) - cvs.height;
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX));
        this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY));

        ctx.fillStyle = "#000"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        ctx.drawImage(
            this.cacheCanvas, 
            this.camera.x, this.camera.y, cvs.width, cvs.height, 
            0, 0, cvs.width, cvs.height 
        );

        ctx.save(); 
        ctx.translate(-this.camera.x, -this.camera.y);

        // SCHIMMER EFFEKT BERECHNEN (Pulsieren)
        // Wert schwingt zwischen 0.5 und 1.0
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        
        // Besondere Tiles neu zeichnen mit Pulse
        const startX = Math.floor(this.camera.x / this.TILE);
        const startY = Math.floor(this.camera.y / this.TILE);
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1;
        const endY = startY + Math.ceil(cvs.height / this.TILE) + 1;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) {
                    const t = this.state.currentMap[y][x];
                    if(['V', 'S', 'C', 'G'].includes(t)) {
                        this.drawTile(ctx, x, y, t, pulse);
                    }
                }
            }
        }

        const px = this.state.player.x * this.TILE + this.TILE/2;
        const py = this.state.player.y * this.TILE + this.TILE/2;
        ctx.fillStyle = "#ff3914"; 
        ctx.beginPath(); ctx.arc(px, py, this.TILE/3, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();

        ctx.restore();
    },

    drawTile: function(ctx, x, y, type, pulse = 1) {
        const ts = this.TILE; const px = x * ts; const py = y * ts;
        let bg = this.colors['.'];
        if(type === '_') bg = this.colors['_'];
        if(type === ',') bg = this.colors[','];
        if(type === '=' || type === 'B' || type === 'S') bg = this.colors['='];
        if(type === '#') bg = this.colors['#'];

        if (type !== '~') { ctx.fillStyle = bg; ctx.fillRect(px, py, ts, ts); }

        // Hilfsfunktion für Helligkeit
        const applyPulse = (colorHex, p) => {
            // Simpel: Wir lassen es so, Canvas GlobalAlpha wäre einfacher
            ctx.globalAlpha = p;
        };

        switch(type) {
            case '^': ctx.fillStyle = "#222"; ctx.fillRect(px, py, ts, ts); ctx.strokeStyle = "#555"; ctx.strokeRect(px, py, ts, ts); break;
            case 'T': ctx.fillStyle = "#1b5e20"; if(bg === this.colors['_']) ctx.fillStyle = "#2e7d32"; ctx.beginPath(); ctx.moveTo(px+ts/2, py+2); ctx.lineTo(px+ts-2, py+ts-2); ctx.lineTo(px+2, py+ts-2); ctx.fill(); break;
            case '~': ctx.fillStyle = this.colors['~']; ctx.fillRect(px, py, ts, ts); break;
            case 'R': ctx.fillStyle = this.colors['R']; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle="#333"; ctx.lineWidth=1; ctx.stroke(); break;
            case 'B': ctx.fillStyle = "#333"; ctx.fillRect(px+2, py+2, ts-4, ts-4); ctx.fillStyle = "#000"; ctx.fillRect(px+5, py+5, ts-10, ts-10); break;
            
            // Schimmernde Objekte
            case 'S': 
                ctx.globalAlpha = pulse; ctx.fillStyle = "#ef4444"; ctx.fillRect(px, py, ts, ts); 
                ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.font="bold 20px monospace"; ctx.fillText("M", px+10, py+28); break;
            case 'V': 
                ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['V']; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle="#fff"; ctx.stroke(); ctx.globalAlpha = 1; break;
            case 'G': 
                ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['G']; ctx.fillRect(px+5, py+5, ts-10, ts-10); ctx.globalAlpha = 1; break;
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
        
        if(tile === 'G') {
            if(this.state.zone.includes("Supermarkt")) {
                this.loadSector(this.state.sector.x, this.state.sector.y);
                UI.log("Zurück an der Oberfläche.", "text-green-400");
                // Zurück zur Vault Position im Sektor
                if(this.state.sector.x === this.state.startSector.x && this.state.sector.y === this.state.startSector.y) {
                    this.state.player.x = 20; this.state.player.y = 20;
                } else this.findSafeSpawn();
            } else this.changeSector(nx, ny);
        }
        else if(tile === 'S') UI.enterSupermarket();
        else if(tile === 'V') UI.enterVault();
        else if(Math.random()<0.1 && tile !== 'S' && tile !== 'G') this.startCombat();
        UI.update();
    },

    reveal: function(px, py) {
        for(let y=py-2; y<=py+2; y++) for(let x=px-2; x<=px+2; x++) if(x>=0 && x<this.MAP_W && y>=0 && y<this.MAP_H) this.state.explored[`${x},${y}`] = true;
    },

    changeSector: function(px, py) {
        let sx=this.state.sector.x, sy=this.state.sector.y;
        if(py===0) sy--; else if(py===this.MAP_H-1) sy++;
        if(px===0) sx--; else if(px===this.MAP_W-1) sx++;
        if(sx < 0 || sx > 7 || sy < 0 || sy > 7) { UI.log("Ende der Weltkarte.", "text-red-500"); this.state.player.x -= (px===0 ? -1 : 1); return; }
        this.state.sector = {x: sx, y: sy};
        this.loadSector(sx, sy);
        if(py===0) this.state.player.y=this.MAP_H-2; else if(py===this.MAP_H-1) this.state.player.y=1;
        if(px===0) this.state.player.x=this.MAP_W-2; else if(px===this.MAP_W-1) this.state.player.x=1;
        this.findSafeSpawn();
        this.reveal(this.state.player.x, this.state.player.y);
        UI.log(`Sektorwechsel: ${sx},${sy}`, "text-blue-400");
    },
    
    findSafeSpawn: function() {
        // Falls wir zufällig genau auf einem Blocker landen beim Sektorwechsel
        let safe = false;
        // Kurzer Check, sonst teleport
        const tile = this.state.currentMap[this.state.player.y][this.state.player.x];
        if(['^', 'T', '~', 'R', 'B'].includes(tile)) {
             this.state.player.x = 20; this.state.player.y = 20; // Notfall mitte
        }
    },

    startCombat: function() {
        let pool = [];
        if(this.state.zone.includes("Wüste")) pool = [this.monsters.moleRat, this.monsters.raider];
        else if(this.state.zone.includes("Supermarkt")) pool = [this.monsters.raider, this.monsters.raider]; 
        else if(this.state.zone.includes("Dschungel")) pool = [this.monsters.mutantRose];
        else pool = [this.monsters.moleRat];
        if(this.state.lvl >= 5) pool.push(this.monsters.deathclaw);

        const template = pool[Math.floor(Math.random()*pool.length)];
        let enemy = { ...template };
        
        // 15% Chance auf Legendär
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
        
        // Anzeige wenn Buff aktiv
        if(Date.now() < this.state.buffEndTime) {
            UI.log("⚡ S.P.E.C.I.A.L. OVERDRIVE aktiv!", "text-yellow-400");
        }
        
        UI.switchView('combat').then(() => UI.renderCombat());
        UI.log(isLegendary ? "LEGENDÄRER GEGNER!" : "Kampf gestartet!", isLegendary ? "text-yellow-400" : "text-red-500");
    },

    getRandomXP: function(xpData) {
        if (Array.isArray(xpData)) return Math.floor(Math.random() * (xpData[1] - xpData[0] + 1)) + xpData[0];
        return xpData;
    },

    combatAction: function(act) {
        if(this.state.isGameOver) return;
        if(!this.state.enemy) return;

        if(act === 'attack') {
            const wpn = this.state.equip.weapon;
            if(wpn.isRanged) {
                if(this.state.ammo > 0) this.state.ammo--;
                else {
                    UI.log("Keine Munition! Fäuste.", "text-red-500");
                    this.state.equip.weapon = this.items.fists;
                    this.enemyTurn(); return;
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
                    
                    // LEGENDARY CHECK
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
    
    rollLegendaryLoot: function() {
        // Lineare Verteilung 3-18 (damit jede Range ca. 33% hat)
        // Bereich 3 bis 18 sind 16 Zahlen.
        // 3-7 (5 zahlen) = 31%
        // 8-12 (5 zahlen) = 31%
        // 13-18 (6 zahlen) = 37%
        const result = Math.floor(Math.random() * 16) + 3; 
        
        let msg = "";
        let type = "";
        
        if(result <= 7) {
            type = "CAPS";
            const amt = this.state.lvl * 80;
            this.state.caps += amt;
            msg = `KRONKORKEN REGEN: +${amt} Caps!`;
        } else if (result <= 12) {
            type = "AMMO";
            const amt = this.state.lvl * 25;
            this.state.ammo += amt;
            msg = `MUNITIONS JACKPOT: +${amt} Schuss!`;
        } else {
            type = "BUFF";
            // 5 Minuten Buff (5 * 60 * 1000 ms)
            this.state.buffEndTime = Date.now() + 300000; 
            msg = `S.P.E.C.I.A.L. OVERDRIVE! (5 Min)`;
        }
        
        return { val: result, msg: msg, type: type };
    },

    enemyTurn: function() {
        if(this.state.enemy.hp <= 0) return;
        if(Math.random() < 0.8) {
            const armor = (this.getStat('END') * 0.5);
            const dmg = Math.max(1, Math.floor(this.state.enemy.dmg - armor));
            this.state.hp -= dmg;
            UI.log(`Schaden erhalten: ${dmg}`, "text-red-400");
            this.checkDeath();
        } else UI.log("Gegner verfehlt.", "text-gray-500");
    },

    checkDeath: function() {
        if(this.state.hp <= 0) {
            this.state.hp = 0;
            this.state.isGameOver = true;
            UI.update();
            UI.showGameOver();
        }
    },

    endCombat: function() {
        this.state.enemy = null;
        this.state.inDialog = false;
        UI.switchView('map');
    },

    rest: function() {
        this.state.hp = this.state.maxHp;
        UI.log("Ausgeruht. HP voll.", "text-blue-400");
        UI.update();
    },

    heal: function() {
        if(this.state.caps >= 25) { this.state.caps -= 25; this.rest(); } 
        else UI.log("Zu wenig Kronkorken.", "text-red-500");
    },

    buyAmmo: function() {
        if(this.state.caps >= 10) { this.state.caps -= 10; this.state.ammo += 10; UI.log("Munition gekauft.", "text-green-400"); UI.update(); } 
        else UI.log("Zu wenig Kronkorken.", "text-red-500");
    },

    buyItem: function(key) {
        const item = this.items[key];
        if(this.state.caps >= item.cost) {
            this.state.caps -= item.cost;
            this.state.equip[item.slot] = item;
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            if(this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
            UI.log(`Gekauft: ${item.name}`, "text-green-400");
            UI.renderCity();
            UI.update();
        } else UI.log("Zu wenig Kronkorken.", "text-red-500");
    },

    upgradeStat: function(key) {
        if(this.state.statPoints > 0) {
            this.state.stats[key]++;
            this.state.statPoints--;
            if(key === 'END') this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            UI.renderChar();
            UI.update();
        }
    }
};
