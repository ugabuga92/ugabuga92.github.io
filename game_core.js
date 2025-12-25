// [v0.4.16]
window.Game = {
    TILE: 30, MAP_W: 40, MAP_H: 40,
    WORLD_W: 10, WORLD_H: 10, 
    
    colors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {},
    items: (typeof window.GameData !== 'undefined') ? window.GameData.items : {},
    monsters: (typeof window.GameData !== 'undefined') ? window.GameData.monsters : {},
    recipes: (typeof window.GameData !== 'undefined') ? window.GameData.recipes : [],

    state: null, worldData: {}, ctx: null, loopId: null, camera: { x: 0, y: 0 }, cacheCanvas: null, cacheCtx: null,

    initCache: function() { 
        this.cacheCanvas = document.createElement('canvas'); 
        this.cacheCanvas.width = this.MAP_W * this.TILE; 
        this.cacheCanvas.height = this.MAP_H * this.TILE; 
        this.cacheCtx = this.cacheCanvas.getContext('2d'); 
    }, 
    
    initCanvas: function() { 
        const cvs = document.getElementById('game-canvas'); 
        if(!cvs) return; 
        const viewContainer = document.getElementById('view-container'); 
        cvs.width = viewContainer.clientWidth; 
        cvs.height = viewContainer.clientHeight; 
        this.ctx = cvs.getContext('2d'); 
        this.ctx.imageSmoothingEnabled = false;
        if(this.loopId) cancelAnimationFrame(this.loopId); 
        this.drawLoop(); 
    },

    drawLoop: function() { 
        if(this.state && this.state.view === 'map' && !this.state.isGameOver) {
            this.draw(); 
            this.loopId = requestAnimationFrame(() => this.drawLoop());
        }
    },

    // --- GAME START & SAVE ---
    init: function(saveData, spawnTarget=null, slotIndex=0, newName=null) {
        this.worldData = {};
        this.initCache();
        try {
            let isNewGame = false;
            if (saveData) {
                this.state = saveData;
                // Checks
                if(!this.state.explored || typeof this.state.explored !== 'object') this.state.explored = {};
                if(!this.state.inDialog) this.state.inDialog = false; 
                if(!this.state.view) this.state.view = 'map';
                if(!this.state.visitedSectors) this.state.visitedSectors = [];
                if(!this.state.tutorialsShown) this.state.tutorialsShown = { hacking: false, lockpicking: false };

                if(!this.state.worldPOIs) {
                    this.state.worldPOIs = [ {type: 'V', x: 4, y: 4}, {type: 'C', x: 3, y: 3} ];
                }
                this.state.saveSlot = slotIndex;
                UI.log(">> Spielstand geladen.", "text-cyan-400");
            } else {
                isNewGame = true;
                const vX = Math.floor(Math.random() * this.WORLD_W);
                const vY = Math.floor(Math.random() * this.WORLD_H);
                let cX, cY;
                do { cX = Math.floor(Math.random() * this.WORLD_W); cY = Math.floor(Math.random() * this.WORLD_H); } while(cX === vX && cY === vY);

                const worldPOIs = [ {type: 'V', x: vX, y: vY}, {type: 'C', x: cX, y: cY} ];
                let startSecX = vX, startSecY = vY, startX = 20, startY = 20;

                if (spawnTarget && spawnTarget.sector) {
                    startSecX = spawnTarget.sector.x; startSecY = spawnTarget.sector.y;
                    startX = spawnTarget.x; startY = spawnTarget.y;
                    UI.log(`>> Signal verfolgt: Sektor ${startSecX},${startSecY}`, "text-yellow-400");
                }

                this.state = {
                    saveSlot: slotIndex,
                    playerName: newName || "SURVIVOR",
                    sector: {x: startSecX, y: startSecY}, startSector: {x: vX, y: vY},
                    worldPOIs: worldPOIs,
                    player: {x: startX, y: startY, rot: 0},
                    stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 }, 
                    equip: { weapon: this.items.fists, body: this.items.vault_suit },
                    inventory: [], 
                    hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0, 
                    view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, 
                    explored: {}, sectorExploredCache: null, visitedSectors: [`${startSecX},${startSecY}`],
                    tutorialsShown: { hacking: false, lockpicking: false },
                    tempStatIncrease: {}, buffEndTime: 0, cooldowns: {}, 
                    quests: [ { id: "q1", title: "Der Weg nach Hause", text: "Suche Zivilisation und finde Vault 101.", read: false } ], 
                    startTime: Date.now(), savedPosition: null
                };
                this.addToInventory('stimpack', 1);
                this.state.hp = this.calculateMaxHP(this.getStat('END')); 
                this.state.maxHp = this.state.hp;
                
                UI.log(">> Neuer Charakter erstellt.", "text-green-400");
                this.saveGame(); 
            }

            this.loadSector(this.state.sector.x, this.state.sector.y);

            if(spawnTarget && !saveData) {
                this.state.player.x = spawnTarget.x;
                this.state.player.y = spawnTarget.y;
                this.reveal(spawnTarget.x, spawnTarget.y);
            }

            UI.switchView('map').then(() => { 
                if(UI.els.gameOver) UI.els.gameOver.classList.add('hidden'); 
                if(typeof Network !== 'undefined') Network.sendHeartbeat();
                if(isNewGame) { setTimeout(() => UI.showPermadeathWarning(), 500); }
            });
        } catch(e) {
            console.error(e);
            if(UI.error) UI.error("GAME INIT FAIL: " + e.message);
        }
    },

    saveGame: function(force=false) {
        if(typeof Network !== 'undefined') Network.save(this.state);
        try { localStorage.setItem('pipboy_save', JSON.stringify(this.state)); } catch(e){}
    },

    hardReset: function() { if(typeof Network !== 'undefined') Network.deleteSave(); this.state = null; location.reload(); },

    // --- STATS ---
    calculateMaxHP: function(end) { return 100 + (end - 5) * 10; }, 
    
    getStat: function(key) {
        if(!this.state) return 5;
        let val = this.state.stats[key] || 5;
        if(this.state.equip.body && this.state.equip.body.bonus && this.state.equip.body.bonus[key]) val += this.state.equip.body.bonus[key];
        if(this.state.equip.weapon && this.state.equip.weapon.bonus && this.state.equip.weapon.bonus[key]) val += this.state.equip.weapon.bonus[key];
        if(this.state.buffEndTime > Date.now()) val += 2; 
        return val;
    },

    expToNextLevel: function(lvl) { return Math.floor(100 * Math.pow(lvl, 1.5)); },

    gainExp: function(amount) {
        this.state.xp += amount;
        UI.log(`+${amount} XP`, "text-yellow-400");
        let next = this.expToNextLevel(this.state.lvl);
        if(this.state.xp >= next) {
            this.state.lvl++;
            this.state.xp -= next;
            this.state.statPoints++;
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            this.state.hp = this.state.maxHp;
            UI.log(`LEVEL UP! Du bist jetzt Level ${this.state.lvl}`, "text-yellow-400 font-bold animate-pulse");
        }
    }
};
