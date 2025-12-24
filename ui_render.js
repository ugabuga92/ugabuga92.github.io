// [v0.4.3]
// Extending UI object with Render methods
Object.assign(UI, {
    
    // Updates HUD and Button States
    update: function() {
        if (!Game.state) return;
        
        // Lazy load ammo element if not in core map
        if(!this.els.ammo) this.els.ammo = document.getElementById('val-ammo');
        
        // Header Info
        if(this.els.name) {
            const sectorStr = Game.state.sector ? ` [${Game.state.sector.x},${Game.state.sector.y}]` : "";
            // FIX: Nutze Charakternamen statt Account-Namen, Fallback auf Network-Name oder SURVIVOR
            const displayName = Game.state.playerName || (typeof Network !== 'undefined' ? Network.myDisplayName : "SURVIVOR");
            this.els.name.textContent = displayName + sectorStr;
        }

        if(this.els.lvl) {
            if(Game.state.statPoints > 0) {
                this.els.lvl.innerHTML = `${Game.state.lvl} <span class="text-yellow-400 animate-pulse ml-1 text-xs">LVL UP!</span>`;
            } else {
                this.els.lvl.textContent = Game.state.lvl;
            }
        }

        // Bars
        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, Math.floor((Game.state.xp / nextXp) * 100));
        if(this.els.xpTxt) this.els.xpTxt.textContent = expPct;
        if(this.els.expBarTop) this.els.expBarTop.style.width = `${expPct}%`;
        
        const maxHp = Game.state.maxHp;
        if(this.els.hp) this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`;
        if(this.els.hpBar) this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`;
        if(this.els.caps) this.els.caps.textContent = `${Game.state.caps}`;
        
        // Ammo Update
        if(this.els.ammo) {
            const ammoItem = Game.state.inventory.find(i => i.id === 'ammo');
            this.els.ammo.textContent = ammoItem ? ammoItem.count : 0;
        }

        // Glow Alerts
        let hasAlert = false;
        if(this.els.btnChar) {
            if(Game.state.statPoints > 0) { this.els.btnChar.classList.add('alert-glow-yellow'); hasAlert = true; } 
            else { this.els.btnChar.classList.remove('alert-glow-yellow'); }
        } 
        const unreadQuests = Game.state.quests.some(q => !q.read);
        if(this.els.btnQuests) {
            if(unreadQuests) { this.els.btnQuests.classList.add('alert-glow-cyan'); hasAlert = true; } 
            else { this.els.btnQuests.classList.remove('alert-glow-cyan'); }
        }
        if(this.els.btnMenu) {
            if(hasAlert) this.els.btnMenu.classList.add('alert-glow-red');
            else this.els.btnMenu.classList.remove('alert-glow-red');
        }

        // DISABLE BUTTONS DURING COMBAT
        const inCombat = Game.state.view === 'combat';
        [this.els.btnWiki, this.els.btnMap, this.els.btnChar, this.els.btnQuests, this.els.btnSave, this.els.btnLogout, this.els.btnInv].forEach(btn => {
            if(btn) {
                btn.disabled = inCombat;
            }
        });
        
        // Buff Visuals
        if(this.els.lvl) {
            if(Date.now() < Game.state.buffEndTime) this.els.lvl.classList.add('blink-red');
            else this.els.lvl.classList.remove('blink-red');
        }
    },

    shakeView: function() {
        if(this.els.view) {
            this.els.view.classList.remove('shake');
            void this.els.view.offsetWidth;
            this.els.view.classList.add('shake');
            setTimeout(() => { if(this.els.view) this.els.view.classList.remove('shake'); }, 300);
        }
    },

    toggleView: function(name) {
        if(Game.state.view === name) {
            this.switchView('map');
        } else {
            this.switchView(name);
        }
    },

    switchView: async function(name) {
        this.stopJoystick();
        this.focusIndex = -1;

        if(this.els.navMenu) {
            this.els.navMenu.classList.add('hidden');
            this.els.navMenu.style.display = 'none';
        }
        if(this.els.playerList) this.els.playerList.style.display = 'none';

        const verDisplay = document.getElementById('version-display');
        const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
        
        if (name === 'map') {
            this.els.view.innerHTML = `
                <div id="map-view" class="w-full h-full flex justify-center items-center bg-black relative">
                    <canvas id="game-canvas" class="w-full h-full object-contain" style="image-rendering: pixelated;"></canvas>
                    <button onclick="UI.switchView('worldmap')" class="absolute top-4 right-4 bg-black/80 border-2 border-green-500 text-green-500 p-2 rounded-full hover:bg-green-900 hover:text-white transition-all z-20 shadow-[0_0_15px_#39ff14] animate-pulse cursor-pointer" title="Weltkarte öffnen">
                        <span class="text-2xl">🌍</span>
                    </button>
                </div>`;
            Game.state.view = name;
            Game.initCanvas();
            this.restoreOverlay();
            this.toggleControls(true);
            this.updateButtonStates(name);
            this.update();
            return;
        }

        if(name === 'hacking') {
            this.renderHacking();
            Game.state.view = name;
            return;
        }
        if(name === 'lockpicking') {
            this.renderLockpicking(true);
            Game.state.view = name;
            return;
        }

        const path = `views/${name}.html?v=${ver}`;
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`View '${name}' not found`);
            const html = await res.text();
            this.els.view.innerHTML = html;
            Game.state.view = name;
            
            this.restoreOverlay();

            if (name === 'combat') {
                this.toggleControls(false);
                if(typeof Combat !== 'undefined' && typeof Combat.render === 'function') Combat.render();
                else this.renderCombat();
            } else {
                this.toggleControls(false);
            }
            
            if (name === 'char') this.renderChar();
            if (name === 'inventory') this.renderInventory();
            if (name === 'wiki') this.renderWiki();
            if (name === 'worldmap') this.renderWorldMap();
            if (name === 'city') this.renderCity();
            if (name === 'quests') this.renderQuests();
            if (name === 'crafting') this.renderCrafting();
            
            this.updateButtonStates(name);
            this.update();
            
            setTimeout(() => this.refreshFocusables(), 100);

        } catch (e) { this.error(`Ladefehler: ${e.message}`); }
    },

    updateButtonStates: function(activeName) {
        if(this.els.btnWiki) this.els.btnWiki.classList.toggle('active', activeName === 'wiki');
        if(this.els.btnMap) this.els.btnMap.classList.toggle('active', activeName === 'worldmap');
        if(this.els.btnChar) this.els.btnChar.classList.toggle('active', activeName === 'char');
        if(this.els.btnInv) this.els.btnInv.classList.toggle('active', activeName === 'inventory');
        if(this.els.btnQuests) this.els.btnQuests.classList.toggle('active', activeName === 'quests');
    },

    restoreOverlay: function() {
        if(document.getElementById('joystick-base')) return;
        const joystickHTML = `
            <div id="joystick-base" style="position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 2px solid rgba(57, 255, 20, 0.5); background: rgba(0, 0, 0, 0.2); display: none; pointer-events: none; z-index: 9999;"></div>
            <div id="joystick-stick" style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(57, 255, 20, 0.8); display: none; pointer-events: none; z-index: 10000; box-shadow: 0 0 10px #39ff14;"></div>
            <div id="dialog-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 50; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: auto; max-width: 90%;"></div>
        `;
        this.els.view.insertAdjacentHTML('beforeend', joystickHTML);
        this.els.joyBase = document.getElementById('joystick-base');
        this.els.joyStick = document.getElementById('joystick-stick');
        this.els.dialog = document.getElementById('dialog-overlay');
    },
    
    toggleControls: function(show) { if (!show && this.els.dialog) this.els.dialog.innerHTML = ''; },

    // --- RENDERERS ---
    
    renderHacking: function() {
        const h = MiniGames.hacking;
        let html = `
            <div class="w-full h-full flex flex-col p-2 font-mono text-green-500 bg-black overflow-hidden relative">
                <div class="flex justify-between border-b border-green-500 mb-2 pb-1">
                    <span class="font-bold">ROBCO INDUSTRIES (TM) TERM-LINK</span>
                    <span class="animate-pulse">ATTEMPTS: ${'█ '.repeat(h.attempts)}</span>
                </div>
                <div class="flex-grow flex gap-4 overflow-hidden relative">
                    <div id="hack-words" class="flex flex-col flex-wrap h-full content-start gap-x-8 text-sm">
                        </div>
                    <div class="w-1/3 border-l border-green-900 pl-2 text-xs overflow-y-auto flex flex-col-reverse" id="hack-log">
                        ${h.logs.map(l => `<div>${l}</div>`).join('')}
                    </div>
                </div>
                <button class="absolute bottom-2 right-2 border border-red-500 text-red-500 px-2 text-xs hover:bg-red-900" onclick="MiniGames.hacking.end()">ABORT</button>
            </div>
        `;
        
        if(this.els.view.innerHTML.indexOf('ROBCO') === -1) {
            this.els.view.innerHTML = html;
        } else {
             document.getElementById('hack-log').innerHTML = h.logs.map(l => `<div>${l}</div>`).join('');
             document.querySelector('.animate-pulse').textContent = `ATTEMPTS: ${'█ '.repeat(h.attempts)}`;
        }

        const wordContainer = document.getElementById('hack-words');
        if(wordContainer) {
            wordContainer.innerHTML = '';
            let buffer = "";
            h.words.forEach(word => {
                const hex = `0x${Math.floor(Math.random()*65535).toString(16).toUpperCase()}`;
                const btn = document.createElement('div');
                btn.className = "hack-row";
                btn.innerHTML = `<span class="hack-hex">${hex}</span> ${word}`;
                btn.onclick = () => MiniGames.hacking.checkWord(word);
                wordContainer.appendChild(btn);
            });
        }
    },

    renderLockpicking: function(init=false) {
        if(init) {
            this.els.view.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center bg-black relative select-none">
                    <div class="absolute top-2 left-2 text-xs text-gray-500">LEVEL: ${MiniGames.lockpicking.difficulty.toUpperCase()}</div>
                    <div class="lock-container">
                        <div class="lock-inner" id="lock-rotator"></div>
                        <div class="lock-center"></div>
                        <div class="bobby-pin" id="bobby-pin"></div>
                        <div class="screwdriver"></div>
                    </div>
                    <div class="mt-8 text-center text-sm text-green-300 font-mono">
                        <p>MAUS/TOUCH: Dietrich bewegen</p>
                        <p>LEERTASTE / KNOPF: Schloss drehen</p>
                    </div>
                    <button id="btn-turn-lock" class="mt-4 action-button w-40 h-16 md:hidden">DREHEN</button>
                    <button class="absolute bottom-4 right-4 border border-red-500 text-red-500 px-3 py-1 hover:bg-red-900" onclick="MiniGames.lockpicking.end()">ABBRECHEN</button>
                </div>
            `;
            const btn = document.getElementById('btn-turn-lock');
            if(btn) {
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); MiniGames.lockpicking.rotateLock(); });
                btn.addEventListener('touchend', (e) => { e.preventDefault(); MiniGames.lockpicking.releaseLock(); });
                btn.addEventListener('mousedown', () => MiniGames.lockpicking.rotateLock());
                btn.addEventListener('mouseup', () => MiniGames.lockpicking.releaseLock());
            }
        }
        
        const pin = document.getElementById('bobby-pin');
        const lock = document.getElementById('lock-rotator');
        
        if(pin) pin.style.transform = `rotate(${MiniGames.lockpicking.currentAngle - 90}deg)`; 
        if(lock) lock.style.transform = `rotate(${MiniGames.lockpicking.lockAngle}deg)`;
    },

    renderCharacterSelection: function(saves) {
        this.charSelectMode = true;
        this.currentSaves = saves;
        this.els.loginScreen.style.display = 'none';
        this.els.charSelectScreen.style.display = 'flex';
        this.els.charSlotsList.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = "char-slot";
            slot.dataset.index = i;
            const save = saves[i];
            
            if (save) {
                const name = save.playerName || "UNBEKANNT";
                const lvl = save.lvl || 1;
                const loc = save.sector ? `[${save.sector.x},${save.sector.y}]` : "[?,?]";
                slot.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-xl text-yellow-400 font-bold">${name}</span>
                        <span class="text-xs text-green-300">Level ${lvl} | Sektor ${loc}</span>
                    </div>
                    <div class="text-xs text-gray-500">SLOT ${i+1}</div>
                `;
            } else {
                slot.classList.add('empty-slot');
                slot.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-xl text-gray-400">[ LEER ]</span>
                        <span class="text-xs text-gray-600">Neuen Charakter erstellen</span>
                    </div>
                    <div class="text-xs text-gray-700">SLOT ${i+1}</div>
                `;
            }
            slot.onclick = () => this.selectSlot(i);
            this.els.charSlotsList.appendChild(slot);
        }
        this.selectSlot(0);
    },

    renderInventory: function() {
        const list = document.getElementById('inventory-list');
        const countDisplay = document.getElementById('inv-count');
        const capsDisplay = document.getElementById('inv-caps');
        
        if(!list || !Game.state.inventory) return;
        
        list.innerHTML = '';
        capsDisplay.textContent = Game.state.caps;
        
        let totalItems = 0;
        
        const getIcon = (type) => {
            switch(type) {
                case 'weapon': return '🔫';
                case 'body': return '🛡️';
                case 'consumable': return '💉';
                case 'junk': return '⚙️';
                case 'component': return '🔩';
                case 'rare': return '⭐';
                default: return '📦';
            }
        };

        Game.state.inventory.forEach((entry) => {
            if(entry.count <= 0) return;
            totalItems += entry.count;
            const item = Game.items[entry.id];
            
            const btn = document.createElement('div');
            btn.className = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-green-500 hover:text-black transition-colors group";
            
            btn.innerHTML = `
                <div class="text-2xl">${getIcon(item.type)}</div>
                <div class="text-[10px] truncate max-w-full px-1 font-bold">${item.name}</div>
                <div class="absolute top-0 right-0 bg-green-900 text-white text-[10px] px-1 font-mono">${entry.count}</div>
            `;
            
            btn.onclick = () => {
                 if(item.type === 'junk' || item.type === 'component' || item.type === 'rare') {
                     // Passive item
                 } else {
                     this.showItemConfirm(entry.id);
                 }
            };

            list.appendChild(btn);
        });
        
        countDisplay.textContent = totalItems;
        if(totalItems === 0) list.innerHTML = '<div class="col-span-4 text-center text-gray-500 italic mt-10">Leerer Rucksack...</div>';
    },

    renderChar: function() {
        const grid = document.getElementById('stat-grid');
        if(!grid) return;
        
        const lvlDisplay = document.getElementById('char-lvl');
        if(lvlDisplay) lvlDisplay.textContent = Game.state.lvl;
        
        const statOrder = ['STR', 'PER', 'END', 'INT', 'AGI', 'LUC'];
        
        grid.innerHTML = statOrder.map(k => {
            const val = Game.getStat(k);
            const btn = Game.state.statPoints > 0 ? `<button class="w-12 h-12 border-2 border-green-500 bg-green-900/50 text-green-400 font-bold ml-2 flex items-center justify-center hover:bg-green-500 hover:text-black transition-colors" onclick="Game.upgradeStat('${k}')" style="font-size: 1.5rem;">+</button>` : '';
            const label = (typeof window.GameData !== 'undefined' && window.GameData.statLabels && window.GameData.statLabels[k]) ? window.GameData.statLabels[k] : k;
            return `<div class="flex justify-between items-center border-b border-green-900/30 py-1 h-14"><span>${label}</span> <div class="flex items-center"><span class="text-yellow-400 font-bold mr-4 text-xl">${val}</span>${btn}</div></div>`;
        }).join('');
        
        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100);
        document.getElementById('char-exp').textContent = Game.state.xp;
        document.getElementById('char-next').textContent = nextXp;
        document.getElementById('char-exp-bar').style.width = `${expPct}%`;
        
        const pts = Game.state.statPoints;
        const ptsEl = document.getElementById('char-points');
        if (pts > 0) {
            ptsEl.innerHTML = `<span class="text-red-500 animate-pulse text-2xl font-bold bg-red-900/20 px-2 border border-red-500">${pts} VERFÜGBAR!</span>`;
        } else {
            ptsEl.textContent = pts;
        }

        const wpn = Game.state.equip.weapon || {name: "Fäuste", baseDmg: 2};
        const arm = Game.state.equip.body || {name: "Vault-Anzug", bonus: {END: 1}};
        document.getElementById('equip-weapon-name').textContent = wpn.name;
        let wpnStats = `DMG: ${wpn.baseDmg}`;
        if(wpn.bonus) { for(let s in wpn.bonus) wpnStats += ` ${s}:${wpn.bonus[s]}`; }
        document.getElementById('equip-weapon-stats').textContent = wpnStats;
        document.getElementById('equip-body-name').textContent = arm.name;
        let armStats = "";
        if(arm.bonus) { for(let s in arm.bonus) armStats += `${s}:${arm.bonus[s]} `; }
        document.getElementById('equip-body-stats').textContent = armStats || "Kein Bonus";
    },
    
    // UPDATE: Render World Map fixed for dynamic POIs
    renderWorldMap: function() {
        const cvs = document.getElementById('world-map-canvas');
        const details = document.getElementById('sector-details');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        const W = 10, H = 10; 
        const TILE_W = cvs.width / W;
        const TILE_H = cvs.height / H;

        // Reset: Fog of War Hintergrund (Dunkelgrün/Schwarz)
        ctx.fillStyle = "#050a05"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // Biome Colors
        const biomeColors = {
            'wasteland': '#4a4036',
            'forest': '#1a3300',
            'jungle': '#0f2405',
            'desert': '#8b5a2b',
            'swamp': '#1e1e11',
            'mountain': '#333333',
            'city': '#444455',
            'vault': '#002244'
        };

        for(let y=0; y<H; y++) {
            for(let x=0; x<W; x++) {
                const key = `${x},${y}`;
                const isVisited = Game.state.visitedSectors && Game.state.visitedSectors.includes(key);
                const isCurrent = (x === Game.state.sector.x && y === Game.state.sector.y);

                if(isVisited) {
                    // 1. Draw Biome Background
                    const biome = WorldGen.getSectorBiome(x, y);
                    ctx.fillStyle = biomeColors[biome] || '#222';
                    ctx.fillRect(x * TILE_W - 0.5, y * TILE_H - 0.5, TILE_W + 1, TILE_H + 1);

                    // 2. Draw Dynamic POIs (NEW Logic)
                    if(Game.state.worldPOIs) {
                        const poi = Game.state.worldPOIs.find(p => p.x === x && p.y === y);
                        if(poi) {
                            ctx.font = "bold 20px monospace";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            if(poi.type === 'C') {
                                ctx.fillStyle = "#00ffff"; 
                                ctx.fillText("🏙️", x * TILE_W + TILE_W/2, y * TILE_H + TILE_H/2);
                            } else if(poi.type === 'V') {
                                ctx.fillStyle = "#ffff00";
                                ctx.fillText("⚙️", x * TILE_W + TILE_W/2, y * TILE_H + TILE_H/2);
                            }
                        }
                    }

                    if(isCurrent && details) {
                        details.innerHTML = `SEKTOR [${x},${y}]<br><span class="text-white">${biome.toUpperCase()}</span>`;
                    }
                }
            }
        }

        // Draw Player Marker on top of everything
        const px = Game.state.sector.x * TILE_W + TILE_W/2;
        const py = Game.state.sector.y * TILE_H + TILE_H/2;
        
        const pulse = (Date.now() % 1000) / 1000;
        
        ctx.beginPath();
        ctx.arc(px, py, 4 + (pulse * 8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57, 255, 20, ${0.6 - pulse * 0.6})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#39ff14";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();

        if(Game.state.view === 'worldmap') {
            requestAnimationFrame(() => this.renderWorldMap());
        }
    },

    renderWiki: function(category = 'monsters') {
        const content = document.getElementById('wiki-content');
        if(!content) return;
        
        ['monsters', 'items', 'crafting', 'locs'].forEach(cat => {
            const btn = document.getElementById(`wiki-btn-${cat}`);
            if(btn) {
                if(cat === category) {
                    btn.classList.add('bg-green-500', 'text-black');
                    btn.classList.remove('text-green-500');
                } else {
                    btn.classList.remove('bg-green-500', 'text-black');
                    btn.classList.add('text-green-500');
                }
            }
        });

        let htmlBuffer = '';
        if(category === 'monsters') {
            Object.keys(Game.monsters).forEach(k => {
                const m = Game.monsters[k];
                const xpText = Array.isArray(m.xp) ? `${m.xp[0]}-${m.xp[1]}` : m.xp;
                let dropsText = "Nichts";
                if(m.drops) {
                    dropsText = m.drops.map(d => {
                        const item = Game.items[d.id];
                        return `${item ? item.name : d.id} (${Math.round(d.c*100)}%)`;
                    }).join(', ');
                }
                htmlBuffer += `
                    <div class="border border-green-900 bg-green-900/10 p-3 mb-2">
                        <div class="flex justify-between items-start">
                            <div class="font-bold text-yellow-400 text-xl">${m.name} ${m.isLegendary ? '★' : ''}</div>
                            <div class="text-xs border border-green-700 px-1">LVL ${m.minLvl}+</div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div>HP: <span class="text-white">${m.hp}</span></div>
                            <div>DMG: <span class="text-red-400">${m.dmg}</span></div>
                            <div>XP: <span class="text-cyan-400">${xpText}</span></div>
                            <div>Caps: <span class="text-yellow-200">~${m.loot}</span></div>
                        </div>
                        <div class="mt-2 text-xs border-t border-green-900 pt-1 text-gray-400">
                            Beute: <span class="text-green-300">${dropsText}</span>
                        </div>
                    </div>`;
            });
        } else if (category === 'items') {
            const categories = {};
            if (Game.items) {
                Object.keys(Game.items).forEach(k => {
                    const i = Game.items[k];
                    if(!categories[i.type]) categories[i.type] = [];
                    categories[i.type].push(i);
                });
                for(let type in categories) {
                    htmlBuffer += `<h3 class="text-lg font-bold border-b border-green-500 mt-4 mb-2 uppercase text-green-300">${type}</h3>`;
                    categories[type].forEach(item => {
                        let details = `Wert: ${item.cost}`;
                        if(item.baseDmg) details += ` | DMG: ${item.baseDmg}`;
                        if(item.bonus) details += ` | Bonus: ${JSON.stringify(item.bonus).replace(/["{}]/g, '').replace(/:/g, '+')}`;
                        htmlBuffer += `
                            <div class="flex justify-between items-center border-b border-green-900/30 py-1">
                                <span class="font-bold text-white">${item.name}</span>
                                <span class="text-xs text-gray-400">${details}</span>
                            </div>`;
                    });
                }
            }
        } else if (category === 'crafting') {
            if (Game.recipes) {
                Game.recipes.forEach(r => {
                    const outName = r.out === "AMMO" ? "Munition x15" : (Game.items[r.out] ? Game.items[r.out].name : r.out);
                    const reqs = Object.keys(r.req).map(rid => {
                        const iName = Game.items[rid] ? Game.items[rid].name : rid;
                        return `${r.req[rid]}x ${iName}`;
                    }).join(', ');
                    htmlBuffer += `
                        <div class="border border-green-900 p-2 mb-2 bg-green-900/10">
                            <div class="font-bold text-yellow-400">${outName} <span class="text-xs text-gray-500 ml-2">(Lvl ${r.lvl})</span></div>
                            <div class="text-xs text-green-300 italic">Benötigt: ${reqs}</div>
                        </div>`;
                });
            }
        } else if (category === 'locs') {
             const locs = [
                {name: "Vault 101", desc: "Startpunkt. Sicherer Hafen. Bietet kostenlose Heilung."},
                {name: "Rusty Springs", desc: "Zentrale Handelsstadt [3,3]. Händler, Heiler und Werkbank."},
                {name: "Supermarkt", desc: "Zufällige Ruine. Mittlere Gefahr, viele Raider."},
                {name: "Alte Höhlen", desc: "Zufälliger Dungeon. Dunkel, Skorpione und Insekten."},
                {name: "Oasis", desc: "Sektor [0,0] bis [1,1]. Dichter Dschungel im Nordwesten."},
                {name: "The Pitt", desc: "Sektor [6,6] bis [7,7]. Tödliche Wüste im Südosten."},
                {name: "Sumpf", desc: "Sektor [6,0] bis [7,1]. Giftiges Wasser und Mirelurks."}
            ];
            locs.forEach(l => {
                htmlBuffer += `
                    <div class="mb-3 border-l-2 border-green-500 pl-2">
                        <div class="font-bold text-cyan-400 text-lg uppercase">${l.name}</div>
                        <div class="text-sm text-green-200 leading-tight">${l.desc}</div>
                    </div>`;
            });
        }
        content.innerHTML = htmlBuffer;
    },

    renderQuests: function() {
        const list = document.getElementById('quest-list');
        if(!list) return;
        list.innerHTML = '';
        if(!Game.state.quests || Game.state.quests.length === 0) {
            list.innerHTML = '<div class="text-gray-500 italic text-center mt-10">Keine aktiven Aufgaben.</div>';
            return;
        }
        Game.state.quests.forEach(q => {
            const div = document.createElement('div');
            div.className = "border border-green-900 bg-green-900/10 p-3 mb-2";
            if(!q.read) { div.classList.add('border-l-4', 'border-l-green-400'); q.read = true; }
            div.innerHTML = `
                <div class="font-bold text-yellow-400 text-lg mb-1">${q.title}</div>
                <div class="text-green-200 text-sm leading-relaxed">${q.text}</div>
            `;
            list.appendChild(div);
        });
    },

    renderCity: function() {
        const con = document.getElementById('city-options');
        if(!con) return;
        con.innerHTML = '';
        const addBtn = (txt, cb, disabled=false) => {
            const b = document.createElement('button');
            b.className = "action-button w-full mb-2 text-left p-3 flex justify-between";
            b.innerHTML = txt;
            b.onclick = cb;
            if(disabled) { b.disabled = true; b.style.opacity = 0.5; }
            con.appendChild(b);
        };
        addBtn("Heilen (25 Kronkorken)", () => Game.heal(), Game.state.caps < 25 || Game.state.hp >= Game.state.maxHp);
        addBtn("Munition (10 Stk / 10 Kronkorken)", () => Game.buyAmmo(), Game.state.caps < 10);
        addBtn("Händler / Waffen & Rüstung", () => this.renderShop(con));
        addBtn("🛠️ Werkbank / Crafting", () => this.toggleView('crafting'));
        
        // NEU: Trainingsgelände für Minigames
        addBtn("🔒 Trainingsgelände (Hacking/Lockpick)", () => {
             con.innerHTML = '';
             const back = document.createElement('button');
             back.className = "action-button w-full mb-4 border-yellow-400 text-yellow-400";
             back.textContent = "ZURÜCK";
             back.onclick = () => this.renderCity();
             con.appendChild(back);
             
             const hack = document.createElement('button');
             hack.className = "action-button w-full mb-2";
             hack.textContent = "TERMINAL HACKEN (EASY)";
             hack.onclick = () => MiniGames.hacking.start('easy');
             con.appendChild(hack);

             const pick = document.createElement('button');
             pick.className = "action-button w-full mb-2";
             pick.textContent = "SCHLOSS KNACKEN (EASY)";
             pick.onclick = () => MiniGames.lockpicking.start('easy');
             con.appendChild(pick);
        });
        
        addBtn("Stadt verlassen", () => this.switchView('map'));
    },
    
    renderShop: function(container) {
        container.innerHTML = '';
        const backBtn = document.createElement('button');
        backBtn.className = "action-button w-full mb-4 text-center border-yellow-400 text-yellow-400";
        backBtn.textContent = "ZURÜCK ZUM PLATZ";
        backBtn.onclick = () => this.renderCity();
        container.appendChild(backBtn);
        Object.keys(Game.items).forEach(key => {
            const item = Game.items[key];
            if(item.cost > 0 && Game.state.lvl >= (item.requiredLevel || 0) - 2) {
                const canAfford = Game.state.caps >= item.cost;
                const isEquipped = (Game.state.equip[item.slot] && Game.state.equip[item.slot].name === item.name);
                let label = `<span>${item.name}</span> <span>${item.cost} Kronkorken</span>`;
                if(isEquipped) label = `<span class="text-green-500">[AUSGERÜSTET]</span>`;
                const btn = document.createElement('button');
                btn.className = "action-button w-full mb-2 flex justify-between text-sm";
                btn.innerHTML = label;
                if(!canAfford || isEquipped) { btn.disabled = true; btn.style.opacity = 0.5; }
                else { btn.onclick = () => Game.buyItem(key); }
                container.appendChild(btn);
            }
        });
    },

    renderCombat: function() {
        const enemy = Game.state.enemy;
        if(!enemy) return;
        // Fix from previous update
        const nameEl = document.getElementById('enemy-name');
        if(nameEl) nameEl.textContent = enemy.name;
        
        document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`;
        document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`;
    },
    
    renderSpawnList: function(players) {
        if(!this.els.spawnList) return;
        this.els.spawnList.innerHTML = '';
        if(Object.keys(players).length === 0) {
            this.els.spawnList.innerHTML = '<div class="text-gray-500 italic">Keine Signale gefunden...</div>';
            return;
        }
        for(let pid in players) {
            const p = players[pid];
            const btn = document.createElement('button');
            btn.className = "action-button w-full mb-2 text-left text-xs";
            btn.innerHTML = `SIGNAL: ${p.name} <span class="float-right">[${p.sector.x},${p.sector.y}]</span>`;
            btn.onclick = () => {
                this.els.spawnScreen.style.display = 'none';
                this.startGame(null, this.selectedSlot, null);
                Game.state.player.x = p.x;
                Game.state.player.y = p.y;
                Game.state.sector = p.sector;
                Game.changeSector(p.sector.x, p.sector.y);
            };
            this.els.spawnList.appendChild(btn);
        }
    },

    renderCrafting: function() {
        const container = document.getElementById('crafting-list');
        if(!container) return;
        container.innerHTML = '';
        
        Game.recipes.forEach(recipe => {
            const outItem = recipe.out === 'AMMO' ? {name: "15x Munition"} : Game.items[recipe.out];
            const div = document.createElement('div');
            div.className = "border border-green-900 bg-green-900/10 p-3 mb-2";
            let reqHtml = '';
            let canCraft = true;
            for(let reqId in recipe.req) {
                const countNeeded = recipe.req[reqId];
                const invItem = Game.state.inventory.find(i => i.id === reqId);
                const countHave = invItem ? invItem.count : 0;
                let color = "text-green-500";
                if (countHave < countNeeded) { canCraft = false; color = "text-red-500"; }
                reqHtml += `<div class="${color} text-xs">• ${Game.items[reqId].name}: ${countHave}/${countNeeded}</div>`;
            }
            if(Game.state.lvl < recipe.lvl) { canCraft = false; reqHtml += `<div class="text-red-500 text-xs mt-1">Benötigt Level ${recipe.lvl}</div>`; }
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="font-bold text-yellow-400 text-lg">${outItem.name}</div>
                    <button class="action-button text-sm px-3" onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>FERTIGEN</button>
                </div>
                <div class="pl-2 border-l-2 border-green-900">${reqHtml}</div>
            `;
            container.appendChild(div);
        });
    },

    // OVERLAYS

    showItemConfirm: function(itemId) {
        if(!this.els.dialog) this.restoreOverlay();
        if(!Game.items[itemId]) return;
        const item = Game.items[itemId];
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        let statsText = "";
        if(item.type === 'consumable') statsText = `Effekt: ${item.effect} (${item.val})`;
        if(item.type === 'weapon') statsText = `Schaden: ${item.baseDmg}`;
        if(item.type === 'body') statsText = `Rüstung: +${item.bonus.END || 0} END`;
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4";
        box.innerHTML = `
            <h2 class="text-xl font-bold text-green-400 mb-2">${item.name}</h2>
            <div class="text-xs text-green-200 mb-4 border-t border-b border-green-900 py-2">Typ: ${item.type.toUpperCase()}<br>Wert: ${item.cost} KK<br><span class="text-yellow-400">${statsText}</span></div>
            <p class="text-green-200 mb-4 text-sm">Gegenstand benutzen / ausrüsten?</p>
        `;
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-2 justify-center w-full";
        const btnYes = document.createElement('button');
        btnYes.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full";
        btnYes.textContent = "BESTÄTIGEN";
        btnYes.onclick = () => { Game.useItem(itemId); this.leaveDialog(); };
        const btnNo = document.createElement('button');
        btnNo.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full";
        btnNo.textContent = "ABBRUCH";
        btnNo.onclick = () => { this.leaveDialog(); };
        btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo);
        box.appendChild(btnContainer); this.els.dialog.appendChild(box);
        this.refreshFocusables();
    },

    showDungeonWarning: function(callback) {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-red-600 p-4 shadow-[0_0_20px_red] max-w-sm text-center animate-pulse mb-4";
        box.innerHTML = `
            <h2 class="text-3xl font-bold text-red-600 mb-2 tracking-widest">⚠️ WARNING ⚠️</h2>
            <p class="text-red-400 mb-4 font-bold">HOHE GEFAHR!<br>Sicher, dass du eintreten willst?</p>
        `;
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-2 justify-center w-full";
        const btnYes = document.createElement('button');
        btnYes.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full";
        btnYes.textContent = "BETRETEN";
        btnYes.onclick = () => { this.leaveDialog(); if(callback) callback(); };
        const btnNo = document.createElement('button');
        btnNo.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full";
        btnNo.textContent = "FLUCHT";
        btnNo.onclick = () => { this.leaveDialog(); };
        btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo);
        box.appendChild(btnContainer); this.els.dialog.appendChild(box);
        this.refreshFocusables();
    },

    showDungeonLocked: function(minutesLeft) {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-gray-600 p-4 shadow-[0_0_20px_gray] max-w-sm text-center mb-4";
        box.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-400 mb-2 tracking-widest">🔒 LOCKED</h2>
            <p class="text-gray-300 mb-4 font-bold">Dieses Gebiet ist versiegelt.<br>Versuche es in ${minutesLeft} Minuten wieder.</p>
        `;
        const btn = document.createElement('button');
        btn.className = "border border-gray-500 text-gray-500 hover:bg-gray-900 px-4 py-2 font-bold w-full";
        btn.textContent = "VERSTANDEN";
        btn.onclick = () => this.leaveDialog();
        box.appendChild(btn); this.els.dialog.appendChild(box);
        this.refreshFocusables();
    },

    showDungeonVictory: function(caps, lvl) {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-yellow-400 p-6 shadow-[0_0_30px_gold] max-w-md text-center mb-4 animate-bounce";
        box.innerHTML = `
            <div class="text-6xl mb-2">👑⚔️</div>
            <h2 class="text-4xl font-bold text-yellow-400 mb-2 tracking-widest text-shadow-gold">VICTORY!</h2>
            <p class="text-yellow-200 mb-4 font-bold text-lg">DUNGEON (LVL ${lvl}) GECLEARED!</p>
            <div class="text-2xl text-white font-bold border-t border-b border-yellow-500 py-2 mb-4 bg-yellow-900/30">+${caps} KRONKORKEN</div>
            <p class="text-xs text-yellow-600">Komme in 10 Minuten wieder!</p>
        `;
        this.els.dialog.appendChild(box);
    },
    
    showPermadeathWarning: function() {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-red-600 p-6 shadow-[0_0_50px_red] max-w-lg text-center animate-pulse";
        box.innerHTML = `
            <div class="text-6xl text-red-600 mb-4 font-bold">☠️</div>
            <h1 class="text-4xl font-bold text-red-600 mb-4 tracking-widest border-b-2 border-red-600 pb-2">PERMADEATH AKTIV</h1>
            <p class="text-red-400 font-mono text-lg mb-6 leading-relaxed">WARNUNG, BEWOHNER!<br>Das Ödland kennt keine Gnade.<br>Wenn deine HP auf 0 fallen, wird dieser Charakter<br><span class="font-bold text-white bg-red-900 px-1">DAUERHAFT GELÖSCHT</span>.</p>
            <button class="action-button w-full border-red-600 text-red-500 font-bold py-4 text-xl hover:bg-red-900" onclick="UI.leaveDialog()">ICH HABE VERSTANDEN</button>
        `;
        this.els.dialog.appendChild(box);
    },

    showGameOver: function() {
        if(this.els.gameOver) this.els.gameOver.classList.remove('hidden');
        this.toggleControls(false);
    },
    
    showManualOverlay: async function() {
        const overlay = document.getElementById('manual-overlay');
        const content = document.getElementById('manual-content');
        if(this.els.navMenu) { this.els.navMenu.classList.add('hidden'); this.els.navMenu.style.display = 'none'; }
        if(overlay && content) {
            content.innerHTML = '<div class="text-center animate-pulse">Lade Handbuch...</div>';
            overlay.style.display = 'flex'; overlay.classList.remove('hidden');
            const verDisplay = document.getElementById('version-display'); 
            const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
            try { 
                const res = await fetch(`readme.md?v=${ver}`); 
                if (!res.ok) throw new Error("Manual not found"); 
                let text = await res.text(); 
                text = text.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-yellow-400 mb-2 border-b border-yellow-500">$1</h1>');
                text = text.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-green-400 mt-4 mb-2">$1</h2>');
                text = text.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-green-300 mt-2 mb-1">$1</h3>');
                text = text.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
                text = text.replace(/\n/gim, '<br>');
                text += '<br><button class="action-button w-full mt-4 border-red-500 text-red-500" onclick="document.getElementById(\'manual-overlay\').classList.add(\'hidden\'); document.getElementById(\'manual-overlay\').style.display=\'none\';">SCHLIESSEN (ESC)</button>';
                content.innerHTML = text; 
            } catch(e) { content.innerHTML = `<div class="text-red-500">Fehler beim Laden: ${e.message}</div>`; }
        }
    },

    showChangelogOverlay: async function() {
        const overlay = document.getElementById('changelog-overlay');
        const content = document.getElementById('changelog-content');
        if(overlay && content) {
            content.textContent = 'Lade Daten...';
            overlay.style.display = 'flex'; overlay.classList.remove('hidden');
            const verDisplay = document.getElementById('version-display'); 
            const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
            try { const res = await fetch(`change.log?v=${ver}`); if (!res.ok) throw new Error("Logfile nicht gefunden"); const text = await res.text(); content.textContent = text; } catch(e) { content.textContent = `Fehler beim Laden: ${e.message}`; }
        }
    },
    
    showMobileControlsHint: function() {
        if(document.getElementById('mobile-hint')) return;
        const hintHTML = `
            <div id="mobile-hint" class="absolute inset-0 z-[100] flex flex-col justify-center items-center bg-black/80 pointer-events-auto backdrop-blur-sm opacity-0 transition-opacity duration-500" onclick="this.style.opacity='0'; setTimeout(() => this.remove(), 500)">
                <div class="border-2 border-[#39ff14] bg-black p-6 text-center shadow-[0_0_20px_#39ff14] max-w-sm mx-4">
                    <div class="text-5xl mb-4 animate-bounce">👆</div>
                    <h2 class="text-2xl font-bold text-[#39ff14] mb-2 tracking-widest border-b border-[#39ff14] pb-2">TOUCH STEUERUNG</h2>
                    <p class="text-green-300 mb-6 font-mono leading-relaxed">Tippe und halte IRGENDWO auf dem Hauptschirm (auch im Log), um den Joystick zu aktivieren.</p>
                    <div class="text-xs text-[#39ff14] animate-pulse font-bold bg-[#39ff14]/20 py-2 rounded">> TIPPEN ZUM STARTEN <</div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', hintHTML);
        setTimeout(() => { const el = document.getElementById('mobile-hint'); if(el) el.classList.remove('opacity-0'); }, 10);
    },

    enterVault: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const restBtn = document.createElement('button'); restBtn.className = "action-button w-full mb-1 border-blue-500 text-blue-300"; restBtn.textContent = "Ausruhen (Gratis)"; restBtn.onclick = () => { Game.rest(); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weiter geht's"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(restBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'flex'; },
    leaveDialog: function() { Game.state.inDialog = false; this.els.dialog.style.display = 'none'; this.update(); },

    updatePlayerList: function() {
        if(!this.els.playerListContent || typeof Network === 'undefined') return;
        this.els.playerListContent.innerHTML = '';
        const myName = Network.myDisplayName || "ICH";
        const mySec = (Game.state && Game.state.sector) ? `[${Game.state.sector.x},${Game.state.sector.y}]` : "[?,?]";
        const myEntry = document.createElement('div');
        myEntry.className = "text-green-400 font-bold border-b border-green-900 py-1";
        myEntry.textContent = `> ${myName} ${mySec}`;
        this.els.playerListContent.appendChild(myEntry);
        for(let pid in Network.otherPlayers) {
            const p = Network.otherPlayers[pid];
            const div = document.createElement('div');
            div.className = "text-green-200 text-sm py-1";
            const pSec = p.sector ? `[${p.sector.x},${p.sector.y}]` : "[?,?]";
            div.textContent = `${p.name} ${pSec}`;
            this.els.playerListContent.appendChild(div);
        }
    },
    
    togglePlayerList: function() {
        if(!this.els.playerList) return;
        if(this.els.playerList.style.display === 'flex') {
            this.els.playerList.style.display = 'none';
        } else {
            this.els.playerList.style.display = 'flex';
            this.updatePlayerList();
        }
    }
});
