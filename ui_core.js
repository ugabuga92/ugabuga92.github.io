// [TIMESTAMP] 2026-01-10 13:05:00 - ui_core.js - Boot-Sequenz Absicherung (isSystemReady) integriert

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
    isSystemReady: false, // [NEU] Verhindert Login vor Abschluss der Boot-Sequenz
    
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
        this.openBugModal(msg);
    },

    showCombatEffect: function(mainText, subText, color="red", duration=1000) {
        const view = document.getElementById('view-container');
        if(!view) return;

        const el = document.createElement('div');
        el.className = "click-effect-overlay"; 
        
        el.style.animation = `clickEffectAnim ${duration/1000}s ease-out forwards`;

        el.innerHTML = `
            <div class="click-effect-text" style="color:${color}; text-shadow: 0 0 20px ${color}">${mainText}</div>
            <div class="click-effect-sub" style="border-color:${color}">${subText}</div>
        `;
        
        view.appendChild(el);
        
        setTimeout(() => {
            if(el) el.remove();
        }, duration);
    },

    // --- ALERT HANDLING ---
    triggerInventoryAlert: function() {
        if(this.els.btnInv) this.els.btnInv.classList.add('alert-glow-yellow');
        if(this.els.btnMenu) this.els.btnMenu.classList.add('alert-glow-yellow');
    },

    resetInventoryAlert: function() {
        if(this.els.btnInv) this.els.btnInv.classList.remove('alert-glow-yellow');
        if(this.els.btnMenu) this.els.btnMenu.classList.remove('alert-glow-yellow');
    },

    // --- BUG REPORT MODAL ---
    openBugModal: function(autoErrorMsg = null) {
        if(document.getElementById('bug-report-overlay')) return;
        if(this.els.navMenu) this.els.navMenu.classList.add('hidden');

        const title = autoErrorMsg ? "⚠️ SYSTEMFEHLER ERKANNT" : "🐞 BUG MELDEN";
        const subText = autoErrorMsg 
            ? `CODE: "${autoErrorMsg}"` 
            : "Fehler gefunden? Beschreibe ihn kurz:";
        
        const overlay = document.createElement('div');
        overlay.id = 'bug-report-overlay';
        overlay.className = "fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4";
        
        overlay.innerHTML = `
            <div class="bg-[#051105] border-2 border-red-600 p-6 rounded shadow-[0_0_30px_red] max-w-md w-full relative">
                <h2 class="text-2xl text-red-500 font-bold mb-2 font-vt323 tracking-widest">${title}</h2>
                <div class="text-red-300 text-sm font-mono mb-4 border-b border-red-900 pb-2">
                    ${subText}
                </div>
                
                <label class="block text-green-500 text-sm mb-1 uppercase tracking-wider">Beschreibung</label>
                <textarea id="bug-desc" class="w-full bg-black border border-green-700 text-green-400 p-2 font-mono text-sm h-24 focus:border-green-400 outline-none mb-4" placeholder="Was ist passiert?"></textarea>
                
                <div class="flex gap-2">
                    <button id="btn-bug-send" class="flex-1 bg-red-900/30 border border-red-500 text-red-400 py-2 font-bold hover:bg-red-500 hover:text-black transition-all uppercase">
                        REPORT SENDEN
                    </button>
                    <button id="btn-bug-close" class="px-4 border border-gray-600 text-gray-500 hover:text-white transition-all uppercase">
                        ABBRECHEN
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const textArea = document.getElementById('bug-desc');
        if(textArea) {
            textArea.focus();
            const stopPropagation = (e) => e.stopPropagation();
            textArea.addEventListener('keydown', stopPropagation);
            textArea.addEventListener('keyup', stopPropagation);
            textArea.addEventListener('keypress', stopPropagation);
        }

        document.getElementById('btn-bug-close').onclick = () => overlay.remove();
        
        document.getElementById('btn-bug-send').onclick = () => {
            const desc = document.getElementById('bug-desc').value;
            const errorType = autoErrorMsg || "Manuelle Meldung";
            this.saveBugReport(errorType, desc);
            overlay.remove();
        };
    },

    saveBugReport: async function(errorMsg, userDesc) {
        const playerName = (Game.state && Game.state.playerName) ? Game.state.playerName : "Unbekannt/Login";
        
        const report = {
            timestamp: new Date().toISOString(),
            playerName: playerName,
            error: errorMsg,
            description: userDesc || "Keine Beschreibung",
            gameState: {
                view: Game.state ? Game.state.view : 'null',
                sector: Game.state ? `${Game.state.sector.x},${Game.state.sector.y}` : 'null',
                caps: Game.state ? Game.state.caps : 0,
                lvl: Game.state ? Game.state.lvl : 0
            },
            userAgent: navigator.userAgent
        };

        this.log("Sende Fehlerbericht an Vault-Tec...", "text-yellow-400 blink-red");

        let sent = false;
        if (typeof Network !== 'undefined' && Network.sendBugReport) {
            sent = await Network.sendBugReport(report);
        }

        if (sent) {
            this.log("✅ Bericht erfolgreich übertragen.", "text-green-400 font-bold");
        } else {
            this.log("❌ Bug report aktuell nicht möglich.", "text-red-500 font-bold");
            console.warn("Bug Report Senden fehlgeschlagen.");
        }
    },

    showMobileControlsHint: function() {
        if(document.getElementById('controls-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'controls-overlay';
        overlay.className = "fixed inset-0 z-[9000] bg-black/95 flex flex-col items-center justify-center p-6 text-center";
        
        overlay.innerHTML = `
            <div class="border-2 border-green-500 p-6 max-w-sm w-full shadow-[0_0_20px_#1aff1a] bg-[#001100]">
                <div class="text-4xl mb-4">📱</div>
                <h2 class="text-2xl text-green-400 font-bold mb-4 font-vt323 tracking-widest border-b border-green-800 pb-2">STEUERUNG</h2>
                
                <div class="text-green-300 font-mono text-sm space-y-4 text-left mb-6">
                    <div class="flex items-start gap-3">
                        <span class="text-xl">👆</span>
                        <div>
                            <strong class="text-green-100">TIPPEN:</strong><br>
                            Bewegen / Interagieren / Angreifen
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <span class="text-xl">📄</span>
                        <div>
                            <strong class="text-green-100">MENÜ:</strong><br>
                            Burger-Icon (☰) oben rechts für Inventar & Charakter.
                        </div>
                    </div>
                </div>

                <div class="border-t border-green-800 pt-4 mt-4">
                    <h3 class="text-red-500 font-bold mb-2 animate-pulse">⚠️ WARNUNG: PERMADEATH</h3>
                    <p class="text-red-400 text-xs font-mono leading-relaxed">
                        In diesem Modus ist der Tod endgültig.<br>
                        Stirbt dein Charakter, wird der Spielstand <span class="underline">automatisch gelöscht</span>.
                    </p>
                </div>

                <button id="btn-close-controls" class="mt-6 w-full border-2 border-green-500 text-green-500 py-3 font-bold hover:bg-green-900 transition-colors uppercase tracking-widest">
                    VERSTANDEN
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        
        document.getElementById('btn-close-controls').onclick = () => {
            overlay.remove();
        };
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
        const isIngame = (Game.state && this.els.gameScreen && !this.els.gameScreen.classList.contains('hidden'));
        const isCharSelect = this.charSelectMode;

        if (isIngame || isCharSelect) {
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
            
            btnBugReport: document.getElementById('btn-bug-report'),
            
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
        
        if (this.els.btnBugReport) {
            this.els.btnBugReport.addEventListener('click', () => {
                this.openBugModal();
            });
        }

        if(this.els.btnInv) {
             this.els.btnInv.addEventListener('click', () => this.resetInventoryAlert());
        }

        if(this.els.headerCharInfo) {
            this.els.headerCharInfo.addEventListener('click', () => {
                this.switchView('char'); 
            });
        }

        window.Game = Game;
        window.UI = this;

        if(this.initInput) this.initInput();
        
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    },

    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    },

    startGame: function(saveData, slotIndex, newName=null) {
        this.charSelectMode = false;
        this.els.charSelectScreen.style.display = 'none';
        this.els.gameScreen.classList.remove('hidden');
        this.els.gameScreen.classList.remove('opacity-0');
        
        const isNewGame = !saveData;

        Game.init(saveData, null, slotIndex, newName);
        
        if(this.isMobile() && isNewGame) {
            this.showMobileControlsHint();
        }
        
        if(typeof Network !== 'undefined') Network.startPresence();
    },

    logout: function(msg) {
        this.loginBusy = false;
        this.selectedSlot = -1; 
        this.charSelectMode = false; 
        
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
        // [TO-DO FIX] Sperre für Boot-Sequenz
        if(!this.isSystemReady) {
            this.els.loginStatus.textContent = "SYSTEM INITIALIZING... PLEASE WAIT";
            this.els.loginStatus.className = "mt-4 text-blue-400 animate-pulse";
            return;
        }

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
            if(msg && (msg.includes("INVALID_LOGIN_CREDENTIALS") || msg.includes("INVALID_EMAIL"))) msg = "E-Mail oder Passwort falsch!";
            else if (e.code === "auth/email-already-in-use") msg = "E-Mail wird bereits verwendet!";
            else if (e.code === "auth/invalid-email") msg = "Ungültige E-Mail-Adresse!";
            else if (e.code === "auth/wrong-password") msg = "Falsches Passwort!";
            else if (e.code === "auth/user-not-found") msg = "Benutzer nicht gefunden!";

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
        if (this.els.btnCharDeleteAction) {
            if (save) {
                this.els.btnCharDeleteAction.disabled = false;
                this.els.btnCharDeleteAction.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                this.els.btnCharDeleteAction.disabled = true;
                this.els.btnCharDeleteAction.classList.add('opacity-50', 'cursor-not-allowed');
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

window.UI = UI;
console.log("UI Core Loaded.");
