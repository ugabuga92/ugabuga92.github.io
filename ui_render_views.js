// [v0.4.15]
// Main View Renderers (Inventory, Map, Screens)
Object.assign(UI, {
    
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
        
        if(Game.state.ammo > 0) {
            totalItems += Game.state.ammo;
            const ammoBtn = document.createElement('div');
            ammoBtn.className = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center cursor-default hover:bg-green-500 hover:text-black transition-colors group";
            ammoBtn.innerHTML = `
                <div class="text-2xl">🧨</div>
                <div class="text-[10px] truncate max-w-full px-1 font-bold">Munition</div>
                <div class="absolute top-0 right-0 bg-green-900 text-white text-[10px] px-1 font-mono">${Game.state.ammo}</div>
            `;
            list.appendChild(ammoBtn);
        }
        
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
    
    renderWorldMap: function() {
        const cvs = document.getElementById('world-map-canvas');
        const details = document.getElementById('sector-details');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        const W = 10, H = 10; 
        const TILE_W = cvs.width / W;
        const TILE_H = cvs.height / H;

        // Reset: Fog of War Hintergrund
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
                    // Draw Biome
                    const biome = WorldGen.getSectorBiome(x, y);
                    ctx.fillStyle = biomeColors[biome] || '#222';
                    ctx.fillRect(x * TILE_W - 0.5, y * TILE_H - 0.5, TILE_W + 1, TILE_H + 1);

                    // Draw POIs
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

        // Draw Player Marker
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
                    i._key = k; 
                    if(!categories[i.type]) categories[i.type] = [];
                    categories[i.type].push(i);
                });
                for(let type in categories) {
                    htmlBuffer += `<h3 class="text-lg font-bold border-b border-green-500 mt-4 mb-2 uppercase text-green-300">${type}</h3>`;
                    categories[type].forEach(item => {
                        let details = `Wert: ${item.cost}`;
                        if(item.baseDmg) details += ` | DMG: ${item.baseDmg}`;
                        if(item.bonus) details += ` | Bonus: ${JSON.stringify(item.bonus).replace(/["{}]/g, '').replace(/:/g, '+')}`;
                        
                        let droppedBy = [];
                        if(Game.monsters) {
                            Object.values(Game.monsters).forEach(m => {
                                if(m.drops && m.drops.some(d => d.id === item._key)) {
                                    droppedBy.push(m.name);
                                }
                            });
                        }
                        if(droppedBy.length > 0) {
                            details += ` | <span class="text-red-300">Gedroppt von: ${droppedBy.join(', ')}</span>`;
                        }

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
        addBtn("Heilen (25 Kronkorken)", () => { UI.switchView('clinic'); }, Game.state.caps < 25 || Game.state.hp >= Game.state.maxHp);
        addBtn("Munition & Ausrüstung", () => { UI.switchView('shop'); });
        addBtn("🛠️ Werkbank / Crafting", () => this.toggleView('crafting'));
        
        // Trainingsgelände
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
        if(!container) return;
        container.innerHTML = '';
        const backBtn = document.createElement('button');
        backBtn.className = "action-button w-full mb-4 text-center border-yellow-400 text-yellow-400";
        backBtn.textContent = "SPEICHERN & ZURÜCK";
        backBtn.onclick = () => { 
            Game.saveGame(); 
            this.switchView('map'); 
        };
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
        
        const ammoBtn = document.createElement('button');
        ammoBtn.className = "action-button w-full mb-2 flex justify-between text-sm border-blue-500 text-blue-300";
        ammoBtn.innerHTML = `<span>10x Munition</span> <span>10 Kronkorken</span>`;
        if(Game.state.caps < 10) { ammoBtn.disabled = true; ammoBtn.style.opacity = 0.5; }
        else { ammoBtn.onclick = () => Game.buyAmmo(); }
        container.appendChild(ammoBtn);
    },

    renderClinic: function() {
        let container = document.getElementById('clinic-list');
        if(!container) {
             this.els.view.innerHTML = `<div class="p-4 flex flex-col items-center"><h2 class="text-2xl text-green-500 mb-4">DR. ZIMMERMANN</h2><div id="clinic-list" class="w-full max-w-md"></div></div>`;
             container = document.getElementById('clinic-list');
        }
        
        container.innerHTML = '';
        const backBtn = document.createElement('button');
        backBtn.className = "action-button w-full mb-4 text-center border-yellow-400 text-yellow-400";
        backBtn.textContent = "SPEICHERN & ZURÜCK";
        backBtn.onclick = () => { Game.saveGame(); this.switchView('map'); };
        container.appendChild(backBtn);

        const healBtn = document.createElement('button');
        healBtn.className = "action-button w-full mb-4 py-4 flex flex-col items-center border-red-500 text-red-500";
        healBtn.innerHTML = `<span class="text-2xl mb-2">💊</span><span class="font-bold">VOLLSTÄNDIGE HEILUNG</span><span class="text-sm">25 Kronkorken</span>`;
        if(Game.state.caps < 25 || Game.state.hp >= Game.state.maxHp) { 
            healBtn.disabled = true; healBtn.style.opacity = 0.5; 
            if(Game.state.hp >= Game.state.maxHp) healBtn.innerHTML += `<br><span class="text-xs text-green-500">(HP VOLL)</span>`;
        }
        else { healBtn.onclick = () => Game.heal(); }
        container.appendChild(healBtn);
    },

    renderCombat: function() {
        const enemy = Game.state.enemy;
        if(!enemy) return;
        
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
        
        const backBtn = document.createElement('button');
        backBtn.className = "action-button w-full mb-4 text-center border-yellow-400 text-yellow-400";
        backBtn.textContent = "SPEICHERN & ZURÜCK";
        backBtn.onclick = () => { Game.saveGame(); this.switchView('map'); };
        container.appendChild(backBtn);
        
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
    }
});
