// [2026-01-17 22:30:00] ui_input.js - Fix: Removed Crash on Register Toggle

Object.assign(UI, {
    
    touchState: {
        active: false, id: null, startX: 0, startY: 0, currentX: 0, currentY: 0, moveDir: { x: 0, y: 0 }, timer: null
    },

    initInput: function() {
        // --- AUTHENTIFIZIERUNG ---
        if(this.els.btnLogin) this.els.btnLogin.onclick = () => this.attemptLogin();
        
        if(this.els.btnToggleRegister) {
            this.els.btnToggleRegister.onclick = () => {
                this.isRegistering = !this.isRegistering;
                const isReg = this.isRegistering;
                this.els.loginTitle.textContent = isReg ? "NEUEN ACCOUNT ERSTELLEN" : "AUTHENTICATION REQUIRED";
                
                // [CRITICAL FIX]
                // Die folgende Zeile wurde entfernt, weil inputName in index.html nicht mehr existiert!
                // this.els.inputName.style.display = isReg ? 'block' : 'none'; <--- DELETE THIS
                
                this.els.btnLogin.textContent = isReg ? "REGISTRIEREN" : "LOGIN";
                this.els.btnToggleRegister.textContent = isReg ? "Zurück zum Login" : "Noch kein Account? Hier registrieren";
            };
        }

        // Enter-Taste für Login
        [this.els.inputEmail, this.els.inputPass].forEach(el => {
            if(el) {
                el.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.stopPropagation(); 
                        e.preventDefault();
                        this.attemptLogin();
                    }
                });
            }
        });
        
        // --- CHARAKTER ERSTELLUNG ---
        if(this.els.inputNewCharName) {
            this.els.inputNewCharName.addEventListener("keydown", (e) => {
                e.stopPropagation(); 
                if (e.key === "Enter") {
                    e.preventDefault();
                    if(this.els.btnCreateCharConfirm) {
                        this.els.btnCreateCharConfirm.click();
                    }
                }
            });
        }

        if(this.els.btnCreateCharConfirm) {
            this.els.btnCreateCharConfirm.onclick = async () => {
                const name = this.els.inputNewCharName.value.trim().toUpperCase();
                if(name.length < 3) { alert("Name zu kurz!"); return; }

                const btn = this.els.btnCreateCharConfirm;
                btn.textContent = "PRÜFE...";
                btn.disabled = true;

                try {
                    let isFree = true;
                    if(typeof Network !== 'undefined' && Network.checkNameAvailability) {
                        isFree = await Network.checkNameAvailability(name);
                    }
                    
                    if(!isFree) {
                        alert("Name bereits vergeben!");
                        btn.textContent = "ERSTELLEN";
                        btn.disabled = false;
                        return;
                    }

                    this.els.newCharOverlay.classList.add('hidden');
                    this.startGame(null, this.selectedSlot, name);
                    btn.textContent = "ERSTELLEN";
                    btn.disabled = false;

                } catch(e) {
                    console.error(e);
                    btn.textContent = "ERSTELLEN";
                    btn.disabled = false;
                }
            };
        }

        // --- CHARAKTER MANAGEMENT ---
        if (this.els.btnCharDeleteAction) this.els.btnCharDeleteAction.onclick = () => this.triggerDeleteSlot();
        if (this.els.btnCharBack) this.els.btnCharBack.onclick = () => this.logout("ZURÜCK ZUM LOGIN");
        if(this.els.btnDeleteCancel) this.els.btnDeleteCancel.onclick = () => this.closeDeleteOverlay();
        
        if(this.els.deleteInput) {
            this.els.deleteInput.addEventListener('input', () => {
                const target = this.els.deleteTargetName.textContent;
                const input = this.els.deleteInput.value.toUpperCase();
                this.els.btnDeleteConfirm.disabled = (target !== input);
                if(target === input) this.els.btnDeleteConfirm.classList.add('animate-pulse');
                else this.els.btnDeleteConfirm.classList.remove('animate-pulse');
            });
        }
        
        if(this.els.btnDeleteConfirm) {
            this.els.btnDeleteConfirm.onclick = async () => {
                if(this.selectedSlot === -1) return;
                await Network.deleteSlot(this.selectedSlot);
                this.closeDeleteOverlay();
                this.attemptLogin(); // Refresh
            };
        }

        // --- NAV & BUTTONS ---
        if(this.els.btnSave) this.els.btnSave.onclick = () => this.handleSaveClick();
        if(this.els.btnMenuSave) this.els.btnMenuSave.onclick = () => this.handleSaveClick();
        if(this.els.btnLogout) this.els.btnLogout.onclick = () => this.logout('MANUELL AUSGELOGGT');
        
        if(this.els.btnMenu) {
            this.els.btnMenu.onclick = (e) => {
                e.stopPropagation();
                this.toggleMenu();
            };
        }

        const btnCharHeader = document.getElementById('header-char-info');
        if(btnCharHeader) {
            btnCharHeader.onclick = () => {
                this.charTab = 'status'; 
                this.switchView('char');
            };
        }

        const navMap = {
            'btn-inv': 'inventory', 'btn-char': 'char', 'btn-map': 'map',
            'btn-quests': 'journal', 'btn-wiki': 'wiki'
        };

        for (const [id, view] of Object.entries(navMap)) {
            const el = document.getElementById(id);
            if(el) el.onclick = () => { 
                if(view === 'char') this.charTab = 'status'; 
                // [FIX] Reset Alert bei Quests
                if(view === 'journal' && typeof UI.resetQuestAlert === 'function') UI.resetQuestAlert();
                
                this.switchView(view); 
                this.toggleNav(false); 
            };
        }

        document.addEventListener('click', (e) => {
            if(this.els.navMenu && !this.els.navMenu.classList.contains('hidden')) {
                if (!this.els.navMenu.contains(e.target) && e.target !== this.els.btnMenu) {
                    this.toggleMenu();
                }
            }
        });

        // --- KEYBOARD ---
        window.addEventListener('keydown', (e) => {
            if (this.deleteMode) return;
            if (this.charSelectMode) {
                if (e.key === 'ArrowUp') this.navigateCharSlot(-1);
                else if (e.key === 'ArrowDown') this.navigateCharSlot(1);
                else if (e.key === 'Enter') this.triggerCharSlot();
                return;
            }
            if (!Game.state || Game.state.isGameOver) return;
            
            if(e.key === 'Escape') {
                if(this.els.navMenu && !this.els.navMenu.classList.contains('hidden')) this.toggleMenu();
                else if(Game.state.view !== 'map') this.switchView('map');
                else this.toggleMenu();
            }
            
            if (Game.state.view === 'map') {
                if(['w', 'ArrowUp'].includes(e.key)) Game.move(0, -1);
                else if(['s', 'ArrowDown'].includes(e.key)) Game.move(0, 1);
                else if(['a', 'ArrowLeft'].includes(e.key)) Game.move(-1, 0);
                else if(['d', 'ArrowRight'].includes(e.key)) Game.move(1, 0);
            }
        });
        
        // --- TOUCH ---
        if(this.els.touchArea) {
            this.els.touchArea.addEventListener('touchstart', (e) => this.handleTouchStart(e), {passive: false});
            this.els.touchArea.addEventListener('touchmove', (e) => this.handleTouchMove(e), {passive: false});
            this.els.touchArea.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        }
    },

    // --- HELPER ---
    toggleMenu: function() {
        if(!this.els.navMenu) return;
        this.els.navMenu.classList.toggle('hidden');
        if(!this.els.navMenu.classList.contains('hidden')) {
            this.els.navMenu.style.display = 'flex';
        } else {
            this.els.navMenu.style.display = 'none';
        }
    },
    
    toggleNav: function(show) {
        if(show) { this.els.navMenu.classList.remove('hidden'); this.els.navMenu.style.display = 'flex'; }
        else { this.els.navMenu.classList.add('hidden'); this.els.navMenu.style.display = 'none'; }
    },

    handleTouchStart: function(e) {
        if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        if(!Game.state || Game.state.view !== 'map') return;
        const touch = e.changedTouches[0];
        Object.assign(this.touchState, {
            active: true, id: touch.identifier, startX: touch.clientX, startY: touch.clientY,
            currentX: touch.clientX, currentY: touch.clientY, moveDir: {x:0, y:0}
        });
        this.showJoystick(touch.clientX, touch.clientY);
        if(this.touchState.timer) clearInterval(this.touchState.timer);
        this.touchState.timer = setInterval(() => {
            const d = this.touchState.moveDir;
            if(d.x !== 0 || d.y !== 0) Game.move(d.x, d.y);
        }, 150);
    },

    handleTouchMove: function(e) {
        if(!this.touchState.active) return;
        let touch = null;
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === this.touchState.id) { touch = e.changedTouches[i]; break; }
        }
        if(!touch) return;
        e.preventDefault();
        this.touchState.currentX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        
        const dx = this.touchState.currentX - this.touchState.startX;
        const dy = this.touchState.currentY - this.touchState.startY;
        
        // Joystick Visual Update
        if(this.els.joyStick) {
            const dist = Math.sqrt(dx*dx + dy*dy);
            const maxDist = 40;
            let visualX = dx, visualY = dy;
            if(dist > maxDist) {
                const ratio = maxDist / dist;
                visualX = dx * ratio; visualY = dy * ratio;
            }
            this.els.joyStick.style.transform = `translate(${visualX}px, ${visualY}px)`;
        }

        // Logic Direction
        const threshold = 20;
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
            this.touchState.moveDir = {x:0, y:0};
        } else if (Math.abs(dx) > Math.abs(dy)) {
            this.touchState.moveDir = { x: dx > 0 ? 1 : -1, y: 0 };
        } else {
            this.touchState.moveDir = { x: 0, y: dy > 0 ? 1 : -1 };
        }
    },

    handleTouchEnd: function(e) {
        if(!this.touchState.active) return;
        let found = false;
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === this.touchState.id) { found = true; break; }
        }
        if(!found) return;
        
        if(this.touchState.timer) { clearInterval(this.touchState.timer); this.touchState.timer = null; }
        this.touchState.active = false;
        this.touchState.id = null;
        this.touchState.moveDir = {x:0, y:0};
        this.hideJoystick();
    },

    showJoystick: function(x, y) {
        if(!this.els.joyBase) {
            // Lazy Create
            this.els.joyBase = document.createElement('div');
            this.els.joyBase.className = "absolute w-24 h-24 rounded-full border-2 border-green-500/50 bg-black/20 pointer-events-none z-50 hidden";
            this.els.joyStick = document.createElement('div');
            this.els.joyStick.className = "absolute w-12 h-12 rounded-full bg-green-500/50 shadow-[0_0_10px_#39ff14] pointer-events-none z-50 hidden";
            document.body.appendChild(this.els.joyBase);
            document.body.appendChild(this.els.joyStick);
        }
        this.els.joyBase.style.left = (x - 48) + 'px';
        this.els.joyBase.style.top = (y - 48) + 'px';
        this.els.joyBase.style.display = 'block';
        
        this.els.joyStick.style.left = (x - 24) + 'px';
        this.els.joyStick.style.top = (y - 24) + 'px';
        this.els.joyStick.style.display = 'block';
    },

    hideJoystick: function() {
        if(this.els.joyBase) this.els.joyBase.style.display = 'none';
        if(this.els.joyStick) {
            this.els.joyStick.style.display = 'none';
            this.els.joyStick.style.transform = 'translate(0px, 0px)';
        }
    }
});
