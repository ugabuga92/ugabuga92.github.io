// [TIMESTAMP] 2026-01-11 14:30:00 - ui_core.js - FORCED REPAINT & SIMPLIFIED CHECKS

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
    
    // Utils
    log: function(msg, color="text-green-500") {
        if(!this.els.log) return;
        const line = document.createElement('div');
        line.className = color;
        line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
    },

    error: function(msg) {
        console.error(`> ERROR: ${msg}`);
        if(this.els.log) {
            const line = document.createElement('div');
            line.className = "text-red-500 font-bold blink-red";
            line.textContent = `> ERROR: ${msg}`;
            this.els.log.prepend(line);
        }
        this.openBugModal(msg);
    },

    // --- BUTTON EVENT LISTENERS (INIT) ---
    init: function() {
        // Element Referenzen holen
        this.els = {
            touchArea: document.getElementById('main-content'),
            view: document.getElementById('view-container'),
            log: document.getElementById('log-area'),
            
            // Login & Char Select
            loginScreen: document.getElementById('login-screen'),
            loginStatus: document.getElementById('login-status'),
            inputEmail: document.getElementById('login-email'),
            inputPass: document.getElementById('login-pass'),
            inputName: document.getElementById('login-name'),
            btnLogin: document.getElementById('btn-login'),
            btnToggleRegister: document.getElementById('btn-toggle-register'),
            
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

            // Game Screens
            gameScreen: document.getElementById('game-screen'),
            navMenu: document.getElementById('main-nav'),
            headerCharInfo: document.getElementById('header-char-info'),
            timer: document.getElementById('game-timer'),
            
            // Buttons im Spiel
            btnInv: document.getElementById('btn-inv'),
            btnChar: document.getElementById('btn-char'),
            btnMap: document.getElementById('btn-map'),
            btnMenu: document.getElementById('btn-menu-toggle'),
            btnLogout: document.getElementById('btn-logout'),
            btnBugReport: document.getElementById('btn-bug-report'),
            
            // Overlays
            spawnScreen: document.getElementById('spawn-screen'),
            gameOver: document.getElementById('game-over-screen')
        };

        // --- EVENTS BINDEN ---

        // 1. CHARAKTER ERSTELLEN (DUPLICATE CHECK FIX)
        if(this.els.btnCreateCharConfirm) {
            this.els.btnCreateCharConfirm.onclick = () => {
                const rawName = this.els.inputNewCharName.value;
                const name = rawName ? rawName.trim() : "";
                
                if(name.length < 3) {
                    alert("Der Name ist zu kurz (min. 3 Zeichen).");
                    return;
                }

                // Manueller Loop durch die Slots 0-4
                const nameUpper = name.toUpperCase();
                let foundDuplicate = false;
                
                console.log("[UI] Prüfe Namen '" + name + "' gegen vorhandene Saves...");
                
                for(let i = 0; i < 5; i++) {
                    const save = this.currentSaves[i];
                    if(save && save.playerName) {
                        console.log(`Slot ${i}: ${save.playerName}`);
                        if(save.playerName.toUpperCase() === nameUpper) {
                            foundDuplicate = true;
                            break;
                        }
                    }
                }

                if(foundDuplicate) {
                    alert(`Der Name "${name}" ist bereits vergeben! Bitte wähle einen anderen.`);
                    this.els.inputNewCharName.focus();
                    return;
                }

                if(this.selectedSlot === -1) return;
                
                this.els.newCharOverlay.classList.add('hidden');
                this.startGame(null, this.selectedSlot, name);
            };
        }

        // 2. LÖSCHEN BESTÄTIGEN (VISUAL FIX)
        if(this.els.btnDeleteConfirm) {
            this.els.btnDeleteConfirm.onclick = async () => {
                if(this.selectedSlot === -1) return;

                const btn = this.els.btnDeleteConfirm;
                const originalText = btn.textContent;

                // UI Update erzwingen
                btn.textContent = "WIRD GELÖSCHT...";
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "wait";
                
                // WICHTIG: Kurze Pause, damit der Browser den Text rendern kann
                await new Promise(resolve => setTimeout(resolve, 100));

                try {
                    // Tatsächliches Löschen + Mindestwartezeit für Effekt
                    const deletePromise = (typeof Network !== 'undefined') ? Network.deleteSave(this.selectedSlot) : Promise.resolve();
                    const delayPromise = new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s warten für User Feedback
                    
                    await Promise.all([deletePromise, delayPromise]);

                    // Erfolg
                    this.currentSaves[this.selectedSlot] = null;
                    this.els.deleteOverlay.style.display = 'none';
                    this.renderCharacterSelection(this.currentSaves);

                } catch(e) {
                    console.error("Löschen fehlgeschlagen:", e);
                    alert("Fehler beim Löschen: " + e.message);
                } finally {
                    // Button Reset
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.cursor = "pointer";
                }
            };
        }

        // 3. INPUT EVENT FÜR LÖSCHEN (Sicherheit)
        if(this.els.deleteInput) {
            this.els.deleteInput.oninput = (e) => {
                const target = this.els.deleteTargetName.textContent;
                // Exakter Match erforderlich
                if(e.target.value === target) {
                    this.els.btnDeleteConfirm.disabled = false;
                    this.els.btnDeleteConfirm.classList.remove('border-red-500', 'text-red-500');
                    this.els.btnDeleteConfirm.classList.add('border-green-500', 'text-green-500', 'animate-pulse');
                } else {
                    this.els.btnDeleteConfirm.disabled = true;
                    this.els.btnDeleteConfirm.classList.add('border-red-500', 'text-red-500');
                    this.els.btnDeleteConfirm.classList.remove('border-green-500', 'text-green-500', 'animate-pulse');
                }
            };
        }

        // 4. SONSTIGE BUTTONS
        if(this.els.btnCharDeleteAction) this.els.btnCharDeleteAction.onclick = () => this.triggerDeleteSlot();
        if(this.els.btnCharBack) this.els.btnCharBack.onclick = () => this.logout("ZURÜCK ZUM LOGIN");
        if(this.els.btnDeleteCancel) this.els.btnDeleteCancel.onclick = () => this.closeDeleteOverlay();
        if(this.els.btnLogout) this.els.btnLogout.onclick = () => this.logout();
        
        if(this.els.btnInv) this.els.btnInv.addEventListener('click', () => this.resetInventoryAlert());
        if(this.els.headerCharInfo) this.els.headerCharInfo.addEventListener('click', () => this.switchView('char'));
        if(this.els.btnBugReport) this.els.btnBugReport.addEventListener('click', () => this.openBugModal());

        window.Game = Game;
        window.UI = this;

        if(this.initInput) this.initInput();
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);

        console.log("UI Init complete.");
    },

    // --- STANDARD FUNKTIONEN (Unverändert wichtig) ---
    
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

    logout: async function(msg) {
        this.loginBusy = false;
        this.selectedSlot = -1; 
        this.charSelectMode = false; 
        
        // Save Game Logic with Wait
        if(Game.state) {
            console.log("Logout initiated, saving...");
            if(this.els.loginStatus) this.els.loginStatus.textContent = "SPEICHERE...";
            try {
                if(Game.saveGame) await Game.saveGame(true);
            } catch(e) { console.error("Save failed:", e); }
            
            await new Promise(r => setTimeout(r, 500)); // Race Condition Protection
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
                if (email.length < 5 || pass.length < 6 || name.length < 3) throw new Error("Daten unvollständig");
                saves = await Network.register(email, pass, name);
            } else {
                if (email.length < 5 || pass.length < 1) throw new Error("Bitte E-Mail und Passwort eingeben");
                saves = await Network.login(email, pass);
            }
            
            this.selectedSlot = -1; 
            
            if(this.renderCharacterSelection) {
                this.renderCharacterSelection(saves || {});
            } else {
                this.els.loginStatus.textContent = "UI FEHLER: CharSelect fehlt!";
            }
            
        } catch(e) {
            let msg = e.message;
            if(msg.includes("auth")) msg = "Anmeldung fehlgeschlagen (Daten prüfen).";
            this.els.loginStatus.textContent = "FEHLER: " + msg;
            this.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red";
        } finally {
            this.loginBusy = false;
        }
    },

    renderCharacterSelection: function(saves) {
        this.currentSaves = saves || {};
        this.els.loginScreen.style.display = 'none';
        this.els.charSelectScreen.style.display = 'flex';
        this.charSelectMode = true;
        this.els.charSlotsList.innerHTML = '';

        for(let i=0; i<5; i++) {
            const save = this.currentSaves[i];
            const div = document.createElement('div');
            
            let html = `
                <div class="flex justify-between items-center p-3 border-2 transition-all cursor-pointer bg-black/80 hover:bg-green-900/30 ${save ? 'border-green-600' : 'border-gray-700 opacity-70'}">
                    <div class="flex items-center gap-3">
                        <div class="text-2xl">${save ? '👤' : '➕'}</div>
                        <div>
                            <div class="font-bold font-vt323 text-xl ${save ? 'text-green-400' : 'text-gray-500'}">
                                ${save ? save.playerName : 'LEERER SLOT ' + (i+1)}
                            </div>
                            <div class="text-xs font-mono text-gray-400">
                                ${save ? `Level ${save.lvl} • ${save.zone || 'Unbekannt'} • ${save.caps} KK` : 'Tippen zum Erstellen'}
                            </div>
                        </div>
                    </div>
                    ${save ? '<div class="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">BEREIT</div>' : ''}
                </div>
            `;
            div.innerHTML = html;
            div.onclick = () => this.selectSlot(i);
            this.els.charSlotsList.appendChild(div);
        }
        this.selectSlot(0); 
    },

    selectSlot: function(index) {
        // Fix: Doppelklick startet/erstellt IMMER
        if(this.selectedSlot === index) {
            this.triggerCharSlot(); 
            return;
        }

        this.selectedSlot = index;
        if(this.els.charSlotsList && this.els.charSlotsList.children) {
            const slots = this.els.charSlotsList.children;
            for(let i=0; i<slots.length; i++) {
                const child = slots[i].firstElementChild; 
                if(child) child.classList.remove('border-yellow-400', 'bg-yellow-900/20');
            }
            if(slots[index]) {
                const child = slots[index].firstElementChild;
                if(child) child.classList.add('border-yellow-400', 'bg-yellow-900/20');
            }
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
                    <div><strong class="text-green-100">TIPPEN:</strong> Interagieren / Angreifen</div>
                    <div><strong class="text-green-100">MENÜ:</strong> Oben Rechts (☰)</div>
                </div>
                <button id="btn-close-controls" class="mt-6 w-full border-2 border-green-500 text-green-500 py-3 font-bold hover:bg-green-900 transition-colors uppercase tracking-widest">VERSTANDEN</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('btn-close-controls').onclick = () => overlay.remove();
    },

    // --- HELPER ---
    showCombatEffect: function(mainText, subText, color="red", duration=1000) {
        const view = document.getElementById('view-container');
        if(!view) return;
        const el = document.createElement('div');
        el.className = "click-effect-overlay"; 
        el.style.animation = `clickEffectAnim ${duration/1000}s ease-out forwards`;
        el.innerHTML = `<div class="click-effect-text" style="color:${color}; text-shadow: 0 0 20px ${color}">${mainText}</div><div class="click-effect-sub" style="border-color:${color}">${subText}</div>`;
        view.appendChild(el);
        setTimeout(() => { if(el) el.remove(); }, duration);
    },

    triggerInventoryAlert: function() {
        if(this.els.btnInv) this.els.btnInv.classList.add('alert-glow-yellow');
        if(this.els.btnMenu) this.els.btnMenu.classList.add('alert-glow-yellow');
    },

    resetInventoryAlert: function() {
        if(this.els.btnInv) this.els.btnInv.classList.remove('alert-glow-yellow');
        if(this.els.btnMenu) this.els.btnMenu.classList.remove('alert-glow-yellow');
    },
    
    openBugModal: function(autoErrorMsg = null) {
        // (Bug Report Modal Code verkürzt da unverändert, aber funktional)
        if(document.getElementById('bug-report-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'bug-report-overlay';
        overlay.className = "fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4";
        overlay.innerHTML = `<div class="bg-black border border-red-500 p-4"><h2 class="text-red-500 font-bold">BUG REPORT</h2><textarea id="bug-desc" class="w-full bg-gray-900 text-white p-2 mt-2"></textarea><div class="flex gap-2 mt-2"><button id="btn-bug-send" class="text-red-500 border border-red-500 px-2">SENDEN</button><button id="btn-bug-close" class="text-gray-500 border border-gray-500 px-2">ABBRUCH</button></div></div>`;
        document.body.appendChild(overlay);
        document.getElementById('btn-bug-close').onclick = () => overlay.remove();
        document.getElementById('btn-bug-send').onclick = () => {
             this.saveBugReport(autoErrorMsg || "Manuell", document.getElementById('bug-desc').value);
             overlay.remove();
        };
    },
    
    saveBugReport: async function(errorMsg, userDesc) {
         if (typeof Network !== 'undefined' && Network.sendBugReport) {
            await Network.sendBugReport({error: errorMsg, desc: userDesc, date: new Date().toISOString()});
            this.log("Bug Report gesendet.", "text-green-500");
         }
    },

    updateTimer: function() {
        const isIngame = (Game.state && this.els.gameScreen && !this.els.gameScreen.classList.contains('hidden'));
        if (isIngame || this.charSelectMode) {
            if(Date.now() - this.lastInputTime > 300000) { this.logout("AFK: ZEITÜBERSCHREITUNG"); return; }
        }
        if(!Game.state || !Game.state.startTime) return;
        const diff = Math.floor((Date.now() - Game.state.startTime) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2,'0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0');
        const s = (diff % 60).toString().padStart(2,'0');
        if(this.els.timer) this.els.timer.textContent = `${h}:${m}:${s}`;
        if(this.update) this.update();
    }
};

window.UI = UI;
console.log("UI Core (Final Fix) Loaded.");
