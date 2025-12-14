const Game = {
    // Config
    TILE: 30, MAP_W: 20, MAP_H: 12,
    
    colors: { 'V':'#39ff14', 'C':'#7a661f', 'X':'#ff3914', 'G':'#00ffff', '.':'#4a3d34', '#':'#8b7d6b', '^':'#5c544d', '~':'#224f80', 'fog':'#000', 'player':'#ff3914' },

    monsters: {
        moleRat: { name: "Maulwurfsratte", hp: 30, dmg: 5, xp: 20, desc: "Nervige Nager." },
        raider: { name: "Raider", hp: 60, dmg: 10, xp: 50, desc: "Wahnsinniger." },
        deathclaw: { name: "Todesklaue", hp: 150, dmg: 30, xp: 200, desc: "LAUF!" }
    },
    items: {
        fists: { name: "Fäuste", slot: 'weapon', bonus: {}, cost: 0, requiredLevel: 0 },
        vault_suit: { name: "Vault-Anzug", slot: 'body', bonus: { END: 1 }, cost: 0, requiredLevel: 0 },
        knife: { name: "Messer", slot: 'weapon', bonus: { STR: 1 }, cost: 15, requiredLevel: 1 },
        pistol: { name: "10mm Pistole", slot: 'weapon', bonus: { AGI: 2 }, cost: 50, requiredLevel: 1, isRanged: true },
        leather_armor: { name: "Lederharnisch", slot: 'body', bonus: { END: 2 }, cost: 30, requiredLevel: 1 },
        metal_helmet: { name: "Metallhelm", slot: 'head', bonus: { END: 1 }, cost: 20, requiredLevel: 1 },
        laser_rifle: { name: "Laser-Gewehr", slot: 'weapon', bonus: { PER: 3 }, cost: 300, requiredLevel: 5, isRanged: true },
        combat_armor: { name: "Kampf-Rüstung", slot: 'body', bonus: { END: 4 }, cost: 150, requiredLevel: 5 }
    },

    state: null,
    worldData: {},
    ctx: null,
    loopId: null,

    init: function() {
        this.worldData = {};
        this.state = {
            sector: {x: 5, y: 5},
            player: {x: 10, y: 6},
            stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 },
            equip: { weapon: this.items.fists, body: this.items.vault_suit, head: null, feet: null },
            hp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0,
            view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, explored: {}
        };
        
        // Start HP basierend auf Stats
        this.state.hp = this.calculateMaxHP(this.getStat('END'));
        
        this.loadSector(5, 5);
        UI.switchView('map').then(() => {
            // Verstecke Game Over Screen falls er an war
            document.getElementById('game-over-screen').classList.add('hidden');
            UI.log("System bereit. Vault verlassen.", "text-green-400");
        });
    },

    // Utils
    calculateMaxHP: function(end) { return 100 + (end - 5) * 10; },
    
    getStat: function(k) { 
        let val = this.state.stats[k];
        for(let s in this.state.equip) {
            if(this.state.equip[s]?.bonus[k]) val += this.state.equip[s].bonus[k];
        }
        return val;
    },
    
    expToNextLevel: function(l) { return 100 + l * 50; },

    // Map & Movement
    loadSector: function(sx, sy) {
        const key = `${sx},${sy}`;
        if(!this.worldData[key]) {
            let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('.'));
            for(let i=0; i<this.MAP_W; i++) { map[0][i] = '^'; map[this.MAP_H-1][i] = '^'; }
            for(let i=0; i<this.MAP_H; i++) { map[i][0] = '^'; map[i][this.MAP_W-1] = '^'; }
            if(sy>0) map[0][10]='G'; if(sy<9) map[this.MAP_H-1][10]='G';
            if(sx>0) map[6][0]='G'; if(sx<9) map[6][this.MAP_W-1]='G';
            if(sx===5 && sy===5) map[5][10]='V'; else if(Math.random()>0.7) map[5][10]='C';
            this.worldData[key] = { layout: map, explored: {} };
        }
        this.state.currentMap = this.worldData[key].layout;
        this.state.explored = this.worldData[key].explored;
        this.state.zone = `Sektor ${sx},${sy}`;
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
        if(this.state.view !== 'map') return;
        this.draw();
        this.loopId = requestAnimationFrame(() => this.drawLoop());
    },

    draw: function() {
        if(!this.ctx) return;
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.MAP_W * this.TILE, this.MAP_H * this.TILE);
        
        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                if(this.state.explored[`${x},${y}`]) {
                    const t = this.state.currentMap[y][x];
                    this.ctx.fillStyle = this.colors[t] || '#fff';
                    this.ctx.fillRect(x*this.TILE, y*this.TILE, this.TILE, this.TILE);
                    this.ctx.strokeStyle = '#111';
                    this.ctx.strokeRect(x*this.TILE, y*this.TILE, this.TILE, this.TILE);
                    if(['C','V','G'].includes(t)) {
                        this.ctx.fillStyle='#000'; this.ctx.font='10px monospace'; 
                        this.ctx.fillText(t==='V'?'VLT':t==='C'?'CTY':'GT', x*this.TILE+2, y*this.TILE+15);
                    }
                }
            }
        }
        this.ctx.fillStyle = this.colors['player'];
        this.ctx.beginPath();
        this.ctx.arc(this.state.player.x*this.TILE+15, this.state.player.y*this.TILE+15, 8, 0, Math.PI*2);
        this.ctx.fill();
    },

    move: function(dx, dy) {
        if(this.state.inDialog || this.state.isGameOver) return;
        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        const tile = this.state.currentMap[ny][nx];
        if(tile === '^') { UI.log("Wand.", "text-gray-500"); return; }
        
        this.state.player.x = nx;
        this.state.player.y = ny;
        this.reveal(nx, ny);
        
        if(tile === 'G') this.changeSector(nx, ny);
        else if(tile === 'C') UI.switchView('city');
        else if(tile === 'V') UI.enterVault(); // NEU: Vault Event
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

    // --- COMBAT ---
    startCombat: function() {
        const template = Object.values(this.monsters)[Math.floor(Math.random() * Object.keys(this.monsters).length)];
        this.state.enemy = { ...template, maxHp: template.hp };
        this.state.inDialog = true;
        UI.switchView('combat');
        UI.log(`Kampf gegen ${template.name}`, "text-red-500");
    },

    combatAction: function(act) {
        if(this.state.isGameOver) return;

        if(act === 'attack') {
            // Check Ammo
            const wpn = this.state.equip.weapon;
            if(wpn.isRanged) {
                if(this.state.ammo > 0) this.state.ammo--;
                else {
                    UI.log("Keine Munition! Wechsel auf Fäuste.", "text-red-500");
                    this.state.equip.weapon = this.items.fists;
                    this.enemyTurn(); return;
                }
            }

            if(Math.random() > 0.3) {
                const dmg = 5 + (this.getStat('STR') * 1.5) + ((wpn.bonus.STR||0)*2);
                this.state.enemy.hp -= Math.floor(dmg);
                UI.log(`Treffer! ${Math.floor(dmg)} Schaden.`, "text-green-400");
                
                if(this.state.enemy.hp <= 0) {
                    this.state.xp += this.state.enemy.xp;
                    this.state.caps += this.state.enemy.loot;
                    this.gainExp(this.state.enemy.xp); // Check Levelup
                    UI.log("Sieg!", "text-yellow-400");
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
        if(Math.random() < 0.8) {
            const dmg = Math.max(1, this.state.enemy.dmg - (this.getStat('END')*0.5));
            this.state.hp -= Math.floor(dmg);
            UI.log(`Gegner trifft für ${Math.floor(dmg)} TP.`, "text-red-400");
            this.checkDeath();
        } else UI.log("Gegner verfehlt.", "text-gray-500");
    },

    checkDeath: function() {
        if(this.state.hp <= 0) {
            this.state.hp = 0;
            this.state.isGameOver = true;
            UI.showGameOver(); // Hier wird der Screen aufgerufen!
        }
    },

    endCombat: function() {
        this.state.enemy = null;
        this.state.inDialog = false;
        UI.switchView('map');
    },

    // --- OTHER ACTIONS ---
    rest: function() {
        this.state.hp = this.calculateMaxHP(this.getStat('END'));
        UI.log("Ausgeruht und geheilt.", "text-blue-400");
        UI.update();
    },

    heal: function() {
        if(this.state.caps >= 25) {
            this.state.caps -= 25;
            this.rest();
        } else UI.log("Zu wenig KK.", "text-red-500");
    },

    buyAmmo: function() {
        if(this.state.caps >= 10) {
            this.state.caps -= 10;
            this.state.ammo += 10;
            UI.log("Munition gekauft.", "text-green-400");
            UI.update();
        } else UI.log("Zu wenig KK.", "text-red-500");
    },

    buyItem: function(key) {
        const item = this.items[key];
        if(this.state.caps >= item.cost) {
            this.state.caps -= item.cost;
            this.state.equip[item.slot] = item;
            // HP Update falls Rüstung gewechselt
            const max = this.calculateMaxHP(this.getStat('END'));
            if(this.state.hp > max) this.state.hp = max;
            
            UI.log("Gekauft & Ausgerüstet.", "text-green-400");
            UI.renderCity();
            UI.update();
        } else UI.log("Zu wenig KK.", "text-red-500");
    },

    upgradeStat: function(key) {
        if(this.state.statPoints > 0) {
            this.state.stats[key]++;
            this.state.statPoints--;
            UI.renderChar();
            UI.update();
        }
    }
};
