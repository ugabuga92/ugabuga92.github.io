const UI = {
    els: {}, 
    timerInterval: null,
    lastInputTime: Date.now(),
    biomeColors: {}, // Safe Init

    // States
    loginBusy: false,
    isRegistering: false,
    charSelectMode: false,
    deleteMode: false,
    currentSaves: {},
    selectedSlot: -1,
    focusIndex: -1,
    focusableEls: [],
    inputMethod: 'touch', 

    log: function(msg, color="text-green-500") {
        if(!this.els || !this.els.log) { console.log("LOG:", msg); return; }
        const line = document.createElement('div');
        line.className = color;
        line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
    },

    error: function(msg) {
        console.error(msg);
        if(this.els && this.els.log) {
            const line = document.createElement('div');
            line.className = "text-red-500 font-bold blink-red";
            line.textContent = `> ERROR: ${msg}`;
            this.els.log.prepend(line);
        }
    },
    
    setConnectionState: function(status) {
        if(!this.els || !this.els.version) return;
        const v = this.els.version;
        if(status === 'online') { v.className = "text-[#39ff14] font-bold tracking-widest"; v.style.textShadow = "0 0 5px #39ff14"; } 
        else if (status === 'offline') { v.className = "text-red-500 font-bold tracking-widest"; v.style.textShadow = "0 0 5px red"; } 
        else { v.className = "text-yellow-400 font-bold tracking-widest animate-pulse"; }
    },

    updateTimer: function() {
        if(Game.state && this.els.gameScreen && !this.els.gameScreen.classList.contains('hidden')) {
            if(Date.now() - this.lastInputTime > 300000) { this.logout("AFK: ZEITÜBERSCHREITUNG"); return; }
        }
        if(!Game.state || !Game.state.startTime) return;
        const diff = Math.floor((Date.now() - Game.state.startTime) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2,'0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0');
        const s = (diff % 60).toString().padStart(2,'0');
        if(this.els.timer) this.els.timer.textContent = `${h}:${m}:${s}`;
        if(this.update) this.update();
    },

    init: function() {
        this.biomeColors = (typeof window.GameData !== 'undefined') ? window.GameData.colors : {};
        
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
            btnMenuSave: document.getElementById('btn-menu-save'),
            btnLogout: document.getElementById('btn-logout'),
            btnReset: document.getElementById('btn-reset'),
            btnMenu: document.getElementById('btn-menu-toggle'),
            navMenu: document.getElementById('main-nav'),
            playerCount: document.getElementById('val-players'),
            playerList: document.getElementById('player-list-overlay'),
            playerListContent: document.getElementById('player-list-content'),
            
            loginScreen: document.getElementById('login-screen'),
            loginStatus: document.getElementById('login-status'),
            inputEmail: document.getElementById('login-email'),
            inputPass: document.getElementById('login-pass'),
            inputName: document.getElementById('login-name'),
            btnLogin: document.getElementById('btn-login'),
            btnToggleRegister: document.getElementById('btn-toggle-register'),
            loginTitle: document.getElementById('login-title'),
            
            charSelectScreen: document.getElementById('char-select-screen'),
            charSlotsList: document.getElementById('char-slots-list'),
            newCharOverlay: document.getElementById('new-char-overlay'),
            inputNewCharName: document.getElementById('new-char-name'),
            btnCreateCharConfirm: document.getElementById('btn-create-char'),
            btnCharSelectAction: document.getElementById('btn-char-select-action'),
            btnCharDeleteAction: document.getElementById('btn-char-delete-action'),
            
            deleteOverlay: document.getElementById('delete-confirm-overlay'),
            deleteTargetName: document.getElementById('delete-target-name'),
            deleteInput: document.getElementById('delete-input'),
            btnDeleteConfirm: document.getElementById('btn-delete-confirm'),
            btnDeleteCancel: document.getElementById('btn-delete-cancel'),

            spawnScreen: document.getElementById('spawn-screen'),
            spawnMsg: document.getElementById('spawn-msg'),
            spawnList: document.getElementById('spawn-list'),
            btnSpawnRandom: document.getElementById('btn-spawn-random'),
            resetOverlay: document.getElementById('reset-overlay'),
            btnConfirmReset: document.getElementById('btn-confirm-reset'),
            btnCancelReset: document.getElementById('btn-cancel-reset'),
            gameScreen: document.getElementById('game-screen'),
            gameOver: document.getElementById('game-over-screen')
        };
        
        window.Game = Game;
        window.UI = this;

        if(this.initInput) this.initInput();
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    },

    isMobile: function() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0); },

    startGame: function(saveData, slotIndex, newName=null) {
        this.charSelectMode = false;
        this.els.charSelectScreen.style.display = 'none';
        this.els.gameScreen.classList.remove('hidden');
        this.els.gameScreen.classList.remove('opacity-0');
        Game.init(saveData, null, slotIndex, newName);
        if(this.isMobile()) this.showMobileControlsHint();
        if(typeof Network !== 'undefined') Network.startPresence();
    },

    logout: function(msg) {
        this.loginBusy = false;
        if(typeof Network !== 'undefined') Network.disconnect();
        if(Game.state) { Game.saveGame(); Game.state = null; }
        this.els.gameScreen.classList.add('hidden');
        this.els.loginScreen.style.display = 'flex';
        this.els.loginStatus.textContent = msg || "AUSGELOGGT";
        if(this.els.navMenu) this.els.navMenu.classList.add('hidden');
        if(this.els.playerList) this.els.playerList.style.display = 'none';
    },

    attemptLogin: async function() {
        if(this.loginBusy) return;
        this.loginBusy = true;
        const email = this.els.inputEmail.value.trim();
        const pass = this.els.inputPass.value.trim();
        const name = this.els.inputName ? this.els.inputName.value.trim().toUpperCase() : "";
        
        this.els.loginStatus.textContent = "VERBINDE...";
        this.els.loginStatus.className = "mt-4 text-yellow-400 animate-pulse";
        
        try {
            if(typeof Network === 'undefined') throw new Error("Netzwerkfehler");
            Network.init();
            let saves = null;
            if (this.isRegistering) {
                if (email.length < 5 || pass.length < 6 || name.length < 3) throw new Error("Daten unvollständig");
                saves = await Network.register(email, pass, name);
            } else {
                if (email.length < 5 || pass.length < 1) throw new Error("Zugangsdaten fehlen");
                saves = await Network.login(email, pass);
            }
            if(this.renderCharacterSelection) this.renderCharacterSelection(saves || {});
        } catch(e) {
            this.els.loginStatus.textContent = "FEHLER: " + e.message;
            this.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red";
        } finally {
            this.loginBusy = false;
        }
    },

    handleSaveClick: function() {
        Game.saveGame(true);
        const btn = this.els.btnSave;
        if(btn) { btn.textContent = "SAVED!"; setTimeout(() => { btn.textContent = "SPEICHERN"; }, 1000); }
    },

    handleReset: function() { if(this.els.resetOverlay) this.els.resetOverlay.style.display = 'flex'; },
    confirmReset: function() { if(typeof Game !== 'undefined') Game.hardReset(); },
    cancelReset: function() { if(this.els.resetOverlay) this.els.resetOverlay.style.display = 'none'; },
    selectSpawn: function(mode) { this.els.spawnScreen.style.display = 'none'; if(mode === 'random') this.startGame(null, this.selectedSlot, null); },
    
    selectSlot: function(index) {
        this.selectedSlot = index;
        const slots = this.els.charSlotsList.children;
        for(let s of slots) s.classList.remove('active-slot');
        if(slots[index]) slots[index].classList.add('active-slot');
        const save = this.currentSaves[index];
        if (this.els.btnCharSelectAction) {
            this.els.btnCharSelectAction.textContent = save ? "SPIEL LADEN" : "CHARAKTER ERSTELLEN";
            this.els.btnCharSelectAction.className = save ? "action-button w-full border-green-500 text-green-500 font-bold py-3 mb-2" : "action-button w-full border-yellow-400 text-yellow-400 font-bold py-3 mb-2";
            if(this.els.btnCharDeleteAction) this.els.btnCharDeleteAction.style.display = save ? 'flex' : 'none';
        }
    },

    navigateCharSlot: function(delta) {
        let newIndex = this.selectedSlot + delta;
        if(newIndex < 0) newIndex = 4; if(newIndex > 4) newIndex = 0;
        this.selectSlot(newIndex);
    },

    triggerCharSlot: function() {
        if(this.selectedSlot === -1) return;
        const save = this.currentSaves[this.selectedSlot];
        if(save) { this.startGame(save, this.selectedSlot); } 
        else { this.els.newCharOverlay.classList.remove('hidden'); this.els.inputNewCharName.value = ""; this.els.inputNewCharName.focus(); }
    },

    triggerDeleteSlot: function() {
        if(this.selectedSlot === -1) return;
        const save = this.currentSaves[this.selectedSlot];
        if(!save) return;
        this.deleteMode = true;
        this.els.deleteOverlay.style.display = 'flex';
        this.els.deleteTargetName.textContent = save.playerName || "UNBEKANNT";
        this.els.deleteInput.value = "";
        this.els.btnDeleteConfirm.disabled = true;
        this.els.deleteInput.focus();
    },

    closeDeleteOverlay: function() { this.deleteMode = false; this.els.deleteOverlay.style.display = 'none'; }
};
