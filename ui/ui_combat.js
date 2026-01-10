// [TIMESTAMP] 2026-01-10 23:55:00 - ui_combat.js - Safe Mode & Error Handling

Object.assign(UI, {

    // ==========================================
    // === TACTICAL COMBAT HUD (SAFE MODE) ===
    // ==========================================
    renderCombat: function() {
        console.log("[UI] Starting renderCombat...");
        try {
            Game.state.view = 'combat';
            const view = document.getElementById('view-container');
            if(!view) { console.error("No view-container found!"); return; }
            
            // Sicherheitscheck: Kein Gegner? Zurück zur Map.
            if(!Combat.enemy) { 
                console.warn("No enemy in Combat.enemy, switching to map.");
                UI.switchView('map'); 
                return; 
            }

            view.innerHTML = ''; 

            // --- BASIS LAYOUT ---
            const wrapper = document.createElement('div');
            wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden select-none";

            // 1. BACKGROUND FX
            const bgFX = document.createElement('div');
            bgFX.className = "absolute inset-0 pointer-events-none z-0 opacity-20";
            bgFX.style.backgroundImage = `
                linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .3) 25%, rgba(0, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .3) 75%, rgba(0, 255, 0, .3) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, .3) 25%, rgba(0, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .3) 75%, rgba(0, 255, 0, .3) 76%, transparent 77%, transparent)
            `;
            bgFX.style.backgroundSize = "50px 50px";
            wrapper.appendChild(bgFX);

            const feedbackLayer = document.createElement('div');
            feedbackLayer.id = "combat-feedback-layer";
            feedbackLayer.className = "absolute inset-0 pointer-events-none z-50 overflow-hidden";
            wrapper.appendChild(feedbackLayer);

            const flashLayer = document.createElement('div');
            flashLayer.id = "damage-flash";
            flashLayer.className = "absolute inset-0 bg-red-500 pointer-events-none z-40 hidden transition-opacity duration-300 opacity-0";
            wrapper.appendChild(flashLayer);

            // --- HUD CONTAINER ---
            const hudContainer = document.createElement('div');
            hudContainer.className = "flex-grow relative flex flex-col items-center justify-center z-10 p-4";

            // 2. TOP BAR (Gegner Status)
            // Safety Checks für Enemy Stats
            let eMax = Combat.enemy.maxHp || 100;
            let eHp = Combat.enemy.hp !== undefined ? Combat.enemy.hp : eMax;
            let hpPercent = Math.max(0, Math.min(100, (eHp / eMax) * 100));
            let isLegendary = Combat.enemy.isLegendary;
            let themeColor = isLegendary ? "yellow" : "red";
            
            const topBar = document.createElement('div');
            topBar.className = "w-full max-w-lg flex flex-col items-center mb-4 relative";
            topBar.innerHTML = `
                <div class="flex justify-between w-full border-b-2 border-${themeColor}-500/50 pb-1 mb-1 items-end">
                    <span class="text-2xl font-bold text-${themeColor}-500 font-vt323 tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]">
                        ${Combat.enemy.name || "FEIND"} ${isLegendary ? '★' : ''}
                    </span>
                    <span class="text-lg font-mono text-${themeColor}-300">${Math.ceil(eHp)}/${eMax} HP</span>
                </div>
                <div class="w-full h-6 bg-black border border-${themeColor}-900 relative skew-x-[-10deg] shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    <div class="h-full bg-${themeColor}-600 transition-all duration-300 relative overflow-hidden" style="width: ${hpPercent}%">
                        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
                    </div>
                </div>
            `;
            hudContainer.appendChild(topBar);

            // 3. TARGETING SCOPE
            const scopeBox = document.createElement('div');
            scopeBox.className = "relative w-full max-w-md aspect-square border-2 border-green-500/30 rounded-lg flex items-center justify-center bg-green-900/5 shadow-[inset_0_0_50px_rgba(0,255,0,0.1)]";
            
            scopeBox.innerHTML = `
                <div class="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400"></div>
                <div class="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400"></div>
                <div class="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400"></div>
                <div class="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400"></div>
                
                <div id="enemy-img" class="text-[10rem] filter drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-transform duration-100 z-0 select-none">
                    ${Combat.enemy.symbol || "💀"}
                </div>
            `;

            // Zonen-Logik
            if(Combat.turn === 'player') {
                const zones = [
                    { id: 0, top: 0, height: 30, label: "KOPF" },
                    { id: 1, top: 30, height: 40, label: "KÖRPER" },
                    { id: 2, top: 70, height: 30, label: "BEINE" }
                ];

                zones.forEach(z => {
                    // ERROR CATCHER FÜR CALC HIT CHANCE
                    let hitChance = 0;
                    try { hitChance = Combat.calculateHitChance(z.id); } 
                    catch(e) { console.error("HitChance Error:", e); hitChance = 0; }

                    const isSelected = (Combat.selectedPart === z.id);
                    
                    const zoneEl = document.createElement('div');
                    zoneEl.className = "absolute left-2 right-2 transition-all duration-150 cursor-pointer z-10 flex items-center justify-between px-4 group border border-transparent hover:bg-green-500/10 hover:border-green-500/30 rounded";
                    
                    if(isSelected) {
                        zoneEl.className += " bg-yellow-500/10 border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.2)]";
                    }

                    zoneEl.style.top = z.top + "%";
                    zoneEl.style.height = z.height + "%";

                    zoneEl.onclick = (e) => {
                        e.stopPropagation();
                        Combat.selectPart(z.id);
                    };

                    zoneEl.innerHTML = `
                        <div class="font-bold text-xs tracking-widest ${isSelected ? 'text-yellow-400' : 'text-green-600 opacity-50 group-hover:opacity-100 group-hover:text-green-400'} transition-all">
                            ${z.label}
                        </div>
                        <div class="font-vt323 text-3xl ${isSelected ? 'text-yellow-400 drop-shadow-[0_0_5px_gold]' : 'text-green-700 opacity-30 group-hover:opacity-100 group-hover:text-green-400'} transition-all">
                            ${hitChance}%
                        </div>
                    `;
                    scopeBox.appendChild(zoneEl);
                });

                // 4. STATS PANEL
                // Ensure Combat.selectedPart is valid
                if(Combat.selectedPart === undefined || Combat.selectedPart < 0) Combat.selectedPart = 1;
                
                const currentPart = Combat.bodyParts[Combat.selectedPart] || {name: "UNKNOWN", dmgMod: 1};
                let currentChance = 0;
                try { currentChance = Combat.calculateHitChance(Combat.selectedPart); } catch(e) {}

                const stats = document.createElement('div');
                stats.className = "absolute top-4 right-4 text-right pointer-events-none hidden md:block";
                stats.innerHTML = `
                    <div class="text-green-500 text-[10px] animate-pulse">V.A.T.S. ACTIVE</div>
                    <div class="text-yellow-400 font-bold text-xl uppercase tracking-widest border-b border-green-500/50 mb-1">${currentPart.name}</div>
                    <div class="text-green-300 font-mono text-xs">
                        <div>CHANCE: <span class="text-white">${currentChance}%</span></div>
                        <div>DMG MOD: <span class="text-white">${currentPart.dmgMod}x</span></div>
                        <div>CRIT: <span class="text-white">${Game.state.critChance || 5}%</span></div>
                    </div>
                `;
                scopeBox.appendChild(stats);

            } else {
                // FEIND ZUG
                const warning = document.createElement('div');
                warning.className = "absolute inset-0 flex items-center justify-center z-30 bg-black/60 backdrop-blur-sm rounded-lg";
                warning.innerHTML = `
                    <div class="text-center">
                        <div class="text-5xl mb-2 animate-bounce">⚠️</div>
                        <div class="text-red-500 font-bold text-2xl animate-pulse tracking-widest border-2 border-red-500 px-6 py-2 bg-black">
                            FEINDLICHES FEUER
                        </div>
                    </div>
                `;
                scopeBox.appendChild(warning);
            }

            hudContainer.appendChild(scopeBox);
            wrapper.appendChild(hudContainer);

            // --- FOOTER CONTROLS ---
            const footerArea = document.createElement('div');
            footerArea.className = "flex-shrink-0 flex flex-col bg-[#050a05] border-t-2 border-green-600 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.8)]";

            const logArea = document.createElement('div');
            logArea.id = "combat-log";
            logArea.className = "h-20 p-2 font-mono text-xs overflow-hidden flex flex-col justify-end text-green-400 leading-tight opacity-80 border-b border-green-900";
            footerArea.appendChild(logArea);

            const btnRow = document.createElement('div');
            btnRow.className = "flex p-3 gap-3";
            
            if(Combat.turn === 'player') {
                btnRow.innerHTML = `
                    <button onclick="Combat.confirmSelection()" class="flex-grow action-button py-4 text-3xl font-bold border-2 border-yellow-500 text-yellow-500 bg-yellow-900/20 hover:bg-yellow-500 hover:text-black shadow-[0_0_15px_rgba(255,200,0,0.2)] tracking-[0.2em] relative overflow-hidden group font-vt323 transition-all">
                        FEUER
                    </button>
                    <button onclick="Combat.flee()" class="w-1/3 action-button py-4 text-gray-500 border-2 border-gray-600 hover:text-white hover:border-white tracking-widest font-bold text-sm">
                        FLUCHT
                    </button>
                `;
            } else {
                btnRow.innerHTML = `<button disabled class="w-full action-button py-4 text-gray-500 border border-gray-800 cursor-wait bg-gray-900/10 tracking-widest italic">TAKTIK-COMPUTER BERECHNET...</button>`;
            }
            footerArea.appendChild(btnRow);

            wrapper.appendChild(footerArea);
            
            // WICHTIG: Erst ganz am Ende anhängen
            view.appendChild(wrapper);

        } catch(err) {
            // FALLBACK ERROR SCREEN
            console.error("COMBAT RENDER FATAL ERROR:", err);
            const view = document.getElementById('view-container');
            if(view) {
                view.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full bg-black text-red-500 p-8 border-4 border-red-600">
                        <div class="text-4xl mb-4">⚠️ SYSTEM CRASH</div>
                        <div class="text-xl font-bold mb-4">RENDER ERROR IN COMBAT MODULE</div>
                        <pre class="bg-gray-900 p-4 rounded text-xs font-mono text-red-300 w-full overflow-auto border border-red-800">
${err.name}: ${err.message}
${err.stack}
                        </pre>
                        <button onclick="UI.switchView('map')" class="mt-8 border-2 border-green-500 text-green-500 px-6 py-3 font-bold hover:bg-green-900">
                            NOT-NEUSTART (ZURÜCK ZUR MAP)
                        </button>
                    </div>
                `;
            }
        }
    }
});
