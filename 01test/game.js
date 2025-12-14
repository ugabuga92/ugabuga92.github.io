const Game = {
    // Config
    TILE: 30, MAP_W: 20, MAP_H: 12,
    
    colors: { 'V':'#39ff14', 'C':'#7a661f', 'X':'#ff3914', 'G':'#00ffff', '.':'#4a3d34', '#':'#8b7d6b', '^':'#5c544d', '~':'#224f80', 'fog':'#000', 'player':'#ff3914' },

    monsters: {
        moleRat: { name: "Maulwurfsratte", hp: 30, dmg: 15, loot: 10, xp: 50, minLvl: 1, desc: "Nervige Nager." },
        mutantRose: { name: "Mutanten Rose", hp: 45, dmg: 20, loot: 15, xp: 75, minLvl: 1, desc: "Dornige Pflanze." },
        raider: { name: "Raider", hp: 60, dmg: 10, loot: 25, xp: 100, minLvl: 2, desc: "Wahnsinniger." },
        deathclaw: { name: "Todesklaue", hp: 150, dmg: 45, loot: 50, xp: 300, minLvl: 5, desc: "LAUF!" }
    },

    // Mehr Items für den Händler hinzugefügt
    items: {
        fists: { name: "Fäuste", slot: 'weapon', bonus: {}, cost: 0, requiredLevel: 0 },
        vault_suit: { name: "Vault-Anzug", slot: 'body', bonus: { END: 1 }, cost: 0, requiredLevel: 0 },
        knife: { name: "Messer", slot: 'weapon', bonus: { STR: 1 }, cost: 15, requiredLevel: 1 },
        pistol: { name: "10mm Pistole", slot: 'weapon', bonus: { AGI: 2 }, cost: 50, requiredLevel: 1 },
        leather_armor: { name: "Lederharnisch", slot: 'body', bonus: { END: 2 }, cost: 30, requiredLevel: 1 },
        metal_helmet: { name: "Metallhelm", slot: 'head', bonus: { END: 1 }, cost: 20, requiredLevel: 1 },
        laser_rifle: { name: "Laser-Gewehr", slot: 'weapon', bonus: { PER: 3 }, cost: 300, requiredLevel: 5 },
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
            hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0,
            view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, explored: {},
            tempStatIncrease: {} // Wichtig für Stat-Vergabe
        };
        
        // HP initial berechnen
        this.state.hp = this.calculateMaxHP(this.getStat('END'));
        this.state.maxHp = this.state.hp;

        this.loadSector(5, 5);
        UI.switchView('map').then(() => {
            UI.log("System bereit. Vault verlassen.", "text-green-400");
        });
    },

    // --- HILFSFUNKTIONEN (WIEDERHERGESTELLT) ---
    calculateMaxHP: function(end) { return 100 + (end - 5) * 10; },
    
    getStat: function(k) {
        let val = this.state.stats[k] || 0;
        // Check Equipment
        for(let slot in this.state.equip) {
            if(this.state.equip[slot] && this.state.equip[slot].bonus[k]) val += this.state.equip[slot].bonus[k];
        }
        // Temp Stat beim Leveln
        if(this.state.tempStatIncrease.key === k) val += 1;
        return val;
    },

    expToNextLevel: function(l) { return 100 + l * 50; },

    gainExp: function(amount) {
        if (this.state.isGameOver) return;
        this.state.xp += amount;
        UI.log(`+${amount} EXP erhalten.`, 'text-blue-400');
        
        let need = this.expToNextLevel(this.state.lvl);
        while(this.state.xp >= need) {
            this.state.lvl++;
            this.state.statPoints++;
            this.state.xp -= need;
            need = this.expToNextLevel(this.state.lvl);
            
            // Heilung bei Level Up
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            this.state.hp = this.state.maxHp;
            
            UI.log(`LEVEL UP! Level ${this.state.lvl}. +1 Stat-Punkt!`, 'text-yellow-400');
        }
    },

    // --- MAP LOGIK ---
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
        if(this.state.view !== 'map' || this.state.isGameOver) return;
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

    // --- KAMPF ---
    startCombat: function() {
        // Monster erstellen (Kopie)
        const templates = Object.values(this.monsters).filter(m => this.state.lvl >= m.minLvl);
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        this.state.enemy = { ...template, maxHp: template.hp };
        this.state.inDialog = true;
        UI.switchView('combat');
        UI.log(`${template.name} greift an!`, "text-red-500");
    },

    combatAction: function(act) {
        if(this.state.isGameOver) return;

        if(act === 'attack') {
            // Spieler greift an (Trefferchance 70%)
            if(Math.random() > 0.3) {
                // Waffenschaden + STR Bonus
                const weaponDmg = (this.state.equip.weapon.bonus.STR || 0) * 2; 
                const dmg = 5 + (this.getStat('STR') * 1.5) + weaponDmg;
                const finalDmg = Math.floor(dmg);
                
                this.state.enemy.hp -= finalDmg;
                UI.log(`Du triffst für ${finalDmg} Schaden!`, "text-green-400");
                
                if(this.state.enemy.hp <= 0) {
                    this.state.caps += this.state.enemy.loot;
                    UI.log(`Sieg! ${this.state.enemy.loot} KK gefunden.`, "text-yellow-400");
                    this.gainExp(this.state.enemy.xp);
                    this.endCombat();
                    return; // Kampf vorbei, Gegner darf nicht mehr angreifen
                }
            } else {
                UI.log("Du hast verfehlt!", "text-gray-400");
            }
            
            // Gegner greift an (wenn er noch lebt)
            this.enemyTurn();

        } else if (act === 'flee') {
            // Flucht Logik: AGI basierend
            const chance = 0.4 + (this.getStat('AGI') * 0.05);
            if(Math.random() < chance) {
                UI.log("Erfolgreich geflohen!", "text-green-400");
                this.endCombat();
            } else {
                UI.log("Flucht fehlgeschlagen!", "text-red-500");
                this.enemyTurn(); // Strafe: Gegner greift an
            }
        }
        
        UI.update();
        if (this.state.view === 'combat') UI.renderCombat();
    },

    enemyTurn: function() {
        // Gegner trifft zu 80%
        if(Math.random() < 0.8) {
            // Schaden minus Rüstung
            const armor = (this.getStat('END') * 0.5); 
            const dmg = Math.max(1, Math.floor(this.state.enemy.dmg - armor));
            
            this.state.hp -= dmg;
            UI.log(`${this.state.enemy.name} trifft dich für ${dmg} TP!`, "text-red-400");
            
            this.checkDeath();
        } else {
            UI.log(`${this.state.enemy.name} verfehlt dich.`, "text-gray-500");
        }
    },

    checkDeath: function() {
        if(this.state.hp <= 0) {
            this.state.hp = 0;
            this.state.isGameOver = true;
            UI.log("KRITISCHER STATUS: LEBENSZEICHEN ERLOSCHEN.", "text-red-700 font-bold");
            UI.renderCombat(); // Update HP display
            setTimeout(() => alert("DU BIST GESTORBEN. Lade die Seite neu."), 100);
        }
    },

    endCombat: function() {
        this.state.enemy = null;
        this.state.inDialog = false;
        UI.switchView('map');
    },

    heal: function() {
        if(this.state.caps >= 25) {
            this.state.caps -= 25;
            this.state.hp = this.calculateMaxHP(this.getStat('END'));
            UI.log("Vollständig geheilt.", "text-green-500");
            UI.update();
        } else {
            UI.log("Nicht genug Kronenkorken.", "text-red-500");
        }
    },

    upgradeStat: function(key) {
        if(this.state.statPoints > 0) {
            this.state.stats[key]++;
            this.state.statPoints--;
            
            // Recalculate HP if END changed
            if(key === 'END') {
                this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            }
            
            UI.renderChar();
            UI.update();
        }
    },
    
    buyItem: function(key) {
        const item = this.items[key];
        if(this.state.caps >= item.cost) {
            this.state.caps -= item.cost;
            this.state.equip[item.slot] = item;
            
            // Update Stats (HP might change via END)
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            if(this.state.hp > this.state.maxHp) this.state.hp = this.state.maxHp;
            
            UI.log(`${item.name} gekauft und ausgerüstet!`, "text-green-400");
            UI.renderCity(); // Shop refreshen
            UI.update();
        } else {
            UI.log("Zu wenig Kronenkorken.", "text-red-500");
        }
    }
};
