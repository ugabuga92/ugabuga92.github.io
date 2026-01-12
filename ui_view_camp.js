// [TIMESTAMP] 2026-01-12 20:35:00 - ui_view_camp.js - Fixed Layout Overlap & State Switching

Object.assign(UI, {

    // Status-Speicher: 'main' oder 'cooking'
    campMode: 'main', 

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

    // Haupt-Render Funktion
    renderCamp: function(resetToMain = false) {
        const view = document.getElementById('view-camp');
        if(!view) return;

        const camp = Game.state.camp;
        if(!camp) { 
            view.innerHTML = '<div class="flex h-full items-center justify-center text-red-500 font-bold">KEIN LAGER AUFGESCHLAGEN</div>';
            return; 
        }

        // Wenn reset angefordert wurde (z.B. "Zurück"-Button)
        if(resetToMain) {
            this.campMode = 'main';
        }

        // 1. STRUKTUR PRÜFEN & ERSTELLEN (Nur einmalig)
        // Wir prüfen ob unser Haupt-Container schon da ist. Wenn nicht, bauen wir das Gerüst.
        if(!document.getElementById('camp-root-container')) {
            view.innerHTML = `
                <div id="camp-root-container" class="flex flex-col h-full w-full p-4">
                    
                    <div class="text-center mb-4 shrink-0">
                        <h1 class="text-3xl font-bold text-yellow-400 tracking-widest leading-none mb-1">BASECAMP ALPHA</h1>
                        <div class="text-xs text-green-600 font-mono flex justify-center gap-4">
                            <span>SEC ${camp.sector.x},${camp.sector.y}</span>
                            <span id="camp-level-display">LEVEL ${camp.level || 1}</span>
                            <button onclick="UI.showCampInfo()" class="text-[10px] border border-green-800 px-1 hover:bg-green-900 text-green-500">INFO</button>
                        </div>
                    </div>

                    <div id="camp-main-actions" class="flex-1 flex flex-col items-center w-full max-w-md mx-auto">
                        
                        <div id="camp-status-box" class="w-full bg-green-900/20 border border-green-800 p-2 text-center text-sm text-green-300 mb-6 font-mono">
                            Lade Status...
                        </div>

                        <div id="camp-upgrade-container" class="w-full mb-6"></div>

                        <div class="grid grid-cols-2 gap-4 w-full">
                            <button class="border-2 border-green-500 p-4 hover:bg-green-900/30 flex flex-col items-center transition-all group bg-black" onclick="UI.renderCampSleep()">
                                <div class="text-4xl mb-2 group-hover:scale-110 transition-transform">💤</div>
                                <span class="font-bold text-green-300">SCHLAFSACK</span>
                                <span class="text-[10px] text-green-600">HP & Erholung</span>
                            </button>
                            
                            <button class="border-2 border-orange-500 p-4 hover:bg-orange-900/30 flex flex-col items-center transition-all group bg-black" onclick="UI.renderCampCooking(true)">
                                <div class="text-4xl mb-2 group-hover:scale-110 transition-transform">🔥</div>
                                <span class="font-bold text-orange-300">LAGERFEUER</span>
                                <span class="text-[10px] text-orange-600">Kochen & Crafting</span>
                            </button>
                            
                            <button class="border-2 border-blue-500 p-4 hover:bg-blue-900/30 flex flex-col items-center transition-all group bg-black opacity-50 cursor-not-allowed">
                                <div class="text-4xl mb-2">📻</div>
                                <span class="font-bold text-blue-300">FUNKGERÄT</span>
                                <span class="text-[10px] text-blue-600">Offline</span>
                            </button>
                            
                            <button class="border-2 border-gray-500 p-4 hover:bg-gray-800 flex flex-col items-center transition-all group bg-black" onclick="UI.packCamp()">
                                <div class="text-4xl mb-2 group-hover:scale-110 transition-transform">⛺</div>
                                <span class="font-bold text-gray-300">ABBAUEN</span>
                                <span class="text-[10px] text-gray-500">Lager einpacken</span>
                            </button>
                        </div>
                    </div>

                    <div id="camp-cooking-view" class="hidden flex-1 flex-col w-full h-full overflow-hidden">
                        <div class="flex justify-between items-center mb-2 border-b border-orange-600 pb-2 shrink-0">
                            <h2 class="text-2xl font-bold text-orange-400">KOCHSTELLE</h2>
                            <button onclick="UI.renderCamp(true)" class="text-xs border border-orange-900 text-orange-700 px-3 py-1 hover:text-white hover:border-white bg-black uppercase font-bold">
                                ZURÜCK
                            </button>
                        </div>
                        <div id="cooking-list" class="flex-1 overflow-y-auto custom-scroll pr-1 space-y-2">
                            </div>
                    </div>

                </div>
            `;
        }

        // 2. ELEMENTE REFERENZIEREN
        const mainActions = document.getElementById('camp-main-actions');
        const cookingView = document.getElementById('camp-cooking-view');

        // 3. SICHTBARKEIT STEUERN (Toggle)
        if(this.campMode === 'cooking') {
            mainActions.classList.add('hidden');
            cookingView.classList.remove('hidden');
            // Liste füllen (ohne Mode-Switch, da wir schon im Modus sind)
            this.renderCampCooking(false);
        } else {
            mainActions.classList.remove('hidden');
            cookingView.classList.add('hidden');
        }

        // 4. DATEN UPDATE (Level, Status, Upgrade Button)
        const lvl = camp.level || 1;
        
        // Header Level Update
        const lvlDisplay = document.getElementById('camp-level-display');
        if(lvlDisplay) lvlDisplay.textContent = `LEVEL ${lvl}`;

        // Status Box Update
        let healPct = 30 + ((lvl - 1) * 8); 
        if(lvl >= 10) healPct = 100;
        
        const statusBox = document.getElementById('camp-status-box');
        if(statusBox) {
            let comfort = (lvl === 1) ? "Basis-Zelt" : (lvl >= 10 ? "Luxus-Bunker" : "Komfort-Zelt");
            statusBox.textContent = `${comfort} (Lvl ${lvl}). Heilung ${Math.floor(healPct)}%.`;
        }

        // Upgrade Button Logic
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
                <button class="flex flex-col items-center justify-center border ${btnClass} p-3 transition-all w-full bg-black"
                    onclick="Game.upgradeCamp()" ${upgradeDisabled ? 'disabled' : ''}>
                    <span class="font-bold text-lg">${upgradeText}</span>
                    <span class="text-xs opacity-70">${upgradeSub}</span>
                </button>
            `;
        }
    },

    renderCampSleep: function() {
        // Sleep ist ein einfaches Overlay oder Dialog, daher nutzen wir showInfoDialog oder bauen temporär um
        // Da wir jetzt ein festes Layout haben, nutzen wir ein Overlay für den Schlaf-Dialog
        
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

    // Aufgerufen durch den "KOCHEN" Button oder Update-Events
    renderCampCooking: function(switchToCooking = true) {
        if(switchToCooking) {
            this.campMode = 'cooking';
            // Layout aktualisieren (durch erneuten Aufruf von renderCamp, das jetzt den Status beachtet)
            this.renderCamp();
            return; 
        }

        const list = document.getElementById('cooking-list');
        if(!list) return;

        // SCROLL FIX: Position merken
        const scrollPos = list.scrollTop;
        list.innerHTML = '';

        const recipes = Game.recipes || [];
        const cookingRecipes = recipes.filter(r => r.type === 'cooking');

        if(cookingRecipes.length === 0) {
            list.innerHTML = '<div class="text-gray-500 italic text-center mt-10">Du kennst noch keine Rezepte.</div>';
            return;
        }

        cookingRecipes.forEach(recipe => {
            // [FIX] Check ob Output-Item existiert
            const outItem = Game.items[recipe.out];
            if (!outItem) return;

            const div = document.createElement('div');
            div.className = "border border-yellow-900 bg-yellow-900/10 p-2 mb-2 flex justify-between items-center relative select-none";
            div.onclick = (e) => e.stopPropagation(); 
            
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
                
                const ingredientDef = Game.items[reqId];
                const ingredientName = ingredientDef ? ingredientDef.name : reqId;

                reqHtml += `<span class="${color} text-[10px] mr-2 block">• ${ingredientName}: ${countHave}/${countNeeded}</span>`;
            }

            div.innerHTML = `
                <div class="flex flex-col min-w-0 pr-2">
                    <span class="font-bold text-yellow-400 text-sm truncate">${outItem.name}</span>
                    <div class="mt-1 bg-black/50 p-1 rounded border border-gray-800">${reqHtml}</div>
                </div>
                <button class="shrink-0 border border-yellow-500 text-yellow-500 px-3 py-4 font-bold hover:bg-yellow-500 hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-black text-xs" 
                    onclick="event.stopPropagation(); Game.craftItem('${recipe.id}'); setTimeout(() => UI.renderCampCooking(false), 50)" ${canCraft ? '' : 'disabled'}>
                    BRATEN
                </button>
            `;
            list.appendChild(div);
        });

        if(scrollPos > 0) list.scrollTop = scrollPos;
    },

    packCamp: function() {
        if(!Game.state.camp) return;
        Game.state.camp = null;
        Game.addToInventory('camp_kit', 1);
        
        UI.log("Lager eingepackt.", "text-yellow-400");
        UI.switchView('map');
    }
});
