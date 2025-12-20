const UI = {
    els: {},
    currentSaves: {},
    selectedSlot: -1,
    isRegistering: false,
    
    // --- CORE ---
    log: function(msg, color="text-green-500") {
        if(!UI.els.log) return;
        const d = document.createElement('div');
        d.className = color; d.textContent = "> " + msg;
        UI.els.log.prepend(d);
    },

    init: function() {
        // Cache Elements
        UI.els = {
            login: document.getElementById('login-screen'),
            char: document.getElementById('char-screen'),
            game: document.getElementById('game-screen'),
            log: document.getElementById('log-area'),
            view: document.getElementById('view-container'),
            dialog: document.getElementById('dialog-overlay'),
            
            // Login Inputs
            email: document.getElementById('login-email'),
            pass: document.getElementById('login-pass'),
            name: document.getElementById('login-name'),
            status: document.getElementById('login-status'),
            
            // Char Select
            slotList: document.getElementById('char-list'),
            charBtn: document.getElementById('btn-char-action'),
            delBtn: document.getElementById('btn-char-delete'),
            newCharOverlay: document.getElementById('new-char-overlay'),
            newCharInput: document.getElementById('new-char-input'),
            
            // HUD
            hpVal: document.getElementById('val-hp'),
            nameVal: document.getElementById('val-name'),
            lvlVal: document.getElementById('val-lvl'),
            menu: document.getElementById('main-menu')
        };

        // Bindings
        document.getElementById('btn-login').onclick = UI.doLogin;
        document.getElementById('btn-reg-toggle').onclick = UI.toggleReg;
        document.getElementById('btn-char-action').onclick = UI.doCharAction;
        document.getElementById('btn-char-delete').onclick = UI.doDeleteChar;
        document.getElementById('btn-create-confirm').onclick = UI.createChar;
        document.getElementById('btn-menu').onclick = () => { 
            UI.els.menu.style.display = (UI.els.menu.style.display === 'none' ? 'block' : 'none'); 
        };
        
        // Mobile Touch
        const touchArea = document.getElementById('view-container');
        if(touchArea) {
            touchArea.addEventListener('touchstart', UI.handleTouchStart, {passive:false});
            touchArea.addEventListener('touchmove', UI.handleTouchMove, {passive:false});
            touchArea.addEventListener('touchend', UI.handleTouchEnd);
        }

        // Global Keys
        window.addEventListener('keydown', (e) => {
            if(Game.state && Game.state.view === 'map') {
                if(e.key === 'w' || e.key === 'ArrowUp') Game.move(0, -1);
                if(e.key === 's' || e.key === 'ArrowDown') Game.move(0, 1);
                if(e.key === 'a' || e.key === 'ArrowLeft') Game.move(-1, 0);
                if(e.key === 'd' || e.key === 'ArrowRight') Game.move(1, 0);
            }
        });

        // Start Network
        if(typeof Network !== 'undefined') Network.init();
    },

    // --- LOGIN LOGIC ---
    toggleReg: function() {
        UI.isRegistering = !UI.isRegistering;
        const btn = document.getElementById('btn-login');
        const nameField = document.getElementById('login-name');
        const toggle = document.getElementById('btn-reg-toggle');
        
        if(UI.isRegistering) {
            btn.textContent = "REGISTRIEREN";
            nameField.style.display = "block";
            toggle.textContent = "Zurück zum Login";
        } else {
            btn.textContent = "LOGIN";
            nameField.style.display = "none";
            toggle.textContent = "Neu? Hier registrieren";
        }
    },

    doLogin: async function() {
        const email = UI.els.email.value;
        const pass = UI.els.pass.value;
        const name = UI.els.name.value;
        
        UI.els.status.textContent = "Lade...";
        
        try {
            let saves;
            if(UI.isRegistering) {
                if(email.length<3 || pass.length<3) throw new Error("Zu kurz!");
                saves = await Network.register(email, pass, name);
            } else {
                saves = await Network.login(email, pass);
            }
            UI.showCharSelect(saves || {});
        } catch(e) {
            UI.els.status.textContent = e.message;
        }
    },

    // --- CHAR SELECT ---
    showCharSelect: function(saves) {
        UI.currentSaves = saves;
        UI.els.login.style.display = 'none';
        UI.els.char.style.display = 'flex';
        UI.els.slotList.innerHTML = '';
        
        for(let i=0; i<5; i++) {
            const div = document.createElement('div');
            div.className = "char-slot";
            const save = saves[i];
            if(save) {
                div.innerHTML = `<span>${save.playerName} (Lvl ${save.lvl})</span><span>SLOT ${i+1}</span>`;
            } else {
                div.classList.add('empty-slot');
                div.innerHTML = `<span>[ LEER ]</span><span>SLOT ${i+1}</span>`;
            }
            div.onclick = () => UI.selectSlot(i);
            UI.els.slotList.appendChild(div);
        }
        UI.selectSlot(0);
    },

    selectSlot: function(index) {
        UI.selectedSlot = index;
        const slots = UI.els.slotList.children;
        for(let s of slots) s.classList.remove('active');
        if(slots[index]) slots[index].classList.add('active');
        
        const save = UI.currentSaves[index];
        if(save) {
            UI.els.charBtn.textContent = "SPIEL LADEN";
            UI.els.charBtn.className = "btn border-green-500 text-green-500";
            UI.els.delBtn.style.display = 'flex';
        } else {
            UI.els.charBtn.textContent = "ERSTELLEN";
            UI.els.charBtn.className = "btn border-yellow-400 text-yellow-400";
            UI.els.delBtn.style.display = 'none';
        }
    },

    doCharAction: function() {
        if(UI.selectedSlot === -1) return;
        const save = UI.currentSaves[UI.selectedSlot];
        if(save) {
            UI.enterGame(save);
        } else {
            UI.els.newCharOverlay.style.display = 'flex';
        }
    },
    
    doDeleteChar: async function() {
        if(confirm("Wirklich löschen?")) {
            await Network.deleteSlot(UI.selectedSlot);
            location.reload();
        }
    },

    createChar: function() {
        const name = UI.els.newCharInput.value.toUpperCase();
        if(name.length < 3) return alert("Name zu kurz");
        UI.els.newCharOverlay.style.display = 'none';
        UI.enterGame(null, name);
    },

    enterGame: function(saveData, newName) {
        UI.els.char.style.display = 'none';
        UI.els.game.style.display = 'flex';
        Game.init(saveData, null, UI.selectedSlot, newName);
        if(!saveData) {
            setTimeout(() => UI.showPermadeathWarning(), 500);
        }
        Network.startPresence();
    },

    // --- GAME UI ---
    update: function() {
        if(!Game.state) return;
        UI.els.hpVal.textContent = `${Game.state.hp}/${Game.state.maxHp}`;
        UI.els.nameVal.textContent = Game.state.playerName;
        UI.els.lvlVal.textContent = Game.state.lvl;
        
        if(Game.state.view === 'map' && UI.els.dialog.innerHTML === '') {
             UI.els.dialog.style.display = 'none';
        }
    },

    toggleView: function(name) {
        if(Game.state.view === name) UI.switchView('map');
        else UI.switchView(name);
    },

    switchView: function(name) {
        UI.els.menu.style.display = 'none';
        if(name === 'map') {
            UI.els.view.innerHTML = '<div style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;background:black;"><canvas id="game-canvas" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;"></canvas></div>';
            Game.state.view = 'map';
            Game.initCanvas();
            UI.update();
        } else {
            const ts = Date.now();
            fetch(`views/${name}.html?v=${ts}`).then(r=>r.text()).then(html => {
                UI.els.view.innerHTML = html;
                Game.state.view = name;
                if(name === 'inventory') UI.renderInventory();
                if(name === 'char') UI.renderChar();
                if(name === 'combat') UI.renderCombat();
                UI.update();
            }).catch(e=>UI.error(e));
        }
    },

    // --- RENDERERS ---
    renderInventory: function() {
        const list = document.getElementById('inventory-list');
        if(!list || !Game.state.inventory) return;
        list.innerHTML = '';
        Game.state.inventory.forEach(i => {
            if(i.count > 0) {
                const d = document.createElement('div');
                d.className = "border border-green-500 p-2 mb-2 cursor-pointer hover:bg-green-900";
                d.innerHTML = `${Game.items[i.id].name} (${i.count})`;
                d.onclick = () => { Game.useItem(i.id); UI.toggleView('inventory'); };
                list.appendChild(d);
            }
        });
    },

    renderChar: function() {
        const d = document.getElementById('stat-grid');
        if(!d) return;
        d.innerHTML = '';
        ['STR','PER','END','INT','AGI','LUC'].forEach(s => {
            d.innerHTML += `<div class="flex justify-between border-b border-green-900"><span>${s}</span><span>${Game.getStat(s)}</span></div>`;
        });
        const pts = document.getElementById('char-points');
        if(pts && Game.state.statPoints > 0) {
            pts.innerHTML = `<button onclick="Game.upgradeStat('STR')" class="btn border-yellow-400 text-yellow-400">PUNKTE VERTEILEN (${Game.state.statPoints})</button>`;
        }
    },

    renderCombat: function() {
        if(!Game.state.enemy) return;
        const n = document.getElementById('enemy-name');
        if(n) n.textContent = Game.state.enemy.name;
        const b = document.getElementById('enemy-hp-bar');
        if(b) b.style.width = (Game.state.enemy.hp / Game.state.enemy.maxHp * 100) + "%";
    },

    // --- DIALOGS ---
    showPermadeathWarning: function() {
        UI.els.dialog.style.display = 'flex';
        UI.els.dialog.innerHTML = `
            <div class="box border-red-500 bg-black">
                <h1 class="text-4xl text-red-500 mb-4">WARNUNG</h1>
                <p class="mb-4 text-red-300">DIESES SPIEL HAT PERMADEATH.<br>WENN DU STIRBST, IST ALLES WEG.</p>
                <button class="btn border-red-500 text-red-500" onclick="UI.closeDialog()">VERSTANDEN</button>
            </div>
        `;
    },
    
    showDungeonWarning: function(cb) {
        UI.els.dialog.style.display = 'flex';
        UI.els.dialog.innerHTML = '';
        const box = document.createElement('div');
        box.className = "box border-red-500 bg-black";
        box.innerHTML = `<h2 class="text-2xl text-red-500 mb-2">GEFAHR!</h2><p class="mb-4">Dungeon betreten?</p>`;
        const b1 = document.createElement('button'); b1.className="btn border-red-500 text-red-500"; b1.textContent="JA";
        b1.onclick = () => { UI.closeDialog(); cb(); };
        const b2 = document.createElement('button'); b2.className="btn"; b2.textContent="NEIN";
        b2.onclick = () => UI.closeDialog();
        box.appendChild(b1); box.appendChild(b2);
        UI.els.dialog.appendChild(box);
    },

    showDungeonVictory: function(c, l) {
        UI.els.dialog.style.display = 'flex';
        UI.els.dialog.innerHTML = `<div class="box border-yellow-400 bg-black"><h1 class="text-3xl text-yellow-400">SIEG!</h1><p>Level ${l} gesäubert.</p><p>+${c} Kronkorken</p><button class="btn" onclick="UI.closeDialog()">OK</button></div>`;
    },

    closeDialog: function() {
        UI.els.dialog.style.display = 'none';
        UI.els.dialog.innerHTML = '';
        Game.state.inDialog = false;
        UI.update();
    },

    // --- TOUCH JOYSTICK ---
    touchStart: {x:0, y:0},
    touchId: null,
    
    handleTouchStart: function(e) {
        if(e.target.tagName === 'BUTTON') return;
        if(Game.state.view !== 'map') return;
        const t = e.changedTouches[0];
        UI.touchId = t.identifier;
        UI.touchStart = {x: t.clientX, y: t.clientY};
    },
    
    handleTouchMove: function(e) {
        if(!UI.touchId) return;
        e.preventDefault();
    },
    
    handleTouchEnd: function(e) {
        if(Game.state.view !== 'map') return;
        let t = null;
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === UI.touchId) t = e.changedTouches[i];
        }
        if(!t) return;
        
        const dx = t.clientX - UI.touchStart.x;
        const dy = t.clientY - UI.touchStart.y;
        
        if(Math.abs(dx) > Math.abs(dy)) {
            if(Math.abs(dx) > 30) Game.move(dx > 0 ? 1 : -1, 0);
        } else {
            if(Math.abs(dy) > 30) Game.move(0, dy > 0 ? 1 : -1);
        }
        UI.touchId = null;
    }
};
