// [v3.7a] - 2026-01-03 07:30am (Camp Logic)
// Logik für das Camping Menü (benötigt views/camp.html)

Object.assign(UI, {

    renderCamp: function() {
        // Sicherstellen, dass wir im Camp View sind (falls Funktion manuell aufgerufen wurde)
        const cookingView = document.getElementById('camp-cooking-view');
        const mainActions = document.getElementById('camp-main-actions');
        
        // Falls wir gerade vom Kochen kommen: Reset View
        if(cookingView && mainActions) {
            cookingView.classList.add('hidden');
            mainActions.classList.remove('hidden'); // Buttons wieder zeigen
        }

        const camp = Game.state.camp;
        if(!camp) { 
            console.warn("Kein Camp gefunden!"); 
            UI.switchView('map'); 
            return; 
        }

        // 1. Level Anzeige Update
        const lvlDisplay = document.getElementById('camp-level-display');
        if(lvlDisplay) lvlDisplay.textContent = `LEVEL ${camp.level}`;

        // 2. Status Text Update
        const statusBox = document.getElementById('camp-status-box');
        let statusText = "Basis-Zelt (Lvl 1). Heilung 50%.";
        if(camp.level >= 2) statusText = "Komfort-Zelt (Lvl 2). Heilung 100%.";
        if(statusBox) statusBox.textContent = statusText;

        // 3. Upgrade Button Logic
        const upgradeCont = document.getElementById('camp-upgrade-container');
        if(upgradeCont) {
            let upgradeText = "LAGER VERBESSERN";
            let upgradeSub = "Kosten: 10x Schrott";
            let upgradeDisabled = false;
            let btnClass = "border-yellow-500 text-yellow-400 hover:bg-yellow-900/30";

            if(camp.level >= 2) {
                upgradeText = "LAGER MAXIMIERT";
                upgradeSub = "Maximum erreicht";
                upgradeDisabled = true;
                btnClass = "border-gray-700 text-gray-500 cursor-not-allowed";
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
        // Umschalten auf Kochen-Ansicht innerhalb der HTML Datei
        const cookingView = document.getElementById('camp-cooking-view');
        const mainActions = document.getElementById('camp-main-actions'); // Die Grid Buttons
        
        if(!cookingView) return;

        // Grid ausblenden, Kochen einblenden
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
            
            // Zutaten Check
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
