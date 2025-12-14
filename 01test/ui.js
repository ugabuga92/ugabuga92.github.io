const UI = {
    els: {},

    init: function() {
        this.els = {
            view: document.getElementById('view-container'),
            log: document.getElementById('log-area'),
            hp: document.getElementById('val-hp'),
            hpBar: document.getElementById('bar-hp'),
            lvl: document.getElementById('val-lvl'),
            exp: document.getElementById('val-exp'),
            ammo: document.getElementById('val-ammo'),
            caps: document.getElementById('val-caps'),
            zone: document.getElementById('current-zone-display'),
            dpad: document.getElementById('dpad'),
            dialog: document.getElementById('dialog-buttons'),
            text: document.getElementById('encounter-text'),
            
            btnNew: document.getElementById('btn-new'),
            btnWiki: document.getElementById('btn-wiki'),
            btnMap: document.getElementById('btn-map'),
            btnChar: document.getElementById('btn-char'),
            
            btnUp: document.getElementById('btn-up'),
            btnDown: document.getElementById('btn-down'),
            btnLeft: document.getElementById('btn-left'),
            btnRight: document.getElementById('btn-right'),
            
            gameOver: document.getElementById('game-over-screen')
        };

        this.els.btnNew.onclick = () => Game.init();
        this.els.btnWiki.onclick = () => this.switchView('wiki');
        this.els.btnMap.onclick = () => this.switchView('worldmap');
        this.els.btnChar.onclick = () => this.switchView('char');

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

            if (name === 'map') {
                Game.initCanvas();
                this.toggleControls(true);
            } else {
                this.toggleControls(false);
            }

            if (name === 'char') this.renderChar();
            if (name === 'wiki') this.renderWiki();
            if (name === 'worldmap') this.renderWorldMap();
            if (name === 'city') this.renderCity();
            if (name === 'combat') this.renderCombat();

            this.update();

        } catch (e) {
            this.log(`Fehler: ${name} (404).`, "text-red-500");
        }
    },

    update: function() {
        if (!Game.state) return;
        
        this.els.lvl.textContent = Game.state.lvl;
        this.els.exp.textContent = Game.state.exp;
        this.els.ammo.textContent = Game.state.ammo;
        this.els.caps.textContent = `${Game.state.caps} KK`;
        this.els.zone.textContent = Game.state.zone;
        
        const maxHp = 100 + (Game.state.stats.END - 5) * 10;
        this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`;
        this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`;
        
        // --- LEVEL UP INDICATOR ---
        if(Game.state.statPoints > 0) {
            this.els.btnChar.classList.add('level-up-alert');
            this.els.btnChar.innerHTML = "CHAR <span class='text-yellow-400'>!</span>";
        } else {
            this.els.btnChar.classList.remove('level-up-alert');
            this.els.btnChar.textContent = "CHAR";
        }

        // --- BUTTONS SPERREN IM KAMPF ---
        const inCombat = Game.state.view === 'combat';
        this.els.btnWiki.disabled = inCombat;
        this.els.btnMap.disabled = inCombat;
        this.els.btnChar.disabled = inCombat;
        this.els.btnNew.disabled = inCombat;

        if(Game.state.view === 'map') {
            const show = !Game.state.inDialog && !Game.state.isGameOver;
            this.els.dpad.style.visibility = show ? 'visible' : 'hidden';
            this.els.dialog.style.display = Game.state.inDialog ? 'flex' : 'none';
        }
    },

    log: function(msg, color="text-green-500") {
        const line = document.createElement('div');
        line.className = color;
        line.textContent = `> ${msg}`;
        this.els.log.prepend(line);
    },

    toggleControls: function(show) {
        this.els.dpad.style.visibility = show ? 'visible' : 'hidden';
        if (!show) this.els.dialog.innerHTML = '';
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
        this.els.dialog.style.display = 'block';
    },

    leaveDialog: function() {
        Game.state.inDialog = false;
        this.els.dialog.innerHTML = '';
        this.update();
    },

    // --- RENDERERS ---

    renderChar: function() {
        const grid = document.getElementById('stat-grid');
        if(!grid) return;
        grid.innerHTML = Object.keys(Game.state.stats).map(k => {
            const val = Game.getStat(k);
            const btn = Game.state.statPoints > 0 ? `<button class="border border-green-500 px-1 ml-2" onclick="Game.upgradeStat('${k}')">+</button>` : '';
            return `<div class="flex justify-between"><span>${k}: ${val}</span>${btn}</div>`;
        }).join('');
        
        document.getElementById('char-exp').textContent = Game.state.exp;
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
            return `<div class="border-b border-green-900 pb-1">
                <div class="font-bold text-yellow-400">${m.name}</div>
                <div class="text-xs opacity-70">${m.desc} (HP: ~${m.hp})</div>
            </div>`;
        }).join('');
    },

    renderWorldMap: function() {
        const grid = document.getElementById('world-grid');
        if(!grid) return;
        grid.innerHTML = '';
        for(let y=0; y<10; y++) {
            for(let x=0; x<10; x++) {
                const d = document.createElement('div');
                d.className = "border border-green-900/50 flex justify-center items-center text-xs";
                if(x===Game.state.sector.x && y===Game.state.sector.y) {
                    d.style.backgroundColor = "#39ff14"; d.style.color = "black"; d.textContent = "YOU";
                } else if(Game.worldData[`${x},${y}`]) {
                    d.style.backgroundColor = "#4a3d34";
                }
                grid.appendChild(d);
            }
        }
    },

    renderCity: function() {
        const con = document.getElementById('city-options');
        if(!con) return;
        con.innerHTML = '';

        const addBtn = (txt, cb, disabled=false) => {
            const b = document.createElement('button');
            b.className = "action-button w-full mb-2 text-left p-3 flex justify-between";
            b.innerHTML = txt; 
            b.onclick = cb;
            if(disabled) { b.disabled = true; b.style.opacity = 0.5; }
            con.appendChild(b);
        };

        addBtn("Heilen (25 KK)", () => Game.heal(), Game.state.caps < 25 || Game.state.hp >= Game.state.maxHp);
        addBtn("Munition (10 Stk / 10 KK)", () => Game.buyAmmo(), Game.state.caps < 10);
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
                
                let label = `<span>${item.name}</span> <span>${item.cost} KK</span>`;
                if(isEquipped) label = `<span class="text-green-500">[AUSGERÜSTET]</span>`;
                
                const btn = document.createElement('button');
                btn.className = "action-button w-full mb-2 flex justify-between text-sm";
                btn.innerHTML = label;
                
                if(!canAfford || isEquipped) {
                    btn.disabled = true;
                    btn.style.opacity = 0.5;
                } else {
                    btn.onclick = () => Game.buyItem(key);
                }
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
