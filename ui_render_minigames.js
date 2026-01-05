Object.assign(UI, {
    
    renderHacking: function() {
        const h = MiniGames.hacking;
        let html = `
            <div class="w-full h-full flex flex-col p-2 font-mono text-green-500 bg-black overflow-hidden relative">
                <div class="flex justify-between border-b border-green-500 mb-2 pb-1">
                    <span class="font-bold">ROBCO INDUSTRIES (TM) TERM-LINK</span>
                    <div class="flex gap-2">
                        <button class="border border-green-500 px-2 text-xs hover:bg-green-900" onclick="UI.showMiniGameHelp('hacking')">?</button>
                        <span class="animate-pulse">ATTEMPTS: ${'█ '.repeat(h.attempts)}</span>
                    </div>
                </div>
                <div class="flex-grow flex gap-4 overflow-hidden relative">
                    <div id="hack-words" class="flex flex-col flex-wrap h-full content-start gap-x-8 text-sm">
                        </div>
                    <div class="w-1/3 border-l border-green-900 pl-2 text-xs overflow-y-auto flex flex-col-reverse" id="hack-log">
                        ${h.logs.map(l => `<div>${l}</div>`).join('')}
                    </div>
                </div>
                <button class="absolute bottom-2 right-2 border border-red-500 text-red-500 px-2 text-xs hover:bg-red-900" onclick="MiniGames.hacking.end()">ABORT</button>
            </div>
        `;
        
        if(this.els.view.innerHTML.indexOf('ROBCO') === -1) {
            this.els.view.innerHTML = html;
        } else {
             document.getElementById('hack-log').innerHTML = h.logs.map(l => `<div>${l}</div>`).join('');
             document.querySelector('.animate-pulse').textContent = `ATTEMPTS: ${'█ '.repeat(h.attempts)}`;
        }

        const wordContainer = document.getElementById('hack-words');
        if(wordContainer) {
            wordContainer.innerHTML = '';
            let buffer = "";
            h.words.forEach(word => {
                const hex = `0x${Math.floor(Math.random()*65535).toString(16).toUpperCase()}`;
                const btn = document.createElement('div');
                btn.className = "hack-row";
                btn.innerHTML = `<span class="hack-hex">${hex}</span> ${word}`;
                btn.onclick = () => MiniGames.hacking.checkWord(word);
                wordContainer.appendChild(btn);
            });
        }
    },

    renderLockpicking: function(init=false) {
        if(init) {
            this.els.view.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center bg-black relative select-none">
                    <div class="absolute top-2 left-2 text-xs text-gray-500">LEVEL: ${MiniGames.lockpicking.difficulty.toUpperCase()}</div>
                    <button class="absolute top-2 right-2 border border-green-500 text-green-500 px-2 font-bold hover:bg-green-900 z-50" onclick="UI.showMiniGameHelp('lockpicking')">?</button>
                    
                    <div class="lock-container">
                        <div class="lock-inner" id="lock-rotator"></div>
                        <div class="lock-center"></div>
                        <div class="bobby-pin" id="bobby-pin"></div>
                        <div class="screwdriver"></div>
                    </div>
                    <div class="mt-8 text-center text-sm text-green-300 font-mono">
                        <p>MAUS/TOUCH: Dietrich bewegen</p>
                        <p>LEERTASTE / KNOPF: Schloss drehen</p>
                    </div>
                    <button id="btn-turn-lock" class="mt-4 action-button w-40 h-16 md:hidden">DREHEN</button>
                    <button class="absolute bottom-4 right-4 border border-red-500 text-red-500 px-3 py-1 hover:bg-red-900" onclick="MiniGames.lockpicking.end()">ABBRECHEN</button>
                </div>
            `;
            const btn = document.getElementById('btn-turn-lock');
            if(btn) {
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); MiniGames.lockpicking.rotateLock(); });
                btn.addEventListener('touchend', (e) => { e.preventDefault(); MiniGames.lockpicking.releaseLock(); });
                btn.addEventListener('mousedown', () => MiniGames.lockpicking.rotateLock());
                btn.addEventListener('mouseup', () => MiniGames.lockpicking.releaseLock());
            }
        }
        
        const pin = document.getElementById('bobby-pin');
        const lock = document.getElementById('lock-rotator');
        
        if(pin) pin.style.transform = `rotate(${MiniGames.lockpicking.currentAngle - 90}deg)`; 
        if(lock) lock.style.transform = `rotate(${MiniGames.lockpicking.lockAngle}deg)`;
    },

    showMiniGameHelp: function(type) {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        
        let title = "", text = "";
        
        if(type === 'hacking') {
            title = "TERMINAL HACKING";
            text = `
                <ul class="text-left text-sm space-y-2 list-disc pl-4">
                    <li>Finde das korrekte Passwort im Speicher.</li>
                    <li>Wähle ein Wort. Das System zeigt die <b>LIKENESS</b> (Treffer) an.</li>
                    <li><b>Likeness</b> = Anzahl korrekter Buchstaben an der <b>korrekten Position</b>.</li>
                    <li>Beispiel: PW ist 'LOVE'. Du tippst 'LIVE'.<br>Ergebnis: 3/4 (L, V, E korrekt).</li>
                    <li>4 Versuche. Fehler = Sperrung!</li>
                </ul>
            `;
        } else {
            title = "SCHLOSS KNACKEN";
            text = `
                <ul class="text-left text-sm space-y-2 list-disc pl-4">
                    <li><b>Dietrich bewegen</b>: Maus bewegen oder auf Touchscreen ziehen.</li>
                    <li><b>Schloss drehen</b>: Leertaste oder Button drücken.</li>
                    <li>Wenn es wackelt: <b>SOFORT STOPPEN!</b> Der Dietrich bricht sonst.</li>
                    <li>Finde den 'Sweet Spot', wo sich das Schloss ganz drehen lässt.</li>
                </ul>
            `;
        }

        const box = document.createElement('div');
        box.className = "bg-black border-2 border-yellow-400 p-4 shadow-[0_0_20px_#aa0] max-w-md w-full text-center relative";
        box.innerHTML = `
            <h2 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-yellow-500 pb-2">${title}</h2>
            <div class="text-green-300 mb-6 font-mono">${text}</div>
            <button class="action-button w-full border-green-500 text-green-500 font-bold" onclick="UI.leaveDialog()">VERSTANDEN</button>
        `;
        this.els.dialog.appendChild(box);
    }
});
