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

        [this.els.inputEmail, this.els.inputPass, this.els.inputName].forEach(el => {
            if(el) {
                el.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        this.attemptLogin();
                    }
                });
            }
        });
        
        // FIX: Enter in New Char Screen
        if(this.els.inputNewCharName) {
            this.els.inputNewCharName.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    if(this.els.btnCreateCharConfirm) this.els.btnCreateCharConfirm.click();
                }
            });
        }

        if (this.els.btnCharSelectAction) this.els.btnCharSelectAction.onclick = () => this.triggerCharSlot();
        if (this.els.btnCharDeleteAction) this.els.btnCharDeleteAction.onclick = () => this.triggerDeleteSlot();
        // UPDATE: Back Button Handler
        if (this.els.btnCharBack) this.els.btnCharBack.onclick = () => this.logout("ZURÜCK ZUM LOGIN");

        if(this.els.btnCreateCharConfirm) {
            this.els.btnCreateCharConfirm.onclick = () => {
                const name = this.els.inputNewCharName.value.trim().toUpperCase();
                if(name.length < 3) { alert("Name zu kurz!"); return; }
                this.els.newCharOverlay.classList.add('hidden');
                this.startGame(null, this.selectedSlot, name);
            };
        }
        
        if(this.els.btnDeleteCancel) this.els.btnDeleteCancel.onclick = () => this.closeDeleteOverlay();
        
        if(this.els.deleteInput) {
            this.els.deleteInput.addEventListener('input', () => {
                const target = this.els.deleteTargetName.textContent;
                const input = this.els.deleteInput.value.toUpperCase();
                this.els.btnDeleteConfirm.disabled = (target !== input);
                if(target === input) {
                    this.els.btnDeleteConfirm.classList.remove('border-red-500', 'text-red-500');
                    this.els.btnDeleteConfirm.classList.add('border-green-500', 'text-green-500', 'animate-pulse');
                } else {
                    this.els.btnDeleteConfirm.classList.add('border-red-500', 'text-red-500');
                    this.els.btnDeleteConfirm.classList.remove('border-green-500', 'text-green-500', 'animate-pulse');
                }
            });
        }
        
        if(this.els.btnDeleteConfirm) {
            this.els.btnDeleteConfirm.onclick = async () => {
                if(this.selectedSlot === -1) return;
                await Network.deleteSlot(this.selectedSlot);
                this.closeDeleteOverlay();
                this.attemptLogin();
            };
        }

        if(this.els.btnSave) this.els.btnSave.onclick = () => this.handleSaveClick();
        if(this.els.btnMenuSave) this.els.btnMenuSave.onclick = () => this.handleSaveClick();
        if(this.els.btnLogout) this.els.btnLogout.onclick = () => this.logout('MANUELL AUSGELOGGT');
        if(this.els.btnReset) this.els.btnReset.onclick = () => this.handleReset();
        if(this.els.btnConfirmReset) this.els.btnConfirmReset.onclick = () => this.confirmReset();
        if(this.els.btnCancelReset) this.els.btnCancelReset.onclick = () => this.cancelReset();

        if(this.els.btnMenu) {
            this.els.btnMenu.onclick = (e) => {
                e.stopPropagation();
                this.toggleMenu();
            };
        }

        // [v0.6.4] SMART CHAR CLICK (Merged)
        const btnCharHeader = document.getElementById('header-char-info');
        if(btnCharHeader) {
            btnCharHeader.onclick = () => {
                if (Game.state.statPoints > 0) this.charTab = 'stats';
                else if (Game.state.perkPoints > 0) this.charTab = 'perks';
                else this.charTab = 'stats';
                this.switchView('char');
            };
        }
        
        document.addEventListener('click', (e) => {
            if(this.els.navMenu && !this.els.navMenu.classList.contains('hidden')) {
                if (!this.els.navMenu.contains(e.target) && e.target !== this.els.btnMenu) {
                    this.els.navMenu.classList.add('hidden');
                    this.els.navMenu.style.display = 'none';
                    this.refreshFocusables();
                }
            }
            if (Game.state && Game.state.view !== 'map' && Game.state.view !== 'combat' && Game.state.view !== 'city' && !Game.state.view.includes('shop') && !Game.state.view.includes('crafting') && !Game.state.view.includes('clinic') && !Game.state.view.includes('vault') && Game.state.view !== 'hacking' && Game.state.view !== 'lockpicking') {
                 const viewContainer = document.getElementById('view-container');
                 if (viewContainer && !viewContainer.contains(e.target)) {
                     this.switchView('map');
                 }
            }
        });
        
        if(this.els.log.parentElement) {
            this.els.log.parentElement.addEventListener('click', () => {
                if (Game.state && Game.state.view !== 'map' && Game.state.view !== 'combat' && !Game.state.view.includes('city') && Game.state.view !== 'hacking' && Game.state.view !== 'lockpicking') {
                     if (Game.state.view !== 'combat') {
                         this.switchView('map');
                     }
                }
            });
        }

        if(this.els.playerCount) this.els.playerCount.onclick = () => this.togglePlayerList();
        if(this.els.btnInv) this.els.btnInv.onclick = () => this.toggleView('inventory');
        if(this.els.btnWiki) this.els.btnWiki.onclick = () => this.toggleView('wiki');
        if(this.els.btnMap) this.els.btnMap.onclick = () => this.toggleView('worldmap');
        if(this.els.btnChar) this.els.btnChar.onclick = () => this.toggleView('char');
        if(this.els.btnQuests) this.els.btnQuests.onclick = () => this.toggleView('quests');
        if(this.els.btnSpawnRandom) this.els.btnSpawnRandom.onclick = () => this.selectSpawn(null);

        // Mobile D-Pad Toggle (falls du den noch willst, sonst ignorieren)
        const btnDpad = document.getElementById('btn-toggle-dpad');
        if(btnDpad) btnDpad.onclick = () => {
            const dpad = document.getElementById('dpad-overlay');
            if(dpad) dpad.classList.toggle('hidden');
        };

        if(this.els.touchArea) {
            this.els.touchArea.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
            this.els.touchArea.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
            this.els.touchArea.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            this.els.touchArea.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
        }

        // INPUT METHOD DETECTION
        ['mousemove', 'mousedown', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, (e) => {
                this.lastInputTime = Date.now();
                if (this.inputMethod !== 'touch') {
                    this.focusIndex = -1;
                    this.updateFocusVisuals();
                    this.inputMethod = 'touch';
                }
                
                // NEW: Mouse Lockpicking
                if(Game.state && Game.state.view === 'lockpicking' && evt === 'mousemove') {
                    // Normalize mouse X to -90 to 90 based on screen width center
                    const w = window.innerWidth;
                    const center = w / 2;
                    const mouseX = e.clientX;
                    const delta = mouseX - center;
                    // Scale it so half screen is 90 deg
                    let angle = (delta / (w/3)) * 90;
                    if(angle < -90) angle = -90; 
                    if(angle > 90) angle = 90;
                    
                    if(MiniGames && MiniGames.lockpicking) {
                        MiniGames.lockpicking.currentAngle = angle;
                        UI.renderLockpicking();
                    }
                }
            }, { passive: true });
        });

        window.addEventListener('keydown', (e) => {
            this.lastInputTime = Date.now();
            this.inputMethod = 'key';
            
            // FIX: Prevent browser scrolling with Arrow Keys and Space
            const preventKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space", "PageUp", "PageDown", "Home", "End"];
            const targetTag = e.target.tagName.toLowerCase();
            
            if (targetTag !== 'input' && targetTag !== 'textarea') {
                if(preventKeys.indexOf(e.key) > -1) {
                    e.preventDefault();
                }
            }

            this.handleKeyDown(e);
        }, { passive: false });
        
        window.addEventListener('keyup', (e) => {
             if (Game.state && Game.state.view === 'lockpicking') {
                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'Enter') {
                    MiniGames.lockpicking.releaseLock();
                }
            }
        });
    },

    handleKeyDown: function(e) {
        if (this.deleteMode) return;

        if (this.charSelectMode) {
            if (e.key === 'ArrowUp') this.navigateCharSlot(-1);
            if (e.key === 'ArrowDown') this.navigateCharSlot(1);
            if (e.key === 'Enter') this.triggerCharSlot();
            if (e.key === 'Delete' || e.key === 'Backspace') this.triggerDeleteSlot();
            return;
        }

        if (!Game.state || Game.state.isGameOver) {
            if(this.els.gameOver && !this.els.gameOver.classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')) location.reload();
            return;
        }
        
        // NEW: Lockpicking Controls
        if (Game.state.view === 'lockpicking') {
            if (e.key === 'ArrowLeft' || e.key === 'a') MiniGames.lockpicking.rotatePin(-5);
            if (e.key === 'ArrowRight' || e.key === 'd') MiniGames.lockpicking.rotatePin(5);
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'Enter') MiniGames.lockpicking.rotateLock();
            if (e.key === 'Escape') MiniGames.lockpicking.end();
            return;
        }
        
        // NEW: Hacking Controls (Esc to exit)
        if (Game.state.view === 'hacking') {
             if (e.key === 'Escape') MiniGames.hacking.end();
             return;
        }

        if(e.key === 'Escape') {
            if (Game.state.inDialog) { /* ... */ }
            else if(this.els.playerList && this.els.playerList.style.display === 'flex') this.togglePlayerList();
            else if(this.els.navMenu && !this.els.navMenu.classList.contains('hidden')) this.toggleMenu();
            else if(Game.state.view !== 'map') this.switchView('map');
            else this.toggleMenu();
            return;
        }

        if (Game.state.inDialog) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
                this.navigateFocus(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'ArrowDown' || e.key === 's' ? 1 : -1);
            } else if (e.key === 'Enter' || e.key === ' ') {
                this.triggerFocus();
            }
            return;
        }

        if (Game.state.view === 'combat') {
            if (typeof Combat !== 'undefined') {
                if (e.key === 'ArrowUp' || e.key === 'w') Combat.moveSelection(-1);
                if (e.key === 'ArrowDown' || e.key === 's') Combat.moveSelection(1);
                if (e.key === ' ' || e.key === 'Enter') Combat.confirmSelection();
            }
            return;
        }

        const isMenuOpen = this.els.navMenu && !this.els.navMenu.classList.contains('hidden');
        if (Game.state.view !== 'map' || isMenuOpen) {
            let isGrid = (Game.state.view === 'inventory') && !isMenuOpen;
            if (['ArrowUp', 'w'].includes(e.key)) this.navigateFocus(isGrid ? -4 : -1);
            if (['ArrowDown', 's'].includes(e.key)) this.navigateFocus(isGrid ? 4 : 1);
            if (['ArrowLeft', 'a'].includes(e.key)) this.navigateFocus(-1);
            if (['ArrowRight', 'd'].includes(e.key)) this.navigateFocus(1);
            if (e.key === 'Enter' || e.key === ' ') this.triggerFocus();
            return;
        }

        if (Game.state.view === 'map') {
            if(e.key === 'w' || e.key === 'ArrowUp') Game.move(0, -1);
            if(e.key === 's' || e.key === 'ArrowDown') Game.move(0, 1);
            if(e.key === 'a' || e.key === 'ArrowLeft') Game.move(-1, 0);
            if(e.key === 'd' || e.key === 'ArrowRight') Game.move(1, 0);
            
            // Shortcuts
            const k = e.key.toLowerCase();
            if(k === 'i') this.switchView('inventory');
            else if(k === 'c') this.switchView('char');
            else if(k === 'm') this.switchView('map');
            else if(k === 'j') this.switchView('journal');
        }
    },
    
    // --- TOUCH JOYSTICK ---
    handleTouchStart: function(e) {
        if(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.no-joystick')) return;
        if(!Game.state || Game.state.view !== 'map' || Game.state.inDialog || this.touchState.active) return;
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

    // --- FOCUS MANAGER ---
    toggleMenu: function() {
        if(!this.els.navMenu) return;
        const isHidden = this.els.navMenu.classList.contains('hidden');
        if(isHidden) {
            this.els.navMenu.classList.remove('hidden');
            this.els.navMenu.style.display = 'flex';
        } else {
            this.els.navMenu.classList.add('hidden');
            this.els.navMenu.style.display = 'none';
        }
        this.focusIndex = -1;
        this.refreshFocusables();
    },

    refreshFocusables: function() {
        let container = this.els.view;
        if (Game.state && Game.state.inDialog && this.els.dialog && this.els.dialog.style.display !== 'none') {
            container = this.els.dialog;
        } else if (this.els.navMenu && !this.els.navMenu.classList.contains('hidden')) {
            container = this.els.navMenu;
        } else if (this.els.playerList && this.els.playerList.style.display === 'flex') {
            container = this.els.playerList;
        }

        const buttons = Array.from(container.querySelectorAll('button:not([disabled])'));
        this.focusableEls = buttons.filter(b => b.offsetParent !== null && b.style.display !== 'none');
        
        // FIX: No focus on mobile unless keys were used
        if(this.inputMethod === 'touch') {
            this.focusIndex = -1;
        } else {
            if (this.focusIndex >= this.focusableEls.length) this.focusIndex = 0;
            if (this.focusIndex < 0 && this.focusableEls.length > 0) this.focusIndex = 0;
        }
        
        this.updateFocusVisuals();
    },

    navigateFocus: function(delta) {
        if (this.focusableEls.length === 0) this.refreshFocusables();
        if (this.focusableEls.length === 0) return;

        if (this.focusIndex === -1) {
            this.focusIndex = delta > 0 ? 0 : this.focusableEls.length - 1;
        } else {
            this.focusIndex += delta;
        }
        
        if (this.focusIndex < 0) this.focusIndex = this.focusableEls.length - 1;
        if (this.focusIndex >= this.focusableEls.length) this.focusIndex = 0;

        this.updateFocusVisuals();
    },

    updateFocusVisuals: function() {
        document.querySelectorAll('.key-focus').forEach(el => el.classList.remove('key-focus'));
        // FIX: Only show focus ring if input method is key
        if (this.inputMethod === 'key' && this.focusIndex !== -1 && this.focusableEls[this.focusIndex]) {
            const el = this.focusableEls[this.focusIndex];
            el.classList.add('key-focus');
            // FIX: Use 'nearest' to prevent screen wandering/jumping
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    },

    triggerFocus: function() {
        if (this.focusableEls[this.focusIndex]) {
            this.focusableEls[this.focusIndex].click();
        }
    }
});
