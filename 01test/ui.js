timerInterval: null,
biomeColors: { 'wasteland': '#5d5345', 'desert': '#eecfa1', 'jungle': '#1a3300', 'city': '#555555' },

    // --- CORE FUNKTIONEN (LOG & ERROR) ZUERST ---
log: function(msg, color="text-green-500") { 
if(!this.els.log) return;
const line = document.createElement('div');
@@ -13,23 +12,21 @@ const UI = {
},

error: function(msg) {
        // Schreibt Fehler ins Log UND in den Login-Status (falls wir noch im Login sind)
const errText = `> ERROR: ${msg}`;
console.error(errText);
        
if(this.els.log) {
const line = document.createElement('div');
line.className = "text-red-500 font-bold blink-red";
line.textContent = errText;
this.els.log.prepend(line);
}
        
        if(this.els.loginStatus && document.getElementById('login-screen').style.display !== 'none') {
            this.els.loginStatus.textContent = msg;
            this.els.loginStatus.className = "mt-4 text-red-500 font-bold blink-red";
        // Zeige Fehler auch im Login-Status, falls wir dort hängen
        const loginStat = document.getElementById('login-status');
        if(loginStat && document.getElementById('login-screen').style.display !== 'none') {
            loginStat.textContent = msg;
            loginStat.className = "mt-4 text-red-500 font-bold blink-red";
}
},
    // -------------------------------------------

init: function() {
this.els = {
@@ -59,25 +56,23 @@ const UI = {
btnLeft: document.getElementById('btn-left'),
btnRight: document.getElementById('btn-right'),
gameOver: document.getElementById('game-over-screen'),
            // Login Elemente
loginScreen: document.getElementById('login-screen'),
gameScreen: document.getElementById('game-screen'),
loginInput: document.getElementById('survivor-id-input'),
loginStatus: document.getElementById('login-status')
};

        // Enter Taste im Login
if(this.els.loginInput) {
this.els.loginInput.addEventListener("keyup", (e) => {
if (e.key === "Enter") this.attemptLogin();
});
}

        this.els.btnNew.onclick = () => { if(confirm("Neustart? Nicht gespeicherter Fortschritt geht verloren.")) location.reload(); };
        this.els.btnWiki.onclick = () => this.toggleView('wiki');
        this.els.btnMap.onclick = () => this.toggleView('worldmap');
        this.els.btnChar.onclick = () => this.toggleView('char');
        this.els.btnQuests.onclick = () => this.toggleView('quests');
        if(this.els.btnNew) this.els.btnNew.onclick = () => { if(confirm("Neustart? Nicht gespeicherter Fortschritt geht verloren.")) location.reload(); };
        if(this.els.btnWiki) this.els.btnWiki.onclick = () => this.toggleView('wiki');
        if(this.els.btnMap) this.els.btnMap.onclick = () => this.toggleView('worldmap');
        if(this.els.btnChar) this.els.btnChar.onclick = () => this.toggleView('char');
        if(this.els.btnQuests) this.els.btnQuests.onclick = () => this.toggleView('quests');

if(this.els.dpadToggle) {
this.els.dpadToggle.onclick = () => {
@@ -86,10 +81,10 @@ const UI = {
};
}

        this.els.btnUp.onclick = () => Game.move(0, -1);
        this.els.btnDown.onclick = () => Game.move(0, 1);
        this.els.btnLeft.onclick = () => Game.move(-1, 0);
        this.els.btnRight.onclick = () => Game.move(1, 0);
        if(this.els.btnUp) this.els.btnUp.onclick = () => Game.move(0, -1);
        if(this.els.btnDown) this.els.btnDown.onclick = () => Game.move(0, 1);
        if(this.els.btnLeft) this.els.btnLeft.onclick = () => Game.move(-1, 0);
        if(this.els.btnRight) this.els.btnRight.onclick = () => Game.move(1, 0);

window.addEventListener('keydown', (e) => {
if (Game.state && Game.state.view === 'map' && !Game.state.inDialog && !Game.state.isGameOver) {
@@ -125,12 +120,10 @@ const UI = {

const saveData = await Network.login(id);

            // UI Umschalten
this.els.loginScreen.style.display = 'none';
this.els.gameScreen.classList.remove('hidden');
this.els.gameScreen.classList.remove('opacity-0');

            // Spiel starten
Game.init(saveData); 

} catch(e) {
@@ -142,7 +135,7 @@ const UI = {
const v = this.els.version;
if(!v) return;
if(status === 'online') {
            v.textContent = "ONLINE (v0.0.10b)";
            v.textContent = "ONLINE (v0.0.10d)"; 
v.className = "text-[#39ff14] font-bold tracking-widest"; v.style.textShadow = "0 0 5px #39ff14";
} else if (status === 'offline') {
v.textContent = "OFFLINE"; v.className = "text-red-500 font-bold tracking-widest"; v.style.textShadow = "0 0 5px red";
@@ -151,7 +144,6 @@ const UI = {
}
},

    // --- GAMEPLAY UI ---
toggleView: function(name) { if (Game.state.view === name) this.switchView('map'); else this.switchView(name); },

updateTimer: function() { 
@@ -164,87 +156,112 @@ const UI = {
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
            if (!res.ok) throw new Error("404"); 
            if (!res.ok) throw new Error(`View '${name}' not found`); 
const html = await res.text(); 
this.els.view.innerHTML = html; 
Game.state.view = name; 
            if(name === 'map') { 
                Game.initCanvas(); 
                this.restoreOverlay(); 
                this.toggleControls(true); 
            } else if (name === 'combat') { 
                this.restoreOverlay(); 
                this.toggleControls(false); 
            } else { 
                this.toggleControls(false); 
            } 
            
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
        } catch (e) { this.log(`Fehler: ${name} (404).`, "text-red-500"); } 
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
        this.els.lvl.textContent = Game.state.lvl; 
        this.els.ammo.textContent = Game.state.ammo; 
        this.els.caps.textContent = `${Game.state.caps} Kronkorken`; 
        this.els.zone.textContent = Game.state.zone; 
        
        // Safe Updates (Null Checks)
        if(this.els.lvl) this.els.lvl.textContent = Game.state.lvl; 
        if(this.els.ammo) this.els.ammo.textContent = Game.state.ammo; 
        if(this.els.caps) this.els.caps.textContent = `${Game.state.caps} Kronkorken`; 
        if(this.els.zone) this.els.zone.textContent = Game.state.zone; 
        
const buffActive = Date.now() < Game.state.buffEndTime; 
        if(buffActive) { this.els.hpBar.style.backgroundColor = "#ffff00"; this.els.hpBar.parentElement.style.borderColor = "#ffff00"; } 
        else { this.els.hpBar.style.backgroundColor = "#39ff14"; this.els.hpBar.parentElement.style.borderColor = "#1a4d1a"; } 
        if(this.els.hpBar) {
            if(buffActive) { this.els.hpBar.style.backgroundColor = "#ffff00"; this.els.hpBar.parentElement.style.borderColor = "#ffff00"; } 
            else { this.els.hpBar.style.backgroundColor = "#39ff14"; this.els.hpBar.parentElement.style.borderColor = "#1a4d1a"; } 
        }
        
const maxHp = Game.state.maxHp; 
        this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`; 
        this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`; 
        if(this.els.hp) this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`; 
        if(this.els.hpBar) this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`; 
        
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
        if(unreadQuests) { 
            this.els.btnQuests.classList.add('quest-alert'); 
            this.els.btnQuests.innerHTML = "AUFGABEN <span class='text-cyan-400'>!</span>"; 
        } else { 
            this.els.btnQuests.classList.remove('quest-alert'); 
            this.els.btnQuests.textContent = "AUFGABEN"; 
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
        this.els.btnWiki.disabled = inCombat; 
        this.els.btnMap.disabled = inCombat; 
        this.els.btnChar.disabled = inCombat; 
        this.els.btnQuests.disabled = inCombat; 
        this.els.btnNew.disabled = inCombat; 
        if(this.els.btnWiki) this.els.btnWiki.disabled = inCombat; 
        if(this.els.btnMap) this.els.btnMap.disabled = inCombat; 
        if(this.els.btnChar) this.els.btnChar.disabled = inCombat; 
        if(this.els.btnQuests) this.els.btnQuests.disabled = inCombat; 
        if(this.els.btnNew) this.els.btnNew.disabled = inCombat; 

        if(buffActive) this.els.lvl.classList.add('blink-red'); 
        else this.els.lvl.classList.remove('blink-red'); 
        if(this.els.lvl) {
            if(buffActive) this.els.lvl.classList.add('blink-red'); 
            else this.els.lvl.classList.remove('blink-red'); 
        }

if(Game.state.view === 'map') { 
if(this.els.dpadToggle) this.els.dpadToggle.style.display = 'flex'; 
@@ -261,6 +278,9 @@ const UI = {
finishRoll: function() { const result = Game.rollLegendaryLoot(); let v1 = Math.floor(result.val / 3); let v2 = Math.floor(result.val / 3); let v3 = result.val - v1 - v2; while(v3 > 6) { v3--; v2++; } while(v2 > 6) { v2--; v1++; } document.getElementById('dice-1').textContent = v1; document.getElementById('dice-2').textContent = v2; document.getElementById('dice-3').textContent = v3; this.log(result.msg, "text-yellow-400 font-bold"); setTimeout(() => { if(this.els.diceOverlay) { this.els.diceOverlay.classList.remove('flex'); this.els.diceOverlay.classList.add('hidden'); } Game.endCombat(); }, 2000); },

restoreOverlay: function() { 
        // Verhindern, dass Overlay mehrfach hinzugefügt wird
        if(document.getElementById('btn-toggle-dpad')) return;

const overlayHTML = ` <button id="btn-toggle-dpad" style="position: absolute; bottom: 20px; left: 20px; z-index: 60; width: 50px; height: 50px; border-radius: 50%; background: rgba(0, 0, 0, 0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 0 10px #000;">🎮</button> <div id="overlay-controls" class="grid grid-cols-3 gap-1" style="position: absolute; bottom: 80px; left: 20px; z-index: 50; display: none;"> <div></div><button class="dpad-btn" id="btn-up" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▲</button><div></div> <button class="dpad-btn" id="btn-left" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">◀</button><div class="flex items-center justify-center text-[#39ff14]">●</div><button class="dpad-btn" id="btn-right" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▶</button> <div></div><button class="dpad-btn" id="btn-down" style="width: 50px; height: 50px; background: rgba(0,0,0,0.8); border: 2px solid #39ff14; color: #39ff14; font-size: 24px; display: flex; justify-content: center; align-items: center; border-radius: 8px;">▼</button><div></div> </div> <div id="dialog-overlay" style="position: absolute; bottom: 20px; right: 20px; z-index: 50; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; max-width: 50%;"></div> <div id="dice-overlay" class="hidden absolute inset-0 z-70 bg-black/95 flex-col justify-center items-center"> <h2 class="text-4xl text-yellow-400 mb-8 font-bold animate-pulse">LEGENDÄRER FUND!</h2> <div class="flex gap-4 mb-8"> <div id="dice-1" class="dice-box" style="width: 60px; height: 60px; border: 4px solid #39ff14; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; background: #000; color: #39ff14;">?</div> <div id="dice-2" class="dice-box" style="width: 60px; height: 60px; border: 4px solid #39ff14; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; background: #000; color: #39ff14;">?</div> <div id="dice-3" class="dice-box" style="width: 60px; height: 60px; border: 4px solid #39ff14; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; background: #000; color: #39ff14;">?</div> </div> <div class="text-xl mb-4 text-center"> <div class="text-cyan-400">3-7: KRONKORKEN</div> <div class="text-cyan-400">8-12: MUNITION</div> <div class="text-yellow-400 font-bold">13-18: OVERDRIVE BUFF</div> </div> <button id="btn-roll" class="action-button px-8 py-4 text-2xl border-yellow-400 text-yellow-400 hover:bg-yellow-900" onclick="UI.rollDiceAnim()">WÜRFELN</button> </div> `; 
this.els.view.insertAdjacentHTML('beforeend', overlayHTML); 
this.els.dpad = document.getElementById('overlay-controls'); 
