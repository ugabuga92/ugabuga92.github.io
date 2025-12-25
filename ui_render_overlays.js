// [v0.4.15]
// Overlays, Dialogs & Popups
Object.assign(UI, {
    
    showItemConfirm: function(itemId) {
        if(!this.els.dialog) this.restoreOverlay();
        if(!Game.items[itemId]) return;
        const item = Game.items[itemId];
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        let statsText = "";
        if(item.type === 'consumable') statsText = `Effekt: ${item.effect} (${item.val})`;
        if(item.type === 'weapon') statsText = `Schaden: ${item.baseDmg}`;
        if(item.type === 'body') statsText = `Rüstung: +${item.bonus.END || 0} END`;
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4";
        box.innerHTML = `
            <h2 class="text-xl font-bold text-green-400 mb-2">${item.name}</h2>
            <div class="text-xs text-green-200 mb-4 border-t border-b border-green-900 py-2">Typ: ${item.type.toUpperCase()}<br>Wert: ${item.cost} KK<br><span class="text-yellow-400">${statsText}</span></div>
            <p class="text-green-200 mb-4 text-sm">Gegenstand benutzen / ausrüsten?</p>
        `;
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-2 justify-center w-full";
        const btnYes = document.createElement('button');
        btnYes.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full";
        btnYes.textContent = "BESTÄTIGEN";
        btnYes.onclick = () => { Game.useItem(itemId); this.leaveDialog(); };
        const btnNo = document.createElement('button');
        btnNo.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full";
        btnNo.textContent = "ABBRUCH";
        btnNo.onclick = () => { this.leaveDialog(); };
        btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo);
        box.appendChild(btnContainer); this.els.dialog.appendChild(box);
        this.refreshFocusables();
    },

    showDungeonWarning: function(callback) {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-red-600 p-4 shadow-[0_0_20px_red] max-w-sm text-center animate-pulse mb-4";
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
        box.appendChild(btnContainer); this.els.dialog.appendChild(box);
        this.refreshFocusables();
    },

    showWastelandGamble: function(callback) {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-yellow-500 p-6 shadow-[0_0_40px_gold] max-w-sm text-center relative overflow-hidden";
        
        // Background Effect
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
        
        this.els.dialog.appendChild(box);
        
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
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-2 border-gray-600 p-4 shadow-[0_0_20px_gray] max-w-sm text-center mb-4";
        box.innerHTML = `
            <h2 class="text-3xl font-bold text-gray-400 mb-2 tracking-widest">🔒 LOCKED</h2>
            <p class="text-gray-300 mb-4 font-bold">Dieses Gebiet ist versiegelt.<br>Versuche es in ${minutesLeft} Minuten wieder.</p>
        `;
        const btn = document.createElement('button');
        btn.className = "border border-gray-500 text-gray-500 hover:bg-gray-900 px-4 py-2 font-bold w-full";
        btn.textContent = "VERSTANDEN";
        btn.onclick = () => this.leaveDialog();
        box.appendChild(btn); this.els.dialog.appendChild(box);
        this.refreshFocusables();
    },

    showDungeonVictory: function(caps, lvl) {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-yellow-400 p-6 shadow-[0_0_30px_gold] max-w-md text-center mb-4 animate-bounce";
        box.innerHTML = `
            <div class="text-6xl mb-2">👑⚔️</div>
            <h2 class="text-4xl font-bold text-yellow-400 mb-2 tracking-widest text-shadow-gold">VICTORY!</h2>
            <p class="text-yellow-200 mb-4 font-bold text-lg">DUNGEON (LVL ${lvl}) GECLEARED!</p>
            <div class="text-2xl text-white font-bold border-t border-b border-yellow-500 py-2 mb-4 bg-yellow-900/30">+${caps} KRONKORKEN</div>
            <p class="text-xs text-yellow-600">Komme in 10 Minuten wieder!</p>
        `;
        this.els.dialog.appendChild(box);
    },
    
    showPermadeathWarning: function() {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-red-600 p-6 shadow-[0_0_50px_red] max-w-lg text-center animate-pulse";
        box.innerHTML = `
            <div class="text-6xl text-red-600 mb-4 font-bold">☠️</div>
            <h1 class="text-4xl font-bold text-red-600 mb-4 tracking-widest border-b-2 border-red-600 pb-2">PERMADEATH AKTIV</h1>
            <p class="text-red-400 font-mono text-lg mb-6 leading-relaxed">WARNUNG, BEWOHNER!<br>Das Ödland kennt keine Gnade.<br>Wenn deine HP auf 0 fallen, wird dieser Charakter<br><span class="font-bold text-white bg-red-900 px-1">DAUERHAFT GELÖSCHT</span>.</p>
            <button class="action-button w-full border-red-600 text-red-500 font-bold py-4 text-xl hover:bg-red-900" onclick="UI.leaveDialog()">ICH HABE VERSTANDEN</button>
        `;
        this.els.dialog.appendChild(box);
    },

    showGameOver: function() {
        if(this.els.gameOver) this.els.gameOver.classList.remove('hidden');
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
    
    leaveDialog: function() { 
        Game.state.inDialog = false; 
        this.els.dialog.style.display = 'none'; 
        this.update(); 
    }
});
