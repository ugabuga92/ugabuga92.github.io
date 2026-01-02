// [v2.9.10] - 2026-01-02 23:50pm (Input Safe Check)
// Extending UI object with Input methods
Object.assign(UI, {
    
    touchState: {
        active: false, id: null, startX: 0, startY: 0, currentX: 0, currentY: 0, moveDir: { x: 0, y: 0 }, timer: null
    },

    initInput: function() {
        // --- EVENT LISTENERS ---
        if(this.els.btnLogin) this.els.btnLogin.onclick = () => this.attemptLogin();
        
        if(this.els.btnToggleRegister) {
            this.els.btnToggleRegister.onclick = () => {
                this.isRegistering = !this.isRegistering;
                if(this.isRegistering) {
                    this.els.loginTitle.textContent = "NEUEN ACCOUNT ERSTELLEN";
                    this.els.inputName.style.display = 'block';
                    this.els.btnLogin.textContent = "REGISTRIEREN";
                    this.els.btnToggleRegister.textContent = "Zurück zum Login";
                } else {
                    this.els.loginTitle.textContent = "AUTHENTICATION REQUIRED";
                    this.els.inputName.style.display = 'none';
                    this.els.btnLogin.textContent = "LOGIN";
                    this.els.btnToggleRegister.textContent = "Noch kein Account? Hier registrieren";
                }
            };
        }

        [this.els.loginEmail, this.els.loginPass, this.els.loginName].forEach(el => {
            if(el) {
                el.addEventListener("keydown", (e) => {
                    if(e.key === "Enter") this.attemptLogin();
                });
            }
        });

        // CHAR SELECT INPUTS
        if(this.els.btnCreateChar) this.els.btnCreateChar.onclick = () => this.attemptCreateChar();
        if(this.els.btnCharBack) this.els.btnCharBack.onclick = () => {
            this.els.charSelectScreen.style.display = 'none';
            this.els.loginScreen.style.display = 'flex';
            if(Network) Network.disconnect();
        };

        if(this.els.charSlotsList) {
            this.els.charSlotsList.onclick = (e) => {
                const slot = e.target.closest('.char-slot');
                if(slot) this.selectSlot(parseInt(slot.dataset.index));
            };
        }

        // DELETE INPUTS
        if(this.els.btnDeleteCancel) this.els.btnDeleteCancel.onclick = () => {
            this.deleteMode = false;
            this.els.deleteOverlay.style.display = 'none';
        };
        
        if(this.els.deleteInput) {
            this.els.deleteInput.addEventListener('input', (e) => {
                const target = this.els.deleteTargetName.textContent;
                if(e.target.value === target) {
                    this.els.btnDeleteConfirm.disabled = false;
                    this.els.btnDeleteConfirm.classList.remove('border-red-500', 'text-red-500');
                    this.els.btnDeleteConfirm.classList.add('border-green-500', 'text-green-500', 'animate-pulse');
                } else {
                    this.els.btnDeleteConfirm.disabled = true;
                    this.els.btnDeleteConfirm.classList.add('border-red-500', 'text-red-500');
                    this.els.btnDeleteConfirm.classList.remove('border-green-500', 'text-green-500', 'animate-pulse');
                }
            });
        }
        
        if(this.els.btnDeleteConfirm) {
            this.els.btnDeleteConfirm.onclick = () => {
                if(this.selectedSlot !== -1 && typeof Network !== 'undefined') {
                    Network.deleteSlot(this.selectedSlot);
                    this.els.deleteOverlay.style.display = 'none';
                    // Refresh logic happens via Network callback usually, but we force refresh here
                    setTimeout(() => { if(Network.myId) Network.loadUserSaves(Network.myId); }, 500);
                }
            };
        }

        // SPAWN INPUTS
        if(this.els.btnSpawnRandom) {
            this.els.btnSpawnRandom.onclick = () => {
                Game.state.player.x = 20;
                Game.state.player.y = 20;
                // Random Sector logic if needed
                this.els.spawnScreen.style.display = 'none';
                Game.saveGame();
            };
        }

        // GAME INPUTS
        if(this.els.btnSave) this.els.btnSave.onclick = () => { Game.saveGame(true); UI.log("Spiel gespeichert.", "text-green-400"); };
        if(this.els.btnLogout) this.els.btnLogout.onclick = () => { location.reload(); }; // Simple logout

        // KEYBOARD
        document.addEventListener('keydown', (e) => {
            if (this.deleteMode || this.isRegistering || this.charSelectMode || !Game.state) return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
                this.inputMethod = 'key';
            }
            this.handleKey(e);
        });

        // MOUSE / TOUCH JOYSTICK
        const view = this.els.view;
        if(view) {
            view.addEventListener('mousedown', (e) => this.startJoystick(e.clientX, e.clientY));
            view.addEventListener('touchstart', (e) => {
                // e.preventDefault(); // removed to allow scrolling in some views
                this.startJoystick(e.touches[0].clientX, e.touches[0].clientY);
            }, {passive: false});
            
            window.addEventListener('mousemove', (e) => this.moveJoystick(e.clientX, e.clientY));
            window.addEventListener('touchmove', (e) => {
                if(this.touchState.active) e.preventDefault();
                this.moveJoystick(e.touches[0].clientX, e.touches[0].clientY);
            }, {passive: false});
            
            window.addEventListener('mouseup', () => this.stopJoystick());
            window.addEventListener('touchend', () => this.stopJoystick());
        }

        // [FIX] Prevent Scroll Chaining on Log
        if(this.els.log) {
            // Safety check: ensure parentElement exists
            if(this.els.log.parentElement) {
                this.els.log.parentElement.addEventListener('touchmove', (e) => { e.stopPropagation(); }, {passive: true});
            }
        }
    },

    attemptLogin: function() {
        const email = this.els.loginEmail.value;
        const pass = this.els.loginPass.value;
        const name = this.els.loginName.value;
        
        if(!email || !pass) {
            this.els.loginStatus.textContent = "Bitte E-Mail und Passwort eingeben.";
            return;
        }
        
        this.els.loginStatus.textContent = "Verbinde mit Vault-Tec Netzwerk...";
        this.loginBusy = true;

        if(this.isRegistering) {
            if(!name) { this.els.loginStatus.textContent = "Name erforderlich."; return; }
            firebase.auth().createUserWithEmailAndPassword(email, pass)
                .then((res) => {
                    // Save Display Name
                    res.user.updateProfile({ displayName: name }).then(() => {
                        this.els.loginStatus.textContent = "Registrierung erfolgreich. Login...";
                        // Auto triggers onAuthStateChanged
                    });
                })
                .catch((error) => {
                    this.els.loginStatus.textContent = "Fehler: " + error.message;
                    this.loginBusy = false;
                });
        } else {
            firebase.auth().signInWithEmailAndPassword(email, pass)
                .catch((error) => {
                    this.els.loginStatus.textContent = "Login Fehler: " + error.message;
                    this.loginBusy = false;
                });
        }
    },

    attemptCreateChar: function() {
        const name = this.els.inputNewCharName.value.toUpperCase();
        if(name.length < 3) { alert("Name zu kurz!"); return; }
        
        // Close overlay
        this.els.newCharOverlay.classList.add('hidden');
        
        // Start Game with new Name
        Game.init(null, null, this.selectedSlot, name);
        
        this.els.charSelectScreen.style.display = 'none';
        this.els.gameScreen.classList.remove('hidden');
        requestAnimationFrame(() => { this.els.gameScreen.style.opacity = 1; });
    },

    // --- GAMEPLAY INPUT ---
    handleKey: function(e) {
        if(Game.state.isGameOver) return;
        
        // Global Shortcuts
        if(e.key === 'm') UI.toggleView('worldmap');
        if(e.key === 'i') UI.toggleView('inventory');
        if(e.key === 'c') UI.toggleView('char');
        if(e.key === 'j') UI.toggleView('quests');
        if(e.key === 'Escape') UI.switchView('map');

        // View Specific
        if(Game.state.view === 'map') {
            if(e.key === 'ArrowUp' || e.key === 'w') Game.move(0, -1);
            if(e.key === 'ArrowDown' || e.key === 's') Game.move(0, 1);
            if(e.key === 'ArrowLeft' || e.key === 'a') Game.move(-1, 0);
            if(e.key === 'ArrowRight' || e.key === 'd') Game.move(1, 0);
            if(e.key === ' ') {
                const px = Game.state.player.x;
                const py = Game.state.player.y;
                const t = Game.state.currentMap[py][px];
                if(t === 'C') UI.switchView('city');
                if(t === 'V') UI.enterVault();
            }
        }
        else if(Game.state.view === 'hacking') {
            // Optional Keyboard support for hacking
        }
        else if(Game.state.view === 'lockpicking') {
            if(e.key === 'ArrowLeft') MiniGames.lockpicking.rotate(-5);
            if(e.key === 'ArrowRight') MiniGames.lockpicking.rotate(5);
            if(e.key === ' ') MiniGames.lockpicking.tryUnlock();
        }
    },

    startJoystick: function(x, y) {
        if(Game.state.view !== 'map' && Game.state.view !== 'lockpicking') return;
        
        this.touchState.active = true;
        this.touchState.startX = x;
        this.touchState.startY = y;
        
        if(this.els.joyBase) {
            this.els.joyBase.style.display = 'block';
            this.els.joyBase.style.left = (x - 50) + 'px';
            this.els.joyBase.style.top = (y - 50) + 'px';
            
            this.els.joyStick.style.display = 'block';
            this.els.joyStick.style.left = (x - 25) + 'px';
            this.els.joyStick.style.top = (y - 25) + 'px';
        }

        if(Game.state.view === 'map') {
            this.touchState.timer = setInterval(() => {
                if(this.touchState.moveDir.x !== 0 || this.touchState.moveDir.y !== 0) {
                    Game.move(this.touchState.moveDir.x, this.touchState.moveDir.y);
                }
            }, 200); // Repeat movement
        }
    },

    moveJoystick: function(x, y) {
        if(!this.touchState.active) return;
        
        const dx = x - this.touchState.startX;
        const dy = y - this.touchState.startY;
        
        // Limit stick visual
        const dist = Math.min(40, Math.sqrt(dx*dx + dy*dy));
        const angle = Math.atan2(dy, dx);
        
        const stickX = this.touchState.startX + Math.cos(angle) * dist;
        const stickY = this.touchState.startY + Math.sin(angle) * dist;
        
        if(this.els.joyStick) {
            this.els.joyStick.style.left = (stickX - 25) + 'px';
            this.els.joyStick.style.top = (stickY - 25) + 'px';
        }

        // Logic
        if(Game.state.view === 'map') {
            if(Math.abs(dx) > 20) this.touchState.moveDir.x = dx > 0 ? 1 : -1;
            else this.touchState.moveDir.x = 0;
            
            if(Math.abs(dy) > 20) this.touchState.moveDir.y = dy > 0 ? 1 : -1;
            else this.touchState.moveDir.y = 0;
        }
        else if(Game.state.view === 'lockpicking') {
            // Horizontal drag rotates lockpick
            const sensitivity = 0.5;
            MiniGames.lockpicking.rotate(dx * sensitivity);
            this.touchState.startX = x; // Reset start to prevent continuous spin
        }
    },

    stopJoystick: function() {
        this.touchState.active = false;
        this.touchState.moveDir = {x:0, y:0};
        if(this.touchState.timer) clearInterval(this.touchState.timer);
        
        if(this.els.joyBase) this.els.joyBase.style.display = 'none';
        if(this.els.joyStick) this.els.joyStick.style.display = 'none';
        
        if(Game.state && Game.state.view === 'lockpicking') {
            MiniGames.lockpicking.tryUnlock(); // Release to try
        }
    },
    
    // Focus Navigation (D-Pad / Keyboard support for menus)
    refreshFocusables: function() {
        if(!this.els.view) return;
        this.focusableEls = Array.from(this.els.view.querySelectorAll('button, input, [tabindex="0"]'))
            .filter(el => !el.disabled && el.offsetParent !== null); // Visible only
        this.focusIndex = -1;
    }
});
