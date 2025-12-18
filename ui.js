const UI = {
    els: {},
    timerInterval: null,
    lastInputTime: Date.now(), 
    biomeColors: GameData.colors, 
    
    touchState: {
        active: false, id: null, startX: 0, startY: 0, currentX: 0, currentY: 0, moveDir: { x: 0, y: 0 }, timer: null
    },

    log: function(msg, color="text-green-500") { 
        if(!this.els.log) return;
        const line = document.createElement('div');
        line.className = color;
        line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
    },

    shakeView: function() {
        if(this.els.view) {
            this.els.view.classList.remove('shake');
            void this.els.view.offsetWidth; 
            this.els.view.classList.add('shake');
            setTimeout(() => { if(this.els.view) this.els.view.classList.remove('shake'); }, 300);
        }
    },

    error: function(msg) {
        const errText = `> ERROR: ${msg}`;
        console.error(errText);
        if(this.els.log) {
            const line = document.createElement('div');
            line.className = "text-red-500 font-bold blink-red";
            line.textContent = errText;
            this.els.log.prepend(line);
        }
    },

    init: function() {
        this.els = {
            touchArea: document.getElementById('main-content'),
            view: document.getElementById('view-container'),
            log: document.getElementById('log-area'),
            
            hp: document.getElementById('val-hp'),
            hpBar: document.getElementById('bar-hp'),
            expBarTop: document.getElementById('bar-exp-top'),
            lvl: document.getElementById('val-lvl'),
            xpTxt: document.getElementById('val-xp-txt'),
            caps: document.getElementById('val-caps'),
            name: document.getElementById('val-name'),

            version: document.getElementById('version-display'), 
            joyBase: null, joyStick: null,
            dialog: document.getElementById('dialog-overlay'),
            timer: document.getElementById('game-timer'),
            
            btnNew: document.getElementById('btn-new'),
            btnInv: document.getElementById('btn-inv'),
            btnWiki: document.getElementById('btn-wiki'),
            btnMap: document.getElementById('btn-map'),
            btnChar: document.getElementById('btn-char'),
            btnQuests: document.getElementById('btn-quests'),
            btnSave: document.getElementById('btn-save'),
            btnLogout: document.getElementById('btn-logout'),
            btnReset: document.getElementById('btn-reset'), 
            btnMenu: document.getElementById('btn-menu-toggle'),
            navMenu: document.getElementById('main-nav'),
            playerCount: document.getElementById('val-players'),
            playerList: document.getElementById('player-list-overlay'),
            playerListContent: document.getElementById('player-list-content'),
            loginScreen: document.getElementById('login-screen'),
            spawnScreen: document.getElementById('spawn-screen'),
            spawnMsg: document.getElementById('spawn-msg'),
            spawnList: document.getElementById('spawn-list'),
            btnSpawnRandom: document.getElementById('btn-spawn-random'),
            resetOverlay: document.getElementById('reset-overlay'),
            btnConfirmReset: document.getElementById('btn-confirm-reset'),
            btnCancelReset: document.getElementById('btn-cancel-reset'),
            gameScreen: document.getElementById('game-screen'),
            loginInput: document.getElementById('survivor-id-input'),
            loginStatus: document.getElementById('login-status'),
            gameOver: document.getElementById('game-over-screen'),
            btnUp: document.getElementById('btn-up'),
            btnDown: document.getElementById('btn-down'),
            btnLeft: document.getElementById('btn-left'),
            btnRight: document.getElementById('btn-right')
        };

        ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
            document.body.addEventListener(evt, () => this.lastInputTime = Date.now());
        });

        if(this.els.loginInput) {
            this.els.loginInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") this.attemptLogin();
            });
        }
        
        const btnLogin = document.getElementById('btn-login');
        if(btnLogin) btnLogin.onclick = () => this.attemptLogin();

        if(this.els.btnSave) this.els.btnSave.onclick = () => this.handleSaveClick();
        if(this.els.btnLogout) this.els.btnLogout.onclick = () => this.logout('MANUELL AUSGELOGGT');
        if(this.els.btnReset) this.els.btnReset.onclick = () => this.handleReset();

        if(this.els.btnConfirmReset) this.els.btnConfirmReset.onclick = () => this.confirmReset();
        if(this.els.btnCancelReset) this.els.btnCancelReset.onclick = () => this.cancelReset();

        if(this.els.btnMenu) {
            this.els.btnMenu.onclick = (e) => {
                e.stopPropagation(); 
                this.els.navMenu.classList.toggle('hidden');
                this.els.navMenu.style.display = this.els.navMenu.classList.contains('hidden') ? 'none' : 'flex';
            };
        }
        
        document.addEventListener('click', (e) => {
            if(this.els.navMenu && !this.els.navMenu.classList.contains('hidden')) {
                if (!this.els.navMenu.contains(e.target) && e.target !== this.els.btnMenu) {
                    this.els.navMenu.classList.add('hidden');
                    this.els.navMenu.style.display = 'none';
                }
            }
        });

        if(this.els.playerCount) this.els.playerCount.onclick = () => this.togglePlayerList();

        if(this.els.btnInv) this.els.btnInv.onclick = () => this.toggleView('inventory');
        if(this.els.btnWiki) this.els.btnWiki.onclick = () => this.toggleView('wiki');
        if(this.els.btnMap) this.els.btnMap.onclick = () => this.toggleView('worldmap');
        if(this.els.btnChar) this.els.btnChar.onclick = () => this.toggleView('char');
        if(this.els.btnQuests) this.els.btnQuests.onclick = () => this.toggleView('quests');

        if(this.els.btnSpawnRandom) this.els.btnSpawnRandom.onclick = () => this.selectSpawn(null);

        if(this.els.touchArea) {
            this.els.touchArea.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
            this.els.touchArea.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
            this.els.touchArea.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            this.els.touchArea.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
        }

        window.addEventListener('keydown', (e) => {
            if (!Game.state || Game.state.isGameOver) return;

            if (Game.state.view === 'combat') {
                if (e.key === ' ') { e.preventDefault(); Game.combatAction('attack'); }
                if (e.key === 'Escape') { Game.combatAction('flee'); }
            }
            else if (Game.state.view === 'map' && !Game.state.inDialog) {
                if(e.key === 'w' || e.key === 'ArrowUp') Game.move(0, -1);
                if(e.key === 's' || e.key === 'ArrowDown') Game.move(0, 1);
                if(e.key === 'a' || e.key === 'ArrowLeft') Game.move(-1, 0);
                if(e.key === 'd' || e.key === 'ArrowRight') Game.move(1, 0);
            }
        });
        
        window.Game = Game; 
        window.UI = this;
        
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    },
    
    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    },

    showManualOverlay: async function() {
        const overlay = document.getElementById('manual-overlay');
        const content = document.getElementById('manual-content');
        
        if(this.els.navMenu) {
            this.els.navMenu.classList.add('hidden');
            this.els.navMenu.style.display = 'none';
        }
        
        if(overlay && content) {
            content.innerHTML = '<div class="text-center animate-pulse">Lade Handbuch...</div>';
            overlay.style.display = 'flex'; 
            overlay.classList.remove('hidden');
            
            const verDisplay = document.getElementById('version-display'); 
            const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
            try {
                const res = await fetch(`views/manual.html?v=${ver}`);
                if (!res.ok) throw new Error("Manual not found");
                const html = await res.text();
                content.innerHTML = html;
            } catch(e) {
                content.innerHTML = `<div class="text-red-500">Fehler beim Laden: ${e.message}</div>`;
            }
        }
    },

    showChangelogOverlay: async function() {
        const overlay = document.getElementById('changelog-overlay');
        const content = document.getElementById('changelog-content');
        
        if(overlay && content) {
            content.textContent = 'Lade Daten...';
            overlay.style.display = 'flex'; 
            overlay.classList.remove('hidden');
            
            const verDisplay = document.getElementById('version-display'); 
            const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
            
            try {
                const res = await fetch(`change.log?v=${ver}`);
                if (!res.ok) throw new Error("Logfile nicht gefunden");
                const text = await res.text();
                content.textContent = text;
            } catch(e) {
                content.textContent = `Fehler beim Laden: ${e.message}`;
            }
        }
    },

    showMobileControlsHint: function() {
        if(document.getElementById('mobile-hint')) return;
        const hintHTML = `
            <div id="mobile-hint" class="absolute inset-0 z-[100] flex flex-col justify-center items-center bg-black/80 pointer-events-auto backdrop-blur-sm opacity-0 transition-opacity duration-500" onclick="this.style.opacity='0'; setTimeout(() => this.remove(), 500)">
                <div class="border-2 border-[#39ff14] bg-black p-6 text-center shadow-[0_0_20px_#39ff14] max-w-sm mx-4">
                    <div class="text-5xl mb-4 animate-bounce">👆</div>
                    <h2 class="text-2xl font-bold text-[#39ff14] mb-2 tracking-widest border-b border-[#39ff14] pb-2">TOUCH STEUERUNG</h2>
                    <p class="text-green-300 mb-6 font-mono leading-relaxed">
                        Tippe und halte IRGENDWO auf dem Hauptschirm (auch im Log), um den Joystick zu aktivieren.
                    </p>
                    <div class="text-xs text-[#39ff14] animate-pulse font-bold bg-[#39ff14]/20 py-2 rounded">
                        > TIPPEN ZUM STARTEN <
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', hintHTML);
        setTimeout(() => { const el = document.getElementById('mobile-hint'); if(el) el.classList.remove('opacity-0'); }, 10);
    },

    handleTouchStart: function(e) {
        if(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.no-joystick')) return;
        if(Game.state.view !== 'map' || Game.state.inDialog || this.touchState.active) return;
        const touch = e.changedTouches[0];
        this.touchState.active = true;
        this.touchState.id = touch.identifier;
        this.touchState.startX = touch.clientX;
        this.touchState.startY = touch.clientY;
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        this.touchState.moveDir = {x:0, y:0};
        this.showJoystick(touch.clientX, touch.clientY);
        if(this.touchState.timer) clearInterval(this.touchState.timer);
        this.touchState.timer = setInterval(() => this.processJoystickMovement(), 150); 
    },

    handleTouchMove: function(e) {
        if(!this.touchState.active) return;
        let touch = null;
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === this.touchState.id) {
                touch = e.changedTouches[i];
                break;
            }
        }
        if(!touch) return;
        e.preventDefault(); 
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        this.updateJoystickVisuals();
        this.calculateDirection();
    },

    handleTouchEnd: function(e) {
        if(!this.touchState.active) return;
        let found = false;
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === this.touchState.id) {
                found = true;
                break;
            }
        }
        if(!found) return;
        this.stopJoystick();
    },

    stopJoystick: function() {
        if(this.touchState.timer) {
            clearInterval(this.touchState.timer);
            this.touchState.timer = null;
        }
        this.touchState.active = false;
        this.touchState.id = null;
        this.touchState.moveDir = {x:0, y:0};
        this.hideJoystick();
    },

    calculateDirection: function() {
        const dx = this.touchState.currentX - this.touchState.startX;
        const dy = this.touchState.currentY - this.touchState.startY;
        const threshold = 20; 
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
            this.touchState.moveDir = {x:0, y:0};
            return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
            this.touchState.moveDir = { x: dx > 0 ? 1 : -1, y: 0 };
        } else {
            this.touchState.moveDir = { x: 0, y: dy > 0 ? 1 : -1 };
        }
    },

    processJoystickMovement: function() {
        const d = this.touchState.moveDir;
        if(d.x !== 0 || d.y !== 0) {
            Game.move(d.x, d.y);
        }
    },

    showJoystick: function(x, y) {
        if(!this.els.joyBase) this.restoreOverlay();
        if(this.els.joyBase) {
            this.els.joyBase.style.left = (x - 50) + 'px';
            this.els.joyBase.style.top = (y - 50) + 'px';
            this.els.joyBase.style.display = 'block';
        }
        if(this.els.joyStick) {
            this.els.joyStick.style.left = (x - 25) + 'px';
            this.els.joyStick.style.top = (y - 25) + 'px';
            this.els.joyStick.style.display = 'block';
        }
    },

    updateJoystickVisuals: function() {
        if(!this.els.joyBase) return;
        const dx = this.touchState.currentX - this.touchState.startX;
        const dy = this.touchState.currentY - this.touchState.startY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 40;
        let visualX = dx;
        let visualY = dy;
        if(dist > maxDist) {
            const ratio = maxDist / dist;
            visualX = dx * ratio;
            visualY = dy * ratio;
        }
        this.els.joyStick.style.transform = `translate(${visualX}px, ${visualY}px)`;
    },

    hideJoystick: function() {
        if(this.els.joyBase) this.els.joyBase.style.display = 'none';
        if(this.els.joyStick) {
            this.els.joyStick.style.display = 'none';
            this.els.joyStick.style.transform = 'translate(0px, 0px)';
        }
    },

    handleReset: function() {
        if(this.els.navMenu) {
            this.els.navMenu.classList.add('hidden');
            this.els.navMenu.style.display = 'none';
        }
        if(this.els.resetOverlay) this.els.resetOverlay.style.display = 'flex';
    },
    
    confirmReset: function() {
        if(typeof Game !== 'undefined') Game.hardReset();
    },
    
    cancelReset: function() {
        if(this.els.resetOverlay) this.els.resetOverlay.style.display = 'none';
    },

    handleSaveClick: function() {
        Game.saveGame(true);
        const btn = this.els.btnSave;
        const originalText = btn.textContent;
        const originalClass = btn.className;
        
        btn.textContent = "SAVED!";
        btn.className = "header-btn bg-[#39ff14] text-black border-[#39ff14]";
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.className = originalClass;
        }, 1000);
    },

    attemptLogin: async function() {
        if(!this.els.loginInput) return;
        const id = this.els.loginInput.value.trim().toUpperCase();
        if(id.length < 3) {
            this.els.loginStatus.textContent = "ID ZU KURZ (MIN 3 ZEICHEN)";
            this.els.loginStatus.className = "mt-4 text-red-500 font-bold";
            return;
        }
        this.els.loginStatus.textContent = "VERBINDE MIT VAULT-TEC NETZWERK...";
        this.els.loginStatus.className = "mt-4 text-yellow-400 animate-pulse";
        this.lastInputTime = Date.now(); 
        try {
            if(typeof Network === 'undefined') throw new Error("Netzwerk Modul fehlt");
            Network.init(); 
            const saveData = await Network.login(id);
            if (saveData) {
                this.els.loginScreen.style.display = 'none';
                this.els.gameScreen.classList.remove('hidden');
                this.els.gameScreen.classList.remove('opacity-0');
                Game.init(saveData);
                if(this.isMobile()) {
                    this.showMobileControlsHint();
                }
            } else {
                this.els.loginScreen.style.display = 'none';
                this.els.spawnScreen.style.display = 'flex'; 
                this.els.spawnScreen.classList.remove('hidden');
                if(this.els.spawnMsg) this.els.spawnMsg.textContent = `KEIN SPIELSTAND FÜR ID '${id}' GEFUNDEN.`;
            }
        } catch(e) {
            this.error("LOGIN FEHLGESCHLAGEN: " + e.message);
        }
    },

    renderSpawnList: function(players) {
        if(!this.els.spawnList) return;
        this.els.spawnList.innerHTML = '';
        let count = 0;
        for(let id in players) {
            if(id === Network.myId) continue;
            const p = players[id];
            const btn = document.createElement('button');
            btn.className = "action-button w-full text-left p-2 flex justify-between";
            const sec = p.sector ? `${p.sector.x},${p.sector.y}` : "?,?";
            btn.innerHTML = `<span>${id}</span> <span class="text-cyan-400">Sektor ${sec}</span>`;
            btn.onclick = () => this.selectSpawn(p);
            this.els.spawnList.appendChild(btn);
            count++;
        }
        if(count === 0) {
            this.els.spawnList.innerHTML = '<div class="text-center italic opacity-50 p-2">Keine Signale. Starte Solo.</div>';
        }
    },

    selectSpawn: function(targetPlayer) {
        this.els.spawnScreen.style.display = 'none'; 
        this.els.gameScreen.classList.remove('hidden');
        this.els.gameScreen.classList.remove('opacity-0');
        Game.init(null, targetPlayer);
        if(this.isMobile()) {
            this.showMobileControlsHint();
        }
    },

    logout: function(reason="AUSGELOGGT") {
        if(typeof Game !== 'undefined') Game.saveGame(true);
        if(typeof Network !== 'undefined') Network.disconnect();
        this.els.gameScreen.classList.add('hidden');
        this.els.gameScreen.classList.add('opacity-0');
        if(this.els.spawnScreen) this.els.spawnScreen.style.display = 'none';
        this.els.loginScreen.style.display = 'flex';
        if(this.els.loginStatus) {
            this.els.loginStatus.textContent = reason;
            this.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red";
        }
        if(this.els.loginInput) {
            this.els.loginInput.value = "";
            this.els.loginInput.focus();
        }
        if(this.els.navMenu) {
            this.els.navMenu.classList.add('hidden');
            this.els.navMenu.style.display = 'none';
        }
        if(this.els.playerList) this.els.playerList.style.display = 'none';
    },

    togglePlayerList: function() {
        if(this.els.playerList.style.display === 'flex') {
            this.els.playerList.style.display = 'none';
        } else {
            this.updatePlayerList();
            this.els.playerList.style.display = 'flex';
        }
    },

    updatePlayerList: function() {
        if(!this.els.playerListContent || typeof Network === 'undefined') return;
        let html = `<div class="text-green-400">> ${Network.myId} (DU)</div>`;
        if(Network.otherPlayers) {
            for(let id in Network.otherPlayers) {
                const p = Network.otherPlayers[id];
                const loc = (p.sector) ? `[${p.sector.x},${p.sector.y}]` : '[?]';
                html += `<div class="text-cyan-400">> ${id} ${loc}</div>`;
            }
        }
        this.els.playerListContent.innerHTML = html;
    },

    setConnectionState: function(status) {
        const v = this.els.version;
        if(!v) return;
        if(status === 'online') {
            v.textContent = "ONLINE (v0.0.17f)"; 
            v.className = "text-[#39ff14] font-bold tracking-widest"; v.style.textShadow = "0 0 5px #39ff14";
        } else if (status === 'offline') {
            v.textContent = "OFFLINE"; v.className = "text-red-500 font-bold tracking-widest"; v.style.textShadow = "0 0 5px red";
        } else {
            v.textContent = "CONNECTING..."; v.className = "text-yellow-400 font-bold tracking-widest animate-pulse";
        }
    },

    toggleView: function(name) { if (Game.state.view === name) this.switchView('map'); else this.switchView(name); },
    
    updateTimer: function() { 
        if(Game.state && this.els.gameScreen && !this.els.gameScreen.classList.contains('hidden')) {
            if(Date.now() - this.lastInputTime > 300000) {
                this.logout("AFK: ZEITÜBERSCHREITUNG");
                return;
            }
        }
        if(!Game.state || !Game.state.startTime) return; 
        const diff = Math.floor((Date.now() - Game.state.startTime) / 1000); 
        const h = Math.floor(diff / 3600).toString().padStart(2,'0'); 
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0'); 
        const s = (diff % 60).toString().padStart(2,'0'); 
        if(this.els.timer) this.els.timer.textContent = `${h}:${m}:${s}`; 
        if(Game.state.view === 'map') this.update(); 
    },

    switchView: async function(name) { 
        this.stopJoystick();

        if(this.els.navMenu) {
            this.els.navMenu.classList.add('hidden');
            this.els.navMenu.style.display = 'none';
        }
        if(this.els.playerList) this.els.playerList.style.display = 'none';

        const verDisplay = document.getElementById('version-display'); 
        const ver = verDisplay ? verDisplay.textContent.trim() : Date.now(); 
        
        if (name === 'map') {
            this.els.view.innerHTML = '<canvas id="game-canvas" class="w-full h-full object-contain" style="image-rendering: pixelated;"></canvas>';
            Game.state.view = name;
            Game.initCanvas();
            this.restoreOverlay();
            this.toggleControls(true);
            this.updateButtonStates(name);
            this.update();
            return; 
        }

        const path = `views/${name}.html?v=${ver}`; 
        try { 
            const res = await fetch(path); 
            if (!res.ok) throw new Error(`View '${name}' not found`); 
            const html = await res.text(); 
            this.els.view.innerHTML = html; 
            Game.state.view = name; 
            
            if (name === 'combat') { 
                this.restoreOverlay(); 
                this.toggleControls(false); 
                this.renderCombat(); 
            } 
            else { this.toggleControls(false); } 
            
            if (name === 'char') this.renderChar(); 
            if (name === 'inventory') this.renderInventory(); 
            if (name === 'wiki') this.renderWiki(); 
            if (name === 'worldmap') this.renderWorldMap(); 
            if (name === 'city') this.renderCity(); 
            if (name === 'combat') this.renderCombat(); 
            if (name === 'quests') this.renderQuests(); 
            if (name === 'crafting') this.renderCrafting();
            
            this.updateButtonStates(name);
            this.update(); 
        } catch (e) { this.error(`Ladefehler: ${e.message}`); } 
    },

    updateButtonStates: function(activeName) {
        if(this.els.btnWiki) this.els.btnWiki.classList.toggle('active', activeName === 'wiki');
        if(this.els.btnMap) this.els.btnMap.classList.toggle('active', activeName === 'worldmap');
        if(this.els.btnChar) this.els.btnChar.classList.toggle('active', activeName === 'char');
        if(this.els.btnInv) this.els.btnInv.classList.toggle('active', activeName === 'inventory');
        if(this.els.btnQuests) this.els.btnQuests.classList.toggle('active', activeName === 'quests');
    },

    update: function() { 
        if (!Game.state) return; 
        
        if(this.els.name && typeof Network !== 'undefined') {
            this.els.name.textContent = Network.myId || "SURVIVOR";
        }

        // NEW: Level Up Notification
        if(Game.state.statPoints > 0) {
            this.els.lvl.innerHTML = `${Game.state.lvl} <span class="text-yellow-400 animate-pulse ml-1 text-xs">LVL UP!</span>`;
        } else {
            this.els.lvl.textContent = Game.state.lvl; 
        }

        if(this.els.ammo) this.els.ammo.textContent = Game.state.ammo; 
        if(this.els.caps) this.els.caps.textContent = `${Game.state.caps} Caps`; 
        if(this.els.zone) this.els.zone.textContent = Game.state.zone; 
        
        const buffActive = Date.now() < Game.state.buffEndTime; 
        if(this.els.hpBar) {
            if(buffActive) { this.els.hpBar.style.backgroundColor = "#ffff00"; this.els.hpBar.parentElement.style.borderColor = "#ffff00"; } 
            else { this.els.hpBar.style.backgroundColor = "#39ff14"; this.els.hpBar.parentElement.style.borderColor = "#1a4d1a"; } 
        }
        
        const maxHp = Game.state.maxHp; 
        if(this.els.hp) this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`; 
        if(this.els.hpBar) this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`; 
        
        const nextXp = Game.expToNextLevel(Game.state.lvl); 
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100); 
        if(this.els.expBarTop) this.els.expBarTop.style.width = `${expPct}%`; 
        
        let hasAlert = false;
        if(this.els.btnChar) {
            if(Game.state.statPoints > 0) { 
                this.els.btnChar.innerHTML = "CHAR <span class='text-yellow-400'>!</span>"; 
                hasAlert = true;
            } else { 
                this.els.btnChar.textContent = "CHARAKTER"; 
            }
        } 
        const unreadQuests = Game.state.quests.some(q => !q.read); 
        if(this.els.btnQuests) {
            if(unreadQuests) { 
                this.els.btnQuests.innerHTML = "AUFGABEN <span class='text-cyan-400'>!</span>"; 
                hasAlert = true;
            } else { 
                this.els.btnQuests.textContent = "AUFGABEN"; 
            }
        } 
        if(this.els.btnMenu) {
            if(hasAlert) {
                this.els.btnMenu.classList.add('border-red-500', 'text-red-500');
                this.els.btnMenu.innerHTML = 'MENÜ <span class="text-xl font-bold animate-pulse">!</span>';
            } else {
                this.els.btnMenu.classList.remove('border-red-500', 'text-red-500');
                this.els.btnMenu.innerHTML = 'MENÜ <span class="text-xl">☰</span>';
            }
        }
        
        const inCombat = Game.state.view === 'combat'; 
        [this.els.btnWiki, this.els.btnMap, this.els.btnChar, this.els.btnQuests, this.els.btnSave, this.els.btnLogout, this.els.btnInv].forEach(btn => {
            if(btn) btn.disabled = inCombat;
        });
        
        if(this.els.lvl) {
            if(buffActive) this.els.lvl.classList.add('blink-red'); 
            else this.els.lvl.classList.remove('blink-red'); 
        }
        
        if(Game.state.view === 'map') { 
            if(this.els.dpadToggle) this.els.dpadToggle.style.display = 'flex'; 
            if(!Game.state.inDialog && this.els.dialog && this.els.dialog.innerHTML === '') { 
                this.els.dialog.style.display = 'none'; 
            } 
        } else { 
            if(this.els.dpadToggle) this.els.dpadToggle.style.display = 'none'; 
        } 
    },

    renderInventory: function() {
        const list = document.getElementById('inventory-list');
        const countDisplay = document.getElementById('inv-count');
        const capsDisplay = document.getElementById('inv-caps');
        
        if(!list || !Game.state.inventory) return;
        
        list.innerHTML = '';
        capsDisplay.textContent = Game.state.caps;
        
        let totalItems = 0;
        
        Game.state.inventory.forEach(entry => {
            if(entry.count <= 0) return;
            totalItems += entry.count;
            const item = Game.items[entry.id];
            
            const div = document.createElement('div');
            div.className = "border border-green-900 bg-green-900/10 p-2 flex justify-between items-center";
            
            let btnText = "BENUTZEN";
            if(item.type === 'weapon' || item.type === 'body') btnText = "AUSRÜSTEN";
            if(item.type === 'junk' || item.type === 'component' || item.type === 'rare') btnText = "-";
            
            div.innerHTML = `
                <div>
                    <div class="font-bold text-yellow-400">${item.name} <span class="text-white">x${entry.count}</span></div>
                    <div class="text-xs opacity-70">${item.type.toUpperCase()}</div>
                </div>
                ${btnText !== '-' ? `<button class="action-button text-sm px-2" onclick="Game.useItem('${entry.id}')">${btnText}</button>` : ''}
            `;
            list.appendChild(div);
        });
        
        countDisplay.textContent = totalItems;
        
        if(totalItems === 0) {
            list.innerHTML = '<div class="text-center text-gray-500 italic mt-10">Leerer Rucksack...</div>';
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
                
                let isEquipped = false;
                if (Game.state.equip.weapon && Object.keys(Game.items).find(k => Game.items[k].name === Game.state.equip.weapon.name) === reqId) isEquipped = true;
                if (Game.state.equip.body && Object.keys(Game.items).find(k => Game.items[k].name === Game.state.equip.body.name) === reqId) isEquipped = true;
                
                let color = "text-green-500";
                
                if (isEquipped) {
                    if (countHave < countNeeded) { 
                        canCraft = false; 
                        color = "text-red-500"; 
                    }
                } else {
                    if (countHave < countNeeded) { 
                        canCraft = false; 
                        color = "text-red-500"; 
                    }
                }
                
                reqHtml += `<div class="${color} text-xs">• ${Game.items[reqId].name}: ${countHave}/${countNeeded} ${isEquipped ? '(E)' : ''}</div>`;
            }
            
            if(Game.state.lvl < recipe.lvl) {
                canCraft = false;
                reqHtml += `<div class="text-red-500 text-xs mt-1">Benötigt Level ${recipe.lvl}</div>`;
            }
            
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="font-bold text-yellow-400 text-lg">${outItem.name}</div>
                    <button class="action-button text-sm px-3" onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>FERTIGEN</button>
                </div>
                <div class="pl-2 border-l-2 border-green-900">
                    ${reqHtml}
                </div>
            `;
            container.appendChild(div);
        });
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
        } 
        else if (category === 'items') {
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
            } else {
                htmlBuffer = '<div class="text-red-500">Fehler: Item-Datenbank nicht gefunden.</div>';
            }
        }
        else if (category === 'crafting') {
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
        }
        else if (category === 'locs') {
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

    renderChar: function() { 
        const grid = document.getElementById('stat-grid'); 
        if(!grid) return; 
        
        const lvlDisplay = document.getElementById('char-lvl'); 
        if(lvlDisplay) lvlDisplay.textContent = Game.state.lvl; 
        
        grid.innerHTML = Object.keys(Game.state.stats).map(k => { 
            const val = Game.getStat(k); 
            // FIX: Große Buttons (w-12 h-12)
            const btn = Game.state.statPoints > 0 ? `<button class="w-12 h-12 border-2 border-green-500 bg-green-900/50 text-green-400 font-bold ml-2 flex items-center justify-center hover:bg-green-500 hover:text-black transition-colors" onclick="Game.upgradeStat('${k}')" style="font-size: 1.5rem;">+</button>` : ''; 
            return `<div class="flex justify-between items-center border-b border-green-900/30 py-1 h-14"><span>${k}</span> <div class="flex items-center"><span class="text-yellow-400 font-bold mr-4 text-xl">${val}</span>${btn}</div></div>`; 
        }).join(''); 
        
        const nextXp = Game.expToNextLevel(Game.state.lvl); 
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100); 
        document.getElementById('char-exp').textContent = Game.state.xp; 
        document.getElementById('char-next').textContent = nextXp; 
        document.getElementById('char-exp-bar').style.width = `${expPct}%`; 
        
        // NEU: Auffälliger Hinweis, wenn Punkte verfügbar sind
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
        if(wpn.bonus) {
            for(let s in wpn.bonus) wpnStats += ` ${s}:${wpn.bonus[s]}`;
        }
        document.getElementById('equip-weapon-stats').textContent = wpnStats;

        document.getElementById('equip-body-name').textContent = arm.name;
        let armStats = "";
        if(arm.bonus) {
            for(let s in arm.bonus) armStats += `${s}:${arm.bonus[s]} `;
        }
        document.getElementById('equip-body-stats').textContent = armStats || "Kein Bonus";
    },
    
    renderCombat: function() { 
        const enemy = Game.state.enemy; 
        if(!enemy) return; 
        document.getElementById('enemy-name').textContent = enemy.name; 
        document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`; 
        document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`; 
    },

    restoreOverlay: function() { 
        if(document.getElementById('joystick-base')) return; 
        
        const joystickHTML = `
            <div id="joystick-base" style="position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 2px solid rgba(57, 255, 20, 0.5); background: rgba(0, 0, 0, 0.2); display: none; pointer-events: none; z-index: 9999;"></div>
            <div id="joystick-stick" style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(57, 255, 20, 0.8); display: none; pointer-events: none; z-index: 10000; box-shadow: 0 0 10px #39ff14;"></div>
            
            <div id="dialog-overlay" style="position: absolute; bottom: 20px; right: 20px; z-index: 50; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; max-width: 50%;"></div> 
        `; 
        this.els.view.insertAdjacentHTML('beforeend', joystickHTML); 
        
        this.els.joyBase = document.getElementById('joystick-base');
        this.els.joyStick = document.getElementById('joystick-stick');
        this.els.dialog = document.getElementById('dialog-overlay'); 
    },
    
    toggleControls: function(show) { if (!show && this.els.dialog) this.els.dialog.innerHTML = ''; },
    showGameOver: function() { if(this.els.gameOver) this.els.gameOver.classList.remove('hidden'); this.toggleControls(false); },
    enterVault: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const restBtn = document.createElement('button'); restBtn.className = "action-button w-full mb-1 border-blue-500 text-blue-300"; restBtn.textContent = "Ausruhen (Gratis)"; restBtn.onclick = () => { Game.rest(); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weiter geht's"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(restBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'flex'; },
    enterSupermarket: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-red-500 text-red-300"; enterBtn.textContent = "Ruine betreten (Gefahr!)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "market"); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(enterBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'block'; },
    enterCave: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-gray-500 text-gray-300"; enterBtn.textContent = "In die Tiefe (Dungeon)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "cave"); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(enterBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'block'; },
    leaveDialog: function() { Game.state.inDialog = false; this.els.dialog.style.display = 'none'; this.update(); },
    renderQuests: function() { const list = document.getElementById('quest-list'); if(!list) return; list.innerHTML = Game.state.quests.map(q => ` <div class="border border-green-900 bg-green-900/10 p-2 flex items-center gap-3 cursor-pointer hover:bg-green-900/30 transition-all" onclick="UI.showQuestDetail('${q.id}')"> <div class="text-3xl">✉️</div> <div> <div class="font-bold text-lg text-yellow-400">${q.read ? '' : '<span class="text-cyan-400">[NEU]</span> '}${q.title}</div> <div class="text-xs opacity-70">Zum Lesen klicken</div> </div> </div> `).join(''); },
    showQuestDetail: function(id) { const quest = Game.state.quests.find(q => q.id === id); if(!quest) return; quest.read = true; this.update(); const list = document.getElementById('quest-list'); const detail = document.getElementById('quest-detail'); const content = document.getElementById('quest-content'); list.classList.add('hidden'); detail.classList.remove('hidden'); content.innerHTML = `<h2 class="text-2xl font-bold text-yellow-400 border-b border-green-500 mb-4">${quest.title}</h2><div class="font-mono text-lg leading-relaxed whitespace-pre-wrap">${quest.text}</div>`; },
    closeQuestDetail: function() { document.getElementById('quest-detail').classList.add('hidden'); document.getElementById('quest-list').classList.remove('hidden'); this.renderQuests(); },
    
    renderWorldMap: function() { const grid = document.getElementById('world-grid'); if(!grid) return; grid.innerHTML = ''; for(let y=0; y<8; y++) { for(let x=0; x<8; x++) { const d = document.createElement('div'); d.className = "border border-green-900/30 flex justify-center items-center text-xs relative"; if(x === Game.state.sector.x && y === Game.state.sector.y) { d.style.backgroundColor = "#39ff14"; d.style.color = "black"; d.style.fontWeight = "bold"; d.textContent = "YOU"; } else if(Game.worldData[`${x},${y}`]) { const biome = Game.worldData[`${x},${y}`].biome; d.style.backgroundColor = this.biomeColors[biome] || '#4a3d34'; } if(typeof Network !== 'undefined' && Network.otherPlayers) { const playersHere = Object.values(Network.otherPlayers).filter(p => p.sector && p.sector.x === x && p.sector.y === y); if(playersHere.length > 0) { const dot = document.createElement('div'); dot.className = "absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_cyan]"; if(x === Game.state.sector.x && y === Game.state.sector.y) { dot.style.top = "2px"; dot.style.right = "2px"; } d.appendChild(dot); } } grid.appendChild(d); } } grid.style.gridTemplateColumns = "repeat(8, 1fr)"; },
    renderCity: function() { const con = document.getElementById('city-options'); if(!con) return; con.innerHTML = ''; const addBtn = (txt, cb, disabled=false) => { const b = document.createElement('button'); b.className = "action-button w-full mb-2 text-left p-3 flex justify-between"; b.innerHTML = txt; b.onclick = cb; if(disabled) { b.disabled = true; b.style.opacity = 0.5; } con.appendChild(b); }; addBtn("Heilen (25 Kronkorken)", () => Game.heal(), Game.state.caps < 25 || Game.state.hp >= Game.state.maxHp); addBtn("Munition (10 Stk / 10 Kronkorken)", () => Game.buyAmmo(), Game.state.caps < 10); addBtn("Händler / Waffen & Rüstung", () => this.renderShop(con)); addBtn("🛠️ Werkbank / Crafting", () => this.toggleView('crafting')); addBtn("Stadt verlassen", () => this.switchView('map')); },
    renderShop: function(container) { container.innerHTML = ''; const backBtn = document.createElement('button'); backBtn.className = "action-button w-full mb-4 text-center border-yellow-400 text-yellow-400"; backBtn.textContent = "ZURÜCK ZUM PLATZ"; backBtn.onclick = () => this.renderCity(); container.appendChild(backBtn); Object.keys(Game.items).forEach(key => { const item = Game.items[key]; if(item.cost > 0 && Game.state.lvl >= (item.requiredLevel || 0) - 2) { const canAfford = Game.state.caps >= item.cost; const isEquipped = (Game.state.equip[item.slot] && Game.state.equip[item.slot].name === item.name); let label = `<span>${item.name}</span> <span>${item.cost} Kronkorken</span>`; if(isEquipped) label = `<span class="text-green-500">[AUSGERÜSTET]</span>`; const btn = document.createElement('button'); btn.className = "action-button w-full mb-2 flex justify-between text-sm"; btn.innerHTML = label; if(!canAfford || isEquipped) { btn.disabled = true; btn.style.opacity = 0.5; } else { btn.onclick = () => Game.buyItem(key); } container.appendChild(btn); } }); },
    renderCombat: function() { const enemy = Game.state.enemy; if(!enemy) return; document.getElementById('enemy-name').textContent = enemy.name; document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`; document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`; }
};
