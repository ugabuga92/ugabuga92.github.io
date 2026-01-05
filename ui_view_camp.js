Object.assign(UI, {

    // Helper für das Info-Popup
    showCampInfo: function() {
        let rows = '';
        for(let l=1; l<=10; l++) {
            let healPct = 30 + ((l - 1) * 8); 
            if(l >= 10) healPct = 100;
            if(healPct > 100) healPct = 100;

            let costStr = '<span class="text-gray-600">-</span>';
            if (l === 1) {
                costStr = '<span class="text-gray-500">Start (100 KK)</span>';
            } else {
                const cost = Game.getCampUpgradeCost(l - 1);
                if(cost) {
                    costStr = `${cost.count}x ${cost.name}`;
                }
            }

            const currentLvl = (Game.state.camp && Game.state.camp.level) ? Game.state.camp.level : 1;
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

        const content = `
            <div class="flex justify-between text-xs text-yellow-600 font-bold mb-2 px-2 uppercase tracking-wider border-b border-yellow-900 pb-1">
                <span class="w-12">Stufe</span>
                <span class="w-20 text-center">Heilung</span>
                <span class="flex-1 text-right">Kosten</span>
            </div>
            <div class="flex flex-col gap-1 max-h-[50vh] overflow-y-auto custom-scroll mb-4 border border-green-900/30 bg-black/50 p-1">
                ${rows}
            </div>
            <div class="text-[10px] text-gray-500 text-center italic">
                Höhere Stufen heilen effektiver.<br>Strahlung (+5) beim Kochen bleibt konstant.
            </div>
        `;

        this.showInfoDialog("LAGER INFO", content);
    },

    // [Fix] Parameter reset=false ist Standard
    renderCamp: function(reset = false) {
        const cookingView = document.getElementById('camp-cooking-view');
        const mainActions = document.getElementById('camp-main-actions');
        
        // RESET LOGIC: Nur ausführen, wenn wir es explizit wollen (Button Klick)
        if(reset && cookingView && mainActions) {
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

        // Force Show Cooking
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

            // AUTO-REFRESH FIX: Nach Crafting neu rendern
            div.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-bold text-yellow-400 text-lg">${outItem.name}</span>
                    <span class="text-xs text-yellow-600 italic">${outItem.desc}</span>
                    <div class="mt-1 bg-black/50 p-1 rounded">${reqHtml}</div>
                </div>
                <button class="border border-yellow-500 text-yellow-500 px-4 py-2 font-bold hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-full ml-2" 
                    onclick="Game.craftItem('${recipe.id}'); setTimeout(() => UI.renderCampCooking(), 100)" ${canCraft ? '' : 'disabled'}>
                    BRATEN
                </button>
            `;
            list.appendChild(div);
        });
    }
});
