const UI = {
    // Speichert Referenzen auf DOM Elemente
    els: {},

    init: function() {
        // 1. DOM Elemente holen
        this.els = {
            view: document.getElementById('view-container'),
            log: document.getElementById('log-area'),
            
            // Status
            hp: document.getElementById('val-hp'),
            hpBar: document.getElementById('bar-hp'),
            lvl: document.getElementById('val-lvl'),
            exp: document.getElementById('val-exp'),
            ammo: document.getElementById('val-ammo'),
            caps: document.getElementById('val-caps'),
            zone: document.getElementById('current-zone-display'),
            text: document.getElementById('encounter-text'),
            
            // Container
            dpad: document.getElementById('dpad'),
            dialog: document.getElementById('dialog-buttons'),
            
            // Header Buttons
            btnNew: document.getElementById('btn-new'),
            btnWiki: document.getElementById('btn-wiki'),
            btnMap: document.getElementById('btn-map'),
            btnChar: document.getElementById('btn-char'),
            
            // Movement Buttons
            btnUp: document.getElementById('btn-up'),
            btnDown: document.getElementById('btn-down'),
            btnLeft: document.getElementById('btn-left'),
            btnRight: document.getElementById('btn-right')
        };

        // 2. Event Listener setzen (Header)
        this.els.btnNew.onclick = () => Game.init();
        this.els.btnWiki.onclick = () => this.switchView('wiki');
        this.els.btnMap.onclick = () => this.switchView('worldmap'); // Globale Map
        this.els.btnChar.onclick = () => this.switchView('char'); // Character

        // 3. Event Listener (Movement)
        this.els.btnUp.onclick = () => Game.move(0, -1);
        this.els.btnDown.onclick = () => Game.move(0, 1);
        this.els.btnLeft.onclick = () => Game.move(-1, 0);
        this.els.btnRight.onclick = () => Game.move(1, 0);

        // Keyboard Support
        window.addEventListener('keydown', (e) => {
            if (Game.state.view === 'map' && !Game.state.inDialog) {
                if(e.key === 'w' || e.key === 'ArrowUp') Game.move(0, -1);
                if(e.key === 's' || e.key === 'ArrowDown') Game.move(0, 1);
                if(e.key === 'a' || e.key === 'ArrowLeft') Game.move(-1, 0);
                if(e.key === 'd' || e.key === 'ArrowRight') Game.move(1, 0);
            }
        });
    },

    // View Wechsel Logik (Kernstück!)
    switchView: async function(name) {
        // Pfad bauen: views/map.html
        const path = `views/${name}.html?t=${Date.now()}`; // Cache Busting
        
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error("404 Not Found");
            const html = await res.text();
            
            // HTML einfügen
            this.els.view.innerHTML = html;
            Game.state.view = name;

            // Spezial-Logik nach dem Laden
            if (name === 'map') {
                Game.initCanvas(); // Canvas starten!
                this.toggleControls(true);
            } else {
                this.toggleControls(false); // D-Pad ausblenden bei Menüs
            }

            // View-Spezifische Updates
            if (name === 'char') this.renderChar();
            if (name === 'wiki') this.renderWiki();
            if (name === 'worldmap') this.renderWorldMap();
            if (name === 'city') this.renderCity();
            if (name === 'combat') this.renderCombat();

            this.update();

        } catch (e) {
            console.error(e);
            this.log(`Fehler beim Laden von ${name}: ${e.message}`, "text-red-500");
        }
    },

    update: function() {
        if (!Game.state) return;
        
        // Status Update
        this.els.lvl.textContent = Game.state.lvl;
        this.els.exp.textContent = Game.state.exp;
        this.els.ammo.textContent = Game.state.ammo;
        this.els.caps.textContent = `${Game.state.caps} KK`;
        this.els.zone.textContent = Game.state.zone;
        
        const maxHp = 100 + (Game.state.stats.END - 5) * 10;
        this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`;
        this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`;
    },

    log: function(msg, color="text-green-500") {
        const line = document.createElement('div');
        line.className = color;
        line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
    },

    toggleControls: function(show) {
        this.els.dpad.style.visibility = show ? 'visible' : 'hidden';
        if (!show) this.els.dialog.innerHTML = ''; // Dialog leeren wenn nicht Map
    },

    // --- Render Helper für die Views ---

    renderChar: function() {
        const statGrid = document.getElementById('stat-grid');
        if (!statGrid) return;
        
        // Stats rendern
        statGrid.innerHTML = Object.keys(Game.state.stats).map(k => {
            const val = Game.state.stats[k];
            // Wenn Stat-Punkte da sind, Plus-Button zeigen
            const btn = Game.state.statPoints > 0 
                ? `<button class="border border-green-500 px-1 text-xs" onclick="Game.upgradeStat('${k}')">+</button>` 
                : '';
            return `<div class="flex justify-between"><span>${k}: ${val}</span>${btn}</div>`;
        }).join('');

        document.getElementById('char-xp').textContent = `${Game.state.exp} / ${Game.state.lvl * 100}`;
        document.getElementById('char-points').textContent = Game.state.statPoints;
        document.getElementById('char-equip').innerHTML = `Waffe: ${Game.state.equip.weapon.name}<br>Rüstung: ${Game.state.equip.body.name}`;
    },

    renderWiki: function() {
        const list = document.getElementById('wiki-list');
        if (!list) return;
        list.innerHTML = Object.keys(Game.monsters).map(k => {
            const m = Game.monsters[k];
            return `<div class="border-b border-gray-700 py-1">
                <div class="font-bold">${m.name}</div>
                <div class="text-xs opacity-70">${m.desc} (HP: ~${m.hp})</div>
            </div>`;
        }).join('');
    },

    renderWorldMap: function() {
        const grid = document.getElementById('world-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        for(let y=0; y<10; y++) {
            for(let x=0; x<10; x++) {
                const cell = document.createElement('div');
                cell.className = "border border-green-900 flex justify-center items-center text-xs relative";
                
                // Spieler Position
                if (x === Game.state.sector.x && y === Game.state.sector.y) {
                    cell.classList.add('bg-green-500', 'text-black');
                    cell.textContent = "YOU";
                } 
                // Erkundete Sektoren
                else if (Game.worldData[`${x},${y}`]) {
                    cell.classList.add('bg-green-900/30');
                }
                
                grid.appendChild(cell);
            }
        }
    },

    renderCity: function() {
        const container = document.getElementById('city-options');
        if(!container) return;
        container.innerHTML = '';

        const createBtn = (txt, fn) => {
            const b = document.createElement('button');
            b.className = "action-button w-full mb-2 text-left";
            b.textContent = txt;
            b.onclick = fn;
            container.appendChild(b);
        };

        createBtn("Heilen (25 KK)", () => Game.heal());
        createBtn("Handeln (WIP)", () => this.log("Händler ist gerade in Pause.", "text-yellow-500"));
        createBtn("Verlassen", () => this.switchView('map'));
    },

    renderCombat: function() {
        if (!Game.state.enemy) return;
        document.getElementById('enemy-name').textContent = Game.state.enemy.name;
        document.getElementById('enemy-hp').textContent = `${Game.state.enemy.hp} TP`;
    }
};
