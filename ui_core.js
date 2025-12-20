window.UI = {
    els: {},
    timerInterval: null,
    lastInputTime: Date.now(), 
    biomeColors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {}, 
    
    // States
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
            setTimeout(() => { if(this.els.view) this.els.view.classList.remove('shake'); }, 300);
        }
    },
    
    setConnectionState: function(status) {
        const v = document.getElementById('version-display');
        if(!v) return;
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
        if(Game.state.view === 'map') this.update(); 
    },

    init: function() {
        // Elements Binding
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
            newCharOverlay: document.getElementById('new-char-overlay'), inputNewCharName: document.getElementById('new-char-name'), btnCreateCharConfirm: document.getElementById('btn-create-char'),
            btnCharSelectAction: document.getElementById('btn-char-select-action'), btnCharDeleteAction: document.getElementById('btn-char-delete-action'),
            deleteOverlay: document.getElementById('delete-confirm-overlay'), deleteTargetName: document.getElementById('delete-target-name'), deleteInput: document.getElementById('delete-input'),
            btnDeleteConfirm: document.getElementById('btn-delete-confirm'), btnDeleteCancel: document.getElementById('btn-delete-cancel'),
            spawnScreen: document.getElementById('spawn-screen'), spawnMsg: document.getElementById('spawn-msg'), spawnList: document.getElementById('spawn-list'), btnSpawnRandom: document.getElementById('btn-spawn-random'),
            resetOverlay: document.getElementById('reset-overlay'), btnConfirmReset: document.getElementById('btn-confirm-reset'), btnCancelReset: document.getElementById('btn-cancel-reset'),
            gameScreen: document.getElementById('game-screen'), gameOver: document.getElementById('game-over-screen')
        };
        
        // Start Inputs if available
        if(this.setupInputs) this.setupInputs();
        
        window.Game = Game; 
        window.UI = this;
        
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }
};
