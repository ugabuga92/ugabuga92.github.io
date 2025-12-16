const UI = {
    els: {},
    timerInterval: null,
    biomeColors: { 'wasteland': '#5d5345', 'desert': '#eecfa1', 'jungle': '#1a3300', 'city': '#555555' },

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
        // Zeige Fehler auch im Login-Status, falls wir dort hängen
        const loginStat = document.getElementById('login-status');
        if(loginStat && document.getElementById('login-screen').style.display !== 'none') {
            loginStat.textContent = msg;
            loginStat.className = "mt-4 text-red-500 font-bold blink-red";
        }
    },

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
            version: document.getElementById('version-display'), 
            dpad: document.getElementById('overlay-controls'),
            dpadToggle: document.getElementById('btn-toggle-dpad'),
            dialog: document.getElementById('dialog-overlay'),
            diceOverlay: document.getElementById('dice-overlay'),
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
            gameOver: document.getElementById('game-over-screen'),
            loginScreen: document.getElementById('login-screen'),
            gameScreen: document.getElementById('game-screen'),
            loginInput: document.getElementById('survivor-id-input'),
            loginStatus: document.getElementById('login-status')
        };

        if(this.els.loginInput) {
            this.els.loginInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") this.attemptLogin();
            });
        }

        if(this.els.btnNew) this.els.btnNew.onclick = () => { if(confirm("Neustart? Nicht gespeicherter Fortschritt geht verloren.")) location.reload(); };
        if(this.els.btnWiki) this.els.btnWiki.onclick = () => this.toggleView('wiki');
        if(this.els.btnMap) this.els.btnMap.onclick = () => this.toggleView('worldmap');
        if(this.els.btnChar) this.els.btnChar.onclick = () => this.toggleView('char');
        if(this.els.btnQuests) this.els.btnQuests.onclick = () => this.toggleView('quests');

        if(this.els.dpadToggle) {
            this.els.dpadToggle.onclick = () => {
                const current = this.els.dpad.style.display;
                this.els.dpad.style.display = (current === 'none' || current === '') ? 'grid' : 'none';
            };
        }

        if(this.els.btnUp) this.els.btnUp.onclick = () => Game.move(0, -1);
        if(this.els.btnDown) this.els.btnDown.onclick = () => Game.move(0, 1);
        if(this.els.btnLeft) this.els.btnLeft.onclick = () => Game.move(-1, 0);
        if(this.els.btnRight) this.els.btnRight.onclick = () => Game.move(1, 0);

        window.addEventListener('keydown', (e) => {
            if (Game.state && Game.state.view === 'map' && !Game.state.inDialog && !Game.state.isGameOver) {
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

    attemptLogin: async function() {
        if(!this.els.loginInput) return;
        const id = this.els.loginInput.value.trim().toUpperCase();
        if(id.length < 3) {
            this.els.loginStatus.textContent = "ID ZU KURZ (MIN 3 ZEICHEN)";
            this.els.loginStatus.className = "mt-4 text-red-500 font-bold";
            return;
        }
        
        this.els.loginStatus.textContent = "VERBINDE MIT VAULT-TEC NETZWERK...";
        this.els.loginStatus.className = "mt-4 text-yellow-400 animate-pulse";
        
        try {
            if(typeof Network === 'undefined') throw new Error("Netzwerk Modul fehlt");
            Network.init(); 
            
            const saveData = await Network.login(id);
            
            this.els.loginScreen.style.display = 'none';
            this.els.gameScreen.classList.remove('hidden');
            this.els.gameScreen.classList.remove('opacity-0');
            
            Game.init(saveData); 
            
        } catch(e) {
            this.error("LOGIN FEHLGESCHLAGEN: " + e.message);
        }
    },

    setConnectionState: function(status) {
        const v = this.els.version;
        if(!v) return;
        if(status === 'online') {
            v.textContent = "ONLINE (v0.0.10d)"; 
            v.className = "text-[#39ff14] font-bold tracking-widest"; v.style.textShadow = "0 0 5px #39ff14";
        } else if (status === 'offline') {
            v.textContent = "OFFLINE"; v.className = "text-red-500 font-bold tracking-widest"; v.style.textShadow = "0 0 5px red";
        } else {
            v.textContent = "CONNECTING..."; v.className = "text-yellow-400 font-bold tracking-widest animate-pulse";
        }
    },

    toggleView: function(name) { if (Game.state.view === name) this.switchView('map'); else this.switchView(name); },
    
    updateTimer: function() { 
        if(!Game.state || !Game.state.startTime) return; 
        const diff = Math.floor((Date.now() - Game.state.startTime) / 1000); 
        const h = Math.floor(diff / 3600).toString().padStart(2,'0'); 
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0'); 
        const s = (diff % 60).toString().padStart(2,'0'); 
        if(this.els.timer) this.els.timer.textContent = `${h}:${m}:${s}`; 
        if(Game.state.view === 'map') this.update(); 
    },

    // --- FIX: INTEGRATED MAP VIEW (KEIN 404 MEHR) ---
    switchView: async function(name) { 
        const verDisplay = document.getElementById('version-display'); 
        const ver = verDisplay ? verDisplay.textContent.trim() : Date.now(); 
        
        // SPEZIALFALL MAP: Direkt im Code erzeugen, keine Datei laden!
        if (name === 'map') {
            this.els.view.innerHTML = '<canvas id="game-canvas" class="w-full h-full object-contain" style="image-rendering: pixelated;"></canvas>';
            Game.state.view = name;
            Game.initCanvas();
            this.restoreOverlay();
            this.toggleControls(true);
            // Buttons updaten
            this.updateButtonStates(name);
            this.update();
            return;
        }

        // Andere Views (Wiki, Char etc.) laden
        const path = `views/${name}.html?v=${ver}`; 
        try { 
            const res = await fetch(path); 
            if (!res.ok) throw new Error(`View '${name}' not found`); 
            const html = await res.text(); 
            this.els.view.innerHTML = html; 
            Game.state.view = name; 
            
            if (name === 'combat') { this.restoreOverlay(); this.toggleControls(false); } 
            else { this.toggleControls(false); } 
            
            if (name === 'char') this.renderChar(); 
            if (name === 'wiki') this.renderWiki(); 
            if (name === 'worldmap') this.renderWorldMap(); 
            if (name === 'city') this.renderCity(); 
            if (name === 'combat') this.renderCombat(); 
            if (name === 'quests') this.renderQuests(); 
            
            this.updateButtonStates(name);
            this.update(); 
        } catch (e) { this.error(`Ladefehler: ${e.message}`); } 
    },

    updateButtonStates: function(activeName) {
        if(this.els.btnWiki) this.els.btnWiki.classList.toggle('active', activeName === 'wiki');
        if(this.els.btnMap) this.els.btnMap.classList.toggle('active', activeName === 'worldmap');
        if(this.els.btnChar) this.els.btnChar.classList.toggle('active', activeName === 'char');
        if(this.els.btnQuests) this.els.btnQuests.classList.toggle('active', activeName === 'quests');
    },

    update: function() { 
        if (!Game.state) return; 
        
        // Safe Updates (Null Checks)
        if(this.els.lvl) this.els.lvl.textContent = Game.state.lvl; 
        if(this.els.ammo) this.els.ammo.textContent = Game.state.ammo; 
        if(this.els.caps) this.els.caps.textContent = `${Game.state.caps} Kronkorken`; 
        if(this.els.zone) this.els.zone.textContent = Game.state.zone; 
        
        const buffActive = Date.now() < Game.state.buffEndTime; 
        if(this.els.hpBar) {
            if(buffActive) { this.els.hpBar.style.backgroundColor = "#ffff00"; this.els.hpBar.parentElement.style.borderColor = "#ffff00"; } 
            else { this.els.hpBar.style.backgroundColor = "#39ff14"; this.els.hpBar.parentElement.style.borderColor = "#1a4d1a"; } 
        }
        
        const maxHp = Game.state.maxHp; 
        if(this.els.hp) this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`; 
        if(this.els.hpBar) this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`; 
        
        const nextXp = Game.expToNextLevel(Game.state.lvl); 
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100); 
        if(this.els.expBarTop) this.els.expBarTop.style.width = `${expPct}%`; 
        
        // Notifications
        if(this.els.btnChar) {
            if(Game.state.statPoints > 0) { 
                this.els.btnChar.classList.add('level-up-alert'); 
                this.els.btnChar.innerHTML = "CHAR <span class='text-yellow-400'>!</span>"; 
            } else { 
                this.els.btnChar.classList.remove('level-up-alert'); 
                this.els.btnChar.textContent = "CHARAKTER"; 
            }
        } 
        
        const unreadQuests = Game.state.quests.some(q => !q.read); 
        if(this.els.btnQuests) {
            if(unreadQuests) { 
                this.els.btnQuests.classList.add('quest-alert'); 
                this.els.btnQuests.innerHTML = "AUFGABEN <span class='text-cyan-400'>!</span>"; 
            } else { 
                this.els.btnQuests.classList.remove('quest-alert'); 
                this.els.btnQuests.textContent = "AUFGABEN"; 
            }
        } 
        
        // SAFETY FIX: Prüfen ob Buttons existieren bevor disabled gesetzt wird
        const inCombat = Game.state.view === 'combat'; 
        if(this.els.btnWiki) this.els.btnWiki.disabled = inCombat; 
        if(this.els.btnMap) this.els.btnMap.disabled = inCombat; 
        if(this.els.btnChar) this.els.btnChar.disabled = inCombat; 
        if(this.els.btnQuests) this.els.btnQuests.disabled = inCombat; 
        if(this.els.btnNew) this.els.btnNew.disabled = inCombat; 
        
        if(this.els.lvl) {
            if(buffActive) this.els.lvl.classList.add('blink-red'); 
            else this.els.lvl.classList.remove('blink-red'); 
        }
        
        if(Game.state.view === 'map') { 
            if(this.els.dpadToggle) this.els.dpadToggle.style.display = 'flex'; 
            if(!Game.state.inDialog && this.els.dialog && this.els.dialog.innerHTML === '') { 
                this.els.dialog.style.display = 'none'; 
            } 
        } else { 
            if(this.els.dpadToggle) this.els.dpadToggle.style.display = 'none'; 
        } 
    },

    showDiceOverlay: function() { this.els.diceOverlay = document.getElementById('dice-overlay'); if(this.els.diceOverlay) { this.els.diceOverlay.classList.remove('hidden'); this.els.diceOverlay.classList.add('flex'); document.getElementById('dice-1').textContent = "?"; document.getElementById('dice-2').textContent = "?"; document.getElementById('dice-3').textContent = "?"; const btn = document.getElementById('btn-roll'); if(btn) btn.disabled = false; } },
    rollDiceAnim: function() { const btn = document.getElementById('btn-roll'); if(btn) btn.disabled = true; let count = 0; const interval = setInterval(() => { document.getElementById('dice-1').textContent = Math.floor(Math.random()*6)+1; document.getElementById('dice-2').textContent = Math.floor(Math.random()*6)+1; document.getElementById('dice-3').textContent = Math.floor(Math.random()*6)+1; count++; if(count > 15) { clearInterval(interval); this.finishRoll(); } }, 100); },
    finishRoll: function() { const result = Game.rollLegendaryLoot(); let v1 = Math.floor(result.val / 3); let v2 = Math.floor(result.val / 3); let v3 = result.val - v1 - v2; while(v3 > 6) { v3--; v2++; } while(v2 > 6) { v2--; v1++; } document.getElementById('dice-1').textContent = v1; document.getElementById('dice-2').textContent = v2; document.getElementById('dice-3').textContent = v3; this.log(result.msg, "text-yellow-400 font-bold"); setTimeout(() => { if(this.els.diceOverlay) { this.els.diceOverlay.classList.remove('flex'); this.els.diceOverlay.classList.add('hidden'); } Game.endCombat(); }, 2000); },
    
    restoreOverlay: function() { 
        // Verhindern, dass Overlay mehrfach hinzugefügt wird
        if(document.getElementById('btn-toggle-dpad')) return;

        const overlayHTML = ` <button id="btn-toggle-dpad" style="position: absolute; bottom: 20px; left: 20px; z-index: 60; width: 50px; height: 50px; border-radius: 50%; background: rgba(0, 0, 0, 0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 0 10px #000;">🎮</button> <div id="overlay-controls" class="grid grid-cols-3 gap-1" style="position: absolute; bottom: 80px; left: 20px; z-index: 50; display: none;"> <div></div><button class="dpad-btn" id="btn-up" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▲</button><div></div> <button class="dpad-btn" id="btn-left" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">◀</button><div class="flex items-center justify-center text-[#39ff14]">●</div><button class="dpad-btn" id="btn-right" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▶</button> <div></div><button class="dpad-btn" id="btn-down" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▼</button><div></div> </div> <div id="dialog-overlay" style="position: absolute; bottom: 20px; right: 20px; z-index: 50; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; max-width: 50%;"></div> <div id="dice-overlay" class="hidden absolute inset-0 z-70 bg-black/95 flex-col justify-center items-center"> <h2 class="text-4xl text-yellow-400 mb-8 font-bold animate-pulse">LEGENDÄRER FUND!</h2> <div class="flex gap-4 mb-8"> <div id="dice-1" class="dice-box" style="width: 60px; height: 60px; border: 4px solid #39ff14; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; background: #000; color: #39ff14;">?</div> <div id="dice-2" class="dice-box" style="width: 60px; height: 60px; border: 4px solid #39ff14; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; background: #000; color: #39ff14;">?</div> <div id="dice-3" class="dice-box" style="width: 60px; height: 60px; border: 4px solid #39ff14; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; background: #000; color: #39ff14;">?</div> </div> <div class="text-xl mb-4 text-center"> <div class="text-cyan-400">3-7: KRONKORKEN</div> <div class="text-cyan-400">8-12: MUNITION</div> <div class="text-yellow-400 font-bold">13-18: OVERDRIVE BUFF</div> </div> <button id="btn-roll" class="action-button px-8 py-4 text-2xl border-yellow-400 text-yellow-400 hover:bg-yellow-900" onclick="UI.rollDiceAnim()">WÜRFELN</button> </div> `; 
        this.els.view.insertAdjacentHTML('beforeend', overlayHTML); 
        this.els.dpad = document.getElementById('overlay-controls'); 
        this.els.dpadToggle = document.getElementById('btn-toggle-dpad'); 
        this.els.dialog = document.getElementById('dialog-overlay'); 
        this.els.diceOverlay = document.getElementById('dice-overlay'); 
        if(this.els.dpadToggle) { this.els.dpadToggle.onclick = () => { const current = this.els.dpad.style.display; this.els.dpad.style.display = (current === 'none' || current === '') ? 'grid' : 'none'; }; } 
        document.getElementById('btn-up').onclick = () => Game.move(0, -1); 
        document.getElementById('btn-down').onclick = () => Game.move(0, 1); 
        document.getElementById('btn-left').onclick = () => Game.move(-1, 0); 
        document.getElementById('btn-right').onclick = () => Game.move(1, 0); 
    },

    toggleControls: function(show) { if (!show && this.els.dialog) this.els.dialog.innerHTML = ''; if (this.els.diceOverlay && !show) { this.els.diceOverlay.classList.remove('flex'); this.els.diceOverlay.classList.add('hidden'); } },
    showGameOver: function() { if(this.els.gameOver) this.els.gameOver.classList.remove('hidden'); this.toggleControls(false); },
    enterVault: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const restBtn = document.createElement('button'); restBtn.className = "action-button w-full mb-1 border-blue-500 text-blue-300"; restBtn.textContent = "Ausruhen (Gratis)"; restBtn.onclick = () => { Game.rest(); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weiter geht's"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(restBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'flex'; },
    enterSupermarket: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-red-500 text-red-300"; enterBtn.textContent = "Ruine betreten (Gefahr!)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "market"); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(enterBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'block'; },
    enterCave: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-gray-500 text-gray-300"; enterBtn.textContent = "In die Tiefe (Dungeon)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "cave"); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(enterBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'block'; },
    leaveDialog: function() { Game.state.inDialog = false; this.els.dialog.style.display = 'none'; this.update(); },
    
    renderQuests: function() { const list = document.getElementById('quest-list'); if(!list) return; list.innerHTML = Game.state.quests.map(q => ` <div class="border border-green-900 bg-green-900/10 p-2 flex items-center gap-3 cursor-pointer hover:bg-green-900/30 transition-all" onclick="UI.showQuestDetail('${q.id}')"> <div class="text-3xl">✉️</div> <div> <div class="font-bold text-lg text-yellow-400">${q.read ? '' : '<span class="text-cyan-400">[NEU]</span> '}${q.title}</div> <div class="text-xs opacity-70">Zum Lesen klicken</div> </div> </div> `).join(''); },
    showQuestDetail: function(id) { const quest = Game.state.quests.find(q => q.id === id); if(!quest) return; quest.read = true; this.update(); const list = document.getElementById('quest-list'); const detail = document.getElementById('quest-detail'); const content = document.getElementById('quest-content'); list.classList.add('hidden'); detail.classList.remove('hidden'); content.innerHTML = `<h2 class="text-2xl font-bold text-yellow-400 border-b border-green-500 mb-4">${quest.title}</h2><div class="font-mono text-lg leading-relaxed whitespace-pre-wrap">${quest.text}</div>`; },
    closeQuestDetail: function() { document.getElementById('quest-detail').classList.add('hidden'); document.getElementById('quest-list').classList.remove('hidden'); this.renderQuests(); },
    renderChar: function() { const grid = document.getElementById('stat-grid'); if(!grid) return; const lvlDisplay = document.getElementById('char-lvl'); if(lvlDisplay) lvlDisplay.textContent = Game.state.lvl; grid.innerHTML = Object.keys(Game.state.stats).map(k => { const val = Game.getStat(k); const btn = Game.state.statPoints > 0 ? `<button class="border border-green-500 px-1 ml-2" onclick="Game.upgradeStat('${k}')">+</button>` : ''; return `<div class="flex justify-between"><span>${k}: ${val}</span>${btn}</div>`; }).join(''); const nextXp = Game.expToNextLevel(Game.state.lvl); const expPct = Math.min(100, (Game.state.xp / nextXp) * 100); document.getElementById('char-exp').textContent = Game.state.xp; document.getElementById('char-next').textContent = nextXp; document.getElementById('char-exp-bar').style.width = `${expPct}%`; document.getElementById('char-points').textContent = Game.state.statPoints; const btn = document.getElementById('btn-assign'); if(btn) btn.disabled = Game.state.statPoints <= 0; document.getElementById('char-equip').innerHTML = `Waffe: ${Game.state.equip.weapon.name}<br>Rüstung: ${Game.state.equip.body.name}`; },
    renderWiki: function() { const content = document.getElementById('wiki-content'); if(!content) return; content.innerHTML = Object.keys(Game.monsters).map(k => { const m = Game.monsters[k]; const xpText = Array.isArray(m.xp) ? `${m.xp[0]}-${m.xp[1]}` : m.xp; return `<div class="border-b border-green-900 pb-1"><div class="font-bold text-yellow-400">${m.name}</div><div class="text-xs opacity-70">HP: ~${m.hp}, XP: ${xpText}</div></div>`; }).join(''); },
    
    renderWorldMap: function() {
        const grid = document.getElementById('world-grid');
        if(!grid) return;
        grid.innerHTML = '';
        for(let y=0; y<8; y++) {
            for(let x=0; x<8; x++) {
                const d = document.createElement('div');
                d.className = "border border-green-900/30 flex justify-center items-center text-xs relative";
                if(x === Game.state.sector.x && y === Game.state.sector.y) {
                    d.style.backgroundColor = "#39ff14"; d.style.color = "black"; d.style.fontWeight = "bold"; d.textContent = "YOU"; 
                } 
                else if(Game.worldData[`${x},${y}`]) {
                    const biome = Game.worldData[`${x},${y}`].biome;
                    d.style.backgroundColor = this.biomeColors[biome] || '#4a3d34';
                }
                if(typeof Network !== 'undefined' && Network.otherPlayers) {
                    const playersHere = Object.values(Network.otherPlayers).filter(p => p.sector && p.sector.x === x && p.sector.y === y);
                    if(playersHere.length > 0) {
                        const dot = document.createElement('div');
                        dot.className = "absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_cyan]";
                        if(x === Game.state.sector.x && y === Game.state.sector.y) { dot.style.top = "2px"; dot.style.right = "2px"; }
                        d.appendChild(dot);
                    }
                }
                grid.appendChild(d);
            }
        }
        grid.style.gridTemplateColumns = "repeat(8, 1fr)";
    },

    renderCity: function() { const con = document.getElementById('city-options'); if(!con) return; con.innerHTML = ''; const addBtn = (txt, cb, disabled=false) => { const b = document.createElement('button'); b.className = "action-button w-full mb-2 text-left p-3 flex justify-between"; b.innerHTML = txt; b.onclick = cb; if(disabled) { b.disabled = true; b.style.opacity = 0.5; } con.appendChild(b); }; addBtn("Heilen (25 Kronkorken)", () => Game.heal(), Game.state.caps < 25 || Game.state.hp >= Game.state.maxHp); addBtn("Munition (10 Stk / 10 Kronkorken)", () => Game.buyAmmo(), Game.state.caps < 10); addBtn("Händler / Waffen & Rüstung", () => this.renderShop(con)); addBtn("Stadt verlassen", () => this.switchView('map')); },
    renderShop: function(container) { container.innerHTML = ''; const backBtn = document.createElement('button'); backBtn.className = "action-button w-full mb-4 text-center border-yellow-400 text-yellow-400"; backBtn.textContent = "ZURÜCK ZUM PLATZ"; backBtn.onclick = () => this.renderCity(); container.appendChild(backBtn); Object.keys(Game.items).forEach(key => { const item = Game.items[key]; if(item.cost > 0 && Game.state.lvl >= (item.requiredLevel || 0) - 2) { const canAfford = Game.state.caps >= item.cost; const isEquipped = (Game.state.equip[item.slot] && Game.state.equip[item.slot].name === item.name); let label = `<span>${item.name}</span> <span>${item.cost} Kronkorken</span>`; if(isEquipped) label = `<span class="text-green-500">[AUSGERÜSTET]</span>`; const btn = document.createElement('button'); btn.className = "action-button w-full mb-2 flex justify-between text-sm"; btn.innerHTML = label; if(!canAfford || isEquipped) { btn.disabled = true; btn.style.opacity = 0.5; } else { btn.onclick = () => Game.buyItem(key); } container.appendChild(btn); } }); },
    renderCombat: function() { const enemy = Game.state.enemy; if(!enemy) return; document.getElementById('enemy-name').textContent = enemy.name; document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`; document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`; }
};
