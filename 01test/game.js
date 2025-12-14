const Game = {
    // Config
    TILE: 30, MAP_W: 20, MAP_H: 12,
    
    colors: {
        'V': '#39ff14', 'C': '#7a661f', 'X': '#ff3914', 'G': '#00ffff',
        '.': '#4a3d34', '#': '#8b7d6b', '^': '#5c544d', '~': '#224f80',
        'fog': '#000000', 'player': '#ff3914'
    },

    monsters: {
        moleRat: { name: "Maulwurfsratte", hp: 30, dmg: 5, xp: 20, desc: "Klein aber gemein." },
        raider: { name: "Raider", hp: 60, dmg: 10, xp: 50, desc: "Wahnsinniger." },
        deathclaw: { name: "Todesklaue", hp: 150, dmg: 30, xp: 200, desc: "LAUF!" }
    },

    items: {
        fists: { name: "Fäuste", bonus: {} },
        vault_suit: { name: "Vault-Suit", bonus: { END: 1 } }
    },

    state: null,
    worldData: {}, // Speichert besuchte Sektoren
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
            view: 'map', zone: 'Ödland', inDialog: false,
            explored: {} // Nebel des Krieges für aktuellen Sektor
        };

        // Startkarte laden
        this.loadSector(5, 5);
        
        // UI auf Map schalten
        UI.switchView('map').then(() => {
            UI.log("Neues Spiel gestartet.", "text-yellow-400");
        });
    },

    // --- MAP LOGIK ---
    initCanvas: function() {
        const cvs = document.getElementById('game-canvas');
        if (!cvs) return;
        
        cvs.width = this.MAP_W * this.TILE;
        cvs.height = this.MAP_H * this.TILE;
        this.ctx = cvs.getContext('2d');
        
        // Starte Render Loop
        if (this.loopId) cancelAnimationFrame(this.loopId);
        this.drawLoop();
    },

    drawLoop: function() {
        if (this.state.view !== 'map') return; // Nur zeichnen wenn auf Map
        
        this.draw();
        this.loopId = requestAnimationFrame(() => this.drawLoop());
    },

    draw: function() {
        if (!this.ctx) return;
        
        // 1. Alles schwarz machen
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.MAP_W * this.TILE, this.MAP_H * this.TILE);

        // 2. Map Tiles zeichnen
        const layout = this.state.currentMap;
        
        for (let y = 0; y < this.MAP_H; y++) {
            for (let x = 0; x < this.MAP_W; x++) {
                // Nebel des Krieges prüfen
                if (this.state.explored[`${x},${y}`]) {
                    const char = layout[y][x];
                    this.ctx.fillStyle = this.colors[char] || '#fff';
                    this.ctx.fillRect(x * this.TILE, y * this.TILE, this.TILE, this.TILE);
                    
                    // Gitter
                    this.ctx.strokeStyle = '#111';
                    this.ctx.strokeRect(x * this.TILE, y * this.TILE, this.TILE, this.TILE);

                    // Labels
                    if (char === 'C') this.drawLabel(x, y, "CITY", "#fff");
                    if (char === 'V') this.drawLabel(x, y, "VLT", "#000");
                    if (char === 'G') this.drawLabel(x, y, "GATE", "#000");
                }
            }
        }

        // 3. Spieler zeichnen
        this.ctx.fillStyle = this.colors['player'];
        this.ctx.beginPath();
        this.ctx.arc(
            this.state.player.x * this.TILE + this.TILE/2,
            this.state.player.y * this.TILE + this.TILE/2,
            this.TILE / 3, 0, Math.PI * 2
        );
        this.ctx.fill();
    },

    drawLabel: function(x, y, text, color) {
        this.ctx.fillStyle = color;
        this.ctx.font = '10px monospace';
        this.ctx.fillText(text, x * this.TILE + 2, y * this.TILE + 20);
    },

    // --- GAMEPLAY ---
    loadSector: function(sx, sy) {
        const key = `${sx},${sy}`;
        
        if (!this.worldData[key]) {
            // Neuen Sektor generieren
            let map = Array(this.MAP_H).fill().map(() => Array(this.MAP_W).fill('.'));
            
            // Wände
            for(let i=0; i<this.MAP_W; i++) { map[0][i] = '^'; map[this.MAP_H-1][i] = '^'; }
            for(let i=0; i<this.MAP_H; i++) { map[i][0] = '^'; map[i][this.MAP_W-1] = '^'; }
            
            // Tore
            if (sy > 0) map[0][10] = 'G'; // Nord
            if (sy < 9) map[this.MAP_H-1][10] = 'G'; // Süd
            if (sx > 0) map[6][0] = 'G'; // West
            if (sx < 9) map[6][this.MAP_W-1] = 'G'; // Ost

            // Features
            if (sx===5 && sy===5) map[5][10] = 'V'; // Vault
            else if (Math.random() > 0.7) map[5][10] = 'C'; // Stadt

            this.worldData[key] = { layout: map, explored: {} };
        }

        this.state.currentMap = this.worldData[key].layout;
        this.state.explored = this.worldData[key].explored;
        this.state.zone = `Sektor ${sx},${sy}`;
    },

    move: function(dx, dy) {
        const nx = this.state.player.x + dx;
        const ny = this.state.player.y + dy;
        const tile = this.state.currentMap[ny][nx];

        // Kollision
        if (tile === '^') { UI.log("Wand.", "text-gray-500"); return; }

        this.state.player.x = nx;
        this.state.player.y = ny;
        this.reveal(nx, ny);

        // Events
        if (tile === 'G') this.useGate(nx, ny);
        else if (tile === 'C') UI.switchView('city');
        else if (Math.random() < 0.1 && tile === '.') this.startCombat();
    },

    reveal: function(px, py) {
        for(let y=py-2; y<=py+2; y++) {
            for(let x=px-2; x<=px+2; x++) {
                if(x>=0 && y>=0 && x<this.MAP_W && y<this.MAP_H) {
                    this.state.explored[`${x},${y}`] = true;
                }
            }
        }
    },

    useGate: function(px, py) {
        let sx = this.state.sector.x;
        let sy = this.state.sector.y;
        
        // Richtung bestimmen
        if (py === 0) sy--;        // Nord
        else if (py === 11) sy++;  // Süd
        else if (px === 0) sx--;   // West
        else if (px === 19) sx++;  // Ost

        this.state.sector = {x: sx, y: sy};
        this.loadSector(sx, sy);

        // Spieler auf gegenüberliegende Seite setzen
        if (py === 0) this.state.player.y = 10;
        if (py === 11) this.state.player.y = 1;
        if (px === 0) this.state.player.x = 18;
        if (px === 19) this.state.player.x = 1;

        this.reveal(this.state.player.x, this.state.player.y);
        UI.log(`Sektor gewechselt: ${sx},${sy}`, "text-blue-400");
    },

    // --- KAMPF ---
    startCombat: function() {
        this.state.enemy = { ...this.monsters.moleRat, hp: 30, maxHp: 30 };
        this.state.inDialog = true; // Blockiert Movement
        UI.switchView('combat');
        UI.log("Ein Gegner taucht auf!", "text-red-500");
    },

    combatAction: function(action) {
        if (action === 'attack') {
            this.state.enemy.hp -= 10;
            UI.log("Treffer! (-10)", "text-green-400");
            
            if (this.state.enemy.hp <= 0) {
                this.state.xp += this.state.enemy.xp;
                this.state.caps += 5;
                UI.log("Sieg! XP erhalten.", "text-yellow-400");
                this.endCombat();
            } else {
                this.state.hp -= this.state.enemy.dmg;
                UI.log("Gegner greift an!", "text-red-400");
            }
        } else {
            UI.log("Geflohen.", "text-gray-400");
            this.endCombat();
        }
        UI.update();
        if (this.state.view === 'combat') UI.renderCombat();
        
        if (this.state.hp <= 0) {
            alert("GAME OVER");
            location.reload();
        }
    },

    endCombat: function() {
        this.state.enemy = null;
        this.state.inDialog = false;
        UI.switchView('map');
    },

    // --- CHARAKTER ---
    upgradeStat: function(key) {
        if (this.state.statPoints > 0) {
            this.state.stats[key]++;
            this.state.statPoints--;
            UI.renderChar();
            UI.update();
        }
    },

    heal: function() {
        if (this.state.caps >= 25) {
            this.state.caps -= 25;
            this.state.hp = 100 + (this.state.stats.END - 5) * 10;
            UI.log("Vollständig geheilt.", "text-green-500");
            UI.update();
        } else {
            UI.log("Nicht genug Kronenkorken.", "text-red-500");
        }
    }
};
