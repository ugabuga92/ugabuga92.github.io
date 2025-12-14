const TILE_SIZE = 30; 
const MAP_WIDTH = 20; 
const MAP_HEIGHT = 12; 

const Game = {
    gameState: {},
    worldState: {},
    mapLayout: [],
    animationFrameId: null,
    
    monsters: {
        moleRat: { name: "Maulwurfsratte", hp: 30, damage: 15, loot: 10, minLevel: 1, description: "Nervige Nager." }, 
        mutantRose: { name: "Mutanten Rose", hp: 45, damage: 20, loot: 15, minLevel: 1, description: "Dornige Pflanze." },
        deathclaw: { name: "Todesklaue", hp: 120, damage: 45, loot: 50, minLevel: 5, description: "Der Tod auf zwei Beinen." }
    },
    items: {
        fists: { name: "Fäuste", slot: 'weapon', bonus: {}, isRanged: false, cost: 0 },
        armor_vault: { name: "Vault-Anzug", slot: 'body', bonus: { END: 1 }, cost: 0 },
        pistol: { name: "10mm Pistole", slot: 'weapon', bonus: { AGI: 2 }, requiredLevel: 1, cost: 50, isRanged: true }
    },

    calculateMaxHP: function(end) { return 100 + (end - 5) * 10; },
    getStat: function(k) { return (this.gameState.stats[k] || 0) + (this.gameState.tempStatIncrease.key === k ? 1 : 0) + (this.gameState.equipment.body.bonus[k] || 0); },
    expToNextLevel: function(l) { return 100 + l * 50; },

    initNewGame: function() {
        this.worldState = {};
        
        const initialStats = { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 };
        const initialEquip = { body: this.items.armor_vault, weapon: this.items.fists, head: {name:"-", bonus:{}}, feet: {name:"-", bonus:{}} };
        
        this.gameState = {
            currentSector: { x: 5, y: 5 },
            player: { x: 10, y: 6 },
            stats: initialStats,
            equipment: initialEquip,
            health: 110, maxHealth: 110,
            ammo: 10, caps: 50, level: 1, exp: 0, statPoints: 0,
            explored: {}, inDialog: false, isGameOver: false,
            currentView: 'map', currentZone: "Ödland",
            tempStatIncrease: {}
        };

        const mapData = this.generateMap(5, 5);
        this.mapLayout = mapData.layout;
        this.gameState.player.x = mapData.startX;
        this.gameState.player.y = mapData.startY;

        UI.switchView('map', true).then(() => {
            setTimeout(() => {
                this.startDrawLoop();
                UI.updateUI();
                UI.log("System bereit. Vault verlassen.", "text-green-400");
            }, 100);
        });
    },

    startDrawLoop: function() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            UI.log("CANVAS FEHLT - Versuche neustart...", "text-red-500");
            return;
        }
        canvas.width = MAP_WIDTH * TILE_SIZE;
        canvas.height = MAP_HEIGHT * TILE_SIZE;
        this.ctx = canvas.getContext('2d');
        
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.draw();
    },

    draw: function() {
        if (this.gameState.currentView !== 'map' || !this.ctx) return;

        const w = UI.els.viewContentArea.offsetWidth;
        const h = UI.els.viewContentArea.offsetHeight;
        const scale = Math.min(w / (MAP_WIDTH*TILE_SIZE), h / (MAP_HEIGHT*TILE_SIZE));
        const ox = (w - (MAP_WIDTH*TILE_SIZE)*scale)/2;
        const oy = (h - (MAP_HEIGHT*TILE_SIZE)*scale)/2;

        this.ctx.canvas.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
        this.ctx.canvas.style.transformOrigin = "top left";
        
        this.ctx.clearRect(0, 0, MAP_WIDTH*TILE_SIZE, MAP_HEIGHT*TILE_SIZE);

        for(let y=0; y<MAP_HEIGHT; y++) {
            for(let x=0; x<MAP_WIDTH; x++) {
                const t = this.mapLayout[y][x];
                this.ctx.fillStyle = (t === '.') ? '#4a3d34' : (t === '^') ? '#5c544d' : (t === 'C') ? '#7a661f' : '#000';
                
                if(this.gameState.explored[`${x},${y}`]) {
                    this.ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    this.ctx.strokeStyle = '#222';
                    this.ctx.strokeRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    if(t === 'C') { this.ctx.fillStyle='#fff'; this.ctx.fillText("CITY", x*TILE_SIZE+2, y*TILE_SIZE+15); }
                    if(t === 'G') { this.ctx.fillStyle='#0ff'; this.ctx.fillText("GATE", x*TILE_SIZE+2, y*TILE_SIZE+15); }
                }
            }
        }

        this.ctx.fillStyle = '#ff3914';
        this.ctx.beginPath();
        this.ctx.arc(this.gameState.player.x*TILE_SIZE + 15, this.gameState.player.y*TILE_SIZE + 15, 10, 0, Math.PI*2);
        this.ctx.fill();

        this.animationFrameId = requestAnimationFrame(() => this.draw());
    },

    generateMap: function(sx, sy) {
        let layout = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill('.'));
        for(let i=0; i<MAP_WIDTH; i++) { layout[0][i] = '^'; layout[MAP_HEIGHT-1][i] = '^'; }
        for(let i=0; i<MAP_HEIGHT; i++) { layout[i][0] = '^'; layout[i][MAP_WIDTH-1] = '^'; }

        if(sy > 0) layout[0][10] = 'G'; 
        if(sy < 9) layout[MAP_HEIGHT-1][10] = 'G'; 
        if(sx > 0) layout[6][0] = 'G'; 
        if(sx < 9) layout[6][MAP_WIDTH-1] = 'G'; 

        if(Math.random() > 0.6) layout[5][10] = 'C';

        const key = `${sx},${sy}`;
        if(this.worldState[key]) return this.worldState[key];

        const data = { layout: layout, startX: 10, startY: 6 };
        this.worldState[key] = data;
        return data;
    },

    revealMap: function(px, py) {
        for(let y=py-2; y<=py+2; y++) {
            for(let x=px-2; x<=px+2; x++) {
                if(x>=0 && x<MAP_WIDTH && y>=0 && y<MAP_HEIGHT) this.gameState.explored[`${x},${y}`] = true;
            }
        }
    },

    movePlayer: function(dx, dy) {
        if(this.gameState.inDialog) return;
        
        const nx = this.gameState.player.x + dx;
        const ny = this.gameState.player.y + dy;
        const tile = this.mapLayout[ny][nx];

        if(tile === '^') { UI.log("Wand.", "text-gray-500"); return; }
        
        this.gameState.player.x = nx;
        this.gameState.player.y = ny;
        this.revealMap(nx, ny);

        if(tile === 'G') this.changeSector(nx, ny);
        else if(tile === 'C') UI.enterCity();
        else if(Math.random() < 0.1) this.triggerCombat();
    },

    changeSector: function(px, py) {
        let dx=0, dy=0;
        if(py===0) dy=-1; else if(py===MAP_HEIGHT-1) dy=1;
        if(px===0) dx=-1; else if(px===MAP_WIDTH-1) dx=1;

        this.gameState.currentSector.x += dx;
        this.gameState.currentSector.y += dy;
        
        const mapData = this.generateMap(this.gameState.currentSector.x, this.gameState.currentSector.y);
        this.mapLayout = mapData.layout;
        
        if(dy===-1) this.gameState.player.y = MAP_HEIGHT-2;
        if(dy===1) this.gameState.player.y = 1;
        if(dx===-1) this.gameState.player.x = MAP_WIDTH-2;
        if(dx===1) this.gameState.player.x = 1;

        this.gameState.explored = {};
        this.revealMap(this.gameState.player.x, this.gameState.player.y);
        UI.log(`Sektor: ${this.gameState.currentSector.x},${this.gameState.currentSector.y}`, "text-yellow-400");
        UI.updateUI();
    },

    triggerCombat: function() {
        this.gameState.currentEnemy = { ...this.monsters.moleRat };
        this.gameState.currentEnemy.maxHp = 30;
        UI.switchView('combat');
        UI.setDialogButtons(`<button class="action-button w-full" onclick="Game.attack()">Angriff</button>`);
        UI.log("Kampf gestartet!", "text-red-500");
    },

    attack: function() {
        if(!this.gameState.currentEnemy) return;
        this.gameState.currentEnemy.hp -= 10;
        if(this.gameState.currentEnemy.hp <= 0) {
            UI.log("Sieg!", "text-green-500");
            this.endCombat();
        } else {
            UI.log("Treffer!", "text-yellow-500");
            UI.updateUI();
        }
    },

    endCombat: function() {
        this.gameState.currentEnemy = null;
        this.gameState.inDialog = false;
        UI.clearDialog();
        UI.switchView('map').then(() => {
            this.startDrawLoop(); 
            UI.updateUI();
        });
    },
    
    quitGame: function() {
        alert("Spiel beendet. Tab schließen oder neu laden.");
    }
};
window.Game = Game;
