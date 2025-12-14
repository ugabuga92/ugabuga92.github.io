const UI = {
    els: {},
    
    init: function() {
        this.els = {
            hp: document.getElementById('health-display'),
            hpBar: document.getElementById('hp-bar'),
            ammo: document.getElementById('ammo-display'),
            caps: document.getElementById('caps-display'),
            text: document.getElementById('encounter-text'),
            btns: document.getElementById('action-buttons'),
            log: document.getElementById('log-area'),
            restart: document.getElementById('restart-button'),
            moveContainer: document.getElementById('movement-container'),
            viewContentArea: document.getElementById('view-content-area'),
            
            // Buttons sicher abrufen
            newGameBtn: document.getElementById('new-game-btn'),
            wikiBtn: document.getElementById('wiki-btn'),
            mapBtn: document.getElementById('map-btn'),
            charBtn: document.getElementById('char-btn'),
            
            zoneDisplay: document.getElementById('current-zone-display'),
            levelDisplay: document.getElementById('level-display'),
            expCurrentDisplay: document.getElementById('exp-current-display'), 
        };

        // Event Listeners (Sicher)
        this.els.newGameBtn?.addEventListener('click', () => Game.initNewGame());
        this.els.wikiBtn?.addEventListener('click', () => this.switchView('wiki'));
        this.els.mapBtn?.addEventListener('click', () => this.switchView('worldmap'));
        this.els.charBtn?.addEventListener('click', () => this.switchView('character'));

        window.addEventListener('resize', () => this.handleResize());
        
        // Globale Hilfsfunktionen für Inline-HTML
        window.increaseTempStat = this.increaseTempStat.bind(this);
        window.applyStatPoint = this.applyStatPoint.bind(this);
        window.enterCity = this.enterCity.bind(this);
        window.showBuyMenu = this.showBuyMenu.bind(this);
        window.showWiki = this.showWiki.bind(this);
        window.showMonsterDetails = this.showMonsterDetails.bind(this);
    },
    
    log: function(msg, colorClass = '') {
        if (!this.els.log) return;
        const div = document.createElement('div');
        div.className = `mb-1 ${colorClass}`;
        div.innerHTML = `> ${msg}`;
        this.els.log.insertBefore(div, this.els.log.firstChild); 
    },
    
    updateUI: function() {
        if (!Game.gameState || !Game.gameState.level) return;

        const maxHp = Game.calculateMaxHP(Game.getStat('END'));
        const hpPercent = Math.max(0, (Game.gameState.health / maxHp) * 100); 
        
        if(this.els.hp) this.els.hp.textContent = `${Math.round(Game.gameState.health)}/${maxHp}`;
        if(this.els.hpBar) this.els.hpBar.style.width = `${hpPercent}%`;
        if(this.els.levelDisplay) this.els.levelDisplay.textContent = Game.gameState.level;
        if(this.els.expCurrentDisplay) this.els.expCurrentDisplay.textContent = Game.gameState.exp;
        if(this.els.ammo) this.els.ammo.textContent = Game.gameState.ammo;
        if(this.els.caps) this.els.caps.textContent = `${Game.gameState.caps} KK`;
        if(this.els.zoneDisplay) this.els.zoneDisplay.textContent = Game.gameState.currentZone;

        // View Updates
        if (Game.gameState.currentView === 'character') this.updateCharView(maxHp);
        if (Game.gameState.currentView === 'combat') this.updateCombatView();

        // Sichtbarkeit der Steuerung
        const showControls = !Game.gameState.inDialog && !Game.gameState.isGameOver && Game.gameState.currentView === 'map';
        if (this.els.moveContainer) this.els.moveContainer.style.visibility = showControls ? 'visible' : 'hidden';
        if (this.els.btns) this.els.btns.style.display = Game.gameState.inDialog ? 'flex' : 'none';
    },
    
    loadView: async function(viewName) {
        // Pfad: ./views/name.html
        const path = `./views/${viewName}.html`; 
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        } catch (error) {
            this.log(`Fehler beim Laden von ${path}: ${error.message}`, 'text-red-500');
            return `<div class="p-4 text-red-500">Konnte View '${viewName}' nicht laden.<br>Pfad: ${path}<br>Fehler: ${error.message}</div>`;
        }
    },

    switchView: async function(newView, forceReload = false) {
        if (!this.els.viewContentArea) return;
        if (Game.gameState.currentView === newView && !forceReload) return;

        // Stoppe Loop wenn wir Map verlassen
        if (newView !== 'map' && Game.animationFrameId) {
            cancelAnimationFrame(Game.animationFrameId);
            Game.animationFrameId = null;
        }

        const html = await this.loadView(newView);
        this.els.viewContentArea.innerHTML = html;
        
        // Element muss im DOM sein, bevor wir Klasse setzen
        const newEl = document.getElementById(newView + '-view');
        if (newEl) {
            newEl.style.display = 'flex'; // Sicherstellen, dass es angezeigt wird
            setTimeout(() => newEl.classList.add('active'), 10);
        }

        Game.gameState.currentView = newView;
        this.postSwitchActions(newView);
    },

    postSwitchActions: function(newView) {
        Game.gameState.inDialog = false;
        
        if (newView === 'map') {
            if(this.els.text) this.els.text.textContent = "Ödland Ebene.";
            this.clearDialog();
            Game.draw(); // Loop starten
        } else if (newView === 'worldmap') {
            Game.gameState.currentZone = "WELTKARTE";
            this.showWorldMap();
        } else if (newView === 'city') {
            Game.gameState.currentZone = "Stadt";
            this.enterCity();
        } else if (newView === 'character') {
            Game.gameState.currentZone = "Status";
            this.updateCharView(Game.calculateMaxHP(Game.getStat('END')));
        } else if (newView === 'wiki') {
            Game.gameState.currentZone = "Datenbank";
            this.showWiki();
        } else if (newView === 'combat') {
            Game.gameState.inDialog = true; // Wichtig: D-Pad ausblenden
        }
        this.updateUI();
    },

    setDialogButtons: function(html) {
        if(this.els.btns) {
            this.els.btns.innerHTML = html;
            Game.gameState.inDialog = true;
            this.updateUI();
        }
    },

    clearDialog: function() {
        if(this.els.btns) this.els.btns.innerHTML = '';
        const cityHeader = document.querySelector('.city-header');
        if (cityHeader) cityHeader.textContent = "RUSTY SPRINGS";
        Game.gameState.inDialog = false;
        this.updateUI();
    },

    handleResize: function() {
        if (Game.gameState.currentView === 'map') Game.draw();
        this.updateUI();
    },

    // --- SUB-VIEWS ---
    updateCombatView: function() {
        const nameEl = document.getElementById('enemy-name-center');
        const hpEl = document.getElementById('enemy-hp-display-center');
        if (nameEl && Game.gameState.currentEnemy) {
            nameEl.textContent = Game.gameState.currentEnemy.name;
            hpEl.textContent = `TP: ${Math.max(0, Game.gameState.currentEnemy.hp)}`;
        }
    },

    updateCharView: function(maxHp) {
        const statsEl = document.getElementById('stat-display');
        if (!statsEl) return;

        document.getElementById('level-display-char').textContent = Game.gameState.level;
        document.getElementById('exp-display-char').textContent = Game.gameState.exp;
        document.getElementById('exp-needed-char').textContent = Game.expToNextLevel(Game.gameState.level);
        document.getElementById('stat-points-display').textContent = Game.gameState.statPoints;
        
        // Stats rendern
        statsEl.innerHTML = Object.keys(Game.gameState.stats).map(k => {
            const val = Game.getStat(k);
            let btn = '';
            if (Game.gameState.statPoints > 0) {
                btn = `<button class="action-button text-xs" onclick="increaseTempStat('${k}', this)">+</button>`;
            }
            return `<div class="flex justify-between items-center"><span>${k}: <span class="text-white">${val}</span></span> ${btn}</div>`;
        }).join('');
        
        // Button Logik
        const applyBtn = document.getElementById('apply-stat-btn');
        if(applyBtn) applyBtn.disabled = !(Game.gameState.statPoints > 0 && Game.gameState.tempStatIncrease.key);
        
        // Equip
        document.getElementById('equipment-display').innerHTML = 
            `Waffe: <span class="text-white">${Game.gameState.equipment.weapon.name}</span>`;
    },

    increaseTempStat: function(key, btn) {
        Game.gameState.tempStatIncrease = { key: key, value: 1 };
        this.updateUI();
    },

    applyStatPoint: function() {
        const key = Game.gameState.tempStatIncrease.key;
        if(key) {
            Game.gameState.stats[key]++;
            Game.gameState.statPoints--;
            Game.gameState.tempStatIncrease = {};
            this.updateUI();
        }
    },

    enterCity: function() {
        const dialog = [
            { text: "Heilen (25 KK)", cost: 25, action: () => { Game.gameState.health = Game.calculateMaxHP(Game.getStat('END')); this.log("Geheilt.", "text-green-400"); this.enterCity(); } },
            { text: "Verlassen", action: () => this.switchView('map') }
        ];
        this.showCityDialog(dialog);
    },

    showCityDialog: function(opts) {
        const container = document.getElementById('city-options');
        if(!container) return;
        container.innerHTML = '';
        Game.gameState.inDialog = true;
        
        opts.forEach(o => {
            const btn = document.createElement('button');
            btn.className = "action-button w-full mb-2";
            btn.innerHTML = o.text;
            if(o.cost && Game.gameState.caps < o.cost) btn.disabled = true;
            btn.onclick = () => { if(o.cost) Game.gameState.caps -= o.cost; o.action(); };
            container.appendChild(btn);
        });
        this.updateUI();
    },

    showWorldMap: function() {
        const grid = document.getElementById('world-map-grid');
        if(!grid) return;
        grid.innerHTML = '';
        for(let y=0; y<10; y++) {
            for(let x=0; x<10; x++) {
                const d = document.createElement('div');
                d.className = "border border-green-900 flex justify-center items-center text-xs";
                d.style.aspectRatio = "1";
                if(x===Game.gameState.currentSector.x && y===Game.gameState.currentSector.y) {
                    d.style.backgroundColor = "#39ff14"; d.style.color = "black"; d.textContent = "YOU";
                } else if (Game.worldState[`${x},${y}`]?.explored) {
                    d.style.backgroundColor = "#4a3d34";
                }
                grid.appendChild(d);
            }
        }
    },

    showWiki: function() {
        const c = document.getElementById('wiki-content');
        if(!c) return;
        c.innerHTML = Object.keys(Game.monsters).map(k => 
            `<div class="border-b border-gray-700 py-1 flex justify-between"><span>${Game.monsters[k].name}</span><button class="action-button text-xs" onclick="showMonsterDetails('${k}')">INFO</button></div>`
        ).join('');
    },

    showMonsterDetails: function(k) {
        const m = Game.monsters[k];
        const c = document.getElementById('wiki-content');
        c.innerHTML = `<h2 class="text-xl font-bold">${m.name}</h2><p>${m.description}</p><p>TP: ${m.hp}</p><button class="action-button mt-4 w-full" onclick="showWiki()">Zurück</button>`;
    }
};
