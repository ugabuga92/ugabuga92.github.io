// [v3.1b] - 2026-01-03 02:00am (Economy Update)
// - Feature: Merchant has limited caps (Budget).
// - Logic: Added 'merchantCaps' to shop state.

window.Game = {
    TILE: 30, MAP_W: 40, MAP_H: 40,
    WORLD_W: 10, WORLD_H: 10, 
    
    colors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {},
    items: (typeof window.GameData !== 'undefined') ? window.GameData.items : {},
    monsters: (typeof window.GameData !== 'undefined') ? window.GameData.monsters : {},
    recipes: (typeof window.GameData !== 'undefined') ? window.GameData.recipes : [],
    perkDefs: (typeof window.GameData !== 'undefined') ? window.GameData.perks : [],
    questDefs: (typeof window.GameData !== 'undefined') ? window.GameData.questDefs : [],

    // [v2.0] Radio Data
    radioStations: [
        {
            name: "GALAXY NEWS",
            freq: "101.5",
            synthType: "square", 
            pitch: 220, 
            tracks: [
                "Nachrichten: Supermutanten in Sektor 7 gesichtet...",
                "Song: 'I Don't Want to Set the World on Fire'",
                "Three Dog: 'Kämpft den guten Kampf!'",
                "Werbung: Nuka Cola - Trink das Strahlen!"
            ]
        },
        {
            name: "ENCLAVE RADIO",
            freq: "98.2",
            synthType: "sawtooth", 
            pitch: 110,
            tracks: [
                "Präsident Eden: 'Die Wiederherstellung Amerikas...'",
                "Marschmusik: 'Stars and Stripes Forever'",
                "Hymne: 'America the Beautiful'"
            ]
        },
        {
            name: "KLASSIK FM",
            freq: "88.0",
            synthType: "sine", 
            pitch: 440,
            tracks: [
                "Agatha: 'Eine Melodie für das Ödland...'",
                "Violin Solo No. 4",
                "Bach: Cello Suite"
            ]
        }
    ],

    // [v2.0] Audio System
    Audio: {
        ctx: null, masterGain: null, noiseNode: null, noiseGain: null, osc: null, oscGain: null, analyser: null, dataArray: null,

        init: function() {
            if(this.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.4;
            this.masterGain.connect(this.ctx.destination);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 64; 
            this.masterGain.connect(this.analyser);
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
        },

        toggle: function(isOn, stationIndex) {
            this.init();
            if(this.ctx.state === 'suspended') this.ctx.resume();
            if(isOn) { this.startStatic(); this.playStation(stationIndex); } else { this.stopAll(); }
        },

        startStatic: function() {
            if(this.noiseNode) return;
            const bufferSize = this.ctx.sampleRate * 2; 
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
            this.noiseNode = this.ctx.createBufferSource();
            this.noiseNode.buffer = buffer;
            this.noiseNode.loop = true;
            this.noiseGain = this.ctx.createGain();
            this.noiseGain.gain.value = 0.05; 
            this.noiseNode.connect(this.noiseGain);
            this.noiseGain.connect(this.masterGain);
            this.noiseNode.start();
        },

        playStation: function(index) {
            if(this.osc) { this.osc.stop(); this.osc = null; }
            const station = Game.radioStations[index];
            if(!station) return;
            this.osc = this.ctx.createOscillator();
            this.osc.type = station.synthType || 'sine';
            this.osc.frequency.setValueAtTime(station.pitch || 440, this.ctx.currentTime);
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 2; 
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 10;
            lfo.connect(lfoGain);
            lfoGain.connect(this.osc.frequency);
            lfo.start();
            this.oscGain = this.ctx.createGain();
            this.oscGain.gain.value = 0.1;
            this.osc.connect(this.oscGain);
            this.oscGain.connect(this.masterGain);
            this.osc.start();
        },

        stopAll: function() {
            if(this.noiseNode) { this.noiseNode.stop(); this.noiseNode = null; }
            if(this.osc) { this.osc.stop(); this.osc = null; }
        },

        getVisualData: function() {
            if(!this.analyser) return [0,0,0,0,0];
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray;
        }
    },

    lootPrefixes: {
        'rusty': { name: 'Rostige', dmgMult: 0.8, valMult: 0.5, color: 'text-gray-500' },
        'hardened': { name: 'Gehärtete', dmgMult: 1.2, valMult: 1.3, color: 'text-gray-300' },
        'precise': { name: 'Präzise', dmgMult: 1.1, valMult: 1.5, bonus: {PER: 1}, color: 'text-blue-300' },
        'radiated': { name: 'Verstrahlte', dmgMult: 1.0, valMult: 1.2, effect: 'rads', color: 'text-green-300' },
        'legendary': { name: 'Legendäre', dmgMult: 1.5, valMult: 3.0, bonus: {LUC: 2}, color: 'text-yellow-400 font-bold' }
    },

    state: null, worldData: {}, ctx: null, loopId: null, camera: { x: 0, y: 0 }, cacheCanvas: null, cacheCtx: null,
    
    // [PERFORMANCE] Save throttling
    saveTimer: null,
    isDirty: false,

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

    getMaxSlots: function() {
        if(!this.state) return 10;
        let slots = 10; 
        slots += Math.max(0, this.getStat('STR') - 5); 
        const backpack = this.state.equip.back; 
        if(backpack && backpack.props && backpack.props.slots) {
            slots += backpack.props.slots;
        }
        return slots;
    },

    getUsedSlots: function() {
        if(!this.state || !this.state.inventory) return 0;
        return this.state.inventory.length;
    },

    getStackLimit: function(itemId) {
        if(itemId === 'ammo') return 100; 
        if(itemId === 'caps') return 99999;
        const item = this.items[itemId];
        if(!item) return 1;
        
        // [v3.1] Added 'rare' to stackable types
        if(item.type === 'component' || item.type === 'rare') return 20; 
        if(item.type === 'consumable' || item.type === 'junk') return 20; 
        if(item.type === 'ammo') return 100;
        
        return 1;
    },
    
    syncAmmo: function() {
        if(!this.state) return;
        const totalAmmo = this.state.inventory.reduce((sum, item) => {
            return item.id === 'ammo' ? sum + item.count : sum;
        }, 0);
        this.state.ammo = totalAmmo;
        if(typeof UI !== 'undefined' && UI.update) UI.update();
    },

    init: function(saveData, spawnTarget=null, slotIndex=0, newName=null) {
        this.worldData = {};
        this.initCache();
        
        // [PERFORMANCE] Save on close
        window.addEventListener('beforeunload', () => {
            if(this.isDirty) this.saveGame(true);
        });

        if(this.items) {
            this.items.backpack_small = { name: "Leder-Ranzen", type: "back", cost: 150, slot: "back", props: { slots: 5 }, icon: "🎒" };
            this.items.backpack_medium = { name: "Reiserucksack", type: "back", cost: 400, slot: "back", props: { slots: 10 }, icon: "🎒" };
            this.items.backpack_large = { name: "Militär-Rucksack", type: "back", cost: 900, slot: "back", props: { slots: 20 }, icon: "🎒" };
            this.items.ammo = { name: "Patronen (5.56mm)", type: "ammo", cost: 2, icon: "bullet" };
        }

        try {
            let isNewGame = false;
            const defaultPOIs = [ {type: 'V', x: 4, y: 4}, {type: 'C', x: 3, y: 3}, {type: 'A', x: 8, y: 1}, {type: 'R', x: 1, y: 8}, {type: 'K', x: 9, y: 9} ];

            if (saveData) {
                this.state = saveData;
                if(!this.state.explored) this.state.explored = {};
                if(!this.state.view) this.state.view = 'map';
                if(!this.state.radio) this.state.radio = { on: false, station: 0, trackIndex: 0 };
                if(typeof this.state.rads === 'undefined') this.state.rads = 0;
                if(!this.state.activeQuests) this.state.activeQuests = [];
                if(!this.state.completedQuests) this.state.completedQuests = [];
                if(!this.state.quests) this.state.quests = [];
                if(!this.state.camp) this.state.camp = null;
                if(!this.state.knownRecipes) this.state.knownRecipes = ['craft_ammo', 'craft_stimpack_simple', 'rcp_camp']; 
                if(!this.state.perks) this.state.perks = [];
                
                // [v3.1b] Merchant Budget Init for existing saves
                if(!this.state.shop) this.state.shop = { nextRestock: 0, stock: {}, merchantCaps: 1000 };
                if(typeof this.state.shop.merchantCaps === 'undefined') this.state.shop.merchantCaps = 1000;
                
                if(!this.state.equip.back) this.state.equip.back = null;
                if(!this.state.equip.head) this.state.equip.head = null;
                if(!this.state.equip.legs) this.state.equip.legs = null;
                if(!this.state.equip.feet) this.state.equip.feet = null;
                if(!this.state.equip.arms) this.state.equip.arms = null;

                this.state.saveSlot = slotIndex;
                this.checkNewQuests();
                
                if(this.state.ammo > 0 && !this.state.inventory.some(i => i.id === 'ammo')) {
                   let ammoLeft = this.state.ammo;
                   while(ammoLeft > 0) {
                       const chunk = Math.min(100, ammoLeft);
                       this.state.inventory.push({id: 'ammo', count: chunk, isNew: true});
                       ammoLeft -= chunk;
                   }
                }
                this.syncAmmo();

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
                    equip: { 
                        weapon: this.items.fists, 
                        body: this.items.vault_suit, 
                        back: null,
                        head: null,
                        legs: null,
                        feet: null,
                        arms: null
                    }, 
                    inventory: [], 
                    hp: 100, maxHp: 100, xp: 0, lvl: 1, caps: 50, ammo: 0, statPoints: 0, 
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
                    shop: { nextRestock: 0, stock: {}, merchantCaps: 1000 },
                    startTime: Date.now()
                };
                
                this.addToInventory('stimpack', 1);
                this.addToInventory('ammo', 10); 

                this.state.hp = this.calculateMaxHP(this.getStat('END')); 
                this.state.maxHp = this.state.hp;
                
                this.checkNewQuests(); 
                UI.log(">> Neuer Charakter erstellt.", "text-green-400");
                this.saveGame(true); // Force Save Initial
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

    saveGame: function(force = false) {
        // Mark as dirty (needs saving)
        this.isDirty = true;

        // If forced, save immediately and clear timer
        if (force) {
            this.performSave();
            return;
        }

        // If a timer is already running, do nothing (wait for it)
        if (this.saveTimer) return;

        // Start new timer (Debounce for 2 seconds)
        this.saveTimer = setTimeout(() => {
            this.performSave();
        }, 2000);
    },

    performSave: function() {
        if(this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }

        if(!this.isDirty) return;
        
        // [v3.0.1] Safety check: If state is already null (after logout), do nothing
        if(!this.state) return;

        if(typeof Network !== 'undefined') { 
            Network.save(this.state); 
            if(!this.state.isGameOver) Network.updateHighscore(this.state); 
        }
        try { 
            localStorage.setItem('pipboy_save', JSON.stringify(this.state)); 
        } catch(e){}
        
        this.isDirty = false;
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
        
        const slots = ['weapon', 'body', 'head', 'legs', 'feet', 'arms', 'back'];
        slots.forEach(slot => {
            const item = this.state.equip[slot];
            if(item) {
                if(item.bonus && item.bonus[key]) val += item.bonus[key];
                if(item.props && item.props.bonus && item.props.bonus[key]) val += item.props.bonus[key];
            }
        });

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
            
            // [v1.0.1] Fix: Fill HP to effective max (Max - Rads)
            this.state.hp = this.state.maxHp - (this.state.rads || 0);
            
            UI.log(`LEVEL UP! Du bist jetzt Level ${this.state.lvl}`, "text-yellow-400 font-bold animate-pulse");
            this.checkNewQuests(); 
            this.saveGame(true); // Force Save on Level Up
        } else {
            this.saveGame();
        }
    },

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
            if(def.reward) {
                if(def.reward.xp) this.gainExp(def.reward.xp);
                if(def.reward.caps) {
                    this.state.caps += def.reward.caps;
                }
                if(def.reward.items) {
                    def.reward.items.forEach(item => {
                        this.addToInventory(item.id, item.c || 1);
                    });
                }
            }
            this.state.completedQuests.push(q.id);
            
            // Trigger HUD Overlay
            if(typeof UI !== 'undefined' && UI.showQuestComplete) {
                UI.showQuestComplete(def);
            }
        }
        this.state.activeQuests.splice(index, 1);
        this.saveGame(true); // Force Save on Quest Complete
    },
    
    checkShopRestock: function() {
        const now = Date.now();
        if(!this.state.shop) this.state.shop = { nextRestock: 0, stock: {}, merchantCaps: 1000 };
        
        if(now >= this.state.shop.nextRestock) {
            const stock = {};
            // Basics
            stock['stimpack'] = 2 + Math.floor(Math.random() * 4);
            stock['radaway'] = 1 + Math.floor(Math.random() * 3);
            stock['nuka_cola'] = 3 + Math.floor(Math.random() * 5);
            
            // Ammo Packs
            this.state.shop.ammoStock = 5 + Math.floor(Math.random() * 10); 

            // Random Equipment
            const weapons = Object.keys(this.items).filter(k => this.items[k].type === 'weapon' && !k.includes('legendary') && !k.startsWith('rusty'));
            const armor = Object.keys(this.items).filter(k => this.items[k].type === 'body');
            
            const heads = Object.keys(this.items).filter(k => this.items[k].type === 'head');
            const legs = Object.keys(this.items).filter(k => this.items[k].type === 'legs');
            const feet = Object.keys(this.items).filter(k => this.items[k].type === 'feet');
            
            for(let i=0; i<3; i++) {
                const w = weapons[Math.floor(Math.random() * weapons.length)];
                if(w) stock[w] = 1;
            }
            // Mix of armor types
            const allArmor = [...armor, ...heads, ...legs, ...feet];
            for(let i=0; i<3; i++) {
                const a = allArmor[Math.floor(Math.random() * allArmor.length)];
                if(a) stock[a] = 1;
            }
            
            if(Math.random() < 0.3) stock['backpack_small'] = 1;
            if(Math.random() < 0.1) stock['backpack_medium'] = 1;

            stock['lockpick'] = 5;
            stock['camp_kit'] = 1;

            // [v3.1b] Restock Merchant Caps
            this.state.shop.merchantCaps = 500 + Math.floor(Math.random() * 1000);

            this.state.shop.stock = stock;
            this.state.shop.nextRestock = now + (15 * 60 * 1000); 
            UI.log("INFO: Der Händler hat neue Ware & Kronkorken.", "text-green-500 italic");
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
