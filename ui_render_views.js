// [v1.5.0] - 2025-12-30 17:00 (Shop Overhaul - UI)
// ------------------------------------------------
// - UI Change: Handelsposten nun in Kategorien unterteilt (Waffen, Kleidung, Hilfsmittel, etc.).
// - UI Change: Bessere visuelle Darstellung und 'Im Besitz' Marker bei ausgerüsteten Items.
// - Integration: Klick öffnet nun den neuen 'showShopConfirm' Dialog.

Object.assign(UI, {
    
    // ... (renderCharacterSelection, renderInventory, renderChar, renderPerksList, renderRadio, renderCamp, renderWorldMap, renderWiki, renderQuests, renderCity bleiben unverändert) ...

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
        
        // Ammo Display
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
                case 'blueprint': return '📜'; 
                case 'tool': return '⛺';
                default: return '📦';
            }
        };

        Game.state.inventory.forEach((entry, index) => {
            if(entry.count <= 0) return;
            
            const item = Game.items[entry.id];
            if(!item) return;

            totalItems += entry.count;
            
            const btn = document.createElement('div');
            btn.className = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-green-500 hover:text-black transition-colors group";
            
            if(entry.isNew) {
                btn.style.boxShadow = "0 0 8px rgba(57, 255, 20, 0.6)";
                btn.classList.replace('border-green-500', 'border-green-300'); 
                btn.onmouseenter = () => {
                    if(entry.isNew) {
                        entry.isNew = false;
                        btn.style.boxShadow = "none";
                        btn.classList.replace('border-green-300', 'border-green-500');
                    }
                };
            }

            let displayName = item.name;
            let extraClass = "";

            if(entry.props) {
                displayName = entry.props.name;
                if(entry.props.color) {
                    extraClass = entry.props.color;
                }
            }

            btn.innerHTML = `
                <div class="text-2xl">${getIcon(item.type)}</div>
                <div class="text-[10px] truncate max-w-full px-1 font-bold ${extraClass}">${displayName}</div>
                <div class="absolute top-0 right-0 bg-green-900 text-white text-[10px] px-1 font-mono">${entry.count}</div>
            `;
            
            // --- OVERLAY: EQUIPPED / ACTIVE ---
            let isEquipped = false;
            let label = "AUSGERÜSTET";
            
            if(Game.state.equip.weapon && Game.state.equip.weapon.name === displayName) isEquipped = true;
            if(Game.state.equip.body && Game.state.equip.body.name === displayName) isEquipped = true;
            
            if(entry.id === 'camp_kit' && Game.state.camp) { isEquipped = true; label = "AUFGESTELLT"; }

            if(isEquipped) {
                const overlay = document.createElement('div');
                overlay.className = "absolute inset-0 bg-black/60 border-2 border-green-500 flex items-center justify-center text-green-500 font-bold tracking-widest text-[10px] pointer-events-none";
                overlay.textContent = label;
                btn.appendChild(overlay);
                btn.style.borderColor = "#39ff14"; 
            }
            
            btn.onclick = () => {
                 UI.showItemConfirm(index);
            };

            list.appendChild(btn);
        });
        
        countDisplay.textContent = totalItems;
        if(totalItems === 0) list.innerHTML = '<div class="col-span-4 text-center text-gray-500 italic mt-10">Leerer Rucksack...</div>';
    },

    renderChar: function(mode = 'stats') {
        const grid = document.getElementById('stat-grid');
        const perksContainer = document.getElementById('perk-container');
        
        if(!grid) return; 

        // Update Header Info
        const lvlDisplay = document.getElementById('char-lvl');
        if(lvlDisplay) lvlDisplay.textContent = Game.state.lvl;

        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100);
        
        const elExp = document.getElementById('char-exp');
        const elNext = document.getElementById('char-next');
        const elBar = document.getElementById('char-exp-bar');
        
        if(elExp) elExp.textContent = Game.state.xp;
        if(elNext) elNext.textContent = nextXp;
        if(elBar) elBar.style.width = `${expPct}%`;

        // Update Points Display
        const pts = Game.state.statPoints || 0;
        const ptsEl = document.getElementById('char-points');
        if(ptsEl) {
            if (pts > 0) {
                ptsEl.innerHTML = `<span class="text-red-500 animate-pulse text-2xl font-bold bg-red-900/20 px-2 border border-red-500">${pts} VERFÜGBAR!</span>`;
            } else {
                ptsEl.textContent = pts;
            }
        }
        
        // Equipment Info
        const wpn = Game.state.equip.weapon || {name: "Fäuste", baseDmg: 2};
        const arm = Game.state.equip.body || {name: "Vault-Anzug", bonus: {END: 1}};
        const elWpnName = document.getElementById('equip-weapon-name');
        const elWpnStats = document.getElementById('equip-weapon-stats');
        const elArmName = document.getElementById('equip-body-name');
        const elArmStats = document.getElementById('equip-body-stats');

        if(elWpnName) elWpnName.textContent = wpn.props ? wpn.props.name : wpn.name;
        if(elWpnStats) {
            let dmg = wpn.baseDmg;
            if(wpn.props && wpn.props.dmgMult) dmg = Math.floor(dmg * wpn.props.dmgMult);
            let wpnStats = `DMG: ${dmg}`;
            if(wpn.bonus) { for(let s in wpn.bonus) wpnStats += ` ${s}:${wpn.bonus[s]}`; }
            elWpnStats.textContent = wpnStats;
        }
        if(elArmName) elArmName.textContent = arm.props ? arm.props.name : arm.name;
        if(elArmStats) {
            let armStats = "";
            if(arm.bonus) { for(let s in arm.bonus) armStats += `${s}:${arm.bonus[s]} `; }
            elArmStats.textContent = armStats || "Kein Bonus";
        }
        
        // Perks Button Update
        const perkPoints = Game.state.perkPoints || 0;
        const perkBtn = document.getElementById('btn-show-perks');
        if(perkBtn) {
             perkBtn.innerHTML = `PERKS ${perkPoints > 0 ? `<span class="bg-yellow-400 text-black px-1 ml-1 text-xs animate-pulse">${perkPoints}</span>` : ''}`;
        }
        
        // Toggle Buttons Style
        const btnStats = document.getElementById('btn-show-stats');
        if(btnStats && perkBtn) {
             if(mode === 'stats') {
                 btnStats.className = "flex-1 py-2 font-bold bg-green-900/40 text-green-400 border border-green-500 transition-colors";
                 perkBtn.className = "flex-1 py-2 font-bold bg-black text-gray-500 border border-gray-700 hover:text-green-400 transition-colors ml-[-1px]";
             } else {
                 btnStats.className = "flex-1 py-2 font-bold bg-black text-gray-500 border border-gray-700 hover:text-green-400 transition-colors";
                 perkBtn.className = "flex-1 py-2 font-bold bg-green-900/40 text-green-400 border border-green-500 transition-colors ml-[-1px]";
             }
        }

        if(mode === 'stats') {
             grid.style.display = 'block';
             if(perksContainer) perksContainer.style.display = 'none';
             
             const statOrder = ['STR', 'PER', 'END', 'INT', 'AGI', 'LUC'];
             grid.innerHTML = statOrder.map(k => {
                const val = Game.getStat(k);
                const btn = Game.state.statPoints > 0 ? `<button class="w-12 h-12 border-2 border-green-500 bg-green-900/50 text-green-400 font-bold ml-2 flex items-center justify-center hover:bg-green-500 hover:text-black transition-colors" onclick="Game.upgradeStat('${k}', event)" style="font-size: 1.5rem;">+</button>` : '';
                const label = (typeof window.GameData !== 'undefined' && window.GameData.statLabels && window.GameData.statLabels[k]) ? window.GameData.statLabels[k] : k;
                return `<div class="flex justify-between items-center border-b border-green-900/30 py-1 h-14"><span>${label}</span> <div class="flex items-center"><span class="text-yellow-400 font-bold mr-4 text-xl">${val}</span>${btn}</div></div>`;
            }).join('');

        } else {
             grid.style.display = 'none';
             if(perksContainer) {
                 perksContainer.style.display = 'block';
                 this.renderPerksList(perksContainer);
             }
        }
    },

    renderPerksList: function(container) {
        if(!container) return;
        container.innerHTML = '';
        const points = Game.state.perkPoints || 0;
        container.innerHTML += `<div class="text-center mb-4">VERFÜGBARE PUNKTE: <span class="text-yellow-400 font-bold text-xl">${points}</span></div>`;

        if(Game.perkDefs) {
            Game.perkDefs.forEach(p => {
                const hasPerk = Game.state.perks && Game.state.perks.includes(p.id);
                const canAfford = points > 0 && !hasPerk;
                let btnHtml = '';
                if(hasPerk) btnHtml = '<span class="text-green-500 font-bold border border-green-500 px-2 py-1 text-xs">GELERNT</span>';
                else if(canAfford) btnHtml = `<button class="action-button text-xs px-2 py-1" onclick="Game.choosePerk('${p.id}')">LERNEN</button>`;
                else btnHtml = '<span class="text-gray-600 text-xs">---</span>';

                const div = document.createElement('div');
                div.className = `border border-green-900 bg-green-900/10 p-2 mb-2 flex justify-between items-center ${hasPerk ? 'opacity-70' : ''}`;
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${p.icon}</span>
                        <div class="flex flex-col">
                            <span class="font-bold ${hasPerk ? 'text-green-300' : 'text-white'}">${p.name}</span>
                            <span class="text-xs text-green-500">${p.desc}</span>
                        </div>
                    </div>
                    <div>${btnHtml}</div>
                `;
                container.appendChild(div);
            });
        }
    },
    
    renderRadio: function() {
        const btnToggle = document.getElementById('btn-radio-toggle');
        const stationName = document.getElementById('radio-station-name');
        const status = document.getElementById('radio-status');
        const hz = document.getElementById('radio-hz');
        const track = document.getElementById('radio-track');
        const waves = document.getElementById('radio-waves');

        if(!btnToggle) return;

        const isOn = Game.state.radio.on;
        
        if(isOn) {
            btnToggle.textContent = "AUSSCHALTEN";
            btnToggle.classList.replace('text-green-500', 'text-red-500');
            btnToggle.classList.replace('border-green-500', 'border-red-500');
            
            const currentStation = Game.radioStations[Game.state.radio.station];
            if(stationName) stationName.textContent = currentStation.name;
            if(status) status.textContent = "SIGNAL STABLE - STEREO";
            if(hz) hz.textContent = currentStation.freq;
            
            const trackList = currentStation.tracks;
            const now = Math.floor(Date.now() / 10000); 
            const tIndex = now % trackList.length;
            if(track) track.textContent = "♪ " + trackList[tIndex] + " ♪";
            
            if(waves) {
                waves.innerHTML = '';
                for(let i=0; i<20; i++) {
                    const h = Math.floor(Math.random() * 80) + 10;
                    const bar = document.createElement('div');
                    bar.className = "w-1 bg-green-500 transition-all duration-100";
                    bar.style.height = `${h}%`;
                    waves.appendChild(bar);
                }
            }

        } else {
            btnToggle.textContent = "EINSCHALTEN";
            btnToggle.classList.replace('text-red-500', 'text-green-500');
            btnToggle.classList.replace('border-red-500', 'border-green-500');
            
            if(stationName) stationName.textContent = "OFFLINE";
            if(status) status.textContent = "NO SIGNAL";
            if(hz) hz.textContent = "00.0";
            if(track) track.textContent = "...";
            if(waves) waves.innerHTML = '';
        }
        
        if(isOn && Game.state.view === 'radio') {
            setTimeout(() => this.renderRadio(), 200); 
        }
    },

    renderCamp: function() {
        const camp = Game.state.camp;
        if(!camp) { this.switchView('map'); return; }

        const lvlEl = document.getElementById('camp-lvl');
        const statusEl = document.getElementById('camp-status');
        const upgradeBtn = document.getElementById('btn-camp-upgrade');
        const restBtn = document.getElementById('btn-camp-rest');

        if(lvlEl) lvlEl.textContent = camp.level;
        
        let statusText = "Basis-Schutz. Heilung 50%.";
        let upgradeCost = "10x Schrott";
        let canUpgrade = true;

        if(camp.level === 2) {
            statusText = "Komfortables Zelt. Heilung 100%.";
            upgradeCost = "25x Schrott (MAX)";
            canUpgrade = false; 
        }

        if(statusEl) statusEl.textContent = statusText;
        
        if(upgradeBtn) {
            if(canUpgrade) {
                upgradeBtn.innerHTML = `Lager verbessern <span class="text-xs block text-gray-400">Kosten: ${upgradeCost}</span>`;
                upgradeBtn.disabled = false;
                upgradeBtn.onclick = () => Game.upgradeCamp();
            } else {
                upgradeBtn.innerHTML = `Lager maximiert`;
                upgradeBtn.disabled = true;
                upgradeBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

        if(restBtn) restBtn.onclick = () => Game.restInCamp();
    },

    renderWorldMap: function() {
        const cvs = document.getElementById('world-map-canvas');
        const details = document.getElementById('sector-details');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        const W = 10, H = 10; 
        const TILE_W = cvs.width / W;
        const TILE_H = cvs.height / H;

        // Reset
        ctx.fillStyle = "#050a05"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // Biomes
        const biomeColors = {
            'wasteland': '#4a4036', 'forest': '#1a3300', 'jungle': '#0f2405',
            'desert': '#8b5a2b', 'swamp': '#1e1e11', 'mountain': '#333333',
            'city': '#444455', 'vault': '#002244'
        };

        const pulse = (Date.now() % 1000) / 1000;
        const glowAlpha = 0.3 + (Math.sin(Date.now() / 200) + 1) * 0.2; // 0.3 to 0.7
        
        if(Game.state.camp && !Game.state.camp.sector && Game.state.camp.sx !== undefined) {
             Game.state.camp.sector = { x: Game.state.camp.sx, y: Game.state.camp.sy };
        }

        for(let y=0; y<H; y++) {
            for(let x=0; x<W; x++) {
                const key = `${x},${y}`;
                const isVisited = Game.state.visitedSectors && Game.state.visitedSectors.includes(key);
                const isCurrent = (x === Game.state.sector.x && y === Game.state.sector.y);

                // --- DETECT DUNGEONS & POIS ---
                let fixedPOI = null;
                let randomDungeon = null;

                if(Game.state.worldPOIs) {
                    fixedPOI = Game.state.worldPOIs.find(p => p.x === x && p.y === y);
                }

                if(!fixedPOI) {
                    const mapSeed = (x + 1) * 5323 + (y + 1) * 8237 + 9283;
                    if(typeof WorldGen !== 'undefined') {
                        WorldGen.setSeed(mapSeed);
                        const rng = () => WorldGen.rand();
                        if(rng() < 0.35) {
                            const r = rng();
                            if(r < 0.3) randomDungeon = 'S'; // Supermarket
                            else if(r < 0.6) randomDungeon = 'H'; // Cave
                        }
                    }
                }

                // DRAW TILE
                if(isVisited) {
                    const biome = WorldGen.getSectorBiome(x, y);
                    ctx.fillStyle = biomeColors[biome] || '#222';
                    ctx.fillRect(x * TILE_W - 0.5, y * TILE_H - 0.5, TILE_W + 1, TILE_H + 1);
                } else {
                    ctx.fillStyle = "#000";
                    ctx.fillRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
                }

                // DRAW POI ICONS / GLOW
                const cx = x * TILE_W + TILE_W/2;
                const cy = y * TILE_H + TILE_H/2;

                ctx.font = "bold 20px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                if (fixedPOI) {
                    let icon = "❓";
                    let color = "#fff";
                    if(fixedPOI.type === 'C') { icon = "🏙️"; color = "#00ffff"; }
                    else if(fixedPOI.type === 'V') { icon = "⚙️"; color = "#ffff00"; }
                    else if(fixedPOI.type === 'M') { icon = "🏰"; color = "#ff5555"; }
                    else if(fixedPOI.type === 'R') { icon = "☠️"; color = "#ffaa00"; }
                    else if(fixedPOI.type === 'T') { icon = "📡"; color = "#55ff55"; }
                    
                    if(isVisited) {
                        ctx.fillStyle = color;
                        ctx.fillText(icon, cx, cy);
                    } else {
                        ctx.globalAlpha = 0.5;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = color;
                        ctx.fillStyle = color;
                        ctx.fillText("?", cx, cy);
                        ctx.shadowBlur = 0;
                        ctx.globalAlpha = 1.0;
                    }
                }
                else if (randomDungeon) {
                    let color = "#a020f0"; // Purple for Mystery
                    let icon = randomDungeon === 'S' ? '🛒' : '🦇'; // Hint if visited
                    
                    if(isVisited) {
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = color;
                        ctx.fillStyle = color;
                        ctx.fillText(icon, cx, cy);
                        ctx.shadowBlur = 0;
                    } else {
                        ctx.fillStyle = `rgba(160, 32, 240, ${glowAlpha})`; // Pulsing Purple
                        ctx.fillRect(x * TILE_W + 2, y * TILE_H + 2, TILE_W - 4, TILE_H - 4);
                        ctx.fillStyle = "#fff";
                        ctx.font = "10px monospace";
                        ctx.fillText("?", cx, cy);
                    }
                }

                // DRAW CAMP ICON
                if(Game.state.camp && Game.state.camp.sector && Game.state.camp.sector.x === x && Game.state.camp.sector.y === y) {
                    ctx.font = "bold 20px monospace";
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText("⛺", x * TILE_W + TILE_W/4, y * TILE_H + TILE_H/4);
                }

                if(isCurrent && details) {
                    let info = `SEKTOR [${x},${y}]`;
                    if(randomDungeon) info += " <span class='text-purple-400 animate-pulse'>[SIGNAL]</span>";
                    details.innerHTML = info;
                }
            }
        }

        // Draw Player Marker
        const relX = Game.state.player.x / Game.MAP_W; 
        const relY = Game.state.player.y / Game.MAP_H; 
        
        const px = Game.state.sector.x * TILE_W + (relX * TILE_W);
        const py = Game.state.sector.y * TILE_H + (relY * TILE_H);
        
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

        // Show Enter Button
        const camp = Game.state.camp;
        const btnCamp = document.getElementById('btn-map-enter-camp');
        
        if(camp && camp.sector && camp.sector.x === Game.state.sector.x && camp.sector.y === Game.state.sector.y) {
            const dist = Math.abs(camp.x - Game.state.player.x) + Math.abs(camp.y - Game.state.player.y);
            if(dist <= 2) {
                if(!btnCamp) {
                    const b = document.createElement('button');
                    b.id = 'btn-map-enter-camp';
                    b.className = "absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black border-2 border-green-500 text-green-500 px-6 py-2 font-bold hover:bg-green-900 z-50";
                    b.innerHTML = "⛺ LAGER BETRETEN";
                    b.onclick = () => Game.enterCamp();
                    document.getElementById('view-container').appendChild(b);
                } else {
                    btnCamp.style.display = 'block';
                }
            } else {
                if(btnCamp) btnCamp.style.display = 'none';
            }
        } else {
            if(btnCamp) btnCamp.style.display = 'none';
        }

        if(Game.state.view === 'worldmap') {
            requestAnimationFrame(() => this.renderWorldMap());
        } else {
            if(btnCamp) btnCamp.style.display = 'none';
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
            if (Game.recipes && Game.recipes.length > 0) {
                Game.recipes.forEach(r => {
                    // Zeige nur bekannte Rezepte
                    if(Game.state.knownRecipes && !Game.state.knownRecipes.includes(r.id)) {
                        return; // Überspringen
                    }
                    
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
            } else {
                htmlBuffer = '<div class="text-center text-gray-500 mt-10">Keine Baupläne in Datenbank.</div>';
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
        
        // --- 1. Tabs Rendern ---
        if(!this.questTab) this.questTab = 'active';

        const tabsContainer = document.createElement('div');
        tabsContainer.className = "flex w-full border-b border-green-900 mb-4";
        
        const btnActive = document.createElement('button');
        btnActive.className = `flex-1 py-2 font-bold text-center transition-colors ${this.questTab === 'active' ? 'bg-green-900/40 text-green-400 border-b-2 border-green-500' : 'bg-black text-gray-600 hover:text-green-500'}`;
        btnActive.textContent = "AKTIV";
        
        btnActive.onclick = (e) => { 
            e.stopPropagation(); 
            this.questTab = 'active'; 
            this.renderQuests(); 
        };
        
        const btnCompleted = document.createElement('button');
        btnCompleted.className = `flex-1 py-2 font-bold text-center transition-colors ${this.questTab === 'completed' ? 'bg-green-900/40 text-green-400 border-b-2 border-green-500' : 'bg-black text-gray-600 hover:text-green-500'}`;
        btnCompleted.textContent = "ERLEDIGT";
        
        btnCompleted.onclick = (e) => { 
            e.stopPropagation(); 
            this.questTab = 'completed'; 
            this.renderQuests(); 
        };
        
        tabsContainer.appendChild(btnActive);
        tabsContainer.appendChild(btnCompleted);
        list.appendChild(tabsContainer);

        // --- 2. Listen Rendern ---
        if(this.questTab === 'active') {
            const quests = Game.state.activeQuests || [];
            
            if(quests.length === 0) {
                list.innerHTML += '<div class="text-gray-500 italic text-center mt-10">Keine aktiven Aufgaben.<br><span class="text-xs">Erkunde die Welt, um Quests zu finden!</span></div>';
                return;
            }

            quests.forEach(q => {
                const def = Game.questDefs ? Game.questDefs.find(d => d.id === q.id) : null;
                const title = def ? def.title : "Unbekannte Quest";
                const desc = def ? def.desc : "???";
                const pct = Math.min(100, Math.floor((q.progress / q.max) * 100));
                
                const div = document.createElement('div');
                div.className = "border border-green-900 bg-green-900/10 p-3 mb-2 relative overflow-hidden";
                div.innerHTML = `
                    <div class="font-bold text-yellow-400 text-lg mb-1 flex justify-between">
                        <span>${title}</span>
                        <span class="text-xs text-gray-400 border border-gray-600 px-1 rounded">LVL ${def ? def.minLvl : 1}</span>
                    </div>
                    <div class="text-green-200 text-sm leading-relaxed mb-3">${desc}</div>
                    
                    <div class="w-full bg-black border border-green-700 h-4 relative">
                        <div class="bg-green-600 h-full transition-all duration-500" style="width: ${pct}%"></div>
                        <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-black">
                            ${q.progress} / ${q.max} (${pct}%)
                        </div>
                    </div>
                    
                    <div class="mt-2 text-right text-xs text-yellow-600">
                        Belohnung: ${def && def.reward ? (def.reward.caps ? def.reward.caps + ' KK, ' : '') + def.reward.xp + ' XP' : '?'}
                    </div>
                `;
                list.appendChild(div);
            });

        } else {
            // COMPLETED TAB
            const completedIds = Game.state.completedQuests || [];
            
            if(completedIds.length === 0) {
                list.innerHTML += '<div class="text-gray-500 italic text-center mt-10">Noch keine Aufgaben abgeschlossen.<br><span class="text-xs">Streng dich an, Ödlander!</span></div>';
                return;
            }

            completedIds.forEach(qId => {
                const def = Game.questDefs ? Game.questDefs.find(d => d.id === qId) : null;
                if(!def) return;

                const div = document.createElement('div');
                div.className = "border border-gray-800 bg-black p-3 mb-2 opacity-70 hover:opacity-100 transition-opacity";
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-gray-400 line-through decoration-green-500 decoration-2">${def.title}</span>
                        <span class="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded">ERLEDIGT</span>
                    </div>
                    <div class="text-gray-600 text-xs italic">${def.desc}</div>
                `;
                list.appendChild(div);
            });
        }
    },

    renderCity: function() {
        const con = document.getElementById('city-options');
        if(!con) return;
        con.innerHTML = '';
        const addBtn = (icon, title, subtitle, cb, disabled=false) => {
            const b = document.createElement('button');
            b.className = "action-button w-full mb-3 p-3 flex items-center justify-between group bg-black/40 hover:bg-green-900/50 border-l-4 border-transparent hover:border-green-500 transition-all";
            
            b.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-3xl filter grayscale group-hover:grayscale-0 transition-all">${icon}</span>
                    <div class="flex flex-col items-start text-left">
                        <span class="text-lg sm:text-xl font-bold text-green-400 group-hover:text-yellow-400 tracking-wider">${title}</span>
                        <span class="text-xs text-green-600 group-hover:text-green-200 font-mono">${subtitle}</span>
                    </div>
                </div>
                <div class="text-xl text-green-800 group-hover:text-green-400 transition-transform group-hover:translate-x-1">▶</div>
            `;
            
            b.onclick = cb;
            
            if(disabled) { 
                b.disabled = true; 
                b.classList.add('opacity-40', 'cursor-not-allowed', 'filter', 'grayscale');
                b.classList.remove('hover:bg-green-900/50', 'hover:border-green-500');
                b.innerHTML = b.innerHTML.replace('group-hover:text-yellow-400', '').replace('group-hover:translate-x-1', '');
            }
            con.appendChild(b);
        };
        
        const healCost = 25;
        const canHeal = Game.state.caps >= healCost && Game.state.hp < Game.state.maxHp;
        let healSub = `HP wiederherstellen (${healCost} KK)`;
        if(Game.state.hp >= Game.state.maxHp) healSub = "Gesundheit ist voll";
        else if(Game.state.caps < healCost) healSub = "Zu wenig Kronkorken";
        
        addBtn("🏥", "KLINIK", healSub, () => UI.switchView('clinic'), !canHeal);
        
        addBtn("🛒", "MARKTPLATZ", "Waffen, Rüstung & Munition", () => UI.switchView('shop').then(() => UI.renderShop()));
        
        addBtn("🛠️", "WERKBANK", "Gegenstände herstellen", () => this.toggleView('crafting'));
        
        addBtn("🎯", "TRAININGSGELÄNDE", "Hacking & Schlossknacken üben", () => {
             con.innerHTML = '';
             const backBtn = document.createElement('button');
             backBtn.className = "w-full py-2 mb-4 border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold tracking-widest";
             backBtn.textContent = "<< ZURÜCK ZUR STADT";
             backBtn.onclick = () => this.renderCity();
             con.appendChild(backBtn);
             
             addBtn("💻", "HACKING SIM", "Schwierigkeit: Einfach", () => MiniGames.hacking.start('easy'));
             addBtn("🔐", "SCHLOSSKNACKEN", "Schwierigkeit: Einfach", () => MiniGames.lockpicking.start('easy'));
        });
        
        addBtn("🚪", "STADT VERLASSEN", "Zurück in das Ödland", () => this.switchView('map'));
    },
    
    // [v1.5.0] UPDATED RENDER SHOP WITH CATEGORIES & DIALOG
    renderShop: function(container) {
        if(!container) container = document.getElementById('shop-list');
        if(!container) return;
        
        container.innerHTML = '';
        
        const backBtn = document.createElement('button');
        backBtn.className = "w-full py-3 mb-4 border border-yellow-400 text-yellow-400 font-bold hover:bg-yellow-400 hover:text-black transition-colors uppercase tracking-widest";
        backBtn.textContent = "<< Speichern & Zurück";
        backBtn.onclick = () => { 
            Game.saveGame(); 
            this.switchView('city'); 
        };
        container.appendChild(backBtn);

        // Caps Display
        const capsDisplay = document.createElement('div');
        capsDisplay.className = "sticky top-0 bg-black/90 border-b border-yellow-500 text-yellow-400 font-bold text-right p-2 mb-4 z-10 font-mono";
        capsDisplay.innerHTML = `VERMÖGEN: ${Game.state.caps} KK`;
        container.appendChild(capsDisplay);

        // Categories
        const categories = {
            'consumable': { title: 'HILFSMITTEL', items: [] },
            'weapon': { title: 'WAFFEN', items: [] },
            'body': { title: 'KLEIDUNG & RÜSTUNG', items: [] },
            'misc': { title: 'SONSTIGES', items: [] } 
        };

        const sortedKeys = Object.keys(Game.items).sort((a,b) => Game.items[a].cost - Game.items[b].cost);
        sortedKeys.forEach(key => {
            const item = Game.items[key];
            if(item.cost > 0 && !key.startsWith('rusty_')) {
                if(categories[item.type]) {
                    categories[item.type].items.push({key, ...item});
                } else {
                    categories['misc'].items.push({key, ...item});
                }
            }
        });

        const renderCategory = (catKey) => {
            const cat = categories[catKey];
            if(cat.items.length === 0) return;

            const header = document.createElement('h3');
            header.className = "text-green-500 font-bold border-b border-green-700 mt-4 mb-2 pb-1 pl-2 text-sm uppercase tracking-widest bg-green-900/20";
            header.textContent = cat.title;
            container.appendChild(header);

            cat.items.forEach(data => {
                const canAfford = Game.state.caps >= data.cost;
                // [v1.5.0] Updated Check: Mark as Owned if equipped OR in inventory (for camp kit etc)
                let isOwned = false;
                if(Game.state.equip[data.slot] && Game.state.equip[data.slot].name === data.name) isOwned = true;
                if(data.type === 'tool' || data.type === 'blueprint') {
                     if(Game.state.inventory.some(i => i.id === data.key)) isOwned = true;
                }
                
                const div = document.createElement('div');
                div.className = `flex justify-between items-center p-2 mb-2 border h-16 w-full ${canAfford ? 'border-green-500 bg-green-900/20 hover:bg-green-900/40' : 'border-red-900 bg-black/40 opacity-70'} transition-all cursor-pointer group`;
                
                let icon = "📦";
                if(data.type === 'weapon') icon = "🔫";
                if(data.type === 'body') icon = "🛡️";
                if(data.type === 'consumable') icon = "💊";
                if(data.type === 'junk') icon = "⚙️";

                div.innerHTML = `
                    <div class="flex items-center gap-3 overflow-hidden flex-1">
                        <span class="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">${icon}</span>
                        <div class="flex flex-col overflow-hidden">
                            <span class="font-bold truncate ${canAfford ? 'text-green-400 group-hover:text-yellow-400' : 'text-gray-500'} text-sm">${data.name}</span>
                            <span class="text-[10px] text-green-600 truncate">${data.desc || data.type}</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end flex-shrink-0 ml-2 min-w-[60px]">
                        <span class="font-mono ${canAfford ? 'text-yellow-400' : 'text-red-500'} font-bold text-sm">${data.cost} KK</span>
                    </div>
                `;
                
                if(isOwned) {
                    div.innerHTML += `<div class="absolute inset-0 flex justify-center items-center bg-black/60 text-green-500 font-bold border border-green-500 pointer-events-none text-xs tracking-widest">IM BESITZ</div>`;
                    div.style.position = 'relative';
                } 
                
                div.onclick = () => UI.showShopConfirm(data.key);
                container.appendChild(div);
            });
        };

        renderCategory('consumable');
        renderCategory('weapon');
        renderCategory('body');
        renderCategory('misc');

        const header = document.createElement('h3');
        header.className = "text-blue-400 font-bold border-b border-blue-700 mt-4 mb-2 pb-1 pl-2 text-sm uppercase tracking-widest bg-blue-900/20";
        header.textContent = "MUNITION & SPECIALS";
        container.appendChild(header);

        const ammoDiv = document.createElement('div');
        ammoDiv.className = "flex justify-between items-center p-2 mb-4 border border-blue-500 bg-blue-900/20 cursor-pointer hover:bg-blue-900/40 h-16 w-full";
        const canBuyAmmo = Game.state.caps >= 10;
        ammoDiv.innerHTML = `
             <div class="flex items-center gap-3 overflow-hidden flex-1">
                <span class="text-2xl flex-shrink-0">🧨</span>
                <div class="flex flex-col overflow-hidden">
                    <span class="font-bold text-blue-300 text-sm">10x Munition</span>
                    <span class="text-[10px] text-blue-500 truncate">Standard Kaliber</span>
                </div>
            </div>
            <span class="font-mono text-yellow-400 font-bold text-sm ml-2">10 KK</span>
        `;
        if(!canBuyAmmo) { ammoDiv.style.opacity = 0.5; }
        else { ammoDiv.onclick = () => Game.buyAmmo(); }
        container.appendChild(ammoDiv);
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
        
        if(typeof Combat !== 'undefined' && typeof Combat.calculateHitChance === 'function') {
             const cHead = Combat.calculateHitChance(0);
             const cTorso = Combat.calculateHitChance(1);
             const cLegs = Combat.calculateHitChance(2);
             
             const elHead = document.getElementById('chance-vats-0');
             const elTorso = document.getElementById('chance-vats-1');
             const elLegs = document.getElementById('chance-vats-2');
             
             if(elHead) elHead.textContent = cHead + "%";
             if(elTorso) elTorso.textContent = cTorso + "%";
             if(elLegs) elLegs.textContent = cLegs + "%";
        }
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
        
        const recipes = Game.recipes || [];
        let knownCount = 0; 

        recipes.forEach(recipe => {
            if(Game.state.knownRecipes && !Game.state.knownRecipes.includes(recipe.id)) {
                return; 
            }
            knownCount++;

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
        
        if(knownCount === 0) {
            container.innerHTML += '<div class="text-gray-500 italic mt-10 text-center border-t border-gray-800 pt-4">Du hast noch keine Baupläne gelernt.<br><span class="text-xs text-green-700">Suche in Dungeons oder der Wildnis nach Blueprints!</span></div>';
        }
    }
});
