// [v1.7.0] - Economy & Restock Logic
window.Game = {
    TILE: 30, MAP_W: 40, MAP_H: 40,
    WORLD_W: 10, WORLD_H: 10, 
    
    colors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {},
    items: (typeof window.GameData !== 'undefined') ? window.GameData.items : {},
    monsters: (typeof window.GameData !== 'undefined') ? window.GameData.monsters : {},
    recipes: (typeof window.GameData !== 'undefined') ? window.GameData.recipes : [],
    perkDefs: (typeof window.GameData !== 'undefined') ? window.GameData.perks : [],
    questDefs: (typeof window.GameData !== 'undefined') ? window.GameData.questDefs : [],

    // [v0.9.0] Radio Data
    radioStations: [
        {
            name: "GALAXY NEWS",
            freq: "101.5",
            tracks: [
                "Nachrichten: Supermutanten in Sektor 7 gesichtet...",
                "Song: 'I Don't Want to Set the World on Fire'",
                "Three Dog: 'Kämpft den guten Kampf!'",
                "Song: 'Maybe'",
                "Werbung: Nuka Cola - Trink das Strahlen!"
            ]
        },
        {
            name: "ENCLAVE RADIO",
            freq: "98.2",
            tracks: [
                "Präsident Eden: 'Die Wiederherstellung Amerikas...'",
                "Marschmusik: 'Stars and Stripes Forever'",
                "Präsident Eden: 'Vertraut eurem Präsidenten.'",
                "Hymne: 'America the Beautiful'"
            ]
        },
        {
            name: "KLASSIK FM",
            freq: "88.0",
            tracks: [
                "Agatha: 'Eine Melodie für das Ödland...'",
                "Violin Solo No. 4",
                "Bach: Cello Suite",
                "Stille (Rauschen)"
            ]
        }
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
            const defaultPOIs = [ {type: 'V', x: 4, y: 4}, {type: 'C', x: 3, y: 3}, {type: 'A', x: 8, y: 1}, {type: 'R', x: 1, y: 8}, {type: 'K', x: 9, y: 9} ];

            if (saveData) {
                this.state = saveData;
                if(!this.state.explored) this.state.explored = {};
                if(!this.state.view) this.state.view = 'map';
                if(!this.state.radio) this.state.radio = { on: false, station: 0, trackIndex: 0 };
                if(typeof this.state.rads === 'undefined') this.state.rads = 0;
                
                // [v0.9.12] Init new Quest System if missing
                if(!this.state.activeQuests) this.state.activeQuests = [];
                if(!this.state.completedQuests) this.state.completedQuests = [];

                if(!this.state.camp) this.state.camp = null;
                if(!this.state.knownRecipes) this.state.knownRecipes = ['craft_ammo', 'craft_stimpack_simple', 'rcp_camp']; 
                if(!this.state.perks) this.state.perks = [];
                
                // [v1.7.0] Init Shop State
                if(!this.state.shop) this.state.shop = { nextRestock: 0, stock: {} };

                this.state.saveSlot = slotIndex;
                this.checkNewQuests(); // Check for available quests on load
                UI.log(">> Spielstand geladen.", "text-cyan-400");
            } else {
                isNewGame = true;
                this.state = {
                    saveSlot: slotIndex,
                    playerName: newName || "SURVIVOR",
                    sector: {x: 4, y: 4}, startSector: {x: 4, y: 4},
                    worldPOIs: defaultPOIs,
                    player: {x: 20, y: 20, rot: 0},
                    stats: { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 }, 
                    equip: { weapon: this.items.fists, body: this.items.vault_suit },
                    inventory: [], 
                    hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 10, statPoints: 0, 
                    perkPoints: 0, perks: [], 
                    camp: null, 
                    radio: { on: false, station: 0, trackIndex: 0 },
                    rads: 0,
                    kills: 0, 
                    view: 'map', zone: 'Ödland', inDialog: false, isGameOver: false, 
                    explored: {}, visitedSectors: ["4,4"],
                    tutorialsShown: { hacking: false, lockpicking: false },
                    activeQuests: [], 
                    completedQuests: [],
                    quests: [], 
                    knownRecipes: ['craft_ammo', 'craft_stimpack_simple', 'rcp_camp'], 
                    hiddenItems: {},
                    // [v1.7.0] Shop Init
                    shop: { nextRestock: 0, stock: {} },
                    startTime: Date.now()
                };
                this.addToInventory('stimpack', 1);
                this.state.hp = this.calculateMaxHP(this.getStat('END')); 
                this.state.maxHp = this.state.hp;
                
                this.checkNewQuests(); 
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
        if(this.state.equip.body && this.state.equip.body.bonus && this.state.equip.body.bonus[key]) 
            val += this.state.equip.body.bonus[key];
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
            this.checkNewQuests(); // Check quests on level up
            this.saveGame(); 
        }
    },

    // [v0.9.12] QUEST SYSTEM LOGIC
    checkNewQuests: function() {
        if(!this.questDefs || !this.state) return;
        this.questDefs.forEach(def => {
            if(this.state.lvl >= def.minLvl) {
                const active = this.state.activeQuests.find(q => q.id === def.id);
                const completed = this.state.completedQuests.includes(def.id);
                if(!active && !completed) {
                    this.state.activeQuests.push({
                        id: def.id, progress: 0, max: def.amount, type: def.type, target: def.target
                    });
                    UI.log(`QUEST: "${def.title}" erhalten!`, "text-cyan-400 font-bold animate-pulse");
                }
            }
        });
    },

    updateQuestProgress: function(type, target, value=1) {
        if(!this.state || !this.state.activeQuests) return;
        let updated = false;
        for(let i = this.state.activeQuests.length - 1; i >= 0; i--) {
            const q = this.state.activeQuests[i];
            if(q.type === type) {
                let match = false;
                if(type === 'collect') match = (q.target === target); 
                if(type === 'kill') match = (q.target === target); 
                if(type === 'visit') match = (q.target === target); 
                
                if(match) {
                    q.progress += value;
                    updated = true;
                    if(q.progress >= q.max) {
                        this.completeQuest(i);
                    }
                }
            }
        }
        if(updated) UI.update();
    },

    completeQuest: function(index) {
        const q = this.state.activeQuests[index];
        const def = this.questDefs.find(d => d.id === q.id);
        if(def) {
            UI.log(`QUEST ERFÜLLT: ${def.title}!`, "text-yellow-400 font-bold animate-bounce text-lg");
            if(def.reward) {
                if(def.reward.xp) this.gainExp(def.reward.xp);
                if(def.reward.caps) {
                    this.state.caps += def.reward.caps;
                    UI.log(`Belohnung: ${def.reward.caps} Kronkorken`, "text-yellow-200");
                }
                if(def.reward.items) {
                    def.reward.items.forEach(item => {
                        this.addToInventory(item.id, item.c || 1);
                    });
                }
            }
            this.state.completedQuests.push(q.id);
        }
        this.state.activeQuests.splice(index, 1);
        this.saveGame();
    },
    
    // [v1.7.0] SHOP RESTOCK LOGIC
    checkShopRestock: function() {
        const now = Date.now();
        if(!this.state.shop) this.state.shop = { nextRestock: 0, stock: {} };
        
        if(now >= this.state.shop.nextRestock) {
            const stock = {};
            // Basics
            stock['stimpack'] = 2 + Math.floor(Math.random() * 4);
            stock['radaway'] = 1 + Math.floor(Math.random() * 3);
            stock['nuka_cola'] = 3 + Math.floor(Math.random() * 5);
            
            // Ammo Packs (simulated as ID 'ammo_pack' or just separate count)
            this.state.shop.ammoStock = 5 + Math.floor(Math.random() * 10); // 10er Packs

            // Random Equipment
            const weapons = Object.keys(this.items).filter(k => this.items[k].type === 'weapon' && !k.includes('legendary') && !k.startsWith('rusty'));
            const armor = Object.keys(this.items).filter(k => this.items[k].type === 'body');
            
            for(let i=0; i<3; i++) {
                const w = weapons[Math.floor(Math.random() * weapons.length)];
                if(w) stock[w] = 1;
            }
            for(let i=0; i<2; i++) {
                const a = armor[Math.floor(Math.random() * armor.length)];
                if(a) stock[a] = 1;
            }
            
            // Fixed Tools
            stock['lockpick'] = 5;
            stock['camp_kit'] = 1;

            this.state.shop.stock = stock;
            this.state.shop.nextRestock = now + (15 * 60 * 1000); // 15 Min
            UI.log("INFO: Der Händler hat neue Ware erhalten.", "text-green-500 italic");
        }
    },

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
            props: { prefix: prefixKey, name: `${prefixDef.name} ${itemDef.name}`, dmgMult: prefixDef.dmgMult || 1, valMult: prefixDef.valMult || 1, bonus: prefixDef.bonus || null, color: prefixDef.color }
        };
    }
};
