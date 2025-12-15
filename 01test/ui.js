const UI = {
    els: {},
    timerInterval: null,
    
    biomeColors: { 'wasteland': '#5d5345', 'desert': '#eecfa1', 'jungle': '#1a3300', 'city': '#555555' },

    init: function() {
        this.els = {
            view: document.getElementById('view-container'),
            log: document.getElementById('log-area'),
            hp: document.getElementById('val-hp'),
            hpBar: document.getElementById('bar-hp'),
            expBarTop: document.getElementById('bar-exp-top'),
            lvl: document.getElementById('val-lvl'),
            ammo: document.getElementById('val-ammo'),
            caps: document.getElementById('val-caps'),
            zone: document.getElementById('current-zone-display'),
            
            dpad: document.getElementById('overlay-controls'),
            dpadToggle: document.getElementById('btn-toggle-dpad'), // Neuer Button
            dialog: document.getElementById('dialog-overlay'),
            text: document.getElementById('encounter-text'),
            timer: document.getElementById('game-timer'),
            
            btnNew: document.getElementById('btn-new'),
            btnWiki: document.getElementById('btn-wiki'),
            btnMap: document.getElementById('btn-map'),
            btnChar: document.getElementById('btn-char'),
            btnQuests: document.getElementById('btn-quests'),
            
            btnUp: document.getElementById('btn-up'),
            btnDown: document.getElementById('btn-down'),
            btnLeft: document.getElementById('btn-left'),
            btnRight: document.getElementById('btn-right'),
            
            gameOver: document.getElementById('game-over-screen')
        };

        this.els.btnNew.onclick = () => Game.init();
        this.els.btnWiki.onclick = () => this.toggleView('wiki');
        this.els.btnMap.onclick = () => this.toggleView('worldmap');
        this.els.btnChar.onclick = () => this.toggleView('char');
        this.els.btnQuests.onclick = () => this.toggleView('quests');

        // TOGGLE LOGIK
        this.els.dpadToggle.onclick = () => {
            const current = this.els.dpad.style.display;
            this.els.dpad.style.display = (current === 'none' || current === '') ? 'grid' : 'none';
        };

        this.els.btnUp.onclick = () => Game.move(0, -1);
        this.els.btnDown.onclick = () => Game.move(0, 1);
        this.els.btnLeft.onclick = () => Game.move(-1, 0);
        this.els.btnRight.onclick = () => Game.move(1, 0);

        window.addEventListener('keydown', (e) => {
            if (Game.state.view === 'map' && !Game.state.inDialog && !Game.state.isGameOver) {
                if(e.key === 'w' || e.key === 'ArrowUp') Game.move(0, -1);
                if(e.key === 's' || e.key === 'ArrowDown') Game.move(0, 1);
                if(e.key === 'a' || e.key === 'ArrowLeft') Game.move(-1, 0);
                if(e.key === 'd' || e.key === 'ArrowRight') Game.move(1, 0);
            }
        });
        
        window.Game = Game; 
        window.UI = this;
        
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    },

    toggleView: function(name) {
        if (Game.state.view === name) this.switchView('map');
        else this.switchView(name);
    },

    updateTimer: function() {
        if(!Game.state || !Game.state.startTime) return;
        const diff = Math.floor((Date.now() - Game.state.startTime) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2,'0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0');
        const s = (diff % 60).toString().padStart(2,'0');
        if(this.els.timer) this.els.timer.textContent = `${h}:${m}:${s}`;
    },

    switchView: async function(name) {
        const verDisplay = document.getElementById('version-display');
        const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
        const path = `views/${name}.html?v=${ver}`;
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error("404");
            const html = await res.text();
            this.els.view.innerHTML = html;
            Game.state.view = name;

            if(name === 'map') {
                Game.initCanvas();
                // Wir müssen das Overlay wieder einfügen (Toggle-Button + D-Pad + Dialog)
                this.restoreOverlay();
                this.toggleControls(true);
            } else {
                this.toggleControls(false);
            }

            if (name === 'char') this.renderChar();
            if (name === 'wiki') this.renderWiki();
            if (name === 'worldmap') this.renderWorldMap();
            if (name === 'city') this.renderCity();
            if (name === 'combat') this.renderCombat();
            if (name === 'quests') this.renderQuests();
            this.update();
        } catch (e) { this.log(`Fehler: ${name} (404).`, "text-red-500"); }
    },
    
    restoreOverlay: function() {
        // Da switchView den Inhalt löscht, fügen wir die Controls neu ein.
        // WICHTIG: Den aktuellen State des D-Pads (sichtbar/versteckt) merken wir uns eigentlich nicht,
        // hier setzen wir es auf 'none' zurück (Standard).
        // Wenn man es perfekt machen will, speichert man den State in einer Variable.
        // Für jetzt reicht: Reset auf Hidden.
        
        const overlayHTML = `
        <button id="btn-toggle-dpad" style="position: absolute; bottom: 20px; left: 20px; z-index: 60; width: 50px; height: 50px; border-radius: 50%; background: rgba(0, 0, 0, 0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 0 10px #000;">🎮</button>
        
        <div id="overlay-controls" class="grid grid-cols-3 gap-1" style="position: absolute; bottom: 80px; left: 20px; z-index: 50; display: none;">
             <div></div><button class="dpad-btn" id="btn-up" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▲</button><div></div>
             <button class="dpad-btn" id="btn-left" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">◀</button><div class="flex items-center justify-center text-[#39ff14]">●</div><button class="dpad-btn" id="btn-right" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▶</button>
             <div></div><button class="dpad-btn" id="btn-down" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▼</button><div></div>
        </div>
        <div id="dialog-overlay" style="position: absolute; bottom: 20px; right: 20px; z-index: 50; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; max-width: 50%;"></div>
        `;
        
        this.els.view.insertAdjacentHTML('beforeend', overlayHTML);
        
        // Neu verknüpfen
        this.els.dpad = document.getElementById('overlay-controls');
        this.els.dpadToggle = document.getElementById('btn-toggle-dpad');
        this.els.dialog = document.getElementById('dialog-overlay');
        
        // Events
        this.els.dpadToggle.onclick = () => {
            const current = this.els.dpad.style.display;
            this.els.dpad.style.display = (current === 'none' || current === '') ? 'grid' : 'none';
        };
        
        document.getElementById('btn-up').onclick = () => Game.move(0, -1);
        document.getElementById('btn-down').onclick = () => Game.move(0, 1);
        document.getElementById('btn-left').onclick = () => Game.move(-1, 0);
        document.getElementById('btn-right').onclick = () => Game.move(1, 0);
    },

    update: function() {
        if (!Game.state) return;
        this.els.lvl.textContent = Game.state.lvl;
        this.els.ammo.textContent = Game.state.ammo;
        this.els.caps.textContent = `${Game.state.caps} Kronkorken`;
        this.els.zone.textContent = Game.state.zone;
        
        // FIX: Nutze Game.state.maxHp (die korrekte 110) statt der Neuberechnung
        const maxHp = Game.state.maxHp; 
        this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`;
        this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`;

        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100);
        if(this.els.expBarTop) this.els.expBarTop.style.width = `${expPct}%`;
        
        this.els.btnWiki.classList.remove('active');
        this.els.btnMap.classList.remove('active');
        this.els.btnChar.classList.remove('active');
        this.els.btnQuests.classList.remove('active');

        if (Game.state.view === 'wiki') this.els.btnWiki.classList.add('active');
        if (Game.state.view === 'worldmap') this.els.btnMap.classList.add('active');
        if (Game.state.view === 'char') this.els.btnChar.classList.add('active');
        if (Game.state.view === 'quests') this.els.btnQuests.classList.add('active');

        if(Game.state.statPoints > 0) {
            this.els.btnChar.classList.add('level-up-alert');
            this.els.btnChar.innerHTML = "CHAR <span class='text-yellow-400'>!</span>";
        } else {
            this.els.btnChar.classList.remove('level-up-alert');
            this.els.btnChar.textContent = "CHARAKTER";
        }

        const unreadQuests = Game.state.quests.some(q => !q.read);
        if(unreadQuests) {
            this.els.btnQuests.classList.add('quest-alert');
            this.els.btnQuests.innerHTML = "AUFGABEN <span class='text-cyan-400'>!</span>";
        } else {
            this.els.btnQuests.classList.remove('quest-alert');
            this.els.btnQuests.textContent = "AUFGABEN";
        }

        const inCombat = Game.state.view === 'combat';
        this.els.btnWiki.disabled = inCombat;
        this.els.btnMap.disabled = inCombat;
        this.els.btnChar.disabled = inCombat;
        this.els.btnQuests.disabled = inCombat;
        this.els.btnNew.disabled = inCombat;

        if(Game.state.view === 'map') {
            const show = !Game.state.inDialog && !Game.state.isGameOver;
            // Wir verstecken den Toggle Button nicht, er soll immer da sein
            if(this.els.dpadToggle) this.els.dpadToggle.style.display = 'flex';
            if(!show && this.els.dialog) this.els.dialog.style.display = 'none';
        } else {
            // In anderen Views (Wiki, Char, Combat) Toggle verstecken
            if(this.els.dpadToggle) this.els.dpadToggle.style.display = 'none';
        }
    },

    log: function(msg, color="text-green-500") {
        const line = document.createElement('div');
        line.className = color;
        line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
    },

    toggleControls: function(show) {
        // Hier machen wir nichts mehr, das Toggle übernimmt der User
        if (!show && this.els.dialog) this.els.dialog.innerHTML = '';
    },
    
    showGameOver: function() {
        if(this.els.gameOver) this.els.gameOver.classList.remove('hidden');
        this.toggleControls(false);
    },
    
    enterVault: function() {
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        
        const restBtn = document.createElement('button');
        restBtn.className = "action-button w-full mb-1 border-blue-500 text-blue-300";
        restBtn.textContent = "Ausruhen (Gratis)";
        restBtn.onclick = () => { Game.rest(); this.leaveDialog(); };
        
        const leaveBtn = document.createElement('button');
        leaveBtn.className = "action-button w-full";
        leaveBtn.textContent = "Weiter geht's";
        leaveBtn.onclick = () => this.leaveDialog();

        this.els.dialog.appendChild(restBtn);
        this.els.dialog.appendChild(leaveBtn);
        this.els.dialog.style.display = 'flex';
    },

    enterSupermarket: function() {
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        
        const enterBtn = document.createElement('button');
        enterBtn.className = "action-button w-full mb-1 border-red-500 text-red-300";
        enterBtn.textContent = "Betreten (Gefahr!)";
        enterBtn.onclick = () => { 
            Game.loadSector(0, 0, true); 
            this.leaveDialog();
        };
        
        const leaveBtn = document.createElement('button');
        leaveBtn.className = "action-button w-full";
        leaveBtn.textContent = "Weitergehen";
        leaveBtn.onclick = () => this.leaveDialog();

        this.els.dialog.appendChild(enterBtn);
        this.els.dialog.appendChild(leaveBtn);
        this.els.dialog.style.display = 'block';
    },

    leaveDialog: function() {
        Game.state.inDialog = false;
        this.els.dialog.style.display = 'none';
        this.update();
    },

    renderQuests: function() {
        const list = document.getElementById('quest-list');
        if(!list) return;
        list.innerHTML = Game.state.quests.map(q => `
            <div class="border border-green-900 bg-green-900/10 p-2 flex items-center gap-3 cursor-pointer hover:bg-green-900/30 transition-all" onclick="UI.showQuestDetail('${q.id}')">
                <div class="text-3xl">✉️</div>
                <div>
                    <div class="font-bold text-lg text-yellow-400">${q.read ? '' : '<span class="text-cyan-400">[NEU]</span> '}${q.title}</div>
                    <div class="text-xs opacity-70">Zum Lesen klicken</div>
                </div>
            </div>
        `).join('');
    },

    showQuestDetail: function(id) {
        const quest = Game.state.quests.find(q => q.id === id);
        if(!quest) return;
        quest.read = true;
        this.update();
        const list = document.getElementById('quest-list');
        const detail = document.getElementById('quest-detail');
        const content = document.getElementById('quest-content');
        list.classList.add('hidden');
        detail.classList.remove('hidden');
        content.innerHTML = `<h2 class="text-2xl font-bold text-yellow-400 border-b border-green-500 mb-4">${quest.title}</h2><div class="font-mono text-lg leading-relaxed whitespace-pre-wrap">${quest.text}</div>`;
    },

    closeQuestDetail: function() {
        document.getElementById('quest-detail').classList.add('hidden');
        document.getElementById('quest-list').classList.remove('hidden');
        this.renderQuests();
    },

    renderChar: function() {
        const grid = document.getElementById('stat-grid');
        if(!grid) return;
        grid.innerHTML = Object.keys(Game.state.stats).map(k => {
            const val = Game.getStat(k);
            const btn = Game.state.statPoints > 0 ? `<button class="border border-green-500 px-1 ml-2" onclick="Game.upgradeStat('${k}')">+</button>` : '';
            return `<div class="flex justify-between"><span>${k}: ${val}</span>${btn}</div>`;
        }).join('');
        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100);
        document.getElementById('char-exp').textContent = Game.state.xp;
        document.getElementById('char-next').textContent = nextXp;
        document.getElementById('char-exp-bar').style.width = `${expPct}%`;
        document.getElementById('char-points').textContent = Game.state.statPoints;
        const btn = document.getElementById('btn-assign');
        if(btn) btn.disabled = Game.state.statPoints <= 0;
        document.getElementById('char-equip').innerHTML = `Waffe: ${Game.state.equip.weapon.name}<br>Rüstung: ${Game.state.equip.body.name}`;
    },

    renderWiki: function() {
        const content = document.getElementById('wiki-content');
        if(!content) return;
        content.innerHTML = Object.keys(Game.monsters).map(k => {
            const m = Game.monsters[k];
            const xpText = Array.isArray(m.xp) ? `${m.xp[0]}-${m.xp[1]}` : m.xp;
            return `<div class="border-b border-green-900 pb-1"><div class="font-bold text-yellow-400">${m.name}</div><div class="text-xs opacity-70">${m.desc} (HP: ~${m.hp}, XP: ${xpText})</div></div>`;
        }).join('');
    },

    renderWorldMap: function() {
        const grid = document.getElementById('world-grid');
        if(!grid) return;
        grid.innerHTML = '';
        for(let y=0; y<8; y++) {
            for(let x=0; x<8; x++) {
                const d = document.createElement('div');
                d.className = "border border-green-900/30 flex justify-center items-center text-xs relative";
                if(x===Game.state.sector.x && y===Game.state.sector.y) { 
                    d.style.backgroundColor = "#39ff14"; d.style.color = "black"; d.style.fontWeight = "bold"; d.textContent = "YOU"; 
                } 
                else if(Game.worldData[`${x},${y}`]) { 
                    const biome = Game.worldData[`${x},${y}`].biome;
                    d.style.backgroundColor = this.biomeColors[biome] || '#4a3d34';
                }
                grid.appendChild(d);
            }
        }
        grid.style.gridTemplateColumns = "repeat(8, 1fr)";
    },

    renderCity: function() {
        const con = document.getElementById('city-options');
        if(!con) return;
        con.innerHTML = '';
        const addBtn = (txt, cb, disabled=false) => {
            const b = document.createElement('button');
            b.className = "action-button w-full mb-2 text-left p-3 flex justify-between";
            b.innerHTML = txt; b.onclick = cb;
            if(disabled) { b.disabled = true; b.style.opacity = 0.5; }
            con.appendChild(b);
        };
        addBtn("Heilen (25 Kronkorken)", () => Game.heal(), Game.state.caps < 25 || Game.state.hp >= Game.state.maxHp);
        addBtn("Munition (10 Stk / 10 Kronkorken)", () => Game.buyAmmo(), Game.state.caps < 10);
        addBtn("Händler / Waffen & Rüstung", () => this.renderShop(con));
        addBtn("Stadt verlassen", () => this.switchView('map'));
    },

    renderShop: function(container) {
        container.innerHTML = ''; 
        const backBtn = document.createElement('button');
        backBtn.className = "action-button w-full mb-4 text-center border-yellow-400 text-yellow-400";
        backBtn.textContent = "ZURÜCK ZUM PLATZ";
        backBtn.onclick = () => this.renderCity();
        container.appendChild(backBtn);
        Object.keys(Game.items).forEach(key => {
            const item = Game.items[key];
            if(item.cost > 0 && Game.state.lvl >= (item.requiredLevel || 0) - 2) {
                const canAfford = Game.state.caps >= item.cost;
                const isEquipped = (Game.state.equip[item.slot] && Game.state.equip[item.slot].name === item.name);
                let label = `<span>${item.name}</span> <span>${item.cost} Kronkorken</span>`;
                if(isEquipped) label = `<span class="text-green-500">[AUSGERÜSTET]</span>`;
                const btn = document.createElement('button');
                btn.className = "action-button w-full mb-2 flex justify-between text-sm";
                btn.innerHTML = label;
                if(!canAfford || isEquipped) { btn.disabled = true; btn.style.opacity = 0.5; } 
                else { btn.onclick = () => Game.buyItem(key); }
                container.appendChild(btn);
            }
        });
    },

    renderCombat: function() {
        const enemy = Game.state.enemy;
        if(!enemy) return;
        document.getElementById('enemy-name').textContent = enemy.name;
        document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`;
        document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`;
    }
};
