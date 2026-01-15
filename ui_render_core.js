/* [TIMESTAMP] 2026-01-15 23:10:00 - ui_render_core.js - Full Recovery & Fix for updatePlayerList */

Object.assign(UI, {
    
    update: function() {
        // --- AFK LOGIC ---
        const loginScreen = document.getElementById('login-screen');
        const isLoginHidden = loginScreen && (loginScreen.style.display === 'none' || loginScreen.classList.contains('hidden'));
        const isAuth = (typeof Network !== 'undefined' && Network.myId);

        if (isLoginHidden && isAuth) {
            if (Date.now() - (this.lastInputTime || Date.now()) > 300000) { 
                console.log("AFK Trigger: Zeitüberschreitung");
                if(typeof this.logout === 'function') this.logout("AFK: ZEITÜBERSCHREITUNG");
                return;
            }
        }

        if (!Game.state) return;
        
        // Element-Caching & Basis-Stats
        if(!this.els.ammo) this.els.ammo = document.getElementById('val-ammo');
        if(!this.els.caps) this.els.caps = document.getElementById('val-caps');
        if(!this.els.hp) this.els.hp = document.getElementById('bar-hp');
        if(!this.els.headerCharInfo) this.els.headerCharInfo = document.getElementById('header-char-info');

        const sectorDisplay = document.getElementById('val-sector-display');
        const hasPoints = (Game.state.statPoints > 0) || (Game.state.perkPoints > 0);
        const displayName = Game.state.playerName || (typeof Network !== 'undefined' ? Network.myDisplayName : "SURVIVOR");
        
        if(this.els.name) this.els.name.textContent = displayName;
        if(this.els.headerCharInfo) this.els.headerCharInfo.classList.toggle('lvl-ready-glow', hasPoints);
        if(this.els.lvl) this.els.lvl.textContent = Game.state.lvl;

        // Bars: HP, RADS, XP
        const maxHp = Game.state.maxHp;
        const hp = Game.state.hp;
        const rads = Game.state.rads || 0;
        const effectiveMax = Math.max(1, maxHp - rads);
        const hpPct = Math.min(100, Math.max(0, (hp / maxHp) * 100));
        const radPct = Math.min(100, (rads / maxHp) * 100);
        
        const valHpEl = document.getElementById('val-hp');
        if(valHpEl) valHpEl.textContent = `TP ${Math.round(hp)}/${Math.round(effectiveMax)}`;

        if(this.els.hp) this.els.hp.style.width = `${hpPct}%`;
        const radBar = document.getElementById('bar-rads');
        if(radBar) radBar.style.width = `${radPct}%`;

        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, Math.floor((Game.state.xp / nextXp) * 100));
        if(this.els.xpTxt) this.els.xpTxt.textContent = expPct;
        if(this.els.expBarTop) this.els.expBarTop.style.width = `${expPct}%`;
        
        if(this.els.caps) this.els.caps.textContent = `${Game.state.caps}`;
        const ammoItem = Game.state.inventory ? Game.state.inventory.find(i => i.id === 'ammo') : null;
        if(this.els.ammo) this.els.ammo.textContent = ammoItem ? ammoItem.count : 0;

        if(sectorDisplay) {
            const sx = Game.state.sector ? Game.state.sector.x : 0;
            const sy = Game.state.sector ? Game.state.sector.y : 0;
            sectorDisplay.innerHTML = `🌍 SEKTOR [${sx},${sy}]`;
        }

        this.updateCampButton();
        this.updateMenuAlerts(hasPoints);
    },

    updateCampButton: function() {
        const campBtn = document.getElementById('btn-camp-overlay');
        if(!campBtn) return;
        const hasKit = Game.state.inventory && Game.state.inventory.some(i => i.id === 'camp_kit');
        const campDeployed = !!Game.state.camp;
        const inCampSector = campDeployed && Game.state.camp.sector.x === Game.state.sector.x && Game.state.camp.sector.y === Game.state.sector.y;

        if (campDeployed && inCampSector) {
            campBtn.classList.remove('hidden');
            campBtn.innerHTML = '<span class="text-2xl">⛺</span><span class="text-xs font-bold">LAGER</span>';
            campBtn.onclick = () => UI.switchView('camp');
        } else if (!campDeployed && hasKit) {
            campBtn.classList.remove('hidden');
            campBtn.innerHTML = '<span class="text-2xl">⛺</span><span class="text-xs font-bold">BAUEN</span>';
            campBtn.onclick = () => Game.deployCamp();
        } else {
            campBtn.classList.add('hidden');
        }
    },

    updateMenuAlerts: function(hasPoints) {
        const questsList = Game.state.quests || [];
        const unreadQuests = questsList.some(q => !q.read);
        if(this.els.btnChar) this.els.btnChar.classList.toggle('alert-glow-yellow', hasPoints);
        if(this.els.btnQuests) this.els.btnQuests.classList.toggle('alert-glow-cyan', unreadQuests);
        if(this.els.btnMenu) this.els.btnMenu.classList.toggle('alert-glow-yellow', hasPoints || unreadQuests);
    },

    switchView: async function(name) {
        this.stopJoystick();
        this.focusIndex = -1;
        if(this.els.navMenu) { this.els.navMenu.classList.add('hidden'); this.els.navMenu.style.display = 'none'; }
        if(this.els.playerList) this.els.playerList.style.display = 'none';

        const ver = document.getElementById('version-display')?.textContent.trim() || Date.now();
        
        if (name === 'map') {
            this.els.view.innerHTML = `
                <div id="map-view" class="w-full h-full flex justify-center items-center bg-black relative">
                    <canvas id="game-canvas" class="w-full h-full object-contain" style="image-rendering: pixelated;"></canvas>
                    <div id="val-sector-display" onclick="UI.switchView('worldmap')" class="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 border border-green-500 text-green-500 px-3 py-1 text-sm font-bold z-20 shadow-[0_0_10px_#39ff14] cursor-pointer rounded">🌍 SEKTOR [?,?]</div>
                    <button id="btn-camp-overlay" class="hidden absolute top-4 left-4 bg-black/80 border-2 border-green-500 text-green-500 p-2 rounded-lg z-20 shadow-[0_0_15px_#39ff14] cursor-pointer flex flex-col items-center"></button>
                </div>`;
            Game.state.view = 'map';
            Game.initCanvas();
            this.restoreOverlay();
            this.toggleControls(true);
            this.updateButtonStates('map');
            return;
        }

        try {
            const res = await fetch(`views/${name}.html?v=${ver}`);
            if (!res.ok) throw new Error(`View '${name}' not found`);
            this.els.view.innerHTML = await res.text();
            Game.state.view = name;
            this.restoreOverlay();

            if (name === 'char') this.renderStats('stats'); 
            else if (name === 'inventory') this.renderInventory();
            else if (name === 'wiki') this.renderWiki();
            else if (name === 'worldmap') this.renderWorldMap();
            else if (name === 'city') this.renderCity();
            else if (name === 'quests') this.renderQuests();
            else if (name === 'crafting') this.renderCrafting();
            else if (name === 'shop') this.renderShop(document.getElementById('shop-list'));
            else if (name === 'clinic') this.renderClinic();
            else if (name === 'camp' && typeof this.renderCamp === 'function') this.renderCamp();
            
            this.updateButtonStates(name);
            this.update();
        } catch (e) { console.error("Ladefehler:", e); }
    },

    updateButtonStates: function(activeName) {
        const btns = { wiki: this.els.btnWiki, worldmap: this.els.btnMap, char: this.els.btnChar, inventory: this.els.btnInv, quests: this.els.btnQuests };
        for(let key in btns) { if(btns[key]) btns[key].classList.toggle('active', activeName === key || (key==='char' && activeName==='stats')); }
    },

    restoreOverlay: function() {
        if(document.getElementById('joystick-base')) return;
        const html = `
            <div id="joystick-base" style="position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 2px solid rgba(57, 255, 20, 0.5); display: none; pointer-events: none; z-index: 9999;"></div>
            <div id="joystick-stick" style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(57, 255, 20, 0.8); display: none; pointer-events: none; z-index: 10000;"></div>
            <div id="dialog-overlay" onclick="if(event.target===this){this.style.display='none';this.innerHTML='';}" style="position: fixed; inset: 0; z-index: 10001; display: none; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px);"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        this.els.joyBase = document.getElementById('joystick-base');
        this.els.joyStick = document.getElementById('joystick-stick');
        this.els.dialog = document.getElementById('dialog-overlay');
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
    },

    toggleControls: function(show) { if (!show && this.els.dialog) this.els.dialog.innerHTML = ''; },
    
    shakeView: function() {
        if(this.els.view) {
            this.els.view.classList.remove('shake');
            void this.els.view.offsetWidth;
            this.els.view.classList.add('shake');
        }
    }
});
