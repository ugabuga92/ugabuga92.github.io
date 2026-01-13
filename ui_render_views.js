// [2026-01-13 14:00:00] ui_render_views.js - CLEANUP: View Management

Object.assign(UI, {
    
    renderCharacterSelection: function(saves) {
        this.charSelectMode = true;
        this.currentSaves = saves;
        
        if(this.els.loginScreen) this.els.loginScreen.style.display = 'none';
        if(this.els.charSelectScreen) this.els.charSelectScreen.style.display = 'flex';
        
        if(this.els.charSlotsList) this.els.charSlotsList.innerHTML = '';

        const btnBack = document.getElementById('btn-char-back');
        if (btnBack) {
            btnBack.onclick = () => {
                this.charSelectMode = false;
                if(this.els.charSelectScreen) this.els.charSelectScreen.style.display = 'none';
                if(this.els.loginScreen) this.els.loginScreen.style.display = 'flex'; 
            };
        }

        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = "char-slot border-2 border-green-900 bg-black/80 p-4 mb-2 cursor-pointer hover:border-yellow-400 transition-all flex justify-between items-center group relative overflow-hidden";
            slot.dataset.index = i;
            
            const save = saves[i];
            
            if (save) {
                const name = save.playerName || "UNBEKANNT";
                const lvl = save.lvl || 1;
                const loc = save.sector ? `[${save.sector.x},${save.sector.y}]` : "[?,?]";
                const isDead = (save.hp !== undefined && save.hp <= 0);
                const statusIcon = isDead ? "💀" : "👤";
                const statusClass = isDead ? "text-red-500" : "text-yellow-400";

                slot.innerHTML = `
                    <div class="flex flex-col z-10">
                        <span class="text-xl ${statusClass} font-bold tracking-wider">${statusIcon} ${name}</span>
                        <span class="text-xs text-green-300 font-mono">Level ${lvl} | Sektor ${loc}</span>
                    </div>
                    <div class="z-10 flex items-center gap-2">
                        <div class="text-xs text-gray-500 font-bold mr-2">SLOT ${i+1}</div>
                        <button class="bg-green-700 text-black font-bold px-4 py-1 text-xs rounded transition-all duration-200 shadow-[0_0_5px_#1b5e20] 
                                       group-hover:bg-[#39ff14] group-hover:shadow-[0_0_20px_#39ff14] group-hover:scale-110">
                            START ▶
                        </button>
                    </div>
                `;
            } else {
                slot.className = "char-slot border-2 border-dashed border-gray-700 bg-black/50 p-4 mb-2 cursor-pointer hover:border-yellow-400 hover:bg-yellow-900/10 transition-all flex justify-center items-center group min-h-[80px]";
                slot.innerHTML = `
                    <div class="text-gray-500 group-hover:text-yellow-400 font-bold tracking-widest flex items-center gap-2 transition-colors">
                        <span class="text-3xl">+</span> NEUEN CHARAKTER ERSTELLEN
                    </div>
                `;
            }
            slot.onclick = () => { if(typeof this.selectSlot === 'function') this.selectSlot(i); };
            if(this.els.charSlotsList) this.els.charSlotsList.appendChild(slot);
        }
        if(typeof this.selectSlot === 'function') this.selectSlot(0);
    },

    renderSpawnList: function(players) {
        if(!this.els.spawnList) return;
        this.els.spawnList.innerHTML = '';
        
        if(!players || Object.keys(players).length === 0) {
            this.els.spawnList.innerHTML = '<div class="text-gray-500 italic p-2">Keine Signale gefunden...</div>';
            return;
        }
        
        for(let pid in players) {
            const p = players[pid];
            const btn = document.createElement('button');
            btn.className = "action-button w-full mb-2 text-left text-xs border-green-800 hover:border-green-500 text-green-400 p-2";
            const sectorStr = p.sector ? `[${p.sector.x},${p.sector.y}]` : "[?,?]";
            
            btn.innerHTML = `
                <div class="font-bold">SIGNAL: ${p.name}</div>
                <div class="text-[10px] text-gray-400 float-right mt-[-1rem]">${sectorStr}</div>
            `;
            
            btn.onclick = () => {
                if(this.els.spawnScreen) this.els.spawnScreen.style.display = 'none';
                this.startGame(null, this.selectedSlot, null); 
                if(Game.state && Game.state.player) {
                    Game.state.player.x = p.x;
                    Game.state.player.y = p.y;
                    if(p.sector) {
                        Game.state.sector = p.sector;
                        Game.changeSector(p.sector.x, p.sector.y);
                    }
                }
            };
            this.els.spawnList.appendChild(btn);
        }
    },

    renderCombat: function() {
        const enemy = Game.state.enemy;
        if(!enemy) return;
        
        const nameEl = document.getElementById('enemy-name');
        if(nameEl) nameEl.textContent = enemy.name;
        
        const hpText = document.getElementById('enemy-hp-text');
        const hpBar = document.getElementById('enemy-hp-bar');
        
        if(hpText) hpText.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`;
        if(hpBar) hpBar.style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`;
        
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
        
        if(typeof Combat !== 'undefined' && Combat.selectedPart !== undefined) {
            for(let i=0; i<3; i++) {
                const btn = document.getElementById(`btn-vats-${i}`);
                if(btn) {
                    if(i === Combat.selectedPart) {
                        btn.classList.add('bg-green-500', 'text-black');
                        btn.classList.remove('bg-green-900/20');
                    } else {
                        btn.classList.remove('bg-green-500', 'text-black');
                        btn.classList.add('bg-green-900/20');
                    }
                }
            }
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
        if(Game.state.view === name) this.switchView('map');
        else this.switchView(name);
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
                    <div id="val-sector-display" onclick="UI.switchView('worldmap')" class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 border border-green-500 text-green-500 px-3 py-1 text-sm font-bold tracking-widest z-20 shadow-[0_0_10px_#39ff14] cursor-pointer hover:text-yellow-400 hover:border-yellow-500 transition-all active:scale-95 group rounded">🌍 SEKTOR [?,?]</div>
                    <button id="btn-camp-overlay" class="hidden absolute top-4 left-4 bg-black/80 border-2 border-green-500 text-green-500 p-2 rounded-lg hover:bg-green-900 transition-all z-20 shadow-[0_0_15px_#39ff14] cursor-pointer flex flex-col items-center">
                        <span class="text-2xl">⛺</span>
                        <span class="text-xs font-bold">BAUEN</span>
                    </button>
                    <div id="online-badge"></div>
                </div>`;
            Game.state.view = name;
            if(Game.state) Game.state.inDialog = false;
            if(document.activeElement) document.activeElement.blur();
            Game.initCanvas();
            this.restoreOverlay();
            this.toggleControls(true);
            this.updateButtonStates(name);
            if(typeof this.render === 'function') this.render();
            return;
        }

        if(name === 'hacking') { this.renderHacking(); Game.state.view = name; return; }
        if(name === 'lockpicking') { this.renderLockpicking(true); Game.state.view = name; return; }

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
            if (name === 'shop') this.renderShop(document.getElementById('shop-list'));
            if (name === 'clinic') this.renderClinic();
            
            if (name === 'camp') {
                if(typeof this.renderCamp === 'function') this.renderCamp();
            }
            
            this.updateButtonStates(name);
            if(typeof this.render === 'function') this.render();
            
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
            <div id="dialog-overlay" onclick="if(event.target === this) { this.style.display='none'; this.innerHTML=''; event.stopPropagation(); event.preventDefault(); }" style="position: fixed; inset: 0; z-index: 10001; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 5px; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px);"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', joystickHTML);
        this.els.joyBase = document.getElementById('joystick-base');
        this.els.joyStick = document.getElementById('joystick-stick');
        this.els.dialog = document.getElementById('dialog-overlay');

        if(!window.escListenerAdded) {
            window.addEventListener('keydown', (e) => {
                if(e.key === 'Escape') {
                    const d = document.getElementById('dialog-overlay');
                    if(d && d.style.display !== 'none') {
                        d.style.display = 'none';
                        d.innerHTML = '';
                        e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
                    }
                }
            }, true); 
            window.escListenerAdded = true;
        }
    },
    
    toggleControls: function(show) { if (!show && this.els.dialog) this.els.dialog.innerHTML = ''; },

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
