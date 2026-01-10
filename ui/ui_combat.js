// [TIMESTAMP] 2026-01-11 01:00:00 - ui_combat.js - Mobile Optimized VATS

(function() {
    function initCombatUI() {
        if (typeof window.UI === 'undefined' || typeof window.Combat === 'undefined') {
            setTimeout(initCombatUI, 100);
            return;
        }

        Object.assign(window.UI, {

            renderCombat: function() {
                try {
                    Game.state.view = 'combat';
                    const view = document.getElementById('view-container');
                    if(!view) return;
                    
                    if(!Combat.enemy) { UI.switchView('map'); return; }

                    view.innerHTML = ''; 

                    // --- MAIN WRAPPER (Mobile-Friendly) ---
                    const wrapper = document.createElement('div');
                    // Flex column, zentriert, 100% Höhe/Breite
                    wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden select-none touch-manipulation";

                    // Background FX
                    const bgFX = document.createElement('div');
                    bgFX.className = "absolute inset-0 pointer-events-none z-0 opacity-20";
                    bgFX.style.backgroundImage = `radial-gradient(circle, transparent 20%, #001100 90%), repeating-linear-gradient(0deg, transparent 0px, transparent 2px, #00ff00 3px)`;
                    bgFX.style.backgroundSize = "100% 4px";
                    wrapper.appendChild(bgFX);

                    const feedbackLayer = document.createElement('div');
                    feedbackLayer.id = "combat-feedback-layer";
                    feedbackLayer.className = "absolute inset-0 pointer-events-none z-50 overflow-hidden";
                    wrapper.appendChild(feedbackLayer);

                    // --- HUD CONTAINER ---
                    // "justify-between" verteilt den Platz besser auf kleinen Screens
                    const hudContainer = document.createElement('div');
                    hudContainer.className = "flex-grow relative flex flex-col items-center justify-between z-10 p-2 w-full h-full";

                    // 1. TOP BAR (Kompakter)
                    let eMax = Combat.enemy.maxHp || 100;
                    let eHp = Combat.enemy.hp !== undefined ? Combat.enemy.hp : eMax;
                    let hpPercent = Math.max(0, Math.min(100, (eHp / eMax) * 100));
                    let isLegendary = Combat.enemy.isLegendary;
                    let themeColor = isLegendary ? "yellow" : "red";
                    
                    const topBar = document.createElement('div');
                    topBar.className = "w-full flex flex-col items-center mt-2 mb-2 flex-shrink-0";
                    topBar.innerHTML = `
                        <div class="flex justify-between w-full max-w-md items-end px-2">
                            <span class="text-xl md:text-2xl font-bold text-${themeColor}-500 font-vt323 tracking-widest uppercase truncate max-w-[70%]">
                                ${Combat.enemy.name} ${isLegendary ? '★' : ''}
                            </span>
                            <span class="text-sm md:text-lg font-mono text-${themeColor}-300">${Math.ceil(eHp)} HP</span>
                        </div>
                        <div class="w-full max-w-md h-4 md:h-6 bg-black border border-${themeColor}-900 relative skew-x-[-10deg]">
                            <div class="h-full bg-${themeColor}-600 transition-all duration-300 relative" style="width: ${hpPercent}%"></div>
                        </div>
                    `;
                    hudContainer.appendChild(topBar);

                    // 2. TARGETING SCOPE (Responsive Größe)
                    // Nimmt den verfügbaren Platz ein, bleibt aber quadratisch bis max-Limit
                    const scopeWrapper = document.createElement('div');
                    scopeWrapper.className = "flex-grow w-full flex items-center justify-center relative min-h-0";
                    
                    const scopeBox = document.createElement('div');
                    // "max-h-full" sorgt dafür, dass es nicht aus dem Screen ragt
                    scopeBox.className = "relative aspect-square h-auto max-h-[50vh] md:max-h-[60vh] w-auto max-w-full border-2 border-green-500/30 rounded-lg flex items-center justify-center bg-green-900/5 shadow-[inset_0_0_30px_rgba(0,255,0,0.1)]";
                    
                    scopeBox.innerHTML = `
                        <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-400"></div>
                        <div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-400"></div>
                        <div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-400"></div>
                        <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-400"></div>
                        
                        <div id="enemy-img" class="text-[5rem] md:text-[8rem] filter drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform duration-100 select-none">
                            ${Combat.enemy.symbol || "💀"}
                        </div>
                    `;

                    if(Combat.turn === 'player') {
                        const zones = [
                            { id: 0, top: 0, height: 35, label: "KOPF" },   // Etwas größer für Touch
                            { id: 1, top: 35, height: 35, label: "TORSO" },
                            { id: 2, top: 70, height: 30, label: "BEINE" }
                        ];

                        zones.forEach(z => {
                            let hitChance = 0;
                            try { hitChance = Combat.calculateHitChance(z.id); } catch(e) {}
                            const isSelected = (Combat.selectedPart === z.id);
                            
                            const zoneEl = document.createElement('div');
                            // Größere Touch-Ziele durch transparente Borders
                            zoneEl.className = "absolute left-1 right-1 transition-all duration-150 cursor-pointer z-10 flex items-center justify-between px-2 md:px-4 border border-transparent active:bg-green-500/20";
                            if(isSelected) zoneEl.className += " bg-yellow-500/10 border-yellow-400/50 shadow-[0_0_10px_rgba(255,215,0,0.2)]";

                            zoneEl.style.top = z.top + "%";
                            zoneEl.style.height = z.height + "%";
                            zoneEl.onclick = (e) => { e.stopPropagation(); Combat.selectPart(z.id); };

                            // Mobile: Schrift größer und dicker
                            zoneEl.innerHTML = `
                                <div class="font-bold text-[10px] md:text-xs tracking-widest ${isSelected ? 'text-yellow-400' : 'text-green-600 opacity-60'}">
                                    ${z.label}
                                </div>
                                <div class="font-vt323 text-2xl md:text-3xl ${isSelected ? 'text-yellow-400' : 'text-green-700 opacity-40'}">
                                    ${hitChance}%
                                </div>
                            `;
                            scopeBox.appendChild(zoneEl);
                        });

                        // Stats Panel (Jetzt auch Mobil sichtbar, aber kompakter unten im Scope)
                        const currentPart = Combat.bodyParts[Combat.selectedPart] || {name:"?", dmgMod:1};
                        let currentChance = 0;
                        try { currentChance = Combat.calculateHitChance(Combat.selectedPart); } catch(e) {}

                        const stats = document.createElement('div');
                        stats.className = "absolute bottom-1 right-2 text-right pointer-events-none";
                        stats.innerHTML = `
                            <div class="text-yellow-400 font-bold text-sm md:text-xl uppercase tracking-widest opacity-80">${currentPart.name}</div>
                            <div class="text-green-300 font-mono text-[10px] md:text-xs leading-tight">
                                ${currentChance}% HIT / ${currentPart.dmgMod}x DMG
                            </div>
                        `;
                        scopeBox.appendChild(stats);

                    } else {
                        // Enemy Turn Overlay
                        scopeBox.innerHTML += `
                            <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                                <div class="text-red-500 font-bold text-xl md:text-2xl animate-pulse border-2 border-red-500 px-4 py-1 bg-black">
                                    FEINDLICHES FEUER
                                </div>
                            </div>
                        `;
                    }

                    scopeWrapper.appendChild(scopeBox);
                    hudContainer.appendChild(scopeWrapper);

                    // 3. FOOTER & LOG (Unten fixiert)
                    const footerArea = document.createElement('div');
                    footerArea.className = "w-full flex-shrink-0 flex flex-col gap-2 mt-2";

                    // Combat Log (Kompakt, 2 Zeilen)
                    const logArea = document.createElement('div');
                    logArea.id = "combat-log";
                    logArea.className = "h-12 md:h-16 p-1 font-mono text-[10px] md:text-xs overflow-hidden flex flex-col justify-end text-green-400 leading-tight border-t border-green-900 bg-black/50";
                    footerArea.appendChild(logArea);

                    // Buttons (Groß für Daumen)
                    const btnRow = document.createElement('div');
                    btnRow.className = "flex w-full h-16 md:h-20 gap-2 pb-2";
                    
                    if(Combat.turn === 'player') {
                        btnRow.innerHTML = `
                            <button onclick="Combat.flee()" class="w-1/4 action-button border-gray-600 text-gray-400 text-xs md:text-sm font-bold active:bg-gray-800">
                                FLUCHT
                            </button>
                            <button onclick="Combat.confirmSelection()" class="flex-grow action-button border-yellow-500 text-yellow-500 bg-yellow-900/20 active:bg-yellow-500 active:text-black text-2xl md:text-3xl font-bold tracking-widest font-vt323 animate-pulse">
                                FEUER
                            </button>
                        `;
                    } else {
                        btnRow.innerHTML = `<button disabled class="w-full h-full border border-gray-800 text-gray-500 bg-gray-900/20 italic text-sm">GEGNER ZUG...</button>`;
                    }
                    footerArea.appendChild(btnRow);

                    hudContainer.appendChild(footerArea);
                    wrapper.appendChild(hudContainer);
                    view.appendChild(wrapper);

                } catch(err) {
                    console.error("COMBAT UI ERROR:", err);
                    const view = document.getElementById('view-container');
                    if(view) view.innerHTML = `<div class="text-red-500 p-4">UI ERROR: ${err.message}<br><button onclick="UI.switchView('map')" class="border border-red-500 p-2 mt-2">RESET</button></div>`;
                }
            }
        });
    }

    initCombatUI();
})();
