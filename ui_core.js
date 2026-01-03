// [v3.4a] - 2026-01-03 04:45am (Stats/Perk Logic)
// - Click Logic for Stats/Perks priority.

const UI = {
    els: {},
    timerInterval: null,
    lastInputTime: Date.now(),
    biomeColors: (typeof window.GameData !== 'undefined') ? window.GameData.colors : {},

    // States
    loginBusy: false,
    isRegistering: false,
    charSelectMode: false,
    deleteMode: false,
    currentSaves: {},
    selectedSlot: -1,
    
    // Focus System
    focusIndex: -1,
    focusableEls: [],
    inputMethod: 'touch', 

    // Utils
    log: function(msg, color="text-green-500") {
        if(!this.els.log) return;
        const line = document.createElement('div');
        line.className = color;
        line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
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
    
    setConnectionState: function(status) {
        const v = this.els.version;
        if(!v) return;
        if(status === 'online') {
            v.className = "text-[#39ff14] font-bold tracking-widest";
            v.style.textShadow = "0 0 5px #39ff14";
        } else if (status === 'offline') {
            v.className = "text-red-500 font-bold tracking-widest";
            v.style.textShadow = "0 0 5px red";
        } else {
            v.className = "text-yellow-400 font-bold tracking-widest animate-pulse";
        }
    },

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
        
        if(this.update) this.update();
    },

    // Initialization
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
            headerCharInfo: document.getElementById('header-char-info'),
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
            btnRadio: document.getElementById('btn-radio'),
            
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
            btnCharBack: document.getElementById('btn-char-back'),
            
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
        
        if(this.els.btnInv) {
             this.els.btnInv.addEventListener('click', () => this.resetInventoryAlert());
        }

        // [v3.4a] Header Info Click Event - Smart Routing
        if(this.els.headerCharInfo) {
            this.els.headerCharInfo.addEventListener('click', () => {
                const hasStats = Game.state.statPoints > 0;
                const hasPerks = Game.state.perkPoints > 0; // Assuming perkPoints key
                
                if(hasStats) {
                    // Prio 1: Stats
                    this.switchView('char'); 
                    // ToDo: Force Stat Tab if needed
                } else if (hasPerks) {
                    // Prio 2: Perks
                    this.switchView('char');
                    // ToDo: Force Perk Tab switch here if possible
                    // setTimeout(() => document.getElementById('tab-perks')?.click(), 100);
                } else {
                    // Default
                    this.switchView('char');
                }
            });
        }

        window.Game = Game;
        window.UI = this;

        if(this.initInput) this.initInput();
        
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    },
    
    triggerInventoryAlert: function() {
        if(this.els.btnInv) this.els.btnInv.classList.add('alert-glow-yellow');
        if(this.els.btnMenu) this.els.btnMenu.classList.add('alert-glow-yellow');
    },

    resetInventoryAlert: function() {
        if(this.els.btnInv) this.els.btnInv.classList.remove('alert-glow-yellow');
        if(this.els.btnMenu) this.els.btnMenu.classList.remove('alert-glow-yellow');
    },

    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    },

    startGame: function(saveData, slotIndex, newName=null) {
        this.charSelectMode = false;
        this.els.charSelectScreen.style.display = 'none';
        this.els.gameScreen.classList.remove('hidden');
        this.els.gameScreen.classList.remove('opacity-0');
        
        Game.init(saveData, null, slotIndex, newName);
        
        if(this.isMobile()) {
            this.showMobileControlsHint();
        }
        if(typeof Network !== 'undefined') Network.startPresence();
    },

    logout: function(msg) {
        this.loginBusy = false;
        this.selectedSlot = -1; 
        
        if(Game.state) {
            Game.saveGame(true); 
            Game.state = null;
        }

        if(typeof Network !== 'undefined') Network.disconnect();
        
        this.els.gameScreen.classList.add('hidden');
        this.els.loginScreen.style.display = 'flex';
        this.els.loginStatus.textContent = msg || "AUSGELOGGT";
        this.els.loginStatus.className = "mt-4 text-yellow-400";
        this.els.inputPass.value = "";
        
        if(this.els.navMenu) this.els.navMenu.classList.add('hidden');
        if(this.els.playerList) this.els.playerList.style.display = 'none';
    },

    attemptLogin: async function() {
        if(this.loginBusy) return;
        this.loginBusy = true;
        const email = this.els.inputEmail.value.trim();
        const pass = this.els.inputPass.value.trim();
        const name = this.els.inputName ? this.els.inputName.value.trim().toUpperCase() : "";
        
        this.els.loginStatus.textContent = "VERBINDE MIT VAULT-TEC...";
        this.els.loginStatus.className = "mt-4 text-yellow-400 animate-pulse";
        
        try {
            if(typeof Network === 'undefined') throw new Error("Netzwerkfehler");
            Network.init();
            let saves = null;
            if (this.isRegistering) {
                if (email.length < 5 || pass.length < 6 || name.length < 3) throw new Error("Daten unvollständig (PW min 6, Name min 3)");
                saves = await Network.register(email, pass, name);
            } else {
                if (email.length < 5 || pass.length < 1) throw new Error("Bitte E-Mail und Passwort eingeben");
                saves = await Network.login(email, pass);
            }
            
            this.selectedSlot = -1; 
            if(this.renderCharacterSelection) this.renderCharacterSelection(saves || {});
            
        } catch(e) {
            let msg = e.message;
            if(msg && (msg.includes("INVALID_LOGIN_CREDENTIALS") || msg.includes("INVALID_EMAIL"))) {
                msg = "E-Mail oder Passwort falsch!";
            }
            else if(msg && msg.includes("EMAIL_NOT_FOUND")) msg = "E-Mail nicht gefunden!";
            else if(msg && msg.includes("INVALID_PASSWORD")) msg = "Falsches Passwort!";
            else if(msg && msg.includes("USER_DISABLED")) msg = "Account deaktiviert!";
            else if(msg && msg.includes("Too many unsuccessful attempts")) msg = "Zu viele Versuche. Warte kurz!";
            else if (e.code === "auth/email-already-in-use") msg = "E-Mail wird bereits verwendet!";
            else if (e.code === "auth/invalid-email") msg = "Ungültige E-Mail-Adresse!";
            else if (e.code === "auth/wrong-password") msg = "Falsches Passwort!";
            else if (e.code === "auth/user-not-found") msg = "Benutzer nicht gefunden!";
            else if (e.code === "auth/internal-error") {
                 if(msg.includes("INVALID_LOGIN_CREDENTIALS")) msg = "E-Mail oder Passwort falsch!";
            }

            this.els.loginStatus.textContent = "FEHLER: " + msg;
            this.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red";
        } finally {
            this.loginBusy = false;
        }
    },

    handleSaveClick: function() {
        Game.saveGame(true);
        [this.els.btnSave, this.els.btnMenuSave].forEach(btn => {
            if(!btn) return;
            const originalText = btn.textContent;
            const originalClass = btn.className;
            btn.textContent = "SAVED!";
            btn.className = "header-btn bg-[#39ff14] text-black border-[#39ff14] w-full text-left";
            if(btn === this.els.btnSave) btn.className = "header-btn bg-[#39ff14] text-black border-[#39ff14] hidden md:flex";
            setTimeout(() => {
                btn.textContent = originalText;
                btn.className = originalClass;
            }, 1000);
        });
    },

    handleReset: function() {
        if(this.els.navMenu) {
            this.els.navMenu.classList.add('hidden');
            this.els.navMenu.style.display = 'none';
        }
        if(this.els.resetOverlay) this.els.resetOverlay.style.display = 'flex';
    },
    
    confirmReset: function() { if(typeof Game !== 'undefined') Game.hardReset(); },
    cancelReset: function() { if(this.els.resetOverlay) this.els.resetOverlay.style.display = 'none'; },

    selectSpawn: function(mode) {
        this.els.spawnScreen.style.display = 'none';
        if(mode === 'random') {
            this.startGame(null, this.selectedSlot, null);
        }
    },
    
    selectSlot: function(index) {
        if(this.selectedSlot === index) {
            this.triggerCharSlot();
            return;
        }

        this.selectedSlot = index;
        if(this.els.charSlotsList && this.els.charSlotsList.children) {
            const slots = this.els.charSlotsList.children;
            for(let i=0; i<slots.length; i++) {
                slots[i].classList.remove('active-slot');
            }
            if(slots[index]) slots[index].classList.add('active-slot');
        }
        
        const save = this.currentSaves ? this.currentSaves[index] : null;
        if (this.els.btnCharSelectAction) {
            if (save) {
                this.els.btnCharSelectAction.style.display = 'none';
                if(this.els.btnCharDeleteAction) {
                    this.els.btnCharDeleteAction.disabled = false;
                    this.els.btnCharDeleteAction.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            } else {
                this.els.btnCharSelectAction.style.display = 'block';
                this.els.btnCharSelectAction.textContent = "CHARAKTER ERSTELLEN";
                this.els.btnCharSelectAction.className = "action-button w-full border-yellow-400 text-yellow-400 font-bold py-3 mb-2";
                if(this.els.btnCharDeleteAction) {
                    this.els.btnCharDeleteAction.disabled = true;
                    this.els.btnCharDeleteAction.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }
        }
    },

    navigateCharSlot: function(delta) {
        let newIndex = this.selectedSlot + delta;
        if(newIndex < 0) newIndex = 4;
        if(newIndex > 4) newIndex = 0;
        this.selectSlot(newIndex);
    },

    triggerCharSlot: function() {
        if(this.selectedSlot === -1) return;
        const save = this.currentSaves[this.selectedSlot];
        if(save) {
            this.startGame(save, this.selectedSlot);
        } else {
            this.els.newCharOverlay.classList.remove('hidden');
            this.els.inputNewCharName.value = "";
            this.els.inputNewCharName.focus();
        }
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
        this.els.btnDeleteConfirm.classList.add('border-red-500', 'text-red-500');
        this.els.btnDeleteConfirm.classList.remove('border-green-500', 'text-green-500', 'animate-pulse');
        this.els.deleteInput.focus();
    },

    closeDeleteOverlay: function() {
        this.deleteMode = false;
        this.els.deleteOverlay.style.display = 'none';
        this.els.charSelectScreen.focus();
    }
};
console.log("UI Core Loaded.");
