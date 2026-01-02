// [v2.2] - Modularized World Views (Map, Camp, Radio)
// [v2.9.4] - Vault Icon Shrink (Back to normal size)
Object.assign(UI, {

    renderWorldMap: function() {
        const cvs = document.getElementById('world-map-canvas');
        const details = document.getElementById('sector-details');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        const W = 10, H = 10; 
        const TILE_W = cvs.width / W;
        const TILE_H = cvs.height / H;

        ctx.fillStyle = "#050a05"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        const biomeColors = {
            'wasteland': '#4a4036', 'forest': '#1a3300', 'jungle': '#0f2405',
            'desert': '#8b5a2b', 'swamp': '#1e1e11', 'mountain': '#333333',
            'city': '#444455', 'vault': '#002244'
        };

        const pulse = (Date.now() % 1000) / 1000;
        const glowAlpha = 0.3 + (Math.sin(Date.now() / 200) + 1) * 0.2; 
        
        if(Game.state.camp && !Game.state.camp.sector && Game.state.camp.sx !== undefined) {
             Game.state.camp.sector = { x: Game.state.camp.sx, y: Game.state.camp.sy };
        }

        for(let y=0; y<H; y++) {
            for(let x=0; x<W; x++) {
                const key = `${x},${y}`;
                const isVisited = Game.state.visitedSectors && Game.state.visitedSectors.includes(key);
                const isCurrent = (x === Game.state.sector.x && y === Game.state.sector.y);

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
                            if(r < 0.3) randomDungeon = 'S'; 
                            else if(r < 0.6) randomDungeon = 'H'; 
                        }
                    }
                }

                if(isVisited) {
                    const biome = WorldGen.getSectorBiome(x, y);
                    ctx.fillStyle = biomeColors[biome] || '#222';
                    ctx.fillRect(x * TILE_W - 0.5, y * TILE_H - 0.5, TILE_W + 1, TILE_H + 1);
                } else {
                    ctx.fillStyle = "#000";
                    ctx.fillRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
                }

                const cx = x * TILE_W + TILE_W/2;
                const cy = y * TILE_H + TILE_H/2;

                ctx.font = "bold 20px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                if (fixedPOI) {
                    let icon = "❓";
                    let color = "#fff";
                    let fontSize = "20px";
                    let label = null;

                    if(fixedPOI.type === 'C') { icon = "🏙️"; color = "#00ffff"; }
                    else if(fixedPOI.type === 'V') { 
                        icon = "⚙️"; 
                        color = "#ffff00"; 
                        fontSize = "25px"; // [MOD] Wieder kleiner (war 40px)
                        label = "VAULT 101"; 
                    }
                    else if(fixedPOI.type === 'M') { icon = "🏰"; color = "#ff5555"; }
                    else if(fixedPOI.type === 'R') { icon = "☠️"; color = "#ffaa00"; }
                    else if(fixedPOI.type === 'T') { icon = "📡"; color = "#55ff55"; }
                    
                    if(isVisited) {
                        ctx.font = `bold ${fontSize} monospace`;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = color;
                        ctx.fillStyle = color;
                        ctx.fillText(icon, cx, cy);
                        ctx.shadowBlur = 0;
                        
                        // Label zeichnen
                        if(label) {
                            ctx.font = "bold 10px monospace";
                            ctx.fillStyle = "#ffffff";
                            ctx.shadowColor = "#000";
                            ctx.shadowBlur = 4;
                            ctx.fillText(label, cx, cy + TILE_H/2 - 5);
                            ctx.shadowBlur = 0;
                        }
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
                    let color = "#a020f0"; 
                    let icon = randomDungeon === 'S' ? '🛒' : '🦇'; 
                    
                    if(isVisited) {
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = color;
                        ctx.fillStyle = color;
                        ctx.fillText(icon, cx, cy);
                        ctx.shadowBlur = 0;
                    } else {
                        ctx.fillStyle = `rgba(160, 32, 240, ${glowAlpha})`; 
                        ctx.fillRect(x * TILE_W + 2, y * TILE_H + 2, TILE_W - 4, TILE_H - 4);
                        ctx.fillStyle = "#fff";
                        ctx.font = "10px monospace";
                        ctx.fillText("?", cx, cy);
                    }
                }

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

    renderCamp: function() {
        const camp = Game.state.camp;
        if(!camp) { this.switchView('map'); return; }

        const lvlEl = document.getElementById('camp-lvl');
        const statusEl = document.getElementById('camp-status');
        const upgradeBtn = document.getElementById('btn-camp-upgrade');
        const restBtn = document.getElementById('btn-camp-rest');
        const cookBtn = document.getElementById('btn-camp-cook'); 

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
        
        if(!cookBtn) {
            const actionsDiv = document.querySelector('#view-container .grid');
            if(actionsDiv && !document.getElementById('btn-camp-cook')) {
                const b = document.createElement('button');
                b.id = 'btn-camp-cook';
                b.className = "border border-yellow-500 p-4 hover:bg-yellow-900/30 flex flex-col items-center justify-center transition-all group";
                b.innerHTML = `<span class="text-3xl mb-2 group-hover:scale-110 transition-transform">🍖</span><span class="font-bold text-yellow-400">KOCHEN</span><span class="text-xs text-yellow-600">Essen zubereiten</span>`;
                b.onclick = () => UI.renderCampCooking();
                actionsDiv.insertBefore(b, actionsDiv.lastElementChild);
            }
        } else {
             cookBtn.onclick = () => UI.renderCampCooking();
        }
    },

    renderCampCooking: function() {
        const view = this.els.view;
        view.innerHTML = `
            <div class="p-4 w-full max-w-2xl mx-auto flex flex-col h-full">
                <h2 class="text-3xl font-bold text-yellow-500 mb-4 border-b-2 border-yellow-900 pb-2 flex items-center gap-2">
                    <span>🔥</span> LAGERFEUER
                </h2>
                <div id="cooking-list" class="flex-grow overflow-y-auto pr-2 custom-scrollbar"></div>
                <button onclick="UI.switchView('camp')" class="mt-4 border border-yellow-500 text-yellow-500 py-3 font-bold hover:bg-yellow-900/40 uppercase tracking-widest">
                    << Zurück zum Zelt
                </button>
            </div>
        `;
        
        const list = document.getElementById('cooking-list');
        const recipes = Game.recipes || [];
        const cookingRecipes = recipes.filter(r => r.type === 'cooking');

        if(cookingRecipes.length === 0) {
            list.innerHTML = '<div class="text-gray-500 italic text-center mt-10">Du kennst noch keine Rezepte.</div>';
            return;
        }

        cookingRecipes.forEach(recipe => {
            const outItem = Game.items[recipe.out];
            const div = document.createElement('div');
            div.className = "border border-yellow-900 bg-yellow-900/10 p-3 mb-2 flex justify-between items-center";
            
            let reqHtml = '';
            let canCraft = true;
            for(let reqId in recipe.req) {
                const countNeeded = recipe.req[reqId];
                const invItem = Game.state.inventory.find(i => i.id === reqId);
                const countHave = invItem ? invItem.count : 0;
                let color = "text-yellow-500";
                if (countHave < countNeeded) { canCraft = false; color = "text-red-500"; }
                const ingredientName = Game.items[reqId] ? Game.items[reqId].name : reqId;
                reqHtml += `<span class="${color} text-xs mr-2">• ${ingredientName}: ${countHave}/${countNeeded}</span>`;
            }

            div.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-bold text-yellow-400 text-lg">${outItem.name}</span>
                    <span class="text-xs text-yellow-600 italic">${outItem.desc}</span>
                    <div class="mt-1">${reqHtml}</div>
                </div>
                <button class="border border-yellow-500 text-yellow-500 px-4 py-2 font-bold hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                    onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>
                    BRATEN
                </button>
            `;
            list.appendChild(div);
        });
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
            
            if(waves && Game.Audio && Game.Audio.analyser) {
                waves.innerHTML = '';
                const data = Game.Audio.getVisualData(); 
                const step = Math.floor(data.length / 20);
                
                for(let i=0; i<20; i++) {
                    const val = data[i * step];
                    const h = Math.max(10, (val / 255) * 100);
                    const bar = document.createElement('div');
                    bar.className = "w-1 bg-green-500 transition-all duration-75";
                    bar.style.height = `${h}%`;
                    bar.style.opacity = 0.5 + (val/500);
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
            requestAnimationFrame(() => this.renderRadio());
        }
    }
});
