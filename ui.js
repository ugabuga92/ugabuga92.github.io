const UI = {
    els: {},
    timerInterval: null,
    lastInputTime: Date.now(), 
    biomeColors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {}, 
    
    loginBusy: false, isRegistering: false, charSelectMode: false, deleteMode: false,
    currentSaves: {}, selectedSlot: -1, focusIndex: -1, focusableEls: [], inputMethod: 'touch',
    touchState: { active: false, id: null, startX: 0, startY: 0, currentX: 0, currentY: 0, moveDir: { x: 0, y: 0 }, timer: null },

    log: function(msg, color="text-green-500") { 
        if(!this.els.log) return;
        const line = document.createElement('div');
        line.className = color; line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
    },

    error: function(msg) {
        console.error(msg);
        if(this.els.log) {
            const line = document.createElement('div');
            line.className = "text-red-500 font-bold blink-red";
            line.textContent = "> ERROR: " + msg;
            this.els.log.prepend(line);
        }
    },

    shakeView: function() {
        if(this.els.view) {
            this.els.view.classList.remove('shake');
            void this.els.view.offsetWidth; 
            this.els.view.classList.add('shake');
            setTimeout(() => { if(UI.els.view) UI.els.view.classList.remove('shake'); }, 300);
        }
    },
    
    setConnectionState: function(status) {
        const v = document.getElementById('login-version-display');
        if(!v) return;
        if(status === 'online') { v.style.color = "#39ff14"; }
        else if (status === 'offline') { v.style.color = "red"; }
    },

    updateTimer: function() { 
        if(Game.state && UI.els.gameScreen && !UI.els.gameScreen.classList.contains('hidden')) {
            if(Date.now() - UI.lastInputTime > 300000) { UI.logout("AFK: ZEITÜBERSCHREITUNG"); return; }
        }
        if(!Game.state || !Game.state.startTime) return; 
        const diff = Math.floor((Date.now() - Game.state.startTime) / 1000); 
        const h = Math.floor(diff / 3600).toString().padStart(2,'0'); 
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0'); 
        const s = (diff % 60).toString().padStart(2,'0'); 
        if(UI.els.timer) UI.els.timer.textContent = `${h}:${m}:${s}`; 
        
        if(Game.state.view === 'map') UI.update(); 
    },

    // --- INIT ---
    init: function() {
        this.els = {
            touchArea: document.getElementById('main-content'), view: document.getElementById('view-container'), log: document.getElementById('log-area'),
            hp: document.getElementById('val-hp'), hpBar: document.getElementById('bar-hp'), expBarTop: document.getElementById('bar-exp-top'),
            lvl: document.getElementById('val-lvl'), xpTxt: document.getElementById('val-xp-txt'), caps: document.getElementById('val-caps'), name: document.getElementById('val-name'),
            timer: document.getElementById('game-timer'), dialog: document.getElementById('dialog-overlay'),
            btnNew: document.getElementById('btn-new'), btnInv: document.getElementById('btn-inv'), btnWiki: document.getElementById('btn-wiki'),
            btnMap: document.getElementById('btn-map'), btnChar: document.getElementById('btn-char'), btnQuests: document.getElementById('btn-quests'),
            btnSave: document.getElementById('btn-save'), btnMenuSave: document.getElementById('btn-menu-save'), btnLogout: document.getElementById('btn-logout'),
            btnReset: document.getElementById('btn-reset'), btnMenu: document.getElementById('btn-menu-toggle'), navMenu: document.getElementById('main-nav'),
            playerCount: document.getElementById('val-players'), playerList: document.getElementById('player-list-overlay'), playerListContent: document.getElementById('player-list-content'),
            loginScreen: document.getElementById('login-screen'), loginStatus: document.getElementById('login-status'), inputEmail: document.getElementById('login-email'),
            inputPass: document.getElementById('login-pass'), inputName: document.getElementById('login-name'), btnLogin: document.getElementById('btn-login'),
            btnToggleRegister: document.getElementById('btn-toggle-register'), loginTitle: document.getElementById('login-title'),
            charSelectScreen: document.getElementById('char-select-screen'), charSlotsList: document.getElementById('char-slots-list'),
            newCharOverlay: document.getElementById('new-char-overlay'), inputNewCharName: document.getElementById('new-char-name'), btnCreateCharConfirm: document.getElementById('btn-create-char-confirm'),
            btnCharSelectAction: document.getElementById('btn-char-select-action'), btnCharDeleteAction: document.getElementById('btn-char-delete-action'),
            deleteOverlay: document.getElementById('delete-confirm-overlay'), deleteTargetName: document.getElementById('delete-target-name'), deleteInput: document.getElementById('delete-input'),
            btnDeleteConfirm: document.getElementById('btn-delete-confirm'), btnDeleteCancel: document.getElementById('btn-delete-cancel'),
            spawnScreen: document.getElementById('spawn-screen'), spawnMsg: document.getElementById('spawn-msg'), spawnList: document.getElementById('spawn-list'), btnSpawnRandom: document.getElementById('btn-spawn-random'),
            resetOverlay: document.getElementById('reset-overlay'), btnConfirmReset: document.getElementById('btn-confirm-reset'), btnCancelReset: document.getElementById('btn-cancel-reset'),
            gameScreen: document.getElementById('game-screen'), gameOver: document.getElementById('game-over-screen')
        };

        // Inputs
        ['mousemove', 'mousedown', 'touchstart'].forEach(evt => { window.addEventListener(evt, () => { UI.lastInputTime = Date.now(); if (UI.inputMethod !== 'touch') { UI.focusIndex = -1; UI.updateFocusVisuals(); UI.inputMethod = 'touch'; } }, { passive: true }); });
        window.addEventListener('keydown', () => { UI.lastInputTime = Date.now(); UI.inputMethod = 'key'; });

        // Event Listeners (Explicit UI. reference)
        if(UI.els.btnLogin) UI.els.btnLogin.onclick = () => UI.attemptLogin();
        if(UI.els.btnToggleRegister) { UI.els.btnToggleRegister.onclick = () => { UI.isRegistering = !UI.isRegistering; if(UI.isRegistering) { UI.els.loginTitle.textContent = "NEUEN ACCOUNT ERSTELLEN"; UI.els.inputName.style.display = 'block'; UI.els.btnLogin.textContent = "REGISTRIEREN"; UI.els.btnToggleRegister.textContent = "Zurück zum Login"; } else { UI.els.loginTitle.textContent = "AUTHENTICATION REQUIRED"; UI.els.inputName.style.display = 'none'; UI.els.btnLogin.textContent = "LOGIN"; UI.els.btnToggleRegister.textContent = "Noch kein Account? Hier registrieren"; } }; }
        [UI.els.inputEmail, UI.els.inputPass, UI.els.inputName].forEach(el => { if(el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); UI.attemptLogin(); } }); });

        if (UI.els.btnCharSelectAction) UI.els.btnCharSelectAction.onclick = () => UI.triggerCharSlot();
        if (UI.els.btnCharDeleteAction) UI.els.btnCharDeleteAction.onclick = () => UI.triggerDeleteSlot();
        if (UI.els.btnCreateCharConfirm) UI.els.btnCreateCharConfirm.onclick = () => { const name = UI.els.inputNewCharName.value.trim().toUpperCase(); if(name.length < 3) { alert("Name zu kurz!"); return; } UI.els.newCharOverlay.classList.add('hidden'); UI.startGame(null, UI.selectedSlot, name); };
        
        if (UI.els.btnDeleteCancel) UI.els.btnDeleteCancel.onclick = () => UI.closeDeleteOverlay();
        if (UI.els.deleteInput) { UI.els.deleteInput.addEventListener('input', () => { const target = UI.els.deleteTargetName.textContent; const input = UI.els.deleteInput.value.toUpperCase(); UI.els.btnDeleteConfirm.disabled = (target !== input); if(target === input) { UI.els.btnDeleteConfirm.classList.remove('border-red-500', 'text-red-500'); UI.els.btnDeleteConfirm.classList.add('border-green-500', 'text-green-500', 'animate-pulse'); } else { UI.els.btnDeleteConfirm.classList.add('border-red-500', 'text-red-500'); UI.els.btnDeleteConfirm.classList.remove('border-green-500', 'text-green-500', 'animate-pulse'); } }); }
        if (UI.els.btnDeleteConfirm) { UI.els.btnDeleteConfirm.onclick = async () => { if(UI.selectedSlot === -1) return; await Network.deleteSlot(UI.selectedSlot); UI.closeDeleteOverlay(); UI.attemptLogin(); }; }

        if(UI.els.btnSave) UI.els.btnSave.onclick = () => UI.handleSaveClick();
        if(UI.els.btnMenuSave) UI.els.btnMenuSave.onclick = () => UI.handleSaveClick();
        if(UI.els.btnLogout) UI.els.btnLogout.onclick = () => UI.logout('MANUELL AUSGELOGGT');
        if(UI.els.btnReset) UI.els.btnReset.onclick = () => UI.handleReset();
        if(UI.els.btnConfirmReset) UI.els.btnConfirmReset.onclick = () => UI.confirmReset();
        if(UI.els.btnCancelReset) UI.els.btnCancelReset.onclick = () => UI.cancelReset();
        if(UI.els.btnMenu) UI.els.btnMenu.onclick = (e) => { e.stopPropagation(); UI.toggleMenu(); };

        document.addEventListener('click', (e) => { if(UI.els.navMenu && !UI.els.navMenu.classList.contains('hidden')) { if (!UI.els.navMenu.contains(e.target) && e.target !== UI.els.btnMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; UI.refreshFocusables(); } } if (Game.state && Game.state.view !== 'map' && Game.state.view !== 'combat' && Game.state.view !== 'city' && !Game.state.view.includes('shop') && !Game.state.view.includes('crafting') && !Game.state.view.includes('clinic') && !Game.state.view.includes('vault')) { const viewContainer = document.getElementById('view-container'); if (!viewContainer.contains(e.target)) UI.switchView('map'); } });
        if(UI.els.log.parentElement) UI.els.log.parentElement.addEventListener('click', () => { if (Game.state && Game.state.view !== 'map' && Game.state.view !== 'combat' && !Game.state.view.includes('city')) { if (Game.state.view !== 'combat') UI.switchView('map'); } });

        if(UI.els.playerCount) UI.els.playerCount.onclick = () => UI.togglePlayerList();
        if(UI.els.btnInv) UI.els.btnInv.onclick = () => UI.toggleView('inventory');
        if(UI.els.btnWiki) UI.els.btnWiki.onclick = () => UI.toggleView('wiki');
        if(UI.els.btnMap) UI.els.btnMap.onclick = () => UI.toggleView('worldmap');
        if(UI.els.btnChar) UI.els.btnChar.onclick = () => UI.toggleView('char');
        if(UI.els.btnQuests) UI.els.btnQuests.onclick = () => UI.toggleView('quests');
        if(UI.els.btnSpawnRandom) UI.els.btnSpawnRandom.onclick = () => UI.selectSpawn(null);

        if(UI.els.touchArea) { UI.els.touchArea.addEventListener('touchstart', (e) => UI.handleTouchStart(e), {passive: false}); UI.els.touchArea.addEventListener('touchmove', (e) => UI.handleTouchMove(e), {passive: false}); UI.els.touchArea.addEventListener('touchend', (e) => UI.handleTouchEnd(e)); UI.els.touchArea.addEventListener('touchcancel', (e) => UI.handleTouchEnd(e)); }

        window.addEventListener('keydown', (e) => {
            if (UI.deleteMode) return; 
            if (UI.charSelectMode) { if (e.key === 'ArrowUp') UI.navigateCharSlot(-1); if (e.key === 'ArrowDown') UI.navigateCharSlot(1); if (e.key === 'Enter') UI.triggerCharSlot(); if (e.key === 'Delete' || e.key === 'Backspace') UI.triggerDeleteSlot(); return; }
            if (!Game.state || Game.state.isGameOver) { if(UI.els.gameOver && !UI.els.gameOver.classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')) location.reload(); return; }
            if(e.key === 'Escape') { if (Game.state.inDialog) return; else if(UI.els.playerList && UI.els.playerList.style.display === 'flex') UI.togglePlayerList(); else if(UI.els.navMenu && !UI.els.navMenu.classList.contains('hidden')) UI.toggleMenu(); else if(Game.state.view !== 'map') UI.switchView('map'); else UI.toggleMenu(); return; }
            if (Game.state.inDialog) { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) { UI.navigateFocus(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'ArrowDown' || e.key === 's' ? 1 : -1); } else if (e.key === 'Enter' || e.key === ' ') { UI.triggerFocus(); } return; }
            if (Game.state.view === 'combat') { if (typeof Combat !== 'undefined') { if (e.key === 'ArrowUp' || e.key === 'w') Combat.moveSelection(-1); if (e.key === 'ArrowDown' || e.key === 's') Combat.moveSelection(1); if (e.key === ' ' || e.key === 'Enter') Combat.confirmSelection(); } return; }
            const isMenuOpen = UI.els.navMenu && !UI.els.navMenu.classList.contains('hidden');
            if (Game.state.view !== 'map' || isMenuOpen) { let isGrid = (Game.state.view === 'inventory') && !isMenuOpen; if (['ArrowUp', 'w'].includes(e.key)) UI.navigateFocus(isGrid ? -4 : -1); if (['ArrowDown', 's'].includes(e.key)) UI.navigateFocus(isGrid ? 4 : 1); if (['ArrowLeft', 'a'].includes(e.key)) UI.navigateFocus(-1); if (['ArrowRight', 'd'].includes(e.key)) UI.navigateFocus(1); if (e.key === 'Enter' || e.key === ' ') UI.triggerFocus(); return; }
            if (Game.state.view === 'map') { if(e.key === 'w' || e.key === 'ArrowUp') Game.move(0, -1); if(e.key === 's' || e.key === 'ArrowDown') Game.move(0, 1); if(e.key === 'a' || e.key === 'ArrowLeft') Game.move(-1, 0); if(e.key === 'd' || e.key === 'ArrowRight') Game.move(1, 0); }
        });
        
        window.Game = Game; 
        window.UI = UI; 
        
        if(UI.timerInterval) clearInterval(UI.timerInterval);
        UI.timerInterval = setInterval(() => UI.updateTimer(), 1000);
    },

    // --- TEIL 1 ENDE - NACHTEN TEIL HIER DRUNTER KOPIEREN ---
    attemptLogin: async function() {
        if(UI.loginBusy) return;
        UI.loginBusy = true;
        const email = UI.els.inputEmail.value.trim();
        const pass = UI.els.inputPass.value.trim();
        const name = UI.els.inputName ? UI.els.inputName.value.trim().toUpperCase() : "";
        UI.els.loginStatus.textContent = "VERBINDE MIT VAULT-TEC...";
        UI.els.loginStatus.className = "mt-4 text-yellow-400 animate-pulse";
        try {
            if(typeof Network === 'undefined') throw new Error("Netzwerkfehler");
            Network.init();
            let saves = null;
            if (UI.isRegistering) {
                if (email.length < 5 || pass.length < 6 || name.length < 3) throw new Error("Daten unvollständig (PW min 6, Name min 3)");
                saves = await Network.register(email, pass, name);
            } else {
                if (email.length < 5 || pass.length < 1) throw new Error("Bitte E-Mail und Passwort eingeben");
                saves = await Network.login(email, pass);
            }
            UI.renderCharacterSelection(saves || {});
        } catch(e) {
            let msg = e.message;
            if (e.code === "auth/email-already-in-use") msg = "E-Mail wird bereits verwendet!";
            if (e.code === "auth/invalid-email") msg = "Ungültige E-Mail-Adresse!";
            if (e.code === "auth/wrong-password") msg = "Falsches Passwort!";
            if (e.code === "auth/user-not-found") msg = "Benutzer nicht gefunden!";
            if (e.code === "auth/weak-password") msg = "Passwort zu schwach (min 6)!";
            UI.els.loginStatus.textContent = "FEHLER: " + msg;
            UI.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red";
        } finally {
            UI.loginBusy = false;
        }
    },

    renderCharacterSelection: function(saves) {
        UI.charSelectMode = true;
        UI.currentSaves = saves;
        UI.els.loginScreen.style.display = 'none';
        UI.els.charSelectScreen.style.display = 'flex';
        UI.els.charSlotsList.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = "char-slot";
            slot.dataset.index = i;
            const save = saves[i];
            
            if (save) {
                const name = save.playerName || "UNBEKANNT";
                const lvl = save.lvl || 1;
                const loc = save.sector ? `[${save.sector.x},${save.sector.y}]` : "[?,?]";
                slot.innerHTML = `<div class="flex flex-col"><span class="text-xl text-yellow-400 font-bold">${name}</span><span class="text-xs text-green-300">Level ${lvl} | Sektor ${loc}</span></div><div class="text-xs text-gray-500">SLOT ${i+1}</div>`;
            } else {
                slot.classList.add('empty-slot');
                slot.innerHTML = `<div class="flex flex-col"><span class="text-xl text-gray-400">[ LEER ]</span><span class="text-xs text-gray-600">Neuen Charakter erstellen</span></div><div class="text-xs text-gray-700">SLOT ${i+1}</div>`;
            }
            slot.onclick = () => UI.selectSlot(i);
            UI.els.charSlotsList.appendChild(slot);
        }
        UI.selectSlot(0);
    },

    selectSlot: function(index) {
        UI.selectedSlot = index;
        const slots = UI.els.charSlotsList.children;
        for(let s of slots) s.classList.remove('active-slot');
        if(slots[index]) slots[index].classList.add('active-slot');
        
        const save = UI.currentSaves[index];
        if (UI.els.btnCharSelectAction) {
            if (save) {
                UI.els.btnCharSelectAction.textContent = "SPIEL LADEN (ENTER)";
                UI.els.btnCharSelectAction.className = "action-button w-full border-green-500 text-green-500 font-bold py-3 mb-2";
                if(UI.els.btnCharDeleteAction) { UI.els.btnCharDeleteAction.classList.remove('hidden'); UI.els.btnCharDeleteAction.style.display='block'; }
            } else {
                UI.els.btnCharSelectAction.textContent = "CHARAKTER ERSTELLEN";
                UI.els.btnCharSelectAction.className = "action-button w-full border-yellow-400 text-yellow-400 font-bold py-3 mb-2";
                if(UI.els.btnCharDeleteAction) { UI.els.btnCharDeleteAction.classList.add('hidden'); UI.els.btnCharDeleteAction.style.display='none'; }
            }
        }
    },
    
    navigateCharSlot: function(delta) { let newIndex = UI.selectedSlot + delta; if(newIndex < 0) newIndex = 4; if(newIndex > 4) newIndex = 0; UI.selectSlot(newIndex); },
    triggerCharSlot: function() { if(UI.selectedSlot === -1) return; const save = UI.currentSaves[UI.selectedSlot]; if(save) { UI.startGame(save, UI.selectedSlot); } else { UI.els.newCharOverlay.classList.remove('hidden'); UI.els.inputNewCharName.value = ""; UI.els.inputNewCharName.focus(); } },
    triggerDeleteSlot: function() { if(UI.selectedSlot === -1) return; const save = UI.currentSaves[UI.selectedSlot]; if(!save) return; UI.deleteMode = true; UI.els.deleteOverlay.style.display = 'flex'; UI.els.deleteTargetName.textContent = save.playerName || "UNBEKANNT"; UI.els.deleteInput.value = ""; UI.els.btnDeleteConfirm.disabled = true; UI.els.btnDeleteConfirm.classList.add('border-red-500', 'text-red-500'); UI.els.btnDeleteConfirm.classList.remove('border-green-500', 'text-green-500', 'animate-pulse'); UI.els.deleteInput.focus(); },
    closeDeleteOverlay: function() { UI.deleteMode = false; UI.els.deleteOverlay.style.display = 'none'; UI.els.charSelectScreen.focus(); },

    startGame: function(saveData, slotIndex, newName=null) {
        UI.charSelectMode = false;
        UI.els.charSelectScreen.style.display = 'none';
        UI.els.gameScreen.classList.remove('hidden');
        UI.els.gameScreen.classList.remove('opacity-0');
        
        Game.init(saveData, null, slotIndex, newName);
        
        if(UI.isMobile()) { UI.showMobileControlsHint(); }
        Network.startPresence();
    },

    toggleMenu: function() {
        if(!UI.els.navMenu) return;
        const isHidden = UI.els.navMenu.classList.contains('hidden');
        if(isHidden) { UI.els.navMenu.classList.remove('hidden'); UI.els.navMenu.style.display = 'flex'; } 
        else { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; }
        UI.focusIndex = -1; UI.refreshFocusables();
    },

    refreshFocusables: function() {
        let container = UI.els.view;
        if (Game.state && Game.state.inDialog && UI.els.dialog && UI.els.dialog.style.display !== 'none') container = UI.els.dialog;
        else if (UI.els.navMenu && !UI.els.navMenu.classList.contains('hidden')) container = UI.els.navMenu;
        else if (UI.els.playerList && UI.els.playerList.style.display === 'flex') container = UI.els.playerList;
        const buttons = Array.from(container.querySelectorAll('button:not([disabled])'));
        UI.focusableEls = buttons.filter(b => b.offsetParent !== null && b.style.display !== 'none');
        if (UI.focusIndex >= UI.focusableEls.length) UI.focusIndex = 0; if (UI.focusIndex < 0 && UI.focusableEls.length > 0) UI.focusIndex = 0; UI.updateFocusVisuals();
    },
    navigateFocus: function(delta) { if (UI.focusableEls.length === 0) UI.refreshFocusables(); if (UI.focusableEls.length === 0) return; if (UI.focusIndex === -1) UI.focusIndex = delta > 0 ? 0 : UI.focusableEls.length - 1; else UI.focusIndex += delta; if (UI.focusIndex < 0) UI.focusIndex = UI.focusableEls.length - 1; if (UI.focusIndex >= UI.focusableEls.length) UI.focusIndex = 0; UI.updateFocusVisuals(); },
    updateFocusVisuals: function() { document.querySelectorAll('.key-focus').forEach(el => el.classList.remove('key-focus')); if (UI.focusIndex !== -1 && UI.focusableEls[UI.focusIndex]) { const el = UI.focusableEls[UI.focusIndex]; el.classList.add('key-focus'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
    triggerFocus: function() { if (UI.focusableEls[UI.focusIndex]) UI.focusableEls[UI.focusIndex].click(); },

    handleTouchStart: function(e) { if(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.no-joystick')) return; if(!Game.state || Game.state.view !== 'map' || Game.state.inDialog || UI.touchState.active) return; const touch = e.changedTouches[0]; UI.touchState.active = true; UI.touchState.id = touch.identifier; UI.touchState.startX = touch.clientX; UI.touchState.startY = touch.clientY; UI.touchState.currentX = touch.clientX; UI.touchState.currentY = touch.clientY; UI.touchState.moveDir = {x:0, y:0}; UI.showJoystick(touch.clientX, touch.clientY); if(UI.touchState.timer) clearInterval(UI.touchState.timer); UI.touchState.timer = setInterval(() => UI.processJoystickMovement(), 150); },
    handleTouchMove: function(e) { if(!UI.touchState.active) return; let touch = null; for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === UI.touchState.id) { touch = e.changedTouches[i]; break; } } if(!touch) return; e.preventDefault(); UI.touchState.currentX = touch.clientX; UI.touchState.currentY = touch.clientY; UI.updateJoystickVisuals(); UI.calculateDirection(); },
    handleTouchEnd: function(e) { if(!UI.touchState.active) return; let found = false; for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === UI.touchState.id) { found = true; break; } } if(!found) return; UI.stopJoystick(); },
    stopJoystick: function() { if(UI.touchState.timer) { clearInterval(UI.touchState.timer); UI.touchState.timer = null; } UI.touchState.active = false; UI.touchState.id = null; UI.touchState.moveDir = {x:0, y:0}; UI.hideJoystick(); },
    calculateDirection: function() { const dx = UI.touchState.currentX - UI.touchState.startX; const dy = UI.touchState.currentY - UI.touchState.startY; const threshold = 20; if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) { UI.touchState.moveDir = {x:0, y:0}; return; } if (Math.abs(dx) > Math.abs(dy)) { UI.touchState.moveDir = { x: dx > 0 ? 1 : -1, y: 0 }; } else { UI.touchState.moveDir = { x: 0, y: dy > 0 ? 1 : -1 }; } },
    processJoystickMovement: function() { const d = UI.touchState.moveDir; if(d.x !== 0 || d.y !== 0) { Game.move(d.x, d.y); } },
    showJoystick: function(x, y) { if(!UI.els.joyBase) UI.restoreOverlay(); if(UI.els.joyBase) { UI.els.joyBase.style.left = (x - 50) + 'px'; UI.els.joyBase.style.top = (y - 50) + 'px'; UI.els.joyBase.style.display = 'block'; } if(UI.els.joyStick) { UI.els.joyStick.style.left = (x - 25) + 'px'; UI.els.joyStick.style.top = (y - 25) + 'px'; UI.els.joyStick.style.display = 'block'; } },
    updateJoystickVisuals: function() { if(!UI.els.joyBase) return; const dx = UI.touchState.currentX - UI.touchState.startX; const dy = UI.touchState.currentY - UI.touchState.startY; const dist = Math.sqrt(dx*dx + dy*dy); const maxDist = 40; let visualX = dx; let visualY = dy; if(dist > maxDist) { const ratio = maxDist / dist; visualX = dx * ratio; visualY = dy * ratio; } UI.els.joyStick.style.transform = `translate(${visualX}px, ${visualY}px)`; },
    hideJoystick: function() { if(UI.els.joyBase) UI.els.joyBase.style.display = 'none'; if(UI.els.joyStick) { UI.els.joyStick.style.display = 'none'; UI.els.joyStick.style.transform = 'translate(0px, 0px)'; } },
    handleReset: function() { if(UI.els.navMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; } if(UI.els.resetOverlay) UI.els.resetOverlay.style.display = 'flex'; },
    confirmReset: function() { if(typeof Game !== 'undefined') Game.hardReset(); },
    cancelReset: function() { if(UI.els.resetOverlay) UI.els.resetOverlay.style.display = 'none'; },
    handleSaveClick: function() { Game.saveGame(true); [UI.els.btnSave, UI.els.btnMenuSave].forEach(btn => { if(!btn) return; const originalText = btn.textContent; const originalClass = btn.className; btn.textContent = "SAVED!"; btn.className = "header-btn bg-[#39ff14] text-black border-[#39ff14] w-full text-left"; if(btn === UI.els.btnSave) btn.className = "header-btn bg-[#39ff14] text-black border-[#39ff14] hidden md:flex"; setTimeout(() => { btn.textContent = originalText; btn.className = originalClass; }, 1000); }); },
    renderSpawnList: function(players) { if(!UI.els.spawnList) return; UI.els.spawnList.innerHTML = ''; let count = 0; for(let id in players) { if(id === Network.myId) continue; const p = players[id]; const btn = document.createElement('button'); btn.className = "action-button w-full text-left p-2 flex justify-between"; const sec = p.sector ? `${p.sector.x},${p.sector.y}` : "?,?"; btn.innerHTML = `<span>${id}</span> <span class="text-cyan-400">Sektor ${sec}</span>`; btn.onclick = () => UI.selectSpawn(p); UI.els.spawnList.appendChild(btn); count++; } if(count === 0) { UI.els.spawnList.innerHTML = '<div class="text-center italic opacity-50 p-2">Keine Signale. Starte Solo.</div>'; } },
    selectSpawn: function(targetPlayer) { UI.els.spawnScreen.style.display = 'none'; UI.els.gameScreen.classList.remove('hidden'); UI.els.gameScreen.classList.remove('opacity-0'); Game.init(null, targetPlayer); if(UI.isMobile()) { UI.showMobileControlsHint(); } Network.startPresence(); },
    logout: function(reason="AUSGELOGGT") { if(typeof Game !== 'undefined') Game.saveGame(true); if(typeof Network !== 'undefined') Network.disconnect(); UI.els.charSelectScreen.style.display = 'none'; UI.els.gameScreen.classList.add('hidden'); UI.els.gameScreen.classList.add('opacity-0'); UI.els.spawnScreen.style.display = 'none'; UI.els.loginScreen.style.display = 'flex'; if(UI.els.loginStatus) { UI.els.loginStatus.textContent = reason; UI.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red"; } if(UI.els.inputPass) UI.els.inputPass.value = ""; if(UI.els.navMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; } if(UI.els.playerList) UI.els.playerList.style.display = 'none'; },
    togglePlayerList: function() { if(UI.els.playerList.style.display === 'flex') { UI.els.playerList.style.display = 'none'; } else { UI.updatePlayerList(); UI.els.playerList.style.display = 'flex'; UI.focusIndex = -1; UI.refreshFocusables(); } },
    updatePlayerList: function() { if(!UI.els.playerListContent || typeof Network === 'undefined') return; let myLoc = "[?,?]"; if (Game.state && Game.state.sector) { myLoc = `[${Game.state.sector.x},${Game.state.sector.y}]`; } let html = `<div class="text-green-400">> ${Network.myDisplayName || "DU"} <span class="text-yellow-400">${myLoc}</span></div>`; if(Network.otherPlayers) { for(let name in Network.otherPlayers) { const p = Network.otherPlayers[name]; const loc = (p.sector) ? `[${p.sector.x},${p.sector.y}]` : '[?]'; html += `<div class="text-cyan-400">> ${name} <span class="text-yellow-400">${loc}</span></div>`; } } UI.els.playerListContent.innerHTML = html; },
    isMobile: function() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0); },
    showManualOverlay: async function() { const overlay = document.getElementById('manual-overlay'); const content = document.getElementById('manual-content'); if(UI.els.navMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; } if(overlay && content) { content.innerHTML = '<div class="text-center animate-pulse">Lade Handbuch...</div>'; overlay.style.display = 'flex'; overlay.classList.remove('hidden'); const verDisplay = document.getElementById('version-display'); const ver = verDisplay ? verDisplay.textContent.trim() : Date.now(); try { const res = await fetch(`readme.md?v=${ver}`); if (!res.ok) throw new Error("Manual not found"); let text = await res.text(); text = text.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-yellow-400 mb-2 border-b border-yellow-500">$1</h1>').replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-green-400 mt-4 mb-2">$1</h2>').replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-green-300 mt-2 mb-1">$1</h3>').replace(/\*\*(.*)\*\*/gim, '<b>$1</b>').replace(/\n/gim, '<br>'); text += '<br><button class="action-button w-full mt-4 border-red-500 text-red-500" onclick="document.getElementById(\'manual-overlay\').classList.add(\'hidden\'); document.getElementById(\'manual-overlay\').style.display=\'none\';">SCHLIESSEN (ESC)</button>'; content.innerHTML = text; } catch(e) { content.innerHTML = `<div class="text-red-500">Fehler beim Laden: ${e.message}</div>`; } } },
    showChangelogOverlay: async function() { const overlay = document.getElementById('changelog-overlay'); const content = document.getElementById('changelog-content'); if(overlay && content) { content.textContent = 'Lade Daten...'; overlay.style.display = 'flex'; overlay.classList.remove('hidden'); const verDisplay = document.getElementById('version-display'); const ver = verDisplay ? verDisplay.textContent.trim() : Date.now(); try { const res = await fetch(`change.log?v=${ver}`); if (!res.ok) throw new Error("Logfile nicht gefunden"); const text = await res.text(); content.textContent = text; } catch(e) { content.textContent = `Fehler beim Laden: ${e.message}`; } } },
    showMobileControlsHint: function() { if(document.getElementById('mobile-hint')) return; const hintHTML = ` <div id="mobile-hint" class="absolute inset-0 z-[100] flex flex-col justify-center items-center bg-black/80 pointer-events-auto backdrop-blur-sm opacity-0 transition-opacity duration-500" onclick="this.style.opacity='0'; setTimeout(() => this.remove(), 500)"> <div class="border-2 border-[#39ff14] bg-black p-6 text-center shadow-[0_0_20px_#39ff14] max-w-sm mx-4"> <div class="text-5xl mb-4 animate-bounce">👆</div> <h2 class="text-2xl font-bold text-[#39ff14] mb-2 tracking-widest border-b border-[#39ff14] pb-2">TOUCH STEUERUNG</h2> <p class="text-green-300 mb-6 font-mono leading-relaxed">Tippe und halte IRGENDWO auf dem Hauptschirm (auch im Log), um den Joystick zu aktivieren.</p> <div class="text-xs text-[#39ff14] animate-pulse font-bold bg-[#39ff14]/20 py-2 rounded">> TIPPEN ZUM STARTEN <</div> </div> </div>`; document.body.insertAdjacentHTML('beforeend', hintHTML); setTimeout(() => { const el = document.getElementById('mobile-hint'); if(el) el.classList.remove('opacity-0'); }, 10); },
    restoreOverlay: function() { if(document.getElementById('joystick-base')) return; const joystickHTML = ` <div id="joystick-base" style="position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 2px solid rgba(57, 255, 20, 0.5); background: rgba(0, 0, 0, 0.2); display: none; pointer-events: none; z-index: 9999;"></div> <div id="joystick-stick" style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(57, 255, 20, 0.8); display: none; pointer-events: none; z-index: 10000; box-shadow: 0 0 10px #39ff14;"></div> <div id="dialog-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 50; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: auto; max-width: 90%;"></div> `; UI.els.view.insertAdjacentHTML('beforeend', joystickHTML); UI.els.joyBase = document.getElementById('joystick-base'); UI.els.joyStick = document.getElementById('joystick-stick'); UI.els.dialog = document.getElementById('dialog-overlay'); },
