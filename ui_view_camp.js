// [TIMESTAMP] 2026-01-12 22:00:00 - ui_view_camp.js - RESTORED ORIGINAL DESIGN

Object.assign(UI, {

    // Helper für das Info-Popup (Bleibt als nützliches Feature, stört das Design nicht)
    showCampInfo: function() {
        if(typeof Game.getCampUpgradeCost !== 'function') return;

        let rows = '';
        for(let l=1; l<=10; l++) {
            let healPct = 30 + ((l - 1) * 8); 
            if(l >= 10) healPct = 100;
            if(healPct > 100) healPct = 100;

            let costStr = '<span class="text-gray-600">-</span>';
            if (l === 1) costStr = '<span class="text-gray-500">Start</span>';
            else {
                const cost = Game.getCampUpgradeCost(l - 1);
                if(cost) costStr = `${cost.count} ${cost.name}`;
            }

            const currentLvl = (Game.state.camp && Game.state.camp.level) ? Game.state.camp.level : 1;
            const bgClass = (l === currentLvl) ? "bg-yellow-900/40 border border-yellow-600 text-yellow-400 font-bold" : "border-b border-gray-800 text-gray-400";

            rows += `
                <div class="flex justify-between items-center py-1 px-2 ${bgClass} text-xs">
                    <div class="w-12">Lvl ${l}</div>
                    <div class="w-20 text-blue-300 text-center">${Math.floor(healPct)}% HP</div>
                    <div class="flex-1 text-right">${costStr}</div>
                </div>
            `;
        }
        this.showInfoDialog("LAGER INFO", `<div class="flex flex-col gap-1 max-h-[50vh] overflow-y-auto custom-scroll p-1">${rows}</div>`);
    },

    // DAS ALTE RENDER CAMP (Überschreibt einfach den View)
    renderCamp: function() {
        const view = document.getElementById('view-container'); // Nutzt den Standard-Container
        if(!view) return;
        
        const camp = Game.state.camp;
        if(!camp) {
            view.innerHTML = '<div class="flex h-full items-center justify-center text-red-500 font-bold">KEIN LAGER AUFGESCHLAGEN</div>';
            return;
        }

        const lvl = camp.level || 1;
        let healPct = Math.min(100, 30 + ((lvl - 1) * 8));

        // Daten für den Upgrade Button vorbereiten
        let upgradeBtnHtml = '';
        if(typeof Game.getCampUpgradeCost === 'function') {
            if(lvl < 10) {
                const cost = Game.getCampUpgradeCost(lvl);
                const canAfford = cost && Game.state.caps >= cost.count;
                const color = canAfford ? "border-yellow-500 text-yellow-400 hover:bg-yellow-900/30" : "border-red-500 text-red-500 opacity-70 cursor-not-allowed";
                upgradeBtnHtml = `
                    <button class="w-full border-2 ${color} p-3 mt-4 flex flex-col items-center transition-all" onclick="Game.upgradeCamp()" ${!canAfford ? 'disabled' : ''}>
                        <span class="font-bold">LAGER VERBESSERN</span>
                        <span class="text-xs">${cost ? cost.count + ' ' + cost.name : '???'}</span>
                    </button>
                `;
            } else {
                upgradeBtnHtml = `<div class="w-full border border-green-500 text-green-500 p-2 mt-4 text-center text-xs">MAX LEVEL ERREICHT</div>`;
            }
        }

        view.innerHTML = `
            <div class="p-4 flex flex-col items-center w-full h-full overflow-y-auto custom-scroll">
                <h1 class="text-3xl font-bold text-yellow-400 mb-2 tracking-widest text-center">BASECAMP ALPHA</h1>
                <div class="text-xs text-green-600 font-mono mb-6 flex gap-4">
                    <span>SEC ${camp.sector.x},${camp.sector.y}</span>
                    <span>LVL ${lvl}</span>
                    <span class="cursor-pointer underline hover:text-green-400" onclick="UI.showCampInfo()">[INFO]</span>
                </div>
                
                <div class="w-full max-w-md bg-green-900/10 border border-green-800 p-2 text-center text-sm text-green-300 mb-6">
                    Status: Sicher. Heilrate: ${Math.floor(healPct)}%.
                </div>

                <div class="grid grid-cols-2 gap-4 w-full max-w-md">
                    <button class="border-2 border-green-500 p-4 hover:bg-green-900/30 flex flex-col items-center transition-all group" onclick="UI.renderCampSleep()">
                        <div class="text-4xl mb-2 group-hover:scale-110 transition-transform">💤</div>
                        <span class="font-bold text-green-300">SCHLAFSACK</span>
                        <span class="text-[10px] text-green-600">HP & Erholung</span>
                    </button>
                    
                    <button class="border-2 border-orange-500 p-4 hover:bg-orange-900/30 flex flex-col items-center transition-all group" onclick="UI.renderCampCooking()">
                        <div class="text-4xl mb-2 group-hover:scale-110 transition-transform">🔥</div>
                        <span class="font-bold text-orange-300">LAGERFEUER</span>
                        <span class="text-[10px] text-orange-600">Kochen & Crafting</span>
                    </button>
                    
                    <button class="border-2 border-blue-500 p-4 opacity-50 cursor-not-allowed flex flex-col items-center transition-all group">
                        <div class="text-4xl mb-2">📻</div>
                        <span class="font-bold text-blue-300">FUNKGERÄT</span>
                        <span class="text-[10px] text-blue-600">Offline</span>
                    </button>
                    
                    <button class="border-2 border-gray-500 p-4 hover:bg-gray-800 flex flex-col items-center transition-all group" onclick="UI.packCamp()">
                        <div class="text-4xl mb-2 group-hover:scale-110 transition-transform">⛺</div>
                        <span class="font-bold text-gray-300">ABBAUEN</span>
                        <span class="text-[10px] text-gray-500">Lager einpacken</span>
                    </button>
                </div>

                ${upgradeBtnHtml}
            </div>
        `;
    },

    renderCampSleep: function() {
        // Einfaches Overlay für Schlaf
        const content = `
            <div class="flex flex-col gap-4">
                 <button onclick="Game.rest(1); UI.leaveDialog()" class="action-button border-green-500 text-green-400 py-4 w-full">
                    <div class="font-bold text-lg">KURZ AUSRUHEN (1h)</div>
                    <div class="text-xs opacity-70">- Hunger / + HP</div>
                </button>
                <button onclick="Game.rest(8); UI.leaveDialog()" class="action-button border-blue-500 text-blue-400 py-4 w-full">
                    <div class="font-bold text-lg">SCHLAFEN (8h)</div>
                    <div class="text-xs opacity-70">Volle Heilung</div>
                </button>
            </div>
        `;
        this.showInfoDialog("SCHLAFPLATZ", content);
    },

    // DIE ALTE KOCH-ANSICHT (Ersetzt den kompletten View)
    renderCampCooking: function() {
        const view = document.getElementById('view-container');
        
        let html = `
            <div class="p-4 flex flex-col h-full overflow-hidden w-full">
                <div class="flex justify-between items-center mb-4 border-b border-orange-600 pb-2 shrink-0">
                    <h2 class="text-2xl font-bold text-orange-400">KOCHSTELLE</h2>
                    <button onclick="UI.renderCamp()" class="text-xs border border-orange-900 text-orange-700 px-4 py-2 hover:text-white hover:border-white uppercase font-bold">ZURÜCK</button>
                </div>
                
                <div class="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
        `;

        const recipes = Game.recipes || [];
        const cookingRecipes = recipes.filter(r => r.type === 'cooking');

        if(cookingRecipes.length === 0) {
            html += '<div class="text-gray-500 text-center italic mt-10">Du kennst keine Rezepte.</div>';
        } else {
            cookingRecipes.forEach(recipe => {
                // [FIX] Abfangen wenn Item-ID falsch ist, damit es nicht crasht
                const outItem = Game.items[recipe.out];
                if (!outItem) return; 

                let reqHtml = '';
                let canCraft = true;

                for(let reqId in recipe.req) {
                    const countNeeded = recipe.req[reqId];
                    const invItem = Game.state.inventory.find(i => i.id === reqId);
                    const countHave = invItem ? invItem.count : 0;
                    
                    let color = "text-yellow-500";
                    if (countHave < countNeeded) { canCraft = false; color = "text-red-500"; }
                    
                    const ingredientDef = Game.items[reqId];
                    const ingredientName = ingredientDef ? ingredientDef.name : reqId;
                    reqHtml += `<span class="${color} text-[10px] mr-2 inline-block">• ${ingredientName}: ${countHave}/${countNeeded}</span>`;
                }

                html += `
                    <div class="border border-yellow-900 bg-yellow-900/10 p-2 flex justify-between items-center relative">
                        <div class="flex flex-col min-w-0 pr-2">
                            <span class="font-bold text-yellow-400 text-lg truncate">${outItem.name}</span>
                            <span class="text-xs text-yellow-600 italic">${outItem.desc || ''}</span>
                            <div class="mt-1 bg-black/50 p-1 rounded border border-gray-800">${reqHtml}</div>
                        </div>
                        <button class="shrink-0 border border-yellow-500 text-yellow-500 px-4 py-4 font-bold hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-black text-sm" 
                            onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>
                            BRATEN
                        </button>
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        view.innerHTML = html;
    },

    packCamp: function() {
        if(!Game.state.camp) return;
        Game.state.camp = null;
        Game.addToInventory('camp_kit', 1);
        UI.log("Lager eingepackt.", "text-yellow-400");
        UI.switchView('map');
    }
});
