// [v0.9.17] - 2025-12-31 15:45pm (Syntax Fix) - Cleaned file header and ensured safe quest array access.
// Core Rendering & Logic (HUD, View Switching)
Object.assign(UI, {
    
    // Updates HUD and Button States
    update: function() {
        if (!Game.state) return;
        
        // Lazy load ammo element if not in core map
        if(!this.els.ammo) this.els.ammo = document.getElementById('val-ammo');
        
        // Header Info
        if(this.els.name) {
            const sectorStr = Game.state.sector ? ` [${Game.state.sector.x},${Game.state.sector.y}]` : "";
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

        // [v0.9.9] HP & Radiation Bars
        const maxHp = Game.state.maxHp;
        const hp = Game.state.hp;
        const rads = Game.state.rads || 0;
        
        if(this.els.hp) this.els.hp.textContent = `${Math.round(hp)}/${maxHp}`;
        
        if(this.els.hpBar) {
            // HP Bar (Green)
            const hpPct = Math.max(0, (hp / maxHp) * 100);
            this.els.hpBar.style.width = `${hpPct}%`;
        }
        
        // New: Rad Bar Logic (Dynamic Element Lookup)
        const radBar = document.getElementById('bar-rads');
        if(radBar) {
            const radPct = Math.min(100, (rads / maxHp) * 100);
            radBar.style.width = `${radPct}%`;
        }

        // XP Bar
        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, Math.floor((Game.state.xp / nextXp) * 100));
        if(this.els.xpTxt) this.els.xpTxt.textContent = expPct;
        if(this.els.expBarTop) this.els.expBarTop.style.width = `${expPct}%`;
        
        if(this.els.caps) this.els.caps.textContent = `${Game.state.caps}`;
        
        // Ammo Update
        if(this.els.ammo) {
            this.els.ammo.textContent = Game.state.ammo || 0;
        }

        // [v0.9.3] Camp Button Visibility Logic
        const campBtn = document.getElementById('btn-enter-camp');
        if(campBtn) {
            const hasCampHere = Game.state.camp && 
                                Game.state.camp.sector.x === Game.state.sector.x && 
                                Game.state.camp.sector.y === Game.state.sector.y;
            
            if(hasCampHere) {
                campBtn.classList.remove('hidden');
            } else {
                campBtn.classList.add('hidden');
            }
        }

        // Glow Alerts
        let hasAlert = false;
        if(this.els.btnChar) {
            if(Game.state.statPoints > 0) { this.els.btnChar.classList.add('alert-glow-yellow'); hasAlert = true; } 
            else { this.els.btnChar.classList.remove('alert-glow-yellow'); }
        } 
        
        // [v0.9.16] FIX: Safety check for missing quests array to prevent crash
        const questsList = Game.state.quests || [];
        const unreadQuests = questsList.some(q => !q.read);
        
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

                    <button id="btn-enter-camp" onclick="UI.switchView('camp')" class="absolute top-4 left-4 hidden bg-black/80 border-2 border-yellow-500 text-yellow-500 p-2 rounded-lg hover:bg-yellow-900 hover:text-white transition-all z-20 shadow-[0_0_15px_#ffd700] cursor-pointer flex flex-col items-center">
                        <span class="text-2xl">⛺</span>
                        <span class="text-xs font-bold">Lager</span>
                    </button>
                </div>`;
            Game.state.view = name;
            
            // FIX: Ensure Dialog state is cleared and focus is reset to Body
            if(Game.state) Game.state.inDialog = false;
            if(document.activeElement) document.activeElement.blur();
            
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
            
            // Render logic based on view
            if (name === 'char') this.renderChar();
            if (name === 'inventory') this.renderInventory();
            if (name === 'wiki') this.renderWiki();
            if (name === 'worldmap') this.renderWorldMap();
            if (name === 'city') this.renderCity();
            if (name === 'quests') this.renderQuests();
            if (name === 'crafting') this.renderCrafting();
            if (name === 'shop') this.renderShop(document.getElementById('shop-list'));
            if (name === 'clinic') this.renderClinic();
            
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
