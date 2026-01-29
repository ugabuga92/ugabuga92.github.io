// [2026-01-28 17:30:00] ui_render_overlays.js - Complete with Dynamic HUD & Epic Quest Animation

Object.assign(UI, {
    
    // [v0.5.5] ZENTRALE OVERLAY LOGIC (Layer 1 - Hauptdialoge)
    restoreOverlay: function() {
        let overlay = document.getElementById('ui-dialog-overlay');
        if(!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ui-dialog-overlay';
            // Z-Index 60 für Hauptdialoge
            overlay.className = "absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm hidden pointer-events-auto";
            document.body.appendChild(overlay);
            this.els.dialog = overlay;
        }
        
        // RESET Click Handler: Klick auf Hintergrund schließt Layer 1
        overlay.onclick = (e) => {
            if(e.target === overlay) {
                e.preventDefault();
                e.stopPropagation();
                UI.leaveDialog();
            }
        };
        
        return overlay;
    },

    // Schließt Layer 1 (Hauptdialoge) und entfernt ESC-Listener
    leaveDialog: function() {
        if(Game.state) Game.state.inDialog = false;
        
        // ESC Listener aufräumen
        if(this._activeEscHandler) {
            document.removeEventListener('keydown', this._activeEscHandler);
            this._activeEscHandler = null;
        }
        
        const overlay = this.els.dialog || document.getElementById('ui-dialog-overlay');
        if(overlay) {
            overlay.style.display = 'none';
            overlay.innerHTML = ''; 
        }
        
        // UI Update feuern
        if(typeof this.update === 'function') this.update();
        
        // Falls wir im Inventar waren, Liste neu laden (z.B. nach Verbrauch)
        if(document.getElementById('inventory-list')) {
            if(typeof UI.renderInventory === 'function') UI.renderInventory();
        }
    },

    // Helper: Aktiviert ESC-Falle
    _trapEscKey: function() {
        if(this._activeEscHandler) document.removeEventListener('keydown', this._activeEscHandler);
        
        this._activeEscHandler = (e) => {
            if(e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation(); // Verhindert Schließen von Fenstern im Hintergrund
                UI.leaveDialog();
            }
        };
        document.addEventListener('keydown', this._activeEscHandler);
    },

    // [NEU] GENERISCHER CONFIRM DIALOG (JA/NEIN)
    showConfirm: function(title, htmlContent, onConfirm) {
        if(Game.state) Game.state.inDialog = true;

        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        this._trapEscKey();

        const box = document.createElement('div');
        box.className = "bg-black border-2 border-yellow-400 p-4 shadow-[0_0_20px_#aa0] max-w-md w-full relative animate-float-in pointer-events-auto mx-4";
        box.onclick = (e) => e.stopPropagation();

        box.innerHTML = `
            <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-yellow-500 pb-2 tracking-widest">${title}</h2>
            <div class="text-green-300 mb-6 font-mono text-sm leading-relaxed">${htmlContent}</div>
            <div class="flex gap-4">
                <button id="btn-confirm-yes" class="action-button flex-1 border-green-500 text-green-500 hover:bg-green-900 font-bold py-2">BESTÄTIGEN</button>
                <button id="btn-confirm-no" class="action-button flex-1 border-red-500 text-red-500 hover:bg-red-900 font-bold py-2">ABBRUCH</button>
            </div>
        `;

        overlay.appendChild(box);

        document.getElementById('btn-confirm-yes').onclick = () => {
            UI.leaveDialog();
            if (onConfirm) onConfirm();
        };

        document.getElementById('btn-confirm-no').onclick = () => {
            UI.leaveDialog();
        };
    },

    // [v0.5.5] GENERIC INFO DIALOG (Layer 2 - Info Popups)
    showInfoDialog: function(title, htmlContent) {
        if(Game.state) Game.state.inDialog = true;

        const infoOverlay = document.createElement('div');
        // --- FIX: Z-Index auf 2000 erhöht (vorher 70), damit es über dem Char-Screen (1000) liegt ---
        infoOverlay.className = "fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn pointer-events-auto";
        
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-yellow-400 p-4 shadow-[0_0_20px_#aa0] max-w-md w-full relative animate-float-in pointer-events-auto mx-4";
        box.onclick = (e) => e.stopPropagation();

        box.innerHTML = `
            <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-yellow-500 pb-2">${title}</h2>
            <div class="text-green-300 mb-6 font-mono text-sm max-h-[60vh] overflow-y-auto custom-scroll">${htmlContent}</div>
        `;

        const btn = document.createElement('button');
        btn.className = "action-button w-full border-green-500 text-green-500 hover:bg-green-900";
        btn.textContent = "VERSTANDEN";
        
        const closeLayer2 = (e) => {
            if(e) { e.preventDefault(); e.stopPropagation(); }
            infoOverlay.remove();
            
            // Check ob Layer 1 noch offen ist
            const baseOverlay = document.getElementById('ui-dialog-overlay');
            const isBaseOpen = baseOverlay && baseOverlay.style.display !== 'none';
            
            if(!isBaseOpen) {
                if(Game.state) Game.state.inDialog = false;
            }
        };

        btn.onclick = closeLayer2;
        infoOverlay.onclick = (e) => { if(e.target === infoOverlay) closeLayer2(e); };

        box.appendChild(btn);
        infoOverlay.appendChild(box);
        document.body.appendChild(infoOverlay);
    },

    // [v0.5.5] INVENTAR ITEM DETAILS & AKTIONEN
    showItemConfirm: function(invIndex) {
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        this._trapEscKey();
        
        if(!Game.state.inventory || !Game.state.inventory[invIndex]) return;
        const invItem = Game.state.inventory[invIndex];
        const item = Game.items[invItem.id];
        
        if(!item) return;
        if(Game.state) Game.state.inDialog = true;
        
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4 w-full pointer-events-auto";
        box.onclick = (e) => e.stopPropagation();

        // --- SPEZIAL LOGIK: STIMPACK ---
        const isStimpack = (invItem.id && invItem.id.toLowerCase().includes('stimpack')) || (item.name && item.name.toLowerCase().includes('stimpack'));

        if (isStimpack) {
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
            
            // Events binden
            document.getElementById('btn-use-one').onclick = () => { Game.useItem(invIndex, 1); setTimeout(() => UI.leaveDialog(), 50); };
            document.getElementById('btn-use-max').onclick = () => { Game.useItem(invIndex, 'max'); setTimeout(() => UI.leaveDialog(), 50); };
            document.getElementById('btn-cancel').onclick = () => { UI.leaveDialog(); };
            return;
        }

        // --- GENERISCHES ITEM ---
        let statsText = "";
        let displayName = item.name;
        
        if(invItem.props) {
            displayName = invItem.props.name;
            if(invItem.props.dmgMult) statsText = `Schaden: ${Math.floor(item.baseDmg * invItem.props.dmgMult)} (Mod)`;
        } else {
            if(item.type === 'consumable') statsText = `Effekt: ${item.effect} (${item.val})`;
            else if(item.type === 'weapon') statsText = `Schaden: ${item.baseDmg}`;
            else if(item.type === 'body') statsText = `Rüstung: +${item.bonus ? item.bonus.END : 0} END`;
            else if(item.type === 'junk' || item.type === 'component') statsText = "Material / Schrott";
            else statsText = item.desc || "Item";
        }

        const isUsable = !['junk', 'component', 'misc', 'rare', 'ammo'].includes(item.type);

        box.innerHTML = `
            <h2 class="text-xl font-bold text-green-400 mb-2">${displayName}</h2>
            <div class="text-xs text-green-200 mb-4 border-t border-b border-green-900 py-2">Typ: ${item.type.toUpperCase()}<br>Wert: ${item.cost} KK<br><span class="text-yellow-400">${statsText}</span></div>
            <p class="text-green-200 mb-4 text-sm">${isUsable ? "Gegenstand benutzen oder wegwerfen?" : "Dieses Item kann nur verkauft oder zum Craften verwendet werden."}</p>
        `;
        
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex flex-col gap-2 w-full mt-2";
        
        if (isUsable) {
            const btnYes = document.createElement('button');
            btnYes.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-3 font-bold w-full text-lg";
            btnYes.textContent = "BENUTZEN / AUSRÜSTEN";
            btnYes.onclick = () => { Game.useItem(invIndex); setTimeout(() => UI.leaveDialog(), 50); };
            btnContainer.appendChild(btnYes);
        }
        
        const row = document.createElement('div');
        row.className = "flex gap-2 w-full";
        
        const btnTrash = document.createElement('button');
        btnTrash.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold flex-1";
        btnTrash.innerHTML = "WEGWERFEN 🗑️";
        btnTrash.onclick = () => { Game.destroyItem(invIndex); setTimeout(() => UI.leaveDialog(), 50); };
        
        const btnNo = document.createElement('button');
        btnNo.className = "border border-gray-600 text-gray-500 hover:bg-gray-800 px-4 py-2 font-bold flex-1";
        btnNo.textContent = "ABBRUCH";
        btnNo.onclick = () => { UI.leaveDialog(); };
        
        row.appendChild(btnTrash);
        row.appendChild(btnNo);
        btnContainer.appendChild(row);
        
        box.appendChild(btnContainer); 
        overlay.appendChild(box);
    },

    // [v0.5.5] AUSGERÜSTETES ITEM DIALOG
    showEquippedDialog: function(slot) {
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        this._trapEscKey();
        
        if(Game.state) Game.state.inDialog = true;

        const item = Game.state.equip[slot];
        const name = item.props ? item.props.name : item.name;

        const box = document.createElement('div');
        box.className = "bg-black border-2 border-yellow-500 p-4 shadow-[0_0_15px_#aa0] max-w-sm text-center mb-4 w-full pointer-events-auto";
        box.onclick = (e) => e.stopPropagation();

        box.innerHTML = `
            <div class="text-xs text-yellow-600 font-bold tracking-widest mb-1">SLOT: ${slot.toUpperCase()}</div>
            <h2 class="text-xl font-bold text-yellow-400 mb-4 border-b border-yellow-500 pb-2">${name}</h2>
            <div class="flex flex-col gap-2 w-full">
                <button id="btn-unequip" class="action-button w-full border-yellow-500 text-yellow-500 hover:bg-yellow-900 py-3 font-bold">
                    ABLEGEN (INS INVENTAR)
                </button>
                <button id="btn-cancel-eq" class="action-button border-gray-600 text-gray-500 hover:bg-gray-800 py-2 font-bold mt-2">
                    ABBRUCH
                </button>
            </div>
        `;
        overlay.appendChild(box);

        document.getElementById('btn-unequip').onclick = () => { Game.unequipItem(slot); setTimeout(() => UI.leaveDialog(), 50); };
        document.getElementById('btn-cancel-eq').onclick = () => { UI.leaveDialog(); };
    },

    // --- SONSTIGE DIALOGE (Shop, Quest, etc.) ---

    // [v3.1] Epic Quest Completion Overlay
    showQuestComplete: function(questDef) {
        let container = document.getElementById('hud-quest-overlay');
        if(!container) {
             const view = document.getElementById('game-screen'); 
             if(!view) return;
             container = document.createElement('div');
             container.id = 'hud-quest-overlay';
             container.className = "fixed top-24 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-[100] w-full max-w-sm";
             view.appendChild(container);
        }

        const msg = document.createElement('div');
        msg.className = "w-full bg-black/95 border-2 border-yellow-400 p-4 shadow-[0_0_30px_rgba(255,215,0,0.6)] mb-4 text-center transform transition-all duration-700 scale-0 opacity-0";
        
        let rewardItems = "";
        if(questDef.reward?.items) {
            rewardItems = questDef.reward.items.map(it => `<div>📦 ${it.c || 1}x ${Game.items[it.id]?.name || it.id}</div>`).join("");
        }

        msg.innerHTML = `
            <div class="text-yellow-500 font-bold tracking-[0.2em] text-[10px] mb-1 animate-pulse">QUEST ERFÜLLT</div>
            <div class="text-2xl font-bold text-white mb-3 uppercase tracking-tighter shadow-black text-shadow-lg">${questDef.title}</div>
            <div class="flex flex-col gap-1 py-2 border-t border-yellow-900/50 bg-yellow-900/10 font-mono text-xs">
                ${questDef.reward?.xp ? `<div class="text-cyan-400">⚡ +${questDef.reward.xp} XP</div>` : ""}
                ${questDef.reward?.caps ? `<div class="text-yellow-400">💰 +${questDef.reward.caps} KK</div>` : ""}
                ${rewardItems}
            </div>
            <div class="absolute -inset-1 bg-yellow-400/5 animate-ping rounded-lg pointer-events-none"></div>
        `;

        container.appendChild(msg);

        requestAnimationFrame(() => {
            msg.classList.remove('scale-0', 'opacity-0');
            msg.classList.add('scale-100', 'opacity-100');
        });

        setTimeout(() => {
            msg.classList.add('translate-y-[-20px]', 'opacity-0', 'scale-90');
            setTimeout(() => msg.remove(), 700);
        }, 4500);
    },

    // [NEU] ACTIVE QUEST HUD TRACKER
    // Automatisch positioniert neben Camp-Button (Links oben)
    updateQuestTracker: function() {
        // 1. Container suchen oder erstellen
        let hud = document.getElementById('quest-tracker-hud');
        if(!hud) {
            const view = document.getElementById('game-screen');
            if(!view) return; // Wenn Spiel noch nicht geladen, abbrechen
            hud = document.createElement('div');
            hud.id = 'quest-tracker-hud';
            // Start mit Basis-Klasse (left wird unten überschrieben)
            hud.className = "absolute top-2 z-40 bg-black/80 border-l-4 border-yellow-500 p-2 max-w-xs shadow-lg pointer-events-none transition-all duration-500";
            view.appendChild(hud);
        }

        // 2. Prüfen ob wir eine Quest tracken
        if(!Game.state || !Game.state.trackedQuestId) {
            hud.style.opacity = '0';
            return;
        }

        const qId = Game.state.trackedQuestId;
        const qData = Game.state.activeQuests.find(q => q.id === qId);
        const def = Game.questDefs.find(d => d.id === qId);

        if(!qData || !def) {
            // Falls Quest erledigt oder nicht gefunden, Tracker ausblenden
            hud.style.opacity = '0';
            return;
        }

        hud.style.opacity = '1';
        
        // Dynamische Positionierung: Rechts neben dem Camp Button (wenn existent)
        // Camp Button ist oben links (left-2). 
        // Wenn Camp da ist (Game.state.camp !== null), muss HUD weiter nach rechts.
        // Wenn kein Camp, kann HUD direkt an left-16 (ca. 64px) oder sogar left-2 (wenn Camp ganz weg ist)
        
        // Wir nehmen an: Sektor-Anzeige ist ganz links. Camp-Button (wenn da) ist daneben.
        // Wenn Camp da ist -> HUD weiter rechts.
        const hasCamp = (Game.state.camp !== null);
        const leftClass = hasCamp ? 'left-32' : 'left-16'; 
        
        // Klasse neu setzen mit korrekter Position
        hud.className = `absolute top-2 ${leftClass} z-40 bg-black/80 border-l-4 border-yellow-500 p-2 max-w-xs shadow-lg pointer-events-none transition-all duration-500`;

        // 3. Inhalt bauen
        let objectives = "";
        
        // A) Multi-Collect
        if(def.type === 'collect_multi') {
            objectives = Object.entries(def.reqItems).map(([id, amt]) => {
                const inInv = Game.state.inventory.filter(i => i.id === id).reduce((s, i) => s + i.count, 0);
                const iName = Game.items[id]?.name || id;
                const done = inInv >= amt;
                const icon = done ? "✔" : "☐";
                return `<div class="${done ? 'text-green-500 line-through' : 'text-yellow-100'} text-xs font-mono ml-2">
                    ${icon} ${inInv}/${amt} ${iName}
                </div>`;
            }).join('');
        } 
        // B) Standard (Kill, Collect, Visit)
        else {
            const current = qData.progress;
            const max = qData.max;
            let verb = "Ziel";
            if(def.type === 'kill') verb = "Eliminiere";
            if(def.type === 'collect') verb = "Sammle";
            if(def.type === 'visit') verb = "Reise nach";
            
            objectives = `<div class="text-yellow-100 text-xs font-mono ml-2">
                [${current}/${max}] ${verb} ${def.target}
            </div>`;
        }

        // 4. Richtungsanzeige (Kompass)
        let directionHint = "";
        if(def.target && typeof def.target === 'string' && def.target.includes(',')) {
            const coords = def.target.split(',').map(Number);
            if(coords.length === 2 && Game.state.sector) {
                const tx = coords[0]; const ty = coords[1];
                const cx = Game.state.sector.x; const cy = Game.state.sector.y;
                
                if(tx === cx && ty === cy) {
                    directionHint = `<div class="text-green-400 text-[10px] mt-1 animate-pulse">📍 ZIEL IM AKTUELLEN SEKTOR!</div>`;
                } else {
                    let dir = "";
                    if(ty < cy) dir += "Nord";
                    if(ty > cy) dir += "Süd";
                    if(tx > cx) dir += "ost";
                    if(tx < cx) dir += "west";
                    if(dir) directionHint = `<div class="text-gray-400 text-[10px] mt-1 italic">📡 Ziel liegt im ${dir}</div>`;
                }
            }
        }

        hud.innerHTML = `
            <div class="text-yellow-500 font-bold text-xs uppercase tracking-widest mb-1 shadow-black">◉ ${def.title}</div>
            <div class="flex flex-col gap-1 mb-1">
                ${objectives}
            </div>
            ${directionHint}
        `;
    },

    showMapLegend: function() {
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        this._trapEscKey();
        
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-green-500 p-6 shadow-[0_0_30px_green] max-w-sm w-full relative pointer-events-auto";
        box.onclick = (e) => e.stopPropagation();

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
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        if(Game.state) Game.state.inDialog = true;
        this._trapEscKey();

        overlay.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 border-2 border-green-500 bg-black shadow-[0_0_20px_green] pointer-events-auto" onclick="event.stopPropagation()">
                <div class="text-green-500 animate-pulse text-2xl mb-6">EMPFANGE DATEN...</div>
                <button class="action-button border-red-500 text-red-500 w-full" onclick="UI.leaveDialog()">ABBRECHEN</button>
            </div>`;

        try {
            const scores = await Network.getHighscores();
            if(!scores) throw new Error("Keine Daten empfangen.");

            scores.sort((a,b) => b.lvl - a.lvl || b.xp - a.xp);

            const box = document.createElement('div');
            box.className = "bg-black border-4 border-green-600 p-4 shadow-[0_0_30px_green] w-full max-w-2xl max-h-[90%] flex flex-col relative pointer-events-auto";
            box.onclick = (e) => e.stopPropagation();

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

                    const icon = isDead ? '❌' : (isTop3 ? '🏆' : '');
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
                <div class="border-2 border-red-500 bg-black p-6 text-center shadow-[0_0_20px_red] pointer-events-auto" onclick="event.stopPropagation()">
                    <div class="text-red-500 font-bold text-2xl mb-4 tracking-widest">NETZWERK FEHLER</div>
                    <div class="text-green-400 font-mono mb-6">${msg}</div>
                    <button class="action-button w-full border-red-500 text-red-500" onclick="UI.leaveDialog()">SCHLIESSEN</button>
                </div>
            `;
        }
    },

    showShopConfirm: function(itemKey) {
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        this._trapEscKey();
        
        const item = Game.items[itemKey];
        if(!item) return;

        if(Game.state) Game.state.inDialog = true;
        
        let statsText = "";
        let typeLabel = item.type.toUpperCase();
        if(item.type === 'consumable') { statsText = `Effekt: ${item.effect} (${item.val})`; typeLabel = "VERBRAUCHSGEGENSTAND"; } 
        else if(item.type === 'weapon') { statsText = `Schaden: ${item.baseDmg}`; typeLabel = "WAFFE"; } 
        else if(item.type === 'body') { const bonus = item.bonus ? Object.entries(item.bonus).map(([k,v]) => `+${v} ${k}`).join(', ') : 'Keine'; statsText = `Rüstung: ${bonus}`; typeLabel = "KLEIDUNG / RÜSTUNG"; } 
        else if(item.type === 'junk' || item.type === 'component') { statsText = "Material für Handwerk"; typeLabel = "SCHROTT / MATERIAL"; } 
        else if(item.type === 'tool' || item.type === 'blueprint') { statsText = "Bauplan / Werkzeug"; typeLabel = "AUSRÜSTUNG"; }

        const canAfford = Game.state.caps >= item.cost;
        const costColor = canAfford ? "text-yellow-400" : "text-red-500";

        const box = document.createElement('div');
        box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4 w-full pointer-events-auto";
        box.onclick = (e) => e.stopPropagation();

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
        if(canAfford && btnBuy) {
            btnBuy.onclick = () => { 
                Game.buyItem(itemKey); 
                UI.leaveDialog(); 
            };
        }
        
        document.getElementById('btn-cancel').onclick = () => UI.leaveDialog();
    },

    showDungeonWarning: function(callback) {
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        this._trapEscKey();

        if(Game.state) Game.state.inDialog = true;
        
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-red-600 p-4 shadow-[0_0_20px_red] max-w-sm text-center animate-pulse mb-4 pointer-events-auto";
        box.onclick = (e) => e.stopPropagation();

        box.innerHTML = `
            <h2 class="text-3xl font-bold text-red-600 mb-2 tracking-widest">⚠️ WARNING ⚠️</h2>
            <p class="text-red-400 mb-4 font-bold">HOHE GEFAHR!<br>Sicher, dass du eintreten willst?</p>
        `;
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-2 justify-center w-full";
        const btnYes = document.createElement('button');
        btnYes.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full";
        btnYes.textContent = "BETRETEN";
        btnYes.onclick = () => { UI.leaveDialog(); if(callback) callback(); };
        const btnNo = document.createElement('button');
        btnNo.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full";
        btnNo.textContent = "FLUCHT";
        btnNo.onclick = () => { UI.leaveDialog(); };
        btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo);
        box.appendChild(btnContainer); overlay.appendChild(box);
    },

    showWastelandGamble: function(callback) {
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        
        if(Game.state) Game.state.inDialog = true;
        
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
                        UI.leaveDialog();
                        callback(sum);
                    }, 1500);
                }
            }, 50);
        };
    },

    showDungeonLocked: function(minutesLeft) {
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        this._trapEscKey();
        
        if(Game.state) Game.state.inDialog = true;

        const box = document.createElement('div');
        box.className = "bg-black border-2 border-gray-600 p-4 shadow-[0_0_20px_gray] max-w-sm text-center mb-4 pointer-events-auto";
        box.onclick = (e) => e.stopPropagation();

        box.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-400 mb-2 tracking-widest">🔒 LOCKED</h2>
            <p class="text-gray-300 mb-4 font-bold">Dieses Gebiet ist versiegelt.<br>Versuche es in ${minutesLeft} Minuten wieder.</p>
        `;
        const btn = document.createElement('button');
        btn.className = "border border-gray-500 text-gray-500 hover:bg-gray-900 px-4 py-2 font-bold w-full";
        btn.textContent = "VERSTANDEN";
        btn.onclick = () => UI.leaveDialog();
        box.appendChild(btn); overlay.appendChild(box);
    },

    showDungeonVictory: function(caps, lvl) {
        const overlay = document.createElement('div');
        overlay.id = "victory-overlay";
        overlay.className = "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 animate-fadeIn pointer-events-auto";
        
        overlay.innerHTML = `
            <div class="bg-black border-4 border-yellow-400 p-6 shadow-[0_0_30px_gold] max-w-md text-center mb-4 relative" onclick="event.stopPropagation()">
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
        const overlay = this.restoreOverlay();
        overlay.style.display = 'flex';
        overlay.innerHTML = '';
        
        if(Game.state) Game.state.inDialog = true;
        
        overlay.onclick = null; // Zwingende Bestätigung

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
        const overlay = this.restoreOverlay(); 
        overlay.style.display = 'flex';
        overlay.innerHTML = ''; 

        if(Game.state) Game.state.inDialog = true; 
        
        const box = document.createElement('div');
        box.className = "flex flex-col gap-2 w-full max-w-sm p-4 bg-black border-2 border-blue-500 shadow-[0_0_20px_blue] pointer-events-auto";
        box.onclick = (e) => e.stopPropagation();

        const msg = document.createElement('div');
        msg.innerHTML = "<h2 class='text-blue-300 font-bold mb-2'>VAULT 101</h2><p class='text-sm text-gray-400'>Sicherer Schlafplatz. Kostet nichts, heilt alles.</p>";
        
        const restBtn = document.createElement('button'); 
        restBtn.className = "action-button w-full border-blue-500 text-blue-300"; 
        restBtn.textContent = "Ausruhen (Gratis)"; 
        restBtn.onclick = () => { Game.rest(); UI.leaveDialog(); }; 
        
        const leaveBtn = document.createElement('button'); 
        leaveBtn.className = "action-button w-full"; 
        leaveBtn.textContent = "Weiter geht's"; 
        leaveBtn.onclick = () => UI.leaveDialog(); 
        
        box.appendChild(msg);
        box.appendChild(restBtn); 
        box.appendChild(leaveBtn);
        overlay.appendChild(box);
    }
});
