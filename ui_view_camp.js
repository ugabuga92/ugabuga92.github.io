// [v1.1.3] - 2026-01-04 09:45pm (Camp Info Feature)
// - Feature: Info-Button (?) für Level-Übersicht.
// - Fix: Kochen-View bleibt stabil.

Object.assign(UI, {

    // [v1.1.3] Helper für das Info-Popup
    showCampInfo: function() {
        if(!this.els.dialog) return;

        let rows = '';
        for(let l=1; l<=10; l++) {
            // Heilung berechnen (identisch zu game_actions logic)
            let healPct = 30 + ((l - 1) * 8); 
            if(l >= 10) healPct = 100;
            if(healPct > 100) healPct = 100;

            // Kosten holen
            let costStr = '<span class="text-gray-600">-</span>';
            if (l === 1) {
                costStr = '<span class="text-gray-500">Start (100 KK)</span>';
            } else {
                // getCampUpgradeCost gibt Kosten für das NÄCHSTE Level zurück (basierend auf aktuellem)
                // Um Kosten FÜR Level 'l' zu sehen, müssen wir wissen was Level 'l-1' kostet
                const cost = Game.getCampUpgradeCost(l - 1);
                if(cost) {
                    // Prüfen ob wir das Material haben (optional, hier nur Info)
                    costStr = `${cost.count}x ${cost.name}`;
                }
            }

            // Style für aktuelles Level
            const currentLvl = Game.state.camp.level || 1;
            const isCurrent = (l === currentLvl);
            const bgClass = isCurrent ? "bg-yellow-900/40 border border-yellow-600" : "border-b border-gray-800";
            const textClass = isCurrent ? "text-yellow-400 font-bold" : "text-gray-400";

            rows += `
                <div class="flex justify-between items-center py-1 px-2 ${bgClass} text-xs">
                    <div class="w-12 ${textClass}">Lvl ${l}</div>
                    <div class="w-20 text-blue-300 text-center">${Math.floor(healPct)}% HP</div>
                    <div class="flex-1 text-right text-gray-300">${costStr}</div>
                </div>
            `;
        }

        this.els.dialog.style.display = 'flex';
        this.els.dialog.innerHTML = `
            <div class="bg-black/95 border-2 border-yellow-400 p-4 rounded-lg shadow-[0_0_20px_#ffd700] w-80 pointer-events-auto relative z-50 flex flex-col max-h-[80vh]">
                <div class="flex justify-between items-center mb-4 border-b border-yellow-900 pb-2">
                    <h3 class="text-lg font-bold text-yellow-400">⛺ LAGER INFO</h3>
                    <button onclick="UI.els.dialog.style.display='none'" class="text-red-500 font-bold hover:text-red-400 px-2">X</button>
                </div>
                
                <div class="flex justify-between text-xs text-yellow-600 font-bold mb-2 px-2 uppercase tracking-wider">
                    <span class="w-12">Stufe</span>
                    <span class="w-20 text-center">Heilung</span>
                    <span class="flex-1 text-right">Kosten (Upgrade)</span>
                </div>

                <div class="overflow-y-auto custom-scrollbar flex-1 space-y-1">
                    ${rows}
                </div>
                
                <div class="mt-4 text-[10px] text-gray-500 text-center border-t border-gray-800 pt-2">
                    Höhere Stufen heilen Verletzungen effektiver. <br>Hintergrundstrahlung (+5) bleibt konstant.
                </div>
            </div>
        `;
    },

    renderCamp: function() {
        const cookingView = document.getElementById('camp-cooking-view');
        const mainActions = document.getElementById('camp-main-actions');
        
        // Reset View NUR wenn wir NICHT gerade im Kochen-Modus sind
        if(cookingView && mainActions && !cookingView.classList.contains('hidden')) {
             // Do nothing (User is cooking)
        } else if(cookingView && mainActions) {
            cookingView.classList.add('hidden');
            mainActions.classList.remove('hidden');
        }

        const camp = Game.state.camp;
        if(!camp) { 
            console.warn("Kein Camp gefunden!"); 
            UI.switchView('map'); 
            return; 
        }

        const lvl = camp.level || 1;

        // 1. Level Anzeige
        const lvlDisplay = document.getElementById('camp-level-display');
        if(lvlDisplay) lvlDisplay.textContent = `LEVEL ${lvl}`;

        // 2. Status Text
        let healPct = 30 + ((lvl - 1) * 8); 
        if(lvl >= 10) healPct = 100;
        if(healPct > 100) healPct = 100;

        const statusBox = document.getElementById('camp-status-box');
        if(statusBox) {
            let comfort = (lvl === 1) ? "Basis-Zelt" : (lvl >= 10 ? "Luxus-Bunker" : "Komfort-Zelt");
            statusBox.textContent = `${comfort} (Lvl ${lvl}). Heilung ${Math.floor(healPct)}%.`;
        }

        // 3. Upgrade Button Logic
        const upgradeCont = document.getElementById('camp-upgrade-container');
        if(upgradeCont) {
            let upgradeText = "LAGER VERBESSERN";
            let upgradeSub = "Lädt...";
            let upgradeDisabled = false;
            let btnClass = "border-yellow-500 text-yellow-400 hover:bg-yellow-900/30";
            
            if(lvl >= 10) {
                upgradeText = "LAGER MAXIMIERT";
                upgradeSub = "Maximum erreicht (Level 10)";
                upgradeDisabled = true;
                btnClass = "border-green-500 text-green-500 cursor-default bg-green-900/20";
            } else {
                const cost = Game.getCampUpgradeCost(lvl);
                if(cost) {
                    const hasItem = Game.state.inventory.find(i => i.id === cost.id);
                    const count = hasItem ? hasItem.count : 0;
                    
                    if(count >= cost.count) {
                        upgradeSub = `Kosten: ${cost.count}x ${cost.name}`;
                    } else {
                        upgradeSub = `Fehlt: ${cost.count}x ${cost.name} (Besitz: ${count})`;
                        upgradeDisabled = true;
                        btnClass = "border-red-500 text-red-500 cursor-not-allowed opacity-70";
                    }
                } else {
                    upgradeSub = "Keine Daten";
                    upgradeDisabled = true;
                }
            }

            // [v1.1.3] Added Info Button (?) top center relative to this container if needed, 
            // BUT since we use the HTML structure from views/camp.html, we inject the button into the container 
            // if it's not already there? 
            // BETTER: We render the whole upgrade block and add the button dynamically to the main view if needed.
            // OR: We rely on the HTML structure.
            // Since I cannot change views/camp.html directly here easily without you uploading it, 
            // I will inject the button via JS into the 'camp-view' container if it exists.
            
            const campView = document.getElementById('camp-view');
            // Check if button already exists to avoid duplicates
            if(campView && !document.getElementById('btn-camp-info')) {
                // Ensure campView has relative positioning
                campView.classList.add('relative');
                
                const infoBtn = document.createElement('button');
                infoBtn.id = 'btn-camp-info';
                infoBtn.textContent = '?';
                infoBtn.onclick = () => UI.showCampInfo();
                infoBtn.className = "absolute top-2 left-1/2 transform -translate-x-1/2 bg-black border border-yellow-400 text-yellow-400 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm hover:bg-yellow-900 z-10 shadow-[0_0_5px_#ffd700]";
                campView.appendChild(infoBtn);
            }

            upgradeCont.innerHTML = `
                <button class="flex flex-col items-center justify-center border ${btnClass} p-3 transition-all w-full mb-4"
                    onclick="Game.upgradeCamp()" ${upgradeDisabled ? 'disabled' : ''}>
                    <span class="font-bold text-lg">${upgradeText}</span>
                    <span class="text-xs opacity-70">${upgradeSub}</span>
                </button>
            `;
        }
    },

    renderCampCooking: function() {
        const cookingView = document.getElementById('camp-cooking-view');
        const mainActions = document.getElementById('camp-main-actions');
        
        if(!cookingView) return;

        if(mainActions) mainActions.classList.add('hidden');
        cookingView.classList.remove('hidden');

        const list = document.getElementById('cooking-list');
        if(!list) return;
        list.innerHTML = '';

        const recipes = Game.recipes || [];
        const cookingRecipes = recipes.filter(r => r.type === 'cooking');

        if(cookingRecipes.length === 0) {
            list.innerHTML = '<div class="text-gray-500 italic text-center mt-10">Du kennst noch keine Rezepte.</div>';
            return;
        }

        cookingRecipes.forEach(recipe => {
            const outItem = Game.items[recipe.out];
            const div = document.createElement('div');
            div.className = "border border-yellow-900 bg-yellow-900/10 p-3 mb-2 flex justify-between items-center";
            
            let reqHtml = '';
            let canCraft = true;
            
            for(let reqId in recipe.req) {
                const countNeeded = recipe.req[reqId];
                const invItem = Game.state.inventory.find(i => i.id === reqId);
                const countHave = invItem ? invItem.count : 0;
                
                let color = "text-yellow-500";
                if (countHave < countNeeded) { 
                    canCraft = false; 
                    color = "text-red-500"; 
                }
                
                const ingredientName = Game.items[reqId] ? Game.items[reqId].name : reqId;
                reqHtml += `<span class="${color} text-xs mr-2 block">• ${ingredientName}: ${countHave}/${countNeeded}</span>`;
            }

            div.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-bold text-yellow-400 text-lg">${outItem.name}</span>
                    <span class="text-xs text-yellow-600 italic">${outItem.desc}</span>
                    <div class="mt-1 bg-black/50 p-1 rounded">${reqHtml}</div>
                </div>
                <button class="border border-yellow-500 text-yellow-500 px-4 py-2 font-bold hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-full ml-2" 
                    onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>
                    BRATEN
                </button>
            `;
            list.appendChild(div);
        });
    }
});
