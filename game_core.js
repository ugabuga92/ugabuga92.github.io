// [v0.9.3]
window.Game = {
    TILE: 30, MAP_W: 40, MAP_H: 40, WORLD_W: 10, WORLD_H: 10, 
    
    colors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {},
    items: (typeof window.GameData !== 'undefined') ? window.GameData.items : {},
    monsters: (typeof window.GameData !== 'undefined') ? window.GameData.monsters : {},
    recipes: (typeof window.GameData !== 'undefined') ? window.GameData.recipes : [],
    perkDefs: (typeof window.GameData !== 'undefined') ? window.GameData.perks : [],

    // [v0.9.0] Radio Data (Local)
    radioStations: [
        { name: "GALAXY NEWS", freq: "101.5", tracks: ["Nachrichten: Supermutanten...", "Song: 'Way Back Home'", "Three Dog: 'Awooo!'"] },
        { name: "ENCLAVE RADIO", freq: "98.2", tracks: ["Präsident Eden: 'Einheit.'", "Hymne: 'Battle Hymn'", "Marschmusik"] },
        { name: "KLASSIK FM", freq: "88.0", tracks: ["Agatha: 'Violin Solo'", "Bach: Air", "Statisches Rauschen"] }
    ],

    // [v0.9.0] Loot Prefixes
    lootPrefixes: {
        'rusty': { name: 'Rostige', dmgMult: 0.8, valMult: 0.5, color: 'text-gray-500' },
        'hardened': { name: 'Gehärtete', dmgMult: 1.2, valMult: 1.3, color: 'text-gray-300' },
        'precise': { name: 'Präzise', dmgMult: 1.1, valMult: 1.5, bonus: {PER: 1}, color: 'text-blue-300' },
        'radiated': { name: 'Verstrahlte', dmgMult: 1.0, valMult: 1.2, effect: 'rads', color: 'text-green-300' },
        'legendary': { name: 'Legendäre', dmgMult: 1.5, valMult: 3.0, bonus: {LUC: 2}, color: 'text-yellow-400 font-bold' }
    },

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

    init: function(saveData, spawnTarget=null, slotIndex=0, newName=null) {
        this.worldData = {};
        this.initCache();
        try {
            let isNewGame = false;
            // Standard POIs
            const defaultPOIs = [ {type: 'V', x: 4, y: 4}, {type: 'C', x: 3, y: 3}, {type: 'M', x: 8, y: 1}, {type: 'R', x: 1, y: 8}, {type: 'T', x: 9, y: 9} ];

            if (saveData) {
                this.state = saveData;
                // Init missing states
                if(!this.state.explored) this.state.explored = {};
                if(!this.state.radio) this.state.radio = { on: false, station: 0, trackIndex: 0 };
                if(!this.state.camp) this.state.camp = null;
                if(!this.state.knownRecipes) this.state.knownRecipes = ['craft_ammo', 'craft_stimpack_simple', 'rcp_camp']; 
                if(!this.state.perks) this.state.perks = [];
                // [v0.9.3] Dungeons check
                if(!this.state.dungeons) this.state.dungeons = []; 

                this.state.saveSlot = slotIndex;
                UI.log(">> Spielstand geladen.", "text-cyan-400");
            } else {
                isNewGame = true;
                
                // [v0.9.3] GENERATE RANDOM DUNGEONS
                // Wir erzeugen 5 zufällige Dungeons, die nicht auf POIs liegen
                let dungeons = [];
                for(let i=0; i<5; i++) {
                    let dx = Math.floor(Math.random() * 10);
                    let dy = Math.floor(Math.random() * 10);
                    // Einfacher Check gegen POIs
                    if(!defaultPOIs.some(p => p.x === dx && p.y === dy)) {
                        dungeons.push({ x: dx, y: dy, cleared: false });
                    }
                }

                this.state = {
                    saveSlot: slotIndex,
                    playerName: newName || "SURVIVOR",
                    sector: {x: 4, y: 4}, startSector: {x: 4, y: 4},
                    worldPOIs: defaultPOIs,
                    dungeons: dungeons, // [v0.9.3] NEU
                    player: {x: 20, y: 20, rot: 0},
                    stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 }, 
                    equip: { weapon: this.items.fists, body: this.items.vault_suit },
                    inventory: [], 
                    hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0, 
                    perkPoints: 0, perks: [], 
                    camp: null, 
                    radio: { on: false, station: 0, trackIndex: 0 },
                    kills: 0, 
                    view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, 
                    explored: {}, visitedSectors: ["4,4"],
                    tutorialsShown: { hacking: false, lockpicking: false },
                    quests: [ { id: "q1", title: "Der Weg nach Hause", text: "Suche Zivilisation und finde Vault 101.", read: false } ], 
                    knownRecipes: ['craft_ammo', 'craft_stimpack_simple', 'rcp_camp'], 
                    hiddenItems: {},
                    startTime: Date.now()
                };
                this.addToInventory('stimpack', 1);
                this.state.hp = this.calculateMaxHP(this.getStat('END')); 
                this.state.maxHp = this.state.hp;
                
                UI.log(">> Neuer Charakter erstellt.", "text-green-400");
                this.saveGame(); 
            }

            if (isNewGame) { this.loadSector(this.state.sector.x, this.state.sector.y); } 
            else { if(this.renderStaticMap) this.renderStaticMap(); this.reveal(this.state.player.x, this.state.player.y); }

            UI.switchView('map').then(() => { 
                if(UI.els.gameOver) UI.els.gameOver.classList.add('hidden'); 
                if(isNewGame) { setTimeout(() => UI.showPermadeathWarning(), 500); }
            });
        } catch(e) {
            console.error(e);
        }
    },

    saveGame: function() {
        if(typeof Network !== 'undefined') { Network.save(this.state); if(!this.state.isGameOver) Network.updateHighscore(this.state); }
        try { localStorage.setItem('pipboy_save', JSON.stringify(this.state)); } catch(e){}
    },

    hardReset: function() { if(typeof Network !== 'undefined') Network.deleteSave(); this.state = null; location.reload(); },

    calculateMaxHP: function(end) { 
        let bonus = 0;
        if(this.state && this.state.perks && this.state.perks.includes('toughness')) bonus += 20;
        return 100 + (end - 5) * 10 + bonus; 
    }, 
    
    getStat: function(key) {
        if(!this.state) return 5;
        let val = this.state.stats[key] || 5;
        if(this.state.equip.body && this.state.equip.body.bonus && this.state.equip.body.bonus[key]) val += this.state.equip.body.bonus[key];
        const wpn = this.state.equip.weapon;
        if(wpn) {
            if(wpn.bonus && wpn.bonus[key]) val += wpn.bonus[key];
            if(wpn.props && wpn.props.bonus && wpn.props.bonus[key]) val += wpn.props.bonus[key];
        }
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
            if(this.state.lvl % 3 === 0) {
                this.state.perkPoints++;
                UI.log("🌟 NEUER PERK PUNKT VERFÜGBAR! 🌟", "text-yellow-400 font-bold animate-pulse text-lg");
            }
            this.state.maxHp = this.calculateMaxHP(this.getStat('END'));
            this.state.hp = this.state.maxHp;
            UI.log(`LEVEL UP! Du bist jetzt Level ${this.state.lvl}`, "text-yellow-400 font-bold animate-pulse");
            this.saveGame(); 
        }
    },

    // [v0.9.0] LOOT GENERATOR
    generateLoot: function(baseId) {
        const itemDef = this.items[baseId];
        if(!itemDef || itemDef.type !== 'weapon') return { id: baseId, count: 1 };
        const roll = Math.random();
        let prefixKey = null;
        if(roll < 0.3) prefixKey = 'rusty';      
        else if(roll < 0.45) prefixKey = 'precise'; 
        else if(roll < 0.55) prefixKey = 'hardened';
        else if(roll < 0.58) prefixKey = 'radiated';
        else if(roll < 0.60) prefixKey = 'legendary';
        if(!prefixKey) return { id: baseId, count: 1 }; 
        const prefixDef = this.lootPrefixes[prefixKey];
        return {
            id: baseId, count: 1,
            props: {
                prefix: prefixKey,
                name: `${prefixDef.name} ${itemDef.name}`,
                dmgMult: prefixDef.dmgMult || 1,
                valMult: prefixDef.valMult || 1,
                bonus: prefixDef.bonus || null,
                color: prefixDef.color
            }
        };
    }
};
