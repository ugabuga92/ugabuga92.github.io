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
        fists: { name: "Fäuste", slot: 'weapon', bonus: {}, cost: 0 },
        vault_suit: { name: "Vault-Anzug", slot: 'body', bonus: { END: 1 }, cost: 0 }
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
            equip: { weapon: this.items.fists, body: this.items.vault_suit },
            hp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0,
            view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, explored: {}
        };
        
        this.loadSector(5, 5);
        UI.switchView('map').then(() => {
            UI.log("System bereit. Vault verlassen.", "text-green-400");
        });
    },

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
        if(this.state.inDialog) return;
        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        const tile = this.state.currentMap[ny][nx];
        if(tile === '^') { UI.log("Wand.", "text-gray-500"); return; }
        
        this.state.player.x = nx;
        this.state.player.y = ny;
        this.reveal(nx, ny);
        
        if(tile === 'G') this.changeSector(nx, ny);
        else if(tile === 'C') UI.switchView('city');
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
        this.state.enemy = { ...this.monsters.moleRat, maxHp: 30 };
        this.state.inDialog = true;
        UI.switchView('combat');
        UI.log("Kampf!", "text-red-500");
    },

    combatAction: function(act) {
        if(act === 'attack') {
            this.state.enemy.hp -= 10;
            UI.log("Treffer! (-10)", "text-green-400");
            if(this.state.enemy.hp <= 0) {
                this.state.xp += 20;
                this.endCombat();
            } else {
                this.state.hp -= 5;
                UI.log("Gegner greift an (-5)", "text-red-400");
            }
        } else {
            this.endCombat();
        }
        UI.renderCombat();
        UI.update();
    },

    endCombat: function() {
        this.state.inDialog = false;
        this.state.enemy = null;
        UI.switchView('map');
    },

    heal: function() {
        if(this.state.caps >= 25) {
            this.state.caps -= 25;
            this.state.hp = 100 + (this.state.stats.END - 5) * 10;
            UI.log("Geheilt.", "text-green-400");
            UI.update();
        } else {
            UI.log("Zu wenig Geld.", "text-red-500");
        }
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
