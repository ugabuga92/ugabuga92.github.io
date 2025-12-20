const UI = {
    els: {},
    timerInterval: null,
    lastInputTime: Date.now(), 
    biomeColors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {}, 
    
    // States
    loginBusy: false, isRegistering: false, charSelectMode: false, deleteMode: false,
    currentSaves: {}, selectedSlot: -1, focusIndex: -1, focusableEls: [], inputMethod: 'touch', 
    touchState: { active: false, id: null, startX: 0, startY: 0, currentX: 0, currentY: 0, moveDir: { x: 0, y: 0 }, timer: null },

    log: function(msg, color="text-green-500") { 
        if(!UI.els.log) return;
        const line = document.createElement('div');
        line.className = color; line.textContent = `> ${msg}`;
        UI.els.log.prepend(line);
    },

    error: function(msg) {
        console.error(msg);
        if(UI.els.log) {
            const line = document.createElement('div');
            line.className = "text-red-500 font-bold blink-red";
            line.textContent = "> ERROR: " + msg;
            UI.els.log.prepend(line);
        }
    },

    shakeView: function() {
        if(UI.els.view) {
            UI.els.view.classList.remove('shake');
            void UI.els.view.offsetWidth; 
            UI.els.view.classList.add('shake');
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
        if(typeof Game === 'undefined' || !Game.state) return;
        if(UI.els.gameScreen && !UI.els.gameScreen.classList.contains('hidden')) {
            if(Date.now() - UI.lastInputTime > 300000) { UI.logout("AFK: ZEITÜBERSCHREITUNG"); return; }
        }
        if(!Game.state.startTime) return; 
        const diff = Math.floor((Date.now() - Game.state.startTime) / 1000); 
        const h = Math.floor(diff / 3600).toString().padStart(2,'0'); 
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0'); 
        const s = (diff % 60).toString().padStart(2,'0'); 
        if(UI.els.timer) UI.els.timer.textContent = `${h}:${m}:${s}`; 
        
        if(Game.state.view === 'map') UI.update(); 
    },

    init: function() {
        UI.els = {
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
            newCharOverlay: document.getElementById('new-char-overlay'), inputNewCharName: document.getElementById('new-char-name'), btnCreateCharConfirm: document.getElementById('btn-create-char'),
            btnCharSelectAction: document.getElementById('btn-char-select-action'), btnCharDeleteAction: document.getElementById('btn-char-delete-action'),
            deleteOverlay: document.getElementById('delete-confirm-overlay'), deleteTargetName: document.getElementById('delete-target-name'), deleteInput: document.getElementById('delete-input'),
            btnDeleteConfirm: document.getElementById('btn-delete-confirm'), btnDeleteCancel: document.getElementById('btn-delete-cancel'),
            spawnScreen: document.getElementById('spawn-screen'), spawnMsg: document.getElementById('spawn-msg'), spawnList: document.getElementById('spawn-list'), btnSpawnRandom: document.getElementById('btn-spawn-random'),
            resetOverlay: document.getElementById('reset-overlay'), btnConfirmReset: document.getElementById('btn-confirm-reset'), btnCancelReset: document.getElementById('btn-cancel-reset'),
            gameScreen: document.getElementById('game-screen'), gameOver: document.getElementById('game-over-screen'),
            btnUp: document.getElementById('btn-up'), btnDown: document.getElementById('btn-down'), btnLeft: document.getElementById('btn-left'), btnRight: document.getElementById('btn-right')
        };

        ['mousemove', 'mousedown', 'touchstart'].forEach(evt => { window.addEventListener(evt, () => { UI.lastInputTime = Date.now(); if (UI.inputMethod !== 'touch') { UI.focusIndex = -1; UI.updateFocusVisuals(); UI.inputMethod = 'touch'; } }, { passive: true }); });
        window.addEventListener('keydown', () => { UI.lastInputTime = Date.now(); UI.inputMethod = 'key'; });

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

        document.addEventListener('click', (e) => {
            if(UI.els.navMenu && !UI.els.navMenu.classList.contains('hidden')) { if (!UI.els.navMenu.contains(e.target) && e.target !== UI.els.btnMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; UI.refreshFocusables(); } }
            if (Game.state && Game.state.view !== 'map' && Game.state.view !== 'combat' && Game.state.view !== 'city' && !Game.state.view.includes('shop') && !Game.state.view.includes('crafting') && !Game.state.view.includes('clinic') && !Game.state.view.includes('vault')) { const viewContainer = document.getElementById('view-container'); if (!viewContainer.contains(e.target)) UI.switchView('map'); }
        });
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
        window.UI = UI; // Explicit global
        
        if(UI.timerInterval) clearInterval(UI.timerInterval);
        UI.timerInterval = setInterval(() => UI.updateTimer(), 1000);
    },
    
    // --- LOGIN ---
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
                if (email.length < 5 || pass.length < 6 || name.length < 3) throw new Error("Daten unvollständig");
                saves = await Network.register(email, pass, name);
            } else {
                if (email.length < 5 || pass.length < 1) throw new Error("Bitte E-Mail und Passwort eingeben");
                saves = await Network.login(email, pass);
            }
            UI.renderCharacterSelection(saves || {});
        } catch(e) {
            UI.els.loginStatus.textContent = "FEHLER: " + e.message;
            UI.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red";
        } finally {
            UI.loginBusy = false;
        }
    },
    // --- SLOTS & GAME START ---
    renderCharacterSelection: function(saves) {
        UI.charSelectMode = true; UI.currentSaves = saves;
        UI.els.loginScreen.style.display = 'none'; UI.els.charSelectScreen.style.display = 'flex'; UI.els.charSlotsList.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div'); slot.className = "char-slot"; slot.dataset.index = i; const save = saves[i];
            if (save) { slot.innerHTML = `<div class="flex flex-col"><span class="text-xl text-yellow-400 font-bold">${save.playerName}</span><span class="text-xs text-green-300">Level ${save.lvl} | Sektor [${save.sector.x},${save.sector.y}]</span></div><div class="text-xs text-gray-500">SLOT ${i+1}</div>`; } 
            else { slot.classList.add('empty-slot'); slot.innerHTML = `<div class="flex flex-col"><span class="text-xl text-gray-400">[ LEER ]</span><span class="text-xs text-gray-600">Neuen Charakter erstellen</span></div><div class="text-xs text-gray-700">SLOT ${i+1}</div>`; }
            slot.onclick = () => UI.selectSlot(i); UI.els.charSlotsList.appendChild(slot);
        }
        UI.selectSlot(0);
    },

    selectSlot: function(index) {
        UI.selectedSlot = index; const slots = UI.els.charSlotsList.children;
        for(let s of slots) s.classList.remove('active-slot'); if(slots[index]) slots[index].classList.add('active-slot');
        const save = UI.currentSaves[index];
        if (UI.els.btnCharSelectAction) {
            if (save) {
                UI.els.btnCharSelectAction.textContent = "SPIEL LADEN (ENTER)";
                UI.els.btnCharSelectAction.className = "action-button w-full border-green-500 text-green-500 font-bold py-3 mb-2";
                if(UI.els.btnCharDeleteAction) { UI.els.btnCharDeleteAction.classList.remove('hidden'); UI.els.btnCharDeleteAction.style.display = 'flex'; }
            } else {
                UI.els.btnCharSelectAction.textContent = "CHARAKTER ERSTELLEN";
                UI.els.btnCharSelectAction.className = "action-button w-full border-yellow-400 text-yellow-400 font-bold py-3 mb-2";
                if(UI.els.btnCharDeleteAction) { UI.els.btnCharDeleteAction.classList.add('hidden'); UI.els.btnCharDeleteAction.style.display = 'none'; }
            }
        }
    },

    navigateCharSlot: function(delta) { let newIndex = UI.selectedSlot + delta; if(newIndex < 0) newIndex = 4; if(newIndex > 4) newIndex = 0; UI.selectSlot(newIndex); },
    triggerCharSlot: function() { if(UI.selectedSlot === -1) return; const save = UI.currentSaves[UI.selectedSlot]; if(save) { UI.startGame(save, UI.selectedSlot); } else { UI.els.newCharOverlay.classList.remove('hidden'); UI.els.inputNewCharName.value = ""; UI.els.inputNewCharName.focus(); } },
    triggerDeleteSlot: function() { if(UI.selectedSlot === -1) return; const save = UI.currentSaves[UI.selectedSlot]; if(!save) return; UI.deleteMode = true; UI.els.deleteOverlay.style.display = 'flex'; UI.els.deleteTargetName.textContent = save.playerName; UI.els.deleteInput.value = ""; UI.els.btnDeleteConfirm.disabled = true; UI.els.btnDeleteConfirm.classList.add('border-red-500', 'text-red-500'); UI.els.btnDeleteConfirm.classList.remove('border-green-500', 'text-green-500', 'animate-pulse'); UI.els.deleteInput.focus(); },
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

    // --- NAVIGATION & INPUT ---
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

    navigateFocus: function(delta) {
        if (UI.focusableEls.length === 0) UI.refreshFocusables();
        if (UI.focusableEls.length === 0) return;
        if (UI.focusIndex === -1) UI.focusIndex = delta > 0 ? 0 : UI.focusableEls.length - 1;
        else UI.focusIndex += delta;
        if (UI.focusIndex < 0) UI.focusIndex = UI.focusableEls.length - 1;
        if (UI.focusIndex >= UI.focusableEls.length) UI.focusIndex = 0;
        UI.updateFocusVisuals();
    },

    updateFocusVisuals: function() {
        document.querySelectorAll('.key-focus').forEach(el => el.classList.remove('key-focus'));
        if (UI.focusIndex !== -1 && UI.focusableEls[UI.focusIndex]) {
            const el = UI.focusableEls[UI.focusIndex];
            el.classList.add('key-focus');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    triggerFocus: function() { if (UI.focusableEls[UI.focusIndex]) UI.focusableEls[UI.focusIndex].click(); },

    handleTouchStart: function(e) {
        if(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.no-joystick')) return;
        if(!Game.state || Game.state.view !== 'map' || Game.state.inDialog || UI.touchState.active) return;
        const touch = e.changedTouches[0];
        UI.touchState.active = true; UI.touchState.id = touch.identifier;
        UI.touchState.startX = touch.clientX; UI.touchState.startY = touch.clientY;
        UI.touchState.currentX = touch.clientX; UI.touchState.currentY = touch.clientY;
        UI.touchState.moveDir = {x:0, y:0};
        UI.showJoystick(touch.clientX, touch.clientY);
        if(UI.touchState.timer) clearInterval(UI.touchState.timer);
        UI.touchState.timer = setInterval(() => UI.processJoystickMovement(), 150); 
    },
    handleTouchMove: function(e) {
        if(!UI.touchState.active) return;
        let touch = null; for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === UI.touchState.id) { touch = e.changedTouches[i]; break; } }
        if(!touch) return; e.preventDefault(); 
        UI.touchState.currentX = touch.clientX; UI.touchState.currentY = touch.clientY;
        UI.updateJoystickVisuals(); UI.calculateDirection();
    },
    handleTouchEnd: function(e) {
        if(!UI.touchState.active) return;
        let found = false; for(let i=0; i<e.changedTouches.length; i++) { if(e.changedTouches[i].identifier === UI.touchState.id) { found = true; break; } }
        if(!found) return; UI.stopJoystick();
    },
    stopJoystick: function() { if(UI.touchState.timer) { clearInterval(UI.touchState.timer); UI.touchState.timer = null; } UI.touchState.active = false; UI.touchState.id = null; UI.touchState.moveDir = {x:0, y:0}; UI.hideJoystick(); },
    calculateDirection: function() { const dx = UI.touchState.currentX - UI.touchState.startX; const dy = UI.touchState.currentY - UI.touchState.startY; const threshold = 20; if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) { UI.touchState.moveDir = {x:0, y:0}; return; } if (Math.abs(dx) > Math.abs(dy)) { UI.touchState.moveDir = { x: dx > 0 ? 1 : -1, y: 0 }; } else { UI.touchState.moveDir = { x: 0, y: dy > 0 ? 1 : -1 }; } },
    processJoystickMovement: function() { const d = UI.touchState.moveDir; if(d.x !== 0 || d.y !== 0) { Game.move(d.x, d.y); } },
    showJoystick: function(x, y) { if(!UI.els.joyBase) UI.restoreOverlay(); if(UI.els.joyBase) { UI.els.joyBase.style.left = (x - 50) + 'px'; UI.els.joyBase.style.top = (y - 50) + 'px'; UI.els.joyBase.style.display = 'block'; } if(UI.els.joyStick) { UI.els.joyStick.style.left = (x - 25) + 'px'; UI.els.joyStick.style.top = (y - 25) + 'px'; UI.els.joyStick.style.display = 'block'; } },
    updateJoystickVisuals: function() { if(!UI.els.joyBase) return; const dx = UI.touchState.currentX - UI.touchState.startX; const dy = UI.touchState.currentY - UI.touchState.startY; const dist = Math.sqrt(dx*dx + dy*dy); const maxDist = 40; let visualX = dx; let visualY = dy; if(dist > maxDist) { const ratio = maxDist / dist; visualX = dx * ratio; visualY = dy * ratio; } UI.els.joyStick.style.transform = `translate(${visualX}px, ${visualY}px)`; },
    hideJoystick: function() { if(UI.els.joyBase) UI.els.joyBase.style.display = 'none'; if(UI.els.joyStick) { UI.els.joyStick.style.display = 'none'; UI.els.joyStick.style.transform = 'translate(0px, 0px)'; } },
    
    // --- OVERLAYS ---
    toggleView: function(name) { if (Game.state.view === name) UI.switchView('map'); else UI.switchView(name); },
    
    switchView: async function(name) { 
        UI.stopJoystick(); UI.focusIndex = -1;
        if(UI.els.navMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; }
        if(UI.els.playerList) UI.els.playerList.style.display = 'none';

        const ver = document.getElementById('version-display') ? document.getElementById('version-display').textContent.trim() : Date.now(); 
        
        if (name === 'map') {
            UI.els.view.innerHTML = `
                <div id="map-view" class="w-full h-full flex justify-center items-center bg-black relative">
                    <canvas id="game-canvas" class="w-full h-full object-contain" style="image-rendering: pixelated;"></canvas>
                    <button onclick="UI.switchView('worldmap')" class="absolute top-4 right-4 bg-black/80 border-2 border-green-500 text-green-500 p-2 rounded-full hover:bg-green-900 hover:text-white transition-all z-20 shadow-[0_0_15px_#39ff14] animate-pulse cursor-pointer">🌍</button>
                </div>`;
            Game.state.view = name;
            Game.initCanvas();
            UI.restoreOverlay();
            UI.toggleControls(true);
            UI.updateButtonStates(name);
            UI.update();
            return; 
        }

        try { 
            const res = await fetch(`views/${name}.html?v=${ver}`); 
            if (!res.ok) throw new Error(`View '${name}' not found`); 
            const html = await res.text(); 
            UI.els.view.innerHTML = html; 
            Game.state.view = name; 
            UI.restoreOverlay();
            if (name === 'combat') { UI.toggleControls(false); if(typeof Combat !== 'undefined' && typeof Combat.render === 'function') Combat.render(); else UI.renderCombat(); } 
            else { UI.toggleControls(false); } 
            if (name === 'char') UI.renderChar(); 
            if (name === 'inventory') UI.renderInventory(); 
            if (name === 'wiki') UI.renderWiki(); 
            if (name === 'worldmap') UI.renderWorldMap(); 
            if (name === 'city') UI.renderCity(); 
            if (name === 'combat') UI.renderCombat(); 
            if (name === 'quests') UI.renderQuests(); 
            if (name === 'crafting') UI.renderCrafting(); 
            UI.updateButtonStates(name); 
            UI.update(); 
            setTimeout(() => UI.refreshFocusables(), 100);
        } catch (e) { UI.error(`Ladefehler: ${e.message}`); } 
    },
    updateButtonStates: function(activeName) {
        if(UI.els.btnWiki) UI.els.btnWiki.classList.toggle('active', activeName === 'wiki');
        if(UI.els.btnMap) UI.els.btnMap.classList.toggle('active', activeName === 'worldmap');
        if(UI.els.btnChar) UI.els.btnChar.classList.toggle('active', activeName === 'char');
        if(UI.els.btnInv) UI.els.btnInv.classList.toggle('active', activeName === 'inventory');
        if(UI.els.btnQuests) UI.els.btnQuests.classList.toggle('active', activeName === 'quests');
    },

    update: function() { 
        if (!Game.state) return; 
        
        if(UI.els.name && typeof Network !== 'undefined') {
            const sectorStr = Game.state.sector ? ` [${Game.state.sector.x},${Game.state.sector.y}]` : "";
            UI.els.name.textContent = (Network.myDisplayName || "SURVIVOR") + sectorStr;
        }

        if(UI.els.lvl) {
            if(Game.state.statPoints > 0) { UI.els.lvl.innerHTML = `${Game.state.lvl} <span class="text-yellow-400 animate-pulse ml-1 text-xs">LVL UP!</span>`; } 
            else { UI.els.lvl.textContent = Game.state.lvl; }
        }

        if(UI.els.ammo) UI.els.ammo.textContent = Game.state.ammo; 
        if(UI.els.caps) UI.els.caps.textContent = `${Game.state.caps}`; 
        
        const nextXp = Game.expToNextLevel(Game.state.lvl); 
        const expPct = Math.min(100, Math.floor((Game.state.xp / nextXp) * 100)); 
        if(UI.els.xpTxt) UI.els.xpTxt.textContent = expPct;
        if(UI.els.expBarTop) UI.els.expBarTop.style.width = `${expPct}%`;
        
        const maxHp = Game.state.maxHp; 
        if(UI.els.hp) UI.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`; 
        if(UI.els.hpBar) UI.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`;
        
        let hasAlert = false;
        if(UI.els.btnChar) {
            if(Game.state.statPoints > 0) { UI.els.btnChar.classList.add('alert-glow-yellow'); hasAlert = true; } 
            else { UI.els.btnChar.classList.remove('alert-glow-yellow'); }
        } 
        
        const unreadQuests = Game.state.quests.some(q => !q.read); 
        if(UI.els.btnQuests) {
            if(unreadQuests) { UI.els.btnQuests.classList.add('alert-glow-cyan'); hasAlert = true; } 
            else { UI.els.btnQuests.classList.remove('alert-glow-cyan'); }
        } 
        
        if(UI.els.btnMenu) {
            if(hasAlert) { UI.els.btnMenu.classList.add('alert-glow-red'); } 
            else { UI.els.btnMenu.classList.remove('alert-glow-red'); }
        }
        
        if(UI.els.lvl) {
            if(Date.now() < Game.state.buffEndTime) UI.els.lvl.classList.add('blink-red'); 
            else UI.els.lvl.classList.remove('blink-red'); 
        }
        
        if(Game.state.view === 'map') { 
            if(!Game.state.inDialog && UI.els.dialog && UI.els.dialog.innerHTML === '') { 
                UI.els.dialog.style.display = 'none'; 
            } 
        }
    },

    renderInventory: function() {
        const list = document.getElementById('inventory-list');
        const countDisplay = document.getElementById('inv-count');
        const capsDisplay = document.getElementById('inv-caps');
        if(!list || !Game.state.inventory) return;
        list.innerHTML = ''; capsDisplay.textContent = Game.state.caps; let totalItems = 0;
        const getIcon = (type) => { switch(type) { case 'weapon': return '🔫'; case 'body': return '🛡️'; case 'consumable': return '💉'; case 'junk': return '⚙️'; case 'component': return '🔩'; case 'rare': return '⭐'; default: return '📦'; } };
        Game.state.inventory.forEach((entry) => {
            if(entry.count <= 0) return; totalItems += entry.count; const item = Game.items[entry.id];
            const btn = document.createElement('div');
            btn.className = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-green-500 hover:text-black transition-colors group";
            btn.innerHTML = `<div class="text-2xl">${getIcon(item.type)}</div><div class="text-[10px] truncate max-w-full px-1 font-bold">${item.name}</div><div class="absolute top-0 right-0 bg-green-900 text-white text-[10px] px-1 font-mono">${entry.count}</div>`;
            btn.onclick = () => { if(item.type === 'junk' || item.type === 'component' || item.type === 'rare') {} else { UI.showItemConfirm(entry.id); } };
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
        const nextXp = Game.expToNextLevel(Game.state.lvl); const expPct = Math.min(100, (Game.state.xp / nextXp) * 100); 
        document.getElementById('char-exp').textContent = Game.state.xp; 
        document.getElementById('char-next').textContent = nextXp; 
        document.getElementById('char-exp-bar').style.width = `${expPct}%`; 
        const pts = Game.state.statPoints; const ptsEl = document.getElementById('char-points'); 
        if (pts > 0) { ptsEl.innerHTML = `<span class="text-red-500 animate-pulse text-2xl font-bold bg-red-900/20 px-2 border border-red-500">${pts} VERFÜGBAR!</span>`; } else { ptsEl.textContent = pts; } 
        const wpn = Game.state.equip.weapon || {name: "Fäuste", baseDmg: 2}; const arm = Game.state.equip.body || {name: "Vault-Anzug", bonus: {END: 1}}; 
        document.getElementById('equip-weapon-name').textContent = wpn.name; 
        let wpnStats = `DMG: ${wpn.baseDmg}`; if(wpn.bonus) { for(let s in wpn.bonus) wpnStats += ` ${s}:${wpn.bonus[s]}`; } 
        document.getElementById('equip-weapon-stats').textContent = wpnStats; 
        document.getElementById('equip-body-name').textContent = arm.name; 
        let armStats = ""; if(arm.bonus) { for(let s in arm.bonus) armStats += `${s}:${arm.bonus[s]} `; } 
        document.getElementById('equip-body-stats').textContent = armStats || "Kein Bonus"; 
    },

    renderCombat: function() { const enemy = Game.state.enemy; if(!enemy) return; document.getElementById('enemy-name').textContent = enemy.name; document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`; document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`; },
    renderWorldMap: function() { const grid = document.getElementById('world-grid'); if(!grid) return; grid.innerHTML = ''; for(let y=0; y<8; y++) { for(let x=0; x<8; x++) { const d = document.createElement('div'); d.className = "border border-green-900/30 flex justify-center items-center text-xs relative cursor-help"; d.title = `Sektor [${x},${y}]`; if(x === Game.state.sector.x && y === Game.state.sector.y) { d.style.backgroundColor = "#39ff14"; d.style.color = "black"; d.style.fontWeight = "bold"; d.textContent = "YOU"; } else if(Game.worldData[`${x},${y}`]) { const data = Game.worldData[`${x},${y}`]; d.style.backgroundColor = UI.biomeColors[data.biome] || '#4a3d34'; if(data.poi) { d.textContent = data.poi; d.style.color = "white"; d.style.fontWeight = "bold"; d.style.textShadow = "0 0 2px black"; } } if(typeof Network !== 'undefined' && Network.otherPlayers) { const playersHere = Object.values(Network.otherPlayers).filter(p => p.sector && p.sector.x === x && p.sector.y === y); if(playersHere.length > 0) { const dot = document.createElement('div'); dot.className = "absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_cyan]"; if(x === Game.state.sector.x && y === Game.state.sector.y) { dot.style.top = "2px"; dot.style.right = "2px"; } d.appendChild(dot); } } grid.appendChild(d); } } grid.style.gridTemplateColumns = "repeat(8, 1fr)"; },
    
    // --- OVERLAYS & DIALOGS ---
    toggleControls: function(show) { if (!show && UI.els.dialog) UI.els.dialog.innerHTML = ''; },
    showGameOver: function() { if(UI.els.gameOver) UI.els.gameOver.classList.remove('hidden'); UI.toggleControls(false); },
    restoreOverlay: function() { if(document.getElementById('joystick-base')) return; const joystickHTML = ` <div id="joystick-base" style="position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 2px solid rgba(57, 255, 20, 0.5); background: rgba(0, 0, 0, 0.2); display: none; pointer-events: none; z-index: 9999;"></div> <div id="joystick-stick" style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(57, 255, 20, 0.8); display: none; pointer-events: none; z-index: 10000; box-shadow: 0 0 10px #39ff14;"></div> <div id="dialog-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 50; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: auto; max-width: 90%;"></div> `; UI.els.view.insertAdjacentHTML('beforeend', joystickHTML); UI.els.joyBase = document.getElementById('joystick-base'); UI.els.joyStick = document.getElementById('joystick-stick'); UI.els.dialog = document.getElementById('dialog-overlay'); },
    showPermadeathWarning: function() {
        if(!UI.els.dialog) UI.restoreOverlay();
        Game.state.inDialog = true;
        UI.els.dialog.innerHTML = '';
        UI.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-red-600 p-6 shadow-[0_0_50px_red] max-w-lg text-center animate-pulse";
        box.innerHTML = `<div class="text-6xl text-red-600 mb-4 font-bold">☠️</div><h1 class="text-4xl font-bold text-red-600 mb-4 tracking-widest border-b-2 border-red-600 pb-2">PERMADEATH AKTIV</h1><p class="text-red-400 font-mono text-lg mb-6 leading-relaxed">WARNUNG, BEWOHNER!<br>Das Ödland kennt keine Gnade.<br>Wenn deine HP auf 0 fallen, wird dieser Charakter<br><span class="font-bold text-white bg-red-900 px-1">DAUERHAFT GELÖSCHT</span>.</p><button class="action-button w-full border-red-600 text-red-500 font-bold py-4 text-xl hover:bg-red-900" onclick="UI.leaveDialog()">ICH HABE VERSTANDEN</button>`;
        UI.els.dialog.appendChild(box);
    },
    showDungeonWarning: function(callback) { if(!UI.els.dialog) { UI.restoreOverlay(); } Game.state.inDialog = true; UI.els.dialog.innerHTML = ''; UI.els.dialog.style.display = 'flex'; const box = document.createElement('div'); box.className = "bg-black border-2 border-red-600 p-4 shadow-[0_0_20px_red] max-w-sm text-center animate-pulse mb-4"; box.innerHTML = `<h2 class="text-3xl font-bold text-red-600 mb-2 tracking-widest">⚠️ WARNING ⚠️</h2><p class="text-red-400 mb-4 font-bold">HOHE GEFAHR!<br>Sicher, dass du eintreten willst?</p>`; const btnContainer = document.createElement('div'); btnContainer.className = "flex gap-2 justify-center w-full"; const btnYes = document.createElement('button'); btnYes.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full"; btnYes.textContent = "BETRETEN"; btnYes.onclick = () => { UI.leaveDialog(); if(callback) callback(); }; const btnNo = document.createElement('button'); btnNo.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full"; btnNo.textContent = "FLUCHT"; btnNo.onclick = () => { UI.leaveDialog(); }; btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo); box.appendChild(btnContainer); UI.els.dialog.appendChild(box); UI.refreshFocusables(); },
    showDungeonLocked: function(minutesLeft) { if(!UI.els.dialog) { UI.restoreOverlay(); } Game.state.inDialog = true; UI.els.dialog.innerHTML = ''; UI.els.dialog.style.display = 'flex'; const box = document.createElement('div'); box.className = "bg-black border-2 border-gray-600 p-4 shadow-[0_0_20px_gray] max-w-sm text-center mb-4"; box.innerHTML = `<h2 class="text-3xl font-bold text-gray-400 mb-2 tracking-widest">🔒 LOCKED</h2><p class="text-gray-300 mb-4 font-bold">Dieses Gebiet ist versiegelt.<br>Versuche es in ${minutesLeft} Minuten wieder.</p>`; const btn = document.createElement('button'); btn.className = "border border-gray-500 text-gray-500 hover:bg-gray-900 px-4 py-2 font-bold w-full"; btn.textContent = "VERSTANDEN"; btn.onclick = () => UI.leaveDialog(); box.appendChild(btn); UI.els.dialog.appendChild(box); UI.refreshFocusables(); },
    showDungeonVictory: function(caps, lvl) { if(!UI.els.dialog) { UI.restoreOverlay(); } Game.state.inDialog = true; UI.els.dialog.innerHTML = ''; UI.els.dialog.style.display = 'flex'; const box = document.createElement('div'); box.className = "bg-black border-4 border-yellow-400 p-6 shadow-[0_0_30px_gold] max-w-md text-center mb-4 animate-bounce"; box.innerHTML = `<div class="text-6xl mb-2">👑⚔️</div><h2 class="text-4xl font-bold text-yellow-400 mb-2 tracking-widest text-shadow-gold">VICTORY!</h2><p class="text-yellow-200 mb-4 font-bold text-lg">DUNGEON (LVL ${lvl}) GECLEARED!</p><div class="text-2xl text-white font-bold border-t border-b border-yellow-500 py-2 mb-4 bg-yellow-900/30">+${caps} KRONKORKEN</div><p class="text-xs text-yellow-600">Komme in 10 Minuten wieder!</p>`; UI.els.dialog.appendChild(box); },
    showItemConfirm: function(itemId) { if(!UI.els.dialog) UI.restoreOverlay(); if(!Game.items[itemId]) return; const item = Game.items[itemId]; Game.state.inDialog = true; UI.els.dialog.innerHTML = ''; UI.els.dialog.style.display = 'flex'; let statsText = ""; if(item.type === 'consumable') statsText = `Effekt: ${item.effect} (${item.val})`; if(item.type === 'weapon') statsText = `Schaden: ${item.baseDmg}`; if(item.type === 'body') statsText = `Rüstung: +${item.bonus.END || 0} END`; const box = document.createElement('div'); box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4"; box.innerHTML = `<h2 class="text-xl font-bold text-green-400 mb-2">${item.name}</h2><div class="text-xs text-green-200 mb-4 border-t border-b border-green-900 py-2">Typ: ${item.type.toUpperCase()}<br>Wert: ${item.cost} KK<br><span class="text-yellow-400">${statsText}</span></div><p class="text-green-200 mb-4 text-sm">Gegenstand benutzen / ausrüsten?</p>`; const btnContainer = document.createElement('div'); btnContainer.className = "flex gap-2 justify-center w-full"; const btnYes = document.createElement('button'); btnYes.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full"; btnYes.textContent = "BESTÄTIGEN"; btnYes.onclick = () => { Game.useItem(itemId); UI.leaveDialog(); }; const btnNo = document.createElement('button'); btnNo.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full"; btnNo.textContent = "ABBRUCH"; btnNo.onclick = () => { UI.leaveDialog(); }; btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo); box.appendChild(btnContainer); UI.els.dialog.appendChild(box); UI.refreshFocusables(); },
    
    // --- ACTIONS ---
    enterVault: function() { Game.state.inDialog = true; UI.els.dialog.innerHTML = ''; const restBtn = document.createElement('button'); restBtn.className = "action-button w-full mb-1 border-blue-500 text-blue-300"; restBtn.textContent = "Ausruhen (Gratis)"; restBtn.onclick = () => { Game.rest(); UI.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weiter geht's"; leaveBtn.onclick = () => UI.leaveDialog(); UI.els.dialog.appendChild(restBtn); UI.els.dialog.appendChild(leaveBtn); UI.els.dialog.style.display = 'flex'; },
    enterSupermarket: function() { Game.state.inDialog = true; UI.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-red-500 text-red-300"; enterBtn.textContent = "Ruine betreten (Gefahr!)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "market"); UI.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => UI.leaveDialog(); UI.els.dialog.appendChild(enterBtn); UI.els.dialog.appendChild(leaveBtn); UI.els.dialog.style.display = 'block'; },
    enterCave: function() { Game.state.inDialog = true; UI.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-gray-500 text-gray-300"; enterBtn.textContent = "In die Tiefe (Dungeon)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "cave"); UI.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => UI.leaveDialog(); UI.els.dialog.appendChild(enterBtn); UI.els.dialog.appendChild(leaveBtn); UI.els.dialog.style.display = 'block'; },
    leaveDialog: function() { Game.state.inDialog = false; UI.els.dialog.style.display = 'none'; UI.update(); },
    
    // --- MANUAL & CHANGELOG ---
    showManualOverlay: async function() { const overlay = document.getElementById('manual-overlay'); const content = document.getElementById('manual-content'); if(UI.els.navMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; } if(overlay && content) { content.innerHTML = '<div class="text-center animate-pulse">Lade Handbuch...</div>'; overlay.style.display = 'flex'; overlay.classList.remove('hidden'); const ver = document.getElementById('version-display') ? document.getElementById('version-display').textContent.trim() : Date.now(); try { const res = await fetch(`readme.md?v=${ver}`); if (!res.ok) throw new Error("Manual not found"); let text = await res.text(); text = text.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-yellow-400 mb-2 border-b border-yellow-500">$1</h1>').replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-green-400 mt-4 mb-2">$1</h2>').replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-green-300 mt-2 mb-1">$1</h3>').replace(/\*\*(.*)\*\*/gim, '<b>$1</b>').replace(/\n/gim, '<br>'); text += '<br><button class="action-button w-full mt-4 border-red-500 text-red-500" onclick="document.getElementById(\'manual-overlay\').classList.add(\'hidden\'); document.getElementById(\'manual-overlay\').style.display=\'none\';">SCHLIESSEN (ESC)</button>'; content.innerHTML = text; } catch(e) { content.innerHTML = `<div class="text-red-500">Fehler beim Laden: ${e.message}</div>`; } } },
    showChangelogOverlay: async function() { const overlay = document.getElementById('changelog-overlay'); const content = document.getElementById('changelog-content'); if(overlay && content) { content.textContent = 'Lade Daten...'; overlay.style.display = 'flex'; overlay.classList.remove('hidden'); const ver = document.getElementById('version-display') ? document.getElementById('version-display').textContent.trim() : Date.now(); try { const res = await fetch(`change.log?v=${ver}`); if (!res.ok) throw new Error("Logfile nicht gefunden"); const text = await res.text(); content.textContent = text; } catch(e) { content.textContent = `Fehler beim Laden: ${e.message}`; } } },
    showMobileControlsHint: function() { if(document.getElementById('mobile-hint')) return; const hintHTML = ` <div id="mobile-hint" class="absolute inset-0 z-[100] flex flex-col justify-center items-center bg-black/80 pointer-events-auto backdrop-blur-sm opacity-0 transition-opacity duration-500" onclick="this.style.opacity='0'; setTimeout(() => this.remove(), 500)"> <div class="border-2 border-[#39ff14] bg-black p-6 text-center shadow-[0_0_20px_#39ff14] max-w-sm mx-4"> <div class="text-5xl mb-4 animate-bounce">👆</div> <h2 class="text-2xl font-bold text-[#39ff14] mb-2 tracking-widest border-b border-[#39ff14] pb-2">TOUCH STEUERUNG</h2> <p class="text-green-300 mb-6 font-mono leading-relaxed">Tippe und halte IRGENDWO auf dem Hauptschirm (auch im Log), um den Joystick zu aktivieren.</p> <div class="text-xs text-[#39ff14] animate-pulse font-bold bg-[#39ff14]/20 py-2 rounded">> TIPPEN ZUM STARTEN <</div> </div> </div>`; document.body.insertAdjacentHTML('beforeend', hintHTML); setTimeout(() => { const el = document.getElementById('mobile-hint'); if(el) el.classList.remove('opacity-0'); }, 10); },
    handleSaveClick: function() { Game.saveGame(true); [UI.els.btnSave, UI.els.btnMenuSave].forEach(btn => { if(!btn) return; const originalText = btn.textContent; const originalClass = btn.className; btn.textContent = "SAVED!"; btn.className = "header-btn bg-[#39ff14] text-black border-[#39ff14] w-full text-left"; if(btn === UI.els.btnSave) btn.className = "header-btn bg-[#39ff14] text-black border-[#39ff14] hidden md:flex"; setTimeout(() => { btn.textContent = originalText; btn.className = originalClass; }, 1000); }); },
    renderSpawnList: function(players) { if(!UI.els.spawnList) return; UI.els.spawnList.innerHTML = ''; let count = 0; for(let id in players) { if(id === Network.myId) continue; const p = players[id]; const btn = document.createElement('button'); btn.className = "action-button w-full text-left p-2 flex justify-between"; const sec = p.sector ? `${p.sector.x},${p.sector.y}` : "?,?"; btn.innerHTML = `<span>${id}</span> <span class="text-cyan-400">Sektor ${sec}</span>`; btn.onclick = () => UI.selectSpawn(p); UI.els.spawnList.appendChild(btn); count++; } if(count === 0) { UI.els.spawnList.innerHTML = '<div class="text-center italic opacity-50 p-2">Keine Signale. Starte Solo.</div>'; } },
    selectSpawn: function(targetPlayer) { UI.els.spawnScreen.style.display = 'none'; UI.els.gameScreen.classList.remove('hidden'); UI.els.gameScreen.classList.remove('opacity-0'); Game.init(null, targetPlayer); if(UI.isMobile()) { UI.showMobileControlsHint(); } Network.startPresence(); },
    logout: function(reason="AUSGELOGGT") { if(typeof Game !== 'undefined') Game.saveGame(true); if(typeof Network !== 'undefined') Network.disconnect(); UI.els.charSelectScreen.style.display = 'none'; UI.els.gameScreen.classList.add('hidden'); UI.els.gameScreen.classList.add('opacity-0'); UI.els.spawnScreen.style.display = 'none'; UI.els.loginScreen.style.display = 'flex'; if(UI.els.loginStatus) { UI.els.loginStatus.textContent = reason; UI.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red"; } if(UI.els.inputPass) UI.els.inputPass.value = ""; if(UI.els.navMenu) { UI.els.navMenu.classList.add('hidden'); UI.els.navMenu.style.display = 'none'; } if(UI.els.playerList) UI.els.playerList.style.display = 'none'; },
    togglePlayerList: function() { if(UI.els.playerList.style.display === 'flex') { UI.els.playerList.style.display = 'none'; } else { UI.updatePlayerList(); UI.els.playerList.style.display = 'flex'; UI.focusIndex = -1; UI.refreshFocusables(); } },
    updatePlayerList: function() { if(!UI.els.playerListContent || typeof Network === 'undefined') return; let myLoc = "[?,?]"; if (Game.state && Game.state.sector) { myLoc = `[${Game.state.sector.x},${Game.state.sector.y}]`; } let html = `<div class="text-green-400">> ${Network.myDisplayName || "DU"} <span class="text-yellow-400">${myLoc}</span></div>`; if(Network.otherPlayers) { for(let name in Network.otherPlayers) { const p = Network.otherPlayers[name]; const loc = (p.sector) ? `[${p.sector.x},${p.sector.y}]` : '[?]'; html += `<div class="text-cyan-400">> ${name} <span class="text-yellow-400">${loc}</span></div>`; } } UI.els.playerListContent.innerHTML = html; },
    renderWiki: function(category = 'monsters') { const content = document.getElementById('wiki-content'); if(!content) return; ['monsters', 'items', 'crafting', 'locs'].forEach(cat => { const btn = document.getElementById(`wiki-btn-${cat}`); if(btn) { if(cat === category) { btn.classList.add('bg-green-500', 'text-black'); btn.classList.remove('text-green-500'); } else { btn.classList.remove('bg-green-500', 'text-black'); btn.classList.add('text-green-500'); } } }); let htmlBuffer = ''; if(category === 'monsters') { Object.keys(Game.monsters).forEach(k => { const m = Game.monsters[k]; const xpText = Array.isArray(m.xp) ? `${m.xp[0]}-${m.xp[1]}` : m.xp; let dropsText = "Nichts"; if(m.drops) { dropsText = m.drops.map(d => { const item = Game.items[d.id]; return `${item ? item.name : d.id} (${Math.round(d.c*100)}%)`; }).join(', '); } htmlBuffer += `<div class="border border-green-900 bg-green-900/10 p-3 mb-2"><div class="flex justify-between items-start"><div class="font-bold text-yellow-400 text-xl">${m.name} ${m.isLegendary ? '★' : ''}</div><div class="text-xs border border-green-700 px-1">LVL ${m.minLvl}+</div></div><div class="grid grid-cols-2 gap-2 text-sm mt-2"><div>HP: <span class="text-white">${m.hp}</span></div><div>DMG: <span class="text-red-400">${m.dmg}</span></div><div>XP: <span class="text-cyan-400">${xpText}</span></div><div>Caps: <span class="text-yellow-200">~${m.loot}</span></div></div><div class="mt-2 text-xs border-t border-green-900 pt-1 text-gray-400">Beute: <span class="text-green-300">${dropsText}</span></div></div>`; }); } else if (category === 'items') { const categories = {}; if (Game.items) { Object.keys(Game.items).forEach(k => { const i = Game.items[k]; if(!categories[i.type]) categories[i.type] = []; categories[i.type].push(i); }); for(let type in categories) { htmlBuffer += `<h3 class="text-lg font-bold border-b border-green-500 mt-4 mb-2 uppercase text-green-300">${type}</h3>`; categories[type].forEach(item => { let details = `Wert: ${item.cost}`; if(item.baseDmg) details += ` | DMG: ${item.baseDmg}`; if(item.bonus) details += ` | Bonus: ${JSON.stringify(item.bonus).replace(/["{}]/g, '').replace(/:/g, '+')}`; htmlBuffer += `<div class="flex justify-between items-center border-b border-green-900/30 py-1"><span class="font-bold text-white">${item.name}</span><span class="text-xs text-gray-400">${details}</span></div>`; }); } } } else if (category === 'crafting') { if (Game.recipes) { Game.recipes.forEach(r => { const outName = r.out === "AMMO" ? "Munition x15" : (Game.items[r.out] ? Game.items[r.out].name : r.out); const reqs = Object.keys(r.req).map(rid => { const iName = Game.items[rid] ? Game.items[rid].name : rid; return `${r.req[rid]}x ${iName}`; }).join(', '); htmlBuffer += `<div class="border border-green-900 p-2 mb-2 bg-green-900/10"><div class="font-bold text-yellow-400">${outName} <span class="text-xs text-gray-500 ml-2">(Lvl ${r.lvl})</span></div><div class="text-xs text-green-300 italic">Benötigt: ${reqs}</div></div>`; }); } } else if (category === 'locs') { const locs = [ {name: "Vault 101", desc: "Startpunkt. Sicherer Hafen. Bietet kostenlose Heilung."}, {name: "Rusty Springs", desc: "Zentrale Handelsstadt [3,3]. Händler, Heiler und Werkbank."}, {name: "Supermarkt", desc: "Zufällige Ruine. Mittlere Gefahr, viele Raider."}, {name: "Alte Höhlen", desc: "Zufälliger Dungeon. Dunkel, Skorpione und Insekten."}, {name: "Oasis", desc: "Sektor [0,0] bis [1,1]. Dichter Dschungel im Nordwesten."}, {name: "The Pitt", desc: "Sektor [6,6] bis [7,7]. Tödliche Wüste im Südosten."}, {name: "Sumpf", desc: "Sektor [6,0] bis [7,1]. Giftiges Wasser und Mirelurks."} ]; locs.forEach(l => { htmlBuffer += `<div class="mb-3 border-l-2 border-green-500 pl-2"><div class="font-bold text-cyan-400 text-lg uppercase">${l.name}</div><div class="text-sm text-green-200 leading-tight">${l.desc}</div></div>`; }); } content.innerHTML = htmlBuffer; },
    renderCrafting: function() { const container = document.getElementById('crafting-list'); if(!container) return; container.innerHTML = ''; Game.recipes.forEach(recipe => { const outItem = recipe.out === 'AMMO' ? {name: "15x Munition"} : Game.items[recipe.out]; const div = document.createElement('div'); div.className = "border border-green-900 bg-green-900/10 p-3 mb-2"; let reqHtml = ''; let canCraft = true; for(let reqId in recipe.req) { const countNeeded = recipe.req[reqId]; const invItem = Game.state.inventory.find(i => i.id === reqId); const countHave = invItem ? invItem.count : 0; let isEquipped = false; if (Game.state.equip.weapon && Object.keys(Game.items).find(k => Game.items[k].name === Game.state.equip.weapon.name) === reqId) isEquipped = true; if (Game.state.equip.body && Object.keys(Game.items).find(k => Game.items[k].name === Game.state.equip.body.name) === reqId) isEquipped = true; let color = "text-green-500"; if (isEquipped) { if (countHave < countNeeded) { canCraft = false; color = "text-red-500"; } } else { if (countHave < countNeeded) { canCraft = false; color = "text-red-500"; } } reqHtml += `<div class="${color} text-xs">• ${Game.items[reqId].name}: ${countHave}/${countNeeded} ${isEquipped ? '(E)' : ''}</div>`; } if(Game.state.lvl < recipe.lvl) { canCraft = false; reqHtml += `<div class="text-red-500 text-xs mt-1">Benötigt Level ${recipe.lvl}</div>`; } div.innerHTML = `<div class="flex justify-between items-start mb-2"><div class="font-bold text-yellow-400 text-lg">${outItem.name}</div><button class="action-button text-sm px-3" onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>FERTIGEN</button></div><div class="pl-2 border-l-2 border-green-900">${reqHtml}</div>`; container.appendChild(div); }); }
};
