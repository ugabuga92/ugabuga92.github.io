const Game = {
    TILE: 30, MAP_W: 20, MAP_H: 12,
    
    // Farben für die Minimap oder Fallback
    colors: { 
        'V':'#39ff14', 'C':'#eab308', 'X':'#ff3914', 'G':'#00ffff', 
        '.':'#5d5345', // Boden dunkler
        'T':'#1a4d1a', // Wald
        'R':'#5c544d', // Fels
        '~':'#224f80', // Wasser
        'H':'#8b4513', // Haus
        'D':'#000000'  // Dungeon
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

    state: null, worldData: {}, ctx: null, loopId: null,

    init: function() {
        this.worldData = {};
        const startX = Math.floor(Math.random() * (this.MAP_W - 2)) + 1;
        const startY = Math.floor(Math.random() * (this.MAP_H - 2)) + 1;

        this.state = {
            sector: {x: 5, y: 5}, 
            player: {x: startX, y: startY},
            stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 },
            equip: { weapon: this.items.fists, body: this.items.vault_suit },
            hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0,
            view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, explored: {}, 
            tempStatIncrease: {},
            quests: [
                { id: "q1", title: "Der Weg nach Hause", text: "Willkommen im einsamen Ödland einer längst vergessenen Zeit.\n\nDeine Aufgabe in der freien Wildbahn ist es, den Weg nach Hause zu finden!\n\nViel Erfolg!!!", read: false }
            ]
        };
        
        this.state.hp = this.calculateMaxHP(this.getStat('END'));
        this.state.maxHp = this.state.hp;
        
        this.loadSector(5, 5);
        UI.switchView('map').then(() => {
            if(UI.els.gameOver) UI.els.gameOver.classList.add('hidden');
            UI.log("System bereit. Grafik-Engine v2 geladen.", "text-green-400");
        });
    },

    calculateMaxHP: function(end) { return 100 + (end - 5) * 10; },
    getStat: function(k) {
        let val = this.state.stats[k] || 0;
        for(let slot in this.state.equip) if(this.state.equip[slot]?.bonus[k]) val += this.state.equip[slot].bonus[k];
        if(this.state.tempStatIncrease.key === k) val += 1;
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

    // --- MAP GENERATION V2 (Organischer) ---
    loadSector: function(sx, sy) {
        const key = `${sx},${sy}`;
        if(!this.worldData[key]) {
            // 1. Leere Map (Boden)
            let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('.'));
            
            // 2. Rand-Felsen
            for(let i=0; i<this.MAP_W; i++) { map[0][i] = '^'; map[this.MAP_H-1][i] = '^'; }
            for(let i=0; i<this.MAP_H; i++) { map[i][0] = '^'; map[i][this.MAP_W-1] = '^'; }
            
            // 3. Organische Cluster (Wald T, Wasser ~, Felsen R)
            this.addClusters(map, 'T', 4, 3); // 4 Cluster Wald
            this.addClusters(map, '~', 2, 4); // 2 Cluster Wasser
            this.addClusters(map, 'R', 3, 2); // 3 Cluster Felsen

            // 4. Tore
            if(sy>0) this.clearGate(map, 10, 0, 'G');
            if(sy<9) this.clearGate(map, 10, this.MAP_H-1, 'G');
            if(sx>0) this.clearGate(map, 0, 6, 'G');
            if(sx<9) this.clearGate(map, this.MAP_W-1, 6, 'G');
            
            // 5. POIs (Point of Interests)
            if(sx===5 && sy===5) {
                map[this.state.player.y][this.state.player.x] = 'V';
            } else {
                if(Math.random() < 0.3) this.placeRandomly(map, 'C'); // Stadt
                if(Math.random() < 0.2) this.placeRandomly(map, 'H'); // Ruine
                if(Math.random() < 0.1) this.placeRandomly(map, 'D'); // Höhle
            }
            
            this.worldData[key] = { layout: map, explored: {} };
        }
        this.state.currentMap = this.worldData[key].layout;
        this.state.explored = this.worldData[key].explored;
        this.state.zone = `Sektor ${sx},${sy}`;
    },

    // Hilfsfunktionen für Map-Gen
    addClusters: function(map, type, count, size) {
        for(let k=0; k<count; k++) {
            let cx = Math.floor(Math.random() * (this.MAP_W-4)) + 2;
            let cy = Math.floor(Math.random() * (this.MAP_H-4)) + 2;
            for(let y=cy-size; y<=cy+size; y++) {
                for(let x=cx-size; x<=cx+size; x++) {
                    if(x>1 && x<this.MAP_W-2 && y>1 && y<this.MAP_H-2) {
                        // Kreisförmig & Zufall für organischen Look
                        if(Math.random() > 0.3 && Math.hypot(x-cx, y-cy) <= size) {
                            if(map[y][x] === '.') map[y][x] = type;
                        }
                    }
                }
            }
        }
    },

    placeRandomly: function(map, char) {
        let placed = false;
        while(!placed) {
            let x = Math.floor(Math.random()*(this.MAP_W-4))+2;
            let y = Math.floor(Math.random()*(this.MAP_H-4))+2;
            if(map[y][x] === '.') { map[y][x] = char; placed = true; }
        }
    },

    clearGate: function(map, x, y, char) {
        map[y][x] = char;
        // Mache den Weg zum Tor frei (entferne Hindernisse drumherum)
        for(let dy=-1; dy<=1; dy++) {
            for(let dx=-1; dx<=1; dx++) {
                let ny = y+dy, nx = x+dx;
                if(ny>0 && ny<this.MAP_H-1 && nx>0 && nx<this.MAP_W-1) {
                    if(map[ny][nx] !== 'V') map[ny][nx] = '.';
                }
            }
        }
    },

    initCanvas: function() {
        const cvs = document.getElementById('game-canvas');
        if(!cvs) return;
        cvs.width = this.MAP_W * this.TILE;
        cvs.height = this.MAP_H * this.TILE;
        this.ctx = cvs.getContext('2d');
        if(this.loopId) cancelAnimationFrame(this.loopId);
        this.drawLoop();
    },

    drawLoop: function() {
        if(this.state.view !== 'map' || this.state.isGameOver) return;
        this.draw();
        this.loopId = requestAnimationFrame(() => this.drawLoop());
    },

    // --- NEUE RENDER ENGINE ---
    draw: function() {
        if(!this.ctx) return;
        const ctx = this.ctx;
        
        // Boden füllen
        ctx.fillStyle = "#1a1a1a"; // Dunkler Hintergrund
        ctx.fillRect(0, 0, this.MAP_W * this.TILE, this.MAP_H * this.TILE);
        
        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                // Nebel des Krieges
                if(this.state.explored[`${x},${y}`]) {
                    const tile = this.state.currentMap[y][x];
                    this.drawTile(ctx, x, y, tile);
                } else {
                    // Fog (Schwarz)
                    ctx.fillStyle = "#000";
                    ctx.fillRect(x*this.TILE, y*this.TILE, this.TILE, this.TILE);
                }
            }
        }
        
        // Spieler zeichnen (Roter Punkt mit Schein)
        const px = this.state.player.x * this.TILE + this.TILE/2;
        const py = this.state.player.y * this.TILE + this.TILE/2;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff3914";
        ctx.fillStyle = "#ff3914";
        ctx.beginPath();
        ctx.arc(px, py, this.TILE/3, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
    },

    // Die Grafik-Funktion
    drawTile: function(ctx, x, y, type) {
        const ts = this.TILE;
        const px = x * ts;
        const py = y * ts;

        // 1. Boden Textur (immer unter allem außer Wasser)
        if (type !== '~') {
            ctx.fillStyle = "#5d5345"; // Sand/Erde
            ctx.fillRect(px, py, ts, ts);
            // Noise Effekt (Dreck)
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            if((x+y)%3===0) ctx.fillRect(px+5, py+5, 2, 2);
            if((x*y)%5===0) ctx.fillRect(px+20, py+20, 2, 2);
        }

        // 2. Objekt Zeichnen
        switch(type) {
            case '^': // Mauer
                ctx.fillStyle = "#2a2a2a";
                ctx.fillRect(px, py, ts, ts);
                ctx.strokeStyle = "#444";
                ctx.strokeRect(px, py, ts, ts);
                break;
            
            case 'T': // Baum
                // Schatten
                ctx.fillStyle = "rgba(0,0,0,0.3)";
                ctx.beginPath(); ctx.arc(px+ts/2+2, py+ts/2+2, ts/3, 0, Math.PI*2); ctx.fill();
                // Stamm
                ctx.fillStyle = "#3e2723";
                ctx.fillRect(px+ts/2-3, py+ts/2, 6, ts/2);
                // Krone
                ctx.fillStyle = "#1b5e20";
                ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2-5, ts/2.5, 0, Math.PI*2); ctx.fill();
                // Highlight
                ctx.fillStyle = "#2e7d32";
                ctx.beginPath(); ctx.arc(px+ts/2-3, py+ts/2-8, ts/5, 0, Math.PI*2); ctx.fill();
                break;

            case 'R': // Fels
                ctx.fillStyle = "#757575";
                ctx.beginPath();
                ctx.moveTo(px+5, py+ts-5);
                ctx.lineTo(px+ts/2, py+5);
                ctx.lineTo(px+ts-5, py+ts-5);
                ctx.fill();
                // Schattierung
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.beginPath();
                ctx.moveTo(px+ts/2, py+5);
                ctx.lineTo(px+ts/2, py+ts-5);
                ctx.lineTo(px+ts-5, py+ts-5);
                ctx.fill();
                break;

            case '~': // Wasser
                ctx.fillStyle = "#1e3a8a";
                ctx.fillRect(px, py, ts, ts);
                // Wellen
                ctx.fillStyle = "#3b82f6";
                ctx.fillRect(px+5, py+10, 10, 2);
                ctx.fillRect(px+15, py+20, 8, 2);
                break;

            case 'V': // Vault (Zahnrad Symbolik)
                ctx.fillStyle = "#fbbf24"; // Gold
                ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/2-2, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = "#000";
                ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = "#fbbf24"; 
                ctx.font = "10px monospace"; ctx.fillText("111", px+6, py+ts/2+3);
                break;

            case 'C': // Stadt
                ctx.fillStyle = "#8b4513"; // Holz Gebäude
                ctx.fillRect(px+2, py+10, ts-4, ts-10);
                ctx.fillStyle = "#ffff00"; // Fenster Licht
                ctx.fillRect(px+8, py+15, 6, 6);
                ctx.fillStyle = "#fff";
                ctx.font = "9px monospace"; ctx.fillText("CTY", px+4, py+8);
                break;

            case 'G': // Gate (Tor)
                ctx.fillStyle = "#00ffff"; // Cyan Leuchten
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = "#000";
                ctx.fillRect(px+2, py+2, ts-4, ts-4); // Rahmen effekt
                break;
            
            case 'H': // Haus Ruine
                ctx.fillStyle = "#5d4037"; 
                ctx.fillRect(px+4, py+8, ts-8, ts-8);
                ctx.fillStyle = "#000"; // Kaputte Tür
                ctx.fillRect(px+ts/2-3, py+ts-8, 6, 8);
                break;

            case 'D': // Dungeon Höhle
                ctx.fillStyle = "#3e2723"; // Berg
                ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2+5, ts/2, Math.PI, 0); ctx.fill();
                ctx.fillStyle = "#000"; // Loch
                ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2+5, ts/4, Math.PI, 0); ctx.fill();
                break;
        }
    },

    move: function(dx, dy) {
        if(this.state.inDialog || this.state.isGameOver) return;
        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        const tile = this.state.currentMap[ny][nx];
        
        // Kollision mit neuen Objekten
        if(tile === '^' || tile === 'T' || tile === 'R' || tile === '~') { 
            let msg = "Weg blockiert.";
            if(tile === '~') msg = "Zu tiefes Wasser.";
            if(tile === 'T') msg = "Dichter Wald.";
            if(tile === 'R') msg = "Felsen im Weg.";
            UI.log(msg, "text-gray-500"); 
            return; 
        }
        
        this.state.player.x = nx;
        this.state.player.y = ny;
        this.reveal(nx, ny);
        
        if(tile === 'G') this.changeSector(nx, ny);
        else if(tile === 'C') UI.switchView('city');
        else if(tile === 'V') UI.enterVault();
        else if(tile === 'H' || tile === 'D') UI.log("Sieht verlassen aus...", "text-yellow-500"); // Placeholder für Dungeons
        else if(Math.random()<0.1 && tile === '.') this.startCombat();
        UI.update();
    },

    reveal: function(px, py) {
        for(let y=py-2; y<=py+2; y++) {
            for(let x=px-2; x<=px+2; x++) {
                if(x>=0 && x<this.MAP_W && y>=0 && y<this.MAP_H) this.state.explored[`${x},${y}`] = true;
            }
        }
    },

    changeSector: function(px, py) {
        let sx=this.state.sector.x, sy=this.state.sector.y;
        if(py===0) sy--; else if(py===11) sy++;
        if(px===0) sx--; else if(px===19) sx++;
        this.state.sector = {x: sx, y: sy};
        this.loadSector(sx, sy);
        if(py===0) this.state.player.y=10; else if(py===11) this.state.player.y=1;
        if(px===0) this.state.player.x=18; else if(px===19) this.state.player.x=1;
        this.reveal(this.state.player.x, this.state.player.y);
        UI.log(`Sektor: ${sx},${sy}`, "text-blue-400");
    },

    startCombat: function() {
        const templates = Object.values(this.monsters).filter(m => this.state.lvl >= m.minLvl);
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        let enemy = { ...template };
        const isLegendary = Math.random() < 0.1;
        
        if(isLegendary) {
            enemy.isLegendary = true;
            enemy.name = "Legendäre " + enemy.name;
            enemy.hp = Math.floor(enemy.hp * 2.0); 
            enemy.maxHp = enemy.hp;
            enemy.dmg = Math.floor(enemy.dmg * 1.5); 
            enemy.loot = Math.floor(enemy.loot * 3.0); 
            if(Array.isArray(enemy.xp)) {
                enemy.xp = [enemy.xp[0]*3, enemy.xp[1]*3]; 
            } else {
                enemy.xp = enemy.xp * 3;
            }
        } else {
            enemy.maxHp = enemy.hp;
        }
        
        this.state.enemy = enemy;
        this.state.inDialog = true;
        UI.switchView('combat').then(() => UI.renderCombat());
        
        if(isLegendary) UI.log("ACHTUNG: LEGENDÄRE PRÄSENZ!", "text-yellow-400 font-bold");
        else UI.log(`${enemy.name} greift an!`, "text-red-500");
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
                const strBonus = this.getStat('STR') * 1.5;
                const dmg = Math.floor(baseDmg + strBonus);
                this.state.enemy.hp -= dmg;
                UI.log(`Treffer! ${dmg} Schaden.`, "text-green-400");
                
                if(this.state.enemy.hp <= 0) {
                    this.state.enemy.hp = 0;
                    this.state.caps += this.state.enemy.loot;
                    UI.log(`Sieg! ${this.state.enemy.loot} KK.`, "text-yellow-400");
                    const randomXp = this.getRandomXP(this.state.enemy.xp);
                    this.gainExp(randomXp);
                    this.endCombat();
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

    enemyTurn: function() {
        if(this.state.enemy.hp <= 0) return;
        if(Math.random() < 0.8) {
            const armor = (this.getStat('END') * 0.5);
            const dmg = Math.max(1, Math.floor(this.state.enemy.dmg - armor));
            this.state.hp -= dmg;
            UI.log(`Gegner trifft: -${dmg} TP.`, "text-red-400");
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
        UI.log("Ausgeruht.", "text-blue-400");
        UI.update();
    },

    heal: function() {
        if(this.state.caps >= 25) { this.state.caps -= 25; this.rest(); } 
        else UI.log("Zu wenig KK.", "text-red-500");
    },

    buyAmmo: function() {
        if(this.state.caps >= 10) { this.state.caps -= 10; this.state.ammo += 10; UI.log("Munition gekauft.", "text-green-400"); UI.update(); } 
        else UI.log("Zu wenig KK.", "text-red-500");
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
        } else UI.log("Zu wenig KK.", "text-red-500");
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
