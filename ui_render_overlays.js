// [v5.9] - 2026-01-04 01:30am (Workbench Integration)
// - Feature: "Zerlegen" Button in showItemConfirm integriert.
// - Logic: Prüft auf Werkbank-Umgebung (Camp/Stadt/Vault) für Scrapping.

Object.assign(UI, {
    
    // [v3.0] NEW QUEST HUD
    showQuestComplete: function(questDef) {
        let container = document.getElementById('hud-quest-overlay');
        if(!container) {
             const view = document.getElementById('game-screen'); 
             if(!view) return;
             container = document.createElement('div');
             container.id = 'hud-quest-overlay';
             container.className = "absolute top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-[60] w-full max-w-md";
             view.appendChild(container);
        }

        const msg = document.createElement('div');
        msg.className = "bg-black/90 border border-yellow-400 p-3 shadow-[0_0_15px_rgba(255,215,0,0.5)] mb-2 text-center transition-opacity duration-500 opacity-0 transform translate-y-2";
        
        let rewardHtml = '';
        if(questDef.reward) {
             if(questDef.reward.xp) rewardHtml += `<div class="text-yellow-400 font-bold">+${questDef.reward.xp} XP</div>`;
             if(questDef.reward.caps) rewardHtml += `<div class="text-yellow-200">+${questDef.reward.caps} Kronkorken</div>`;
             if(questDef.reward.items) rewardHtml += `<div class="text-blue-300 text-xs">+ Items erhalten</div>`;
        }

        msg.innerHTML = `
            <div class="text-yellow-400 font-bold tracking-widest text-sm border-b border-yellow-900/50 pb-1 mb-1">QUEST ERFÜLLT</div>
            <div class="text-white font-bold mb-1">${questDef.title}</div>
            ${rewardHtml}
        `;

        container.appendChild(msg);
        requestAnimationFrame(() => { msg.classList.remove('opacity-0', 'translate-y-2'); });
        setTimeout(() => { msg.classList.add('opacity-0'); setTimeout(() => msg.remove(), 500); }, 4000);
    },

    showMapLegend: function() {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        overlay.onclick = (e) => { 
            if(e.target === overlay) UI.leaveDialog(); 
        };

        overlay.innerHTML = '';
        
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-green-500 p-6 shadow-[0_0_30px_green] max-w-sm w-full relative pointer-events-auto";
        
        const item = (icon, text, color) => `
            <div class="flex items-center gap-4 mb-3 border-b border-green-900/30 pb-1 last:border-0">
                <span class="text-2xl w-10 text-center filter drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" style="color: ${color}">${icon}</span>
                <span class="text-green-300 font-mono text-sm tracking-wide uppercase">${text}</span>
            </div>`;

        box.innerHTML = `
            <h2 class="text-2xl font-bold text-green-500 mb-6 border-b-2 border-green-500 pb-2 tracking-widest text-center">KARTEN LEGENDE</h2>
            <div class="flex flex-col space-y-1">
                ${item('🟢', 'DEINE POSITION', '#39ff14')}
                ${item('⚙️', 'VAULT 101 (SICHER)', '#ffff00')}
                ${item('🏙️', 'RUSTY SPRINGS (STADT)', '#00ffff')}
                ${item('🏰', 'MILITÄRBASIS (LVL 10+)', '#ff5555')}
                ${item('☠️', 'RAIDER FESTUNG (LVL 5+)', '#ffaa00')}
                ${item('📡', 'FUNKTURM (THE PITT)', '#55ff55')}
            </div>
            <button class="action-button w-full mt-6 border-green-500 text-green-500 font-bold hover:bg-green-900" onclick="UI.leaveDialog()">SCHLIESSEN</button>
        `;
        
        overlay.appendChild(box);
    },

    showHighscoreBoard: async function() {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;

        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        if(Game.state) Game.state.inDialog = true;
        
        const escHandler = (e) => { if(e.key === "Escape") UI.leaveDialog(); };
        document.addEventListener('keydown', escHandler);
        
        const originalLeave = this.leaveDialog.bind(this);
        this.leaveDialog = function() {
            document.removeEventListener('keydown', escHandler);
            UI.leaveDialog = originalLeave;
            originalLeave();
        };

        overlay.onclick = (e) => {
            if(e.target === overlay) UI.leaveDialog();
        };

        overlay.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 border-2 border-green-500 bg-black shadow-[0_0_20px_green] pointer-events-auto">
                <div class="text-green-500 animate-pulse text-2xl mb-6">EMPFANGE DATEN...</div>
                <button class="action-button border-red-500 text-red-500 w-full" onclick="UI.leaveDialog()">ABBRECHEN</button>
            </div>`;

        try {
            const scores = await Network.getHighscores();
            if(!scores) throw new Error("Keine Daten empfangen.");

            scores.sort((a,b) => b.lvl - a.lvl || b.xp - a.xp);

            const box = document.createElement('div');
            box.className = "bg-black border-4 border-green-600 p-4 shadow-[0_0_30px_green] w-full max-w-2xl max-h-[90%] flex flex-col relative pointer-events-auto";
            
            const closeBtn = document.createElement('button');
            closeBtn.className = "absolute top-2 right-2 text-green-500 text-xl border border-green-500 px-3 hover:bg-green-900 font-bold z-50";
            closeBtn.textContent = "X";
            closeBtn.onclick = function() { UI.leaveDialog(); }; 
            
            box.innerHTML = `
                <h2 class="text-3xl font-bold text-green-400 mb-4 text-center border-b-2 border-green-600 pb-2 tracking-widest shrink-0">VAULT LEGENDS</h2>
                <div class="flex justify-between mb-2 text-xs text-green-300 uppercase font-bold px-2 shrink-0">
                    <span class="w-8">#</span>
                    <span class="w-1/3 cursor-pointer hover:text-white" onclick="UI.renderHighscoreList(this.dataset.scores, 'name')">NAME</span>
                    <span class="w-16 text-right cursor-pointer hover:text-white" onclick="UI.renderHighscoreList(this.dataset.scores, 'lvl')">LVL</span>
                    <span class="w-16 text-right cursor-pointer hover:text-white" onclick="UI.renderHighscoreList(this.dataset.scores, 'kills')">KILLS</span>
                    <span class="w-24 text-right cursor-pointer hover:text-white" onclick="UI.renderHighscoreList(this.dataset.scores, 'xp')">EXP</span>
                </div>
                <div id="highscore-list" class="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 border-b border-green-900/50 mb-2"></div>
                <div class="text-[10px] text-center text-green-800 shrink-0">ESC / KLICK NEBEN FENSTER ZUM SCHLIESSEN</div>
            `;
            box.appendChild(closeBtn);

            const listContainer = box.querySelector('#highscore-list');
            if(listContainer) listContainer.dataset.rawScores = JSON.stringify(scores);
            
            this.renderHighscoreList = (sortBy) => {
                const container = document.getElementById('highscore-list');
                if(!container) return;
                let data = JSON.parse(container.dataset.rawScores);
                
                if(sortBy === 'name') data.sort((a,b) => a.name.localeCompare(b.name));
                else if(sortBy === 'lvl') data.sort((a,b) => b.lvl - a.lvl || b.xp - a.xp);
                else if(sortBy === 'kills') data.sort((a,b) => b.kills - a.kills || b.lvl - a.lvl);
                else if(sortBy === 'xp') data.sort((a,b) => b.xp - a.xp);

                container.innerHTML = '';
                data.forEach((entry, idx) => {
                    const isDead = entry.status === 'dead';
                    const isTop3 = idx < 3;
                    
                    let rowClass = "flex justify-between items-center py-2 border-b border-green-900/30 text-lg ";
                    if(isTop3) rowClass += "text-yellow-400 font-bold bg-yellow-900/10 ";
                    else if(isDead) rowClass += "text-gray-500 italic ";
                    else rowClass += "text-green-400 ";

                    const icon = isDead ? '☠️' : (isTop3 ? '🏆' : '');
                    const nameDisplay = `${icon} ${entry.name}`;

                    const row = document.createElement('div');
                    row.className = rowClass;
                    row.innerHTML = `
                        <span class="w-8 opacity-50">${idx+1}</span>
                        <span class="w-1/3 truncate">${nameDisplay}</span>
                        <span class="w-16 text-right">${entry.lvl}</span>
                        <span class="w-16 text-right">${entry.kills}</span>
                        <span class="w-24 text-right font-mono text-sm opacity-80">${entry.xp}</span>
                    `;
                    container.appendChild(row);
                });
            };

            overlay.innerHTML = '';
            overlay.appendChild(box);
            this.renderHighscoreList('lvl');

        } catch(e) {
            let msg = e.message;
            if(msg && msg.toLowerCase().includes("permission_denied")) {
                msg = "ZUGRIFF VERWEIGERT: FIREBASE REGELN BLOCKIEREN 'leaderboard'.";
            }
            overlay.innerHTML = `
                <div class="border-2 border-red-500 bg-black p-6 text-center shadow-[0_0_20px_red] pointer-events-auto">
                    <div class="text-red-500 font-bold text-2xl mb-4 tracking-widest">NETZWERK FEHLER</div>
                    <div class="text-green-400 font-mono mb-6">${msg}</div>
                    <button class="action-button w-full border-red-500 text-red-500" onclick="UI.leaveDialog()">SCHLIESSEN</button>
                </div>
            `;
        }
    },

    showShopConfirm: function(itemKey) {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        const item = Game.items[itemKey];
        if(!item) return;

        if(Game.state) Game.state.inDialog = true;
        
        overlay.onclick = (e) => { if(e.target === overlay) UI.leaveDialog(); };

        overlay.innerHTML = '';
        
        // Calculate Stats Text
        let statsText = "";
        let typeLabel = item.type.toUpperCase();
        
        if(item.type === 'consumable') {
            statsText = `Effekt: ${item.effect} (${item.val})`;
            typeLabel = "VERBRAUCHSGEGENSTAND";
        } else if(item.type === 'weapon') {
            statsText = `Schaden: ${item.baseDmg}`;
            typeLabel = "WAFFE";
        } else if(item.type === 'body') {
            const bonus = item.bonus ? Object.entries(item.bonus).map(([k,v]) => `+${v} ${k}`).join(', ') : 'Keine';
            statsText = `Rüstung: ${bonus}`;
            typeLabel = "KLEIDUNG / RÜSTUNG";
        } else if(item.type === 'junk' || item.type === 'component') {
            statsText = "Material für Handwerk";
            typeLabel = "SCHROTT / MATERIAL";
        } else if(item.type === 'tool' || item.type === 'blueprint') {
            statsText = "Bauplan / Werkzeug";
            typeLabel = "AUSRÜSTUNG";
        }

        const canAfford = Game.state.caps >= item.cost;
        const costColor = canAfford ? "text-yellow-400" : "text-red-500";

        const box = document.createElement('div');
        box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4 w-full pointer-events-auto";
        box.innerHTML = `
            <div class="border-b border-green-500 pb-2 mb-2">
                <h2 class="text-xl font-bold text-green-400">${item.name}</h2>
                <div class="text-[10px] text-green-600 tracking-widest">${typeLabel}</div>
            </div>
            
            <div class="text-sm text-green-200 mb-4 bg-green-900/20 p-3 text-left">
                <div class="mb-1 text-xs italic text-green-400">${item.desc || "Standard Ausrüstung."}</div>
                <div class="w-full h-px bg-green-900/50 my-2"></div>
                <div class="font-bold text-yellow-200">${statsText}</div>
            </div>

            <div class="flex justify-between items-center bg-black border border-green-900 p-2 mb-4">
                <span class="text-xs text-gray-400">PREIS:</span>
                <span class="font-mono font-bold text-xl ${costColor}">${item.cost} KK</span>
            </div>
            
            <div class="flex flex-col gap-2 w-full">
                <button id="btn-buy" class="action-button border-green-500 text-green-500 hover:bg-green-900 py-3 font-bold" ${!canAfford ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    ${canAfford ? 'KAUFEN' : 'ZU TEUER'}
                </button>
                <button id="btn-cancel" class="action-button border-red-500 text-red-500 hover:bg-red-900 py-2 font-bold">
                    ABBRUCH
                </button>
            </div>
        `;
        
        overlay.appendChild(box);
        
        const btnBuy = document.getElementById('btn-buy');
        if(canAfford) {
            btnBuy.onclick = () => { 
                Game.buyItem(itemKey); 
                this.leaveDialog(); 
            };
        }
        
        document.getElementById('btn-cancel').onclick = () => this.leaveDialog();
        this.refreshFocusables();
    },

    showItemConfirm: function(invIndex) {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        if(!Game.state.inventory || !Game.state.inventory[invIndex]) return;
        const invItem = Game.state.inventory[invIndex];
        const item = Game.items[invItem.id];
        
        if(!item) return;

        if(Game.state) Game.state.inDialog = true;
        
        overlay.onclick = (e) => { if(e.target === overlay) UI.leaveDialog(); };

        overlay.innerHTML = '';
        
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4 w-full pointer-events-auto";

        // Stimpack Logic
        if (invItem.id === 'stimpack') {
             box.innerHTML = `
                <h2 class="text-xl font-bold text-green-400 mb-2 border-b border-green-500 pb-2">${item.name}</h2>
                <div class="text-xs text-green-200 mb-4 bg-green-900/20 p-2">
                    <div class="flex justify-between"><span>TP Aktuell:</span> <span class="text-white font-bold">${Math.floor(Game.state.hp)} / ${Game.state.maxHp}</span></div>
                    <div class="flex justify-between"><span>Verfügbar:</span> <span class="text-yellow-400 font-bold">${invItem.count} Stück</span></div>
                </div>
                
                <div class="flex flex-col gap-3 w-full">
                    <button id="btn-use-one" class="action-button border-green-500 text-green-500 hover:bg-green-900 py-3 font-bold flex justify-between px-4">
                        <span>1x BENUTZEN</span>
                        <span class="text-xs mt-1 text-green-300">+${item.val} HP</span>
                    </button>
                    
                    <button id="btn-use-max" class="action-button border-blue-500 text-blue-400 hover:bg-blue-900 py-3 font-bold flex justify-between px-4">
                        <span>AUTO-HEAL (MAX)</span>
                        <span class="text-xs mt-1 text-blue-200">Bis voll</span>
                    </button>
                    
                    <button id="btn-cancel" class="action-button border-red-500 text-red-500 hover:bg-red-900 py-2 font-bold mt-2">
                        ABBRUCH
                    </button>
                </div>
            `;
            overlay.appendChild(box);
            
            document.getElementById('btn-use-one').onclick = () => { Game.useItem(invIndex, 1); this.leaveDialog(); };
            document.getElementById('btn-use-max').onclick = () => { Game.useItem(invIndex, 'max'); this.leaveDialog(); };
            document.getElementById('btn-cancel').onclick = () => { this.leaveDialog(); };
            
            this.refreshFocusables();
            return;
        }

        let statsText = "";
        let displayName = item.name;
        let isScrappable = false;
        
        if(invItem.props) {
            displayName = invItem.props.name;
            if(invItem.props.dmgMult) statsText = `Schaden: ${Math.floor(item.baseDmg * invItem.props.dmgMult)} (Mod)`;
        } else {
            if(item.type === 'consumable') statsText = `Effekt: ${item.effect} (${item.val})`;
            else if(item.type === 'weapon') statsText = `Schaden: ${item.baseDmg}`;
            else if(item.type === 'body') statsText = `Rüstung: +${item.bonus.END || 0} END`;
            else if(item.type === 'junk' || item.type === 'component') statsText = "Material / Schrott";
            else statsText = item.desc || "Item";
        }

        // Check if scrappable (Weapon/Armor) AND Workbench nearby
        if (['weapon', 'body', 'head', 'legs', 'feet', 'arms'].includes(item.type)) {
            isScrappable = true;
        }

        const isUsable = !['junk', 'component', 'misc', 'rare', 'ammo'].includes(item.type);
        const hasWorkbench = (Game.state.camp || (Game.state.zone && Game.state.zone.includes('Stadt')) || (Game.state.zone && Game.state.zone.includes('Vault 101')));

        box.innerHTML = `
            <h2 class="text-xl font-bold text-green-400 mb-2">${displayName}</h2>
            <div class="text-xs text-green-200 mb-4 border-t border-b border-green-900 py-2">Typ: ${item.type.toUpperCase()}<br>Wert: ${item.cost} KK<br><span class="text-yellow-400">${statsText}</span></div>
            <p class="text-green-200 mb-4 text-sm">${isUsable ? "Ausrüsten, Zerlegen oder Wegwerfen?" : "Nur Verkauf / Crafting"}</p>
        `;
        
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex flex-col gap-2 w-full mt-2";
        
        if (isUsable) {
            const btnYes = document.createElement('button');
            btnYes.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-3 font-bold w-full text-lg";
            btnYes.textContent = "BENUTZEN / AUSRÜSTEN";
            btnYes.onclick = () => { Game.useItem(invIndex); this.leaveDialog(); };
            btnContainer.appendChild(btnYes);
        }

        // [v5.9] Scrapping Button Logic
        if (isScrappable) {
            const btnScrap = document.createElement('button');
            if (hasWorkbench) {
                btnScrap.className = "border border-orange-500 text-orange-500 hover:bg-orange-900 px-4 py-2 font-bold w-full";
                btnScrap.innerHTML = "ZERLEGEN (Schrott) 🔧";
                btnScrap.onclick = () => { Game.scrapItem(invIndex); this.leaveDialog(); };
            } else {
                btnScrap.className = "border border-gray-600 text-gray-600 px-4 py-2 font-bold w-full cursor-not-allowed opacity-50";
                btnScrap.innerHTML = "ZERLEGEN (Werkbank benötigt)";
            }
            btnContainer.appendChild(btnScrap);
        }
        
        const row = document.createElement('div');
        row.className = "flex gap-2 w-full";
        
        const btnTrash = document.createElement('button');
        btnTrash.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold flex-1";
        btnTrash.innerHTML = "WEGWERFEN 🗑️";
        btnTrash.onclick = () => { Game.destroyItem(invIndex); this.leaveDialog(); };
        
        const btnNo = document.createElement('button');
        btnNo.className = "border border-gray-600 text-gray-500 hover:bg-gray-800 px-4 py-2 font-bold flex-1";
        btnNo.textContent = "ABBRUCH";
        btnNo.onclick = () => { this.leaveDialog(); };
        
        row.appendChild(btnTrash);
        row.appendChild(btnNo);
        
        btnContainer.appendChild(row);
        
        box.appendChild(btnContainer); overlay.appendChild(box);
        this.refreshFocusables();
    },

    showDungeonWarning: function(callback) {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        if(Game.state) Game.state.inDialog = true;
        
        overlay.onclick = (e) => { if(e.target === overlay) UI.leaveDialog(); };

        overlay.innerHTML = '';
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-red-600 p-4 shadow-[0_0_20px_red] max-w-sm text-center animate-pulse mb-4 pointer-events-auto";
        box.innerHTML = `
            <h2 class="text-3xl font-bold text-red-600 mb-2 tracking-widest">⚠️ WARNING ⚠️</h2>
            <p class="text-red-400 mb-4 font-bold">HOHE GEFAHR!<br>Sicher, dass du eintreten willst?</p>
        `;
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-2 justify-center w-full";
        const btnYes = document.createElement('button');
        btnYes.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full";
        btnYes.textContent = "BETRETEN";
        btnYes.onclick = () => { this.leaveDialog(); if(callback) callback(); };
        const btnNo = document.createElement('button');
        btnNo.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full";
        btnNo.textContent = "FLUCHT";
        btnNo.onclick = () => { this.leaveDialog(); };
        btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo);
        box.appendChild(btnContainer); overlay.appendChild(box);
        this.refreshFocusables();
    },

    showWastelandGamble: function(callback) {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        if(Game.state) Game.state.inDialog = true;
        overlay.innerHTML = '';
        
        // Prevent accidental close during gamble
        overlay.onclick = null;

        const box = document.createElement('div');
        box.className = "bg-black border-4 border-yellow-500 p-6 shadow-[0_0_40px_gold] max-w-sm text-center relative overflow-hidden pointer-events-auto";
        
        const bg = document.createElement('div');
        bg.className = "absolute inset-0 bg-yellow-900/20 z-0 pointer-events-none";
        box.appendChild(bg);
        
        box.innerHTML += `
            <h2 class="text-2xl font-bold text-yellow-400 mb-2 tracking-widest relative z-10">WASTELAND GAMBLE</h2>
            <p class="text-green-300 text-xs mb-4 relative z-10">Würfle um dein Schicksal!</p>
            
            <div id="dice-container" class="flex justify-center gap-4 mb-6 relative z-10">
                <div id="die-1" class="w-12 h-12 border-2 border-yellow-400 flex items-center justify-center text-3xl font-bold bg-black text-yellow-400 shadow-lg">?</div>
                <div id="die-2" class="w-12 h-12 border-2 border-yellow-400 flex items-center justify-center text-3xl font-bold bg-black text-yellow-400 shadow-lg">?</div>
                <div id="die-3" class="w-12 h-12 border-2 border-yellow-400 flex items-center justify-center text-3xl font-bold bg-black text-yellow-400 shadow-lg">?</div>
            </div>
            
            <button id="btn-roll" class="action-button w-full border-green-500 text-green-500 font-bold text-xl py-3 hover:bg-green-900 relative z-10">WÜRFELN!</button>
        `;
        
        overlay.appendChild(box);
        
        const btnRoll = document.getElementById('btn-roll');
        btnRoll.onclick = () => {
            btnRoll.disabled = true;
            btnRoll.textContent = "ROLLING...";
            
            let rolls = 0;
            const maxRolls = 20;
            const interval = setInterval(() => {
                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                const d3 = Math.floor(Math.random() * 6) + 1;
                document.getElementById('die-1').textContent = d1;
                document.getElementById('die-2').textContent = d2;
                document.getElementById('die-3').textContent = d3;
                rolls++;
                
                if(rolls >= maxRolls) {
                    clearInterval(interval);
                    const sum = parseInt(document.getElementById('die-1').textContent) + 
                                parseInt(document.getElementById('die-2').textContent) + 
                                parseInt(document.getElementById('die-3').textContent);
                    
                    btnRoll.textContent = `SUMME: ${sum}`;
                    btnRoll.classList.add('animate-pulse');
                    setTimeout(() => {
                        this.leaveDialog();
                        callback(sum);
                    }, 1500);
                }
            }, 50);
        };
    },

    showDungeonLocked: function(minutesLeft) {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        if(Game.state) Game.state.inDialog = true;
        
        overlay.onclick = (e) => { if(e.target === overlay) UI.leaveDialog(); };

        overlay.innerHTML = '';
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-gray-600 p-4 shadow-[0_0_20px_gray] max-w-sm text-center mb-4 pointer-events-auto";
        box.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-400 mb-2 tracking-widest">🔒 LOCKED</h2>
            <p class="text-gray-300 mb-4 font-bold">Dieses Gebiet ist versiegelt.<br>Versuche es in ${minutesLeft} Minuten wieder.</p>
        `;
        const btn = document.createElement('button');
        btn.className = "border border-gray-500 text-gray-500 hover:bg-gray-900 px-4 py-2 font-bold w-full";
        btn.textContent = "VERSTANDEN";
        btn.onclick = () => this.leaveDialog();
        box.appendChild(btn); overlay.appendChild(box);
        this.refreshFocusables();
    },

    showDungeonVictory: function(caps, lvl) {
        const overlay = document.createElement('div');
        overlay.id = "victory-overlay";
        overlay.className = "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 animate-fadeIn pointer-events-auto";
        
        overlay.innerHTML = `
            <div class="bg-black border-4 border-yellow-400 p-6 shadow-[0_0_30px_gold] max-w-md text-center mb-4 relative">
                <div class="text-6xl mb-2">👑⚔️</div>
                <h2 class="text-4xl font-bold text-yellow-400 mb-2 tracking-widest text-shadow-gold">VICTORY!</h2>
                <p class="text-yellow-200 mb-4 font-bold text-lg">DUNGEON (LVL ${lvl}) GECLEARED!</p>
                <div class="text-2xl text-white font-bold border-t border-b border-yellow-500 py-2 mb-4 bg-yellow-900/30">+${caps} KRONKORKEN</div>
                <p class="text-xs text-yellow-600 mb-4">Komme in 10 Minuten wieder!</p>
                <button id="btn-victory-close" class="action-button w-full border-yellow-500 text-yellow-500 font-bold hover:bg-yellow-900">ZURÜCK ZUR KARTE</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        if(Game.state) Game.state.inDialog = true;
        
        const btn = document.getElementById('btn-victory-close');
        if(btn) {
            btn.onclick = () => {
                const el = document.getElementById('victory-overlay');
                if(el) el.remove();
                if(Game.state) Game.state.inDialog = false;
                UI.leaveDialog(); 
            };
            btn.focus();
        }
    },
    
    showPermadeathWarning: function() {
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';
        
        if(Game.state) Game.state.inDialog = true;
        
        overlay.onclick = null; // Zwingende Bestätigung

        overlay.innerHTML = '';
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-red-600 p-6 shadow-[0_0_50px_red] max-w-lg text-center animate-pulse pointer-events-auto";
        box.innerHTML = `
            <div class="text-6xl text-red-600 mb-4 font-bold">☠️</div>
            <h1 class="text-4xl font-bold text-red-600 mb-4 tracking-widest border-b-2 border-red-600 pb-2">PERMADEATH AKTIV</h1>
            <p class="text-red-400 font-mono text-lg mb-6 leading-relaxed">WARNUNG, BEWOHNER!<br>Das Ödland kennt keine Gnade.<br>Wenn deine HP auf 0 fallen, wird dieser Charakter<br><span class="font-bold text-white bg-red-900 px-1">DAUERHAFT GELÖSCHT</span>.</p>
            <button class="action-button w-full border-red-600 text-red-500 font-bold py-4 text-xl hover:bg-red-900" onclick="UI.leaveDialog()">ICH HABE VERSTANDEN</button>
        `;
        overlay.appendChild(box);
    },

    showGameOver: function() {
        if(this.els.gameOver) this.els.gameOver.classList.remove('hidden');
        if(typeof Network !== 'undefined' && Game.state) Network.registerDeath(Game.state);
        this.toggleControls(false);
    },
    
    showManualOverlay: async function() {
        const overlay = document.getElementById('manual-overlay');
        const content = document.getElementById('manual-content');
        if(this.els.navMenu) { this.els.navMenu.classList.add('hidden'); this.els.navMenu.style.display = 'none'; }
        if(overlay && content) {
            content.innerHTML = '<div class="text-center animate-pulse">Lade Handbuch...</div>';
            overlay.style.display = 'flex'; overlay.classList.remove('hidden');
            const verDisplay = document.getElementById('version-display'); 
            const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
            try { 
                const res = await fetch(`readme.md?v=${ver}`); 
                if (!res.ok) throw new Error("Manual not found"); 
                let text = await res.text(); 
                text = text.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-yellow-400 mb-2 border-b border-yellow-500">$1</h1>');
                text = text.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-green-400 mt-4 mb-2">$1</h2>');
                text = text.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-green-300 mt-2 mb-1">$1</h3>');
                text = text.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
                text = text.replace(/\n/gim, '<br>');
                text += '<br><button class="action-button w-full mt-4 border-red-500 text-red-500" onclick="document.getElementById(\'manual-overlay\').classList.add(\'hidden\'); document.getElementById(\'manual-overlay\').style.display=\'none\';">SCHLIESSEN (ESC)</button>';
                content.innerHTML = text; 
            } catch(e) { content.innerHTML = `<div class="text-red-500">Fehler beim Laden: ${e.message}</div>`; }
        }
    },

    showChangelogOverlay: async function() {
        const overlay = document.getElementById('changelog-overlay');
        const content = document.getElementById('changelog-content');
        if(overlay && content) {
            content.textContent = 'Lade Daten...';
            overlay.style.display = 'flex'; overlay.classList.remove('hidden');
            const verDisplay = document.getElementById('version-display'); 
            const ver = verDisplay ? verDisplay.textContent.trim() : Date.now();
            try { const res = await fetch(`change.log?v=${ver}`); if (!res.ok) throw new Error("Logfile nicht gefunden"); const text = await res.text(); content.textContent = text; } catch(e) { content.textContent = `Fehler beim Laden: ${e.message}`; }
        }
    },

    enterVault: function() { 
        if(!this.els.dialog) this.restoreOverlay();
        const overlay = this.els.dialog;
        overlay.className = "absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto";
        overlay.style.display = 'flex';

        if(Game.state) Game.state.inDialog = true; 
        
        overlay.onclick = (e) => { if(e.target === overlay) UI.leaveDialog(); };

        overlay.innerHTML = ''; 
        const restBtn = document.createElement('button'); 
        restBtn.className = "action-button w-full mb-1 border-blue-500 text-blue-300 pointer-events-auto"; 
        restBtn.textContent = "Ausruhen (Gratis)"; 
        restBtn.onclick = () => { Game.rest(); this.leaveDialog(); }; 
        const leaveBtn = document.createElement('button'); 
        leaveBtn.className = "action-button w-full pointer-events-auto"; 
        leaveBtn.textContent = "Weiter geht's"; 
        leaveBtn.onclick = () => this.leaveDialog(); 
        overlay.appendChild(restBtn); 
        overlay.appendChild(leaveBtn); 
    },
    
    leaveDialog: function() { 
        if(Game.state) Game.state.inDialog = false; 
        if(this.els.dialog) {
            this.els.dialog.style.display = 'none'; 
            this.els.dialog.onclick = null; 
        }
        if(typeof this.update === 'function') this.update(); 
    }
});
