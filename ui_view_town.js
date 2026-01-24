// [TIMESTAMP] 2026-01-25 10:30:00 - ui_view_town.js - Added Modding Help

console.log(">> UI VIEW TOWN (WITH HELP) GELADEN");

Object.assign(UI, {
    
    shopQty: 1,

    renderCity: function(cityId = 'rusty_springs') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = ''; 
        
        Game.state.view = 'city';

        const cityData = {
            'rusty_springs': {
                name: "RUSTY SPRINGS",
                pop: 142, sec: "HOCH", rad: "NIEDRIG",
                flairs: ["Die Luft riecht nach Rost.", "Ein Generator brummt.", "Händler schreien.", "Sicher ist es nur hier."]
            }
        };

        const data = cityData[cityId] || cityData['rusty_springs'];
        const flair = data.flairs[Math.floor(Math.random() * data.flairs.length)];

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden";

        // HEADER
        const header = document.createElement('div');
        header.className = "flex-shrink-0 flex flex-col border-b-4 border-green-900 bg-[#001100] p-4 relative shadow-lg z-10";
        
        header.innerHTML = `
            <div class="flex justify-between items-start z-10 relative">
                <div>
                    <h1 class="text-5xl md:text-6xl font-bold text-green-400 tracking-widest text-shadow-glow font-vt323 leading-none">${data.name}</h1>
                    <div class="text-green-600 text-sm italic mt-1 font-mono">"${flair}"</div>
                </div>
                <div class="bg-black/60 border-2 border-yellow-600 p-2 flex flex-col items-end shadow-[0_0_15px_rgba(200,150,0,0.3)] min-w-[120px]">
                    <span class="text-[10px] text-yellow-700 font-bold tracking-widest">VERMÖGEN</span>
                    <span class="text-2xl text-yellow-400 font-bold font-vt323 tracking-wider">${Game.state.caps} KK</span>
                </div>
            </div>
            <div class="flex gap-4 mt-2 pt-2 border-t border-green-900/50 text-xs font-mono z-10 uppercase tracking-widest">
                <div class="bg-green-900/30 px-2 py-1 border-l-2 border-green-500">POP: <span class="text-green-300 font-bold">${data.pop}</span></div>
                <div class="bg-cyan-900/30 px-2 py-1 border-l-2 border-cyan-500">SEC: <span class="text-cyan-300 font-bold">${data.sec}</span></div>
            </div>
        `;
        wrapper.appendChild(header);

        // GRID MENU
        const grid = document.createElement('div');
        grid.className = "flex-grow overflow-y-auto custom-scrollbar p-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start bg-[#050a05]";

        const createCard = (conf) => {
            const card = document.createElement('div');
            let baseClass = "relative overflow-hidden group cursor-pointer p-4 flex items-center gap-4 border-2 transition-all duration-200 bg-black/80 hover:bg-[#0a1a0a] shadow-md min-h-[100px]";
            let themeColor = "green";
            if(conf.type === 'trader') { themeColor = "yellow"; baseClass += " md:col-span-2 border-yellow-600 hover:border-yellow-400 shadow-yellow-900/20 h-32"; }
            else if (conf.type === 'clinic') { themeColor = "red"; baseClass += " border-red-600 hover:border-red-400 shadow-red-900/20"; }
            else if (conf.type === 'craft') { themeColor = "blue"; baseClass += " border-blue-600 hover:border-blue-400 shadow-blue-900/20"; }
            else if (conf.type === 'smithy') { themeColor = "orange"; baseClass += " border-orange-600 hover:border-orange-400 shadow-orange-900/20"; }
            else { baseClass += " border-green-600 hover:border-green-400 shadow-green-900/20"; }

            card.className = baseClass;
            
            // ROBUST CLICK HANDLER
            card.onclick = function(e) {
                e.preventDefault(); 
                e.stopPropagation();
                try {
                    conf.onClick();
                } catch(err) {
                    console.error("UI Error:", err);
                    alert("Kritischer Fehler beim Öffnen: " + err.message);
                }
            };

            const iconSize = conf.type === 'trader' ? 'text-6xl' : 'text-5xl';
            let titleClass = `text-${themeColor}-500 group-hover:text-${themeColor}-300`;
            if(conf.type === 'trader') titleClass = "text-yellow-500 group-hover:text-yellow-300";

            card.innerHTML = `
                <div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-${themeColor}-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                <div class="icon flex-shrink-0 ${iconSize} z-10 relative filter drop-shadow-md">${conf.icon}</div>
                <div class="flex flex-col z-10 relative">
                    <span class="text-2xl font-bold ${titleClass} tracking-wider font-vt323 uppercase">${conf.label}</span>
                    <span class="text-xs text-${themeColor}-700 font-mono uppercase tracking-widest mt-1">${conf.sub}</span>
                </div>
            `;
            return card;
        };

        grid.appendChild(createCard({ type: 'trader', icon: "🛒", label: "HANDELSPOSTEN", sub: "Waffen & Munition", onClick: () => UI.renderShop() }));
        grid.appendChild(createCard({ type: 'clinic', icon: "⚕️", label: "KLINIK", sub: "Dr. Zimmermann", onClick: () => UI.renderClinic() }));
        grid.appendChild(createCard({ type: 'smithy', icon: "⚒️", label: "DER SCHMIED", sub: "Reparaturen & Mods", onClick: () => UI.renderSmithy() }));
        grid.appendChild(createCard({ type: 'craft', icon: "🛠️", label: "WERKBANK", sub: "Zerlegen & Bauen", onClick: () => UI.renderCrafting() }));

        wrapper.appendChild(grid);

        // FOOTER
        const footer = document.createElement('div');
        footer.className = "flex-shrink-0 p-3 border-t-4 border-green-900 bg-[#001100]";
        footer.innerHTML = `<button class="action-button w-full border-2 border-green-600 text-green-500 py-3 font-bold text-xl hover:bg-green-900/50 hover:text-green-200 transition-all uppercase tracking-[0.15em]" onclick="Game.leaveCity()">ZURÜCK INS ÖDLAND</button>`;
        wrapper.appendChild(footer);

        view.appendChild(wrapper);
    },

    // --- DER SCHMIED (GEHÄRTET & MIT HILFE) ---
    renderSmithy: function() {
        console.log(">> Starte Schmied...");
        const view = document.getElementById('view-container');
        if(!view) return;
        
        Game.state.view = 'smithy';
        view.innerHTML = '';

        try {
            // LOKALE FALLBACK FUNKTION (Verhindert Crash durch fehlende Logik)
            const getWeaponStatsSafe = (item) => {
                if (typeof Game.getWeaponStats === 'function') {
                    try { return Game.getWeaponStats(item); } catch(e) { console.warn("Global stats failed", e); }
                }
                const def = (Game.items && Game.items[item.id]) ? Game.items[item.id] : {};
                let dmg = item.dmg !== undefined ? item.dmg : (item.baseDmg || def.baseDmg || 1);
                if (item.mods && Array.isArray(item.mods) && Game.items) {
                    item.mods.forEach(mid => {
                        const m = Game.items[mid];
                        if (m && m.stats && m.stats.dmg) dmg += m.stats.dmg;
                    });
                }
                return { dmg: dmg, name: item.name || def.name || item.id };
            };

            const wrapper = document.createElement('div');
            wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black z-20 overflow-hidden";

            // Header mit Hilfe-Button
            const header = document.createElement('div');
            header.className = "p-4 border-b-2 border-orange-500 bg-orange-900/20 flex justify-between items-center shadow-lg";
            header.innerHTML = `
                <div class="flex-1">
                    <h2 class="text-3xl text-orange-400 font-bold font-vt323 tracking-widest leading-none">DER SCHMIED</h2>
                    <div class="text-xs text-orange-300 tracking-wider">"Aus Alt mach Neu..."</div>
                </div>
                
                <button onclick="UI.renderSmithyHelp()" class="mx-2 w-10 h-10 border-2 border-orange-500 rounded-full text-orange-500 font-bold text-xl hover:bg-orange-500 hover:text-black transition-colors animate-pulse" title="Hilfe & Infos">?</button>

                <div class="text-4xl text-orange-500 opacity-50 ml-2">⚒️</div>
            `;
            wrapper.appendChild(header);

            // Content
            const content = document.createElement('div');
            content.className = "flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-[#0a0500]";

            // Inventar filtern
            let weapons = [];
            if(Game.state.inventory && Array.isArray(Game.state.inventory)) {
                weapons = Game.state.inventory.map((item, idx) => ({...item, idx})).filter(i => {
                    if(!i || !i.id) return false;
                    const def = (Game.items && Game.items[i.id]) ? Game.items[i.id] : null;
                    return def && (def.type === 'weapon' || def.type === 'melee');
                });
            }

            if(weapons.length === 0) {
                content.innerHTML = '<div class="text-center text-orange-800 mt-10 p-4 border-2 border-dashed border-orange-900">Keine Waffen im Inventar.</div>';
            } else {
                weapons.forEach(w => {
                    const stats = getWeaponStatsSafe(w);
                    const isRusty = w.id.startsWith('rusty_');
                    
                    let actionBtn = '';
                    
                    if(isRusty) {
                        const hasRestore = typeof Game.restoreWeapon === 'function';
                        if(hasRestore) {
                            actionBtn = `<button onclick="Game.restoreWeapon(${w.idx}); UI.renderSmithy()" class="bg-blue-900/30 text-xs px-3 py-2 border border-blue-500 hover:bg-blue-600 hover:text-black font-bold uppercase transition-colors">Restaurieren (50 KK + Öl)</button>`;
                        } else {
                            actionBtn = `<div class="text-red-500 text-xs border border-red-500 px-2 py-1">LOGIK FEHLT</div>`;
                        }
                    } else {
                        actionBtn = `<button onclick="UI.renderModdingScreen(${w.idx})" class="bg-orange-900/30 text-xs px-3 py-2 border border-orange-500 hover:bg-orange-500 hover:text-black font-bold uppercase transition-colors">Modifizieren</button>`;
                    }

                    const div = document.createElement('div');
                    div.className = `flex justify-between items-center bg-black/40 p-3 border border-gray-700 hover:border-orange-500/50 transition-colors`;
                    div.innerHTML = `
                        <div>
                            <div class="${isRusty ? 'text-red-400' : 'text-orange-300'} font-bold text-lg">${stats.name}</div>
                            <div class="text-xs text-gray-500 font-mono">DMG: ${stats.dmg} | Mods: ${w.mods ? w.mods.length : 0}</div>
                        </div>
                        ${actionBtn}
                    `;
                    content.appendChild(div);
                });
            }
            wrapper.appendChild(content);

            // Footer
            const footer = document.createElement('div');
            footer.className = "absolute bottom-0 left-0 w-full p-4 bg-black border-t-2 border-orange-900 z-50";
            footer.innerHTML = `<button class="action-button w-full border-2 border-orange-800 text-orange-700 hover:border-orange-500 hover:text-orange-400 transition-colors py-3 font-bold tracking-widest uppercase bg-black" onclick="UI.renderCity()">ZURÜCK ZUM ZENTRUM</button>`;
            wrapper.appendChild(footer);

            view.appendChild(wrapper);

        } catch(e) {
            console.error("FATAL SMITHY ERROR:", e);
            view.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-red-500 p-6 text-center">
                    <h1 class="text-2xl font-bold mb-4">SYSTEMFEHLER</h1>
                    <div class="border border-red-800 p-4 bg-red-900/20 mb-4 font-mono text-xs">
                        ${e.message}
                    </div>
                    <button onclick="UI.renderCity()" class="border border-red-500 px-4 py-2 hover:bg-red-500 hover:text-black">NEUSTART</button>
                </div>
            `;
        }
    },

    // --- NEU: HILFE FENSTER ---
    renderSmithyHelp: function() {
        const view = document.getElementById('view-container');
        if(!view) return;

        const overlay = document.createElement('div');
        overlay.className = "absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-fade-in";
        overlay.innerHTML = `
            <div class="w-full max-w-lg border-2 border-orange-500 bg-[#1a0f00] shadow-[0_0_30px_rgba(255,100,0,0.3)] flex flex-col max-h-full">
                <div class="p-4 border-b-2 border-orange-500 flex justify-between items-center bg-orange-900/30">
                    <h2 class="text-2xl font-bold text-orange-400 font-vt323 tracking-widest">MODDING HANDBUCH</h2>
                    <button onclick="this.closest('.absolute').remove()" class="text-orange-500 hover:text-white font-bold border border-orange-500 px-2">X</button>
                </div>
                
                <div class="p-6 overflow-y-auto custom-scrollbar text-sm font-mono space-y-6 text-orange-200">
                    
                    <div>
                        <h3 class="text-orange-400 font-bold border-b border-orange-800 mb-2">1. WAS IST MODDING?</h3>
                        <p class="opacity-80">
                            Hier kannst du deine Waffen verbessern. Jede Waffe hat bestimmte Slots (z.B. Lauf, Visier, Magazin), in die du Modifikationen einbauen kannst. Mods erhöhen Schaden, Präzision oder ändern den Munitionsverbrauch.
                        </p>
                    </div>

                    <div>
                        <h3 class="text-orange-400 font-bold border-b border-orange-800 mb-2">2. WIE FUNKTIONIERT ES?</h3>
                        <ul class="list-disc pl-4 space-y-1 opacity-80">
                            <li>Wähle eine Waffe aus der Liste und klicke auf <span class="text-orange-400 border border-orange-500 px-1 text-xs">MODIFIZIEREN</span>.</li>
                            <li>Du siehst nun alle Mods in deinem Inventar, die auf diese Waffe passen.</li>
                            <li>Klicke auf <span class="text-green-400 border border-green-500 px-1 text-xs">EINBAUEN</span>, um den Mod zu installieren.</li>
                            <li>Alte Mods im selben Slot werden dabei zerstört/ersetzt.</li>
                        </ul>
                    </div>

                    <div>
                        <h3 class="text-orange-400 font-bold border-b border-orange-800 mb-2">3. FUNDORTE</h3>
                        <p class="opacity-80 mb-2">Wo bekomme ich Mods her?</p>
                        <div class="grid grid-cols-1 gap-2">
                            <div class="bg-black/40 p-2 border-l-2 border-yellow-500 text-xs">
                                <strong class="text-yellow-500">HANDELSPOSTEN:</strong> Der Händler verkauft oft Basis-Mods.
                            </div>
                            <div class="bg-black/40 p-2 border-l-2 border-red-500 text-xs">
                                <strong class="text-red-500">BEUTE:</strong> Gegner im Ödland lassen selten Mods fallen. Legendäre Gegner haben höhere Chancen.
                            </div>
                            <div class="bg-black/40 p-2 border-l-2 border-blue-500 text-xs">
                                <strong class="text-blue-500">WERKBANK:</strong> (Bald verfügbar) Zerlege Waffen, um Baupläne für Mods zu lernen.
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 class="text-orange-400 font-bold border-b border-orange-800 mb-2">4. ROSTIGE WAFFEN</h3>
                        <p class="opacity-80">
                            Rostige Waffen ("Rusty ...") können nicht modifiziert werden. Du musst sie zuerst <span class="text-blue-400">Restaurieren</span>. Dafür benötigst du <span class="text-yellow-400">50 Kronkorken</span> und <span class="text-gray-400">Waffenöl</span>.
                        </p>
                    </div>

                </div>

                <div class="p-4 border-t-2 border-orange-500 bg-orange-900/20 text-center">
                    <button onclick="this.closest('.absolute').remove()" class="w-full bg-orange-500 text-black font-bold py-2 hover:bg-white transition-colors uppercase tracking-widest">VERSTANDEN</button>
                </div>
            </div>
        `;
        view.appendChild(overlay);
    },

    renderModdingScreen: function(weaponIdx) {
        try {
            const view = document.getElementById('view-container');
            if(!view) return;
            
            const weapon = Game.state.inventory[weaponIdx];
            if(!weapon) { 
                this.renderSmithy(); 
                return; 
            }
            
            const wDef = (Game.items && Game.items[weapon.id]) ? Game.items[weapon.id] : { name: weapon.id };

            view.innerHTML = ''; 

            const wrapper = document.createElement('div');
            wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black z-30 overflow-hidden";

            wrapper.innerHTML = `
                <div class="p-4 border-b-2 border-orange-500 bg-orange-900/20">
                    <h2 class="text-2xl text-orange-400 font-bold font-vt323 tracking-widest">MODIFIZIEREN</h2>
                    <div class="text-white font-bold">${weapon.name || wDef.name}</div>
                </div>
                <div class="p-4 bg-black/60 border-b border-gray-800 text-sm text-gray-400 font-mono">
                    <p>Verfügbare Slots: <span class="text-yellow-500">${wDef.modSlots ? wDef.modSlots.join(', ') : 'Keine'}</span></p>
                    <p>Installierte Mods: <span class="text-white">${weapon.mods ? weapon.mods.length : 0}</span></p>
                </div>
            `;

            const content = document.createElement('div');
            content.className = "flex-1 overflow-y-auto custom-scroll p-4 space-y-2 bg-[#0a0500]";

            let compatibleMods = [];
            if (Game.items) {
                compatibleMods = Game.state.inventory.map((item, idx) => ({...item, idx})).filter(m => {
                    const mDef = Game.items[m.id];
                    return mDef && mDef.type === 'mod' && mDef.target === weapon.id;
                });
            }

            if(compatibleMods.length === 0) {
                content.innerHTML = '<div class="text-red-500 text-sm text-center mt-10">Keine passenden Mods im Inventar gefunden.<br><span class="text-xs text-gray-500">(Klicke ? im Hauptmenü für Hilfe)</span></div>';
            } else {
                compatibleMods.forEach(m => {
                    const mDef = Game.items[m.id];
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center bg-black/40 p-3 border border-orange-500/30 hover:bg-orange-900/10";
                    div.innerHTML = `
                        <div>
                            <div class="text-orange-300 font-bold">${mDef.name}</div>
                            <div class="text-xs text-gray-400">${mDef.desc}</div>
                            <div class="text-xs text-green-500 mt-1">${JSON.stringify(mDef.stats).replace(/[{""}]/g,'').replace(/,/g, ', ')}</div>
                        </div>
                        <button onclick="Game.installMod(${weaponIdx}, ${m.idx}); UI.renderSmithy()" class="bg-green-900/30 text-xs px-3 py-2 border border-green-500 hover:bg-green-500 hover:text-black font-bold uppercase transition-colors">
                            EINBAUEN
                        </button>
                    `;
                    content.appendChild(div);
                });
            }
            wrapper.appendChild(content);

            const footer = document.createElement('div');
            footer.className = "p-4 bg-black border-t-2 border-gray-800";
            footer.innerHTML = `<button onclick="UI.renderSmithy()" class="w-full text-gray-500 hover:text-white uppercase font-bold text-sm">ZURÜCK</button>`;
            wrapper.appendChild(footer);

            view.appendChild(wrapper);
        } catch(e) {
            console.error("Modding Screen Error:", e);
            alert("MODDING ERROR:\n" + e.message);
            UI.renderSmithy(); 
        }
    },

    renderCrafting: function(tab = 'create') {
        Game.state.view = 'crafting';
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black/95 z-20 overflow-hidden";

        const scrollContainer = document.createElement('div');
        scrollContainer.className = "flex-1 overflow-y-auto overflow-x-hidden custom-scroll pb-24";

        const header = document.createElement('div');
        header.className = "p-4 border-b-2 border-blue-500 bg-blue-900/20 flex justify-between items-end shadow-lg shadow-blue-900/20";
        header.innerHTML = `
            <div>
                <h2 class="text-3xl text-blue-400 font-bold font-vt323 tracking-widest">WERKBANK</h2>
                <div class="text-xs text-blue-300 tracking-wider">Zustand: Rostig, aber funktional</div>
            </div>
            <div class="text-4xl text-blue-500 opacity-50">🛠️</div>
        `;
        scrollContainer.appendChild(header);
        
        const tabsDiv = document.createElement('div');
        tabsDiv.className = "flex w-full border-b border-blue-900 bg-black";
        tabsDiv.innerHTML = `
            <button class="flex-1 py-3 font-bold transition-colors uppercase tracking-wider ${tab==='create' ? 'bg-blue-900/40 text-blue-300 border-b-4 border-blue-500' : 'text-gray-600 hover:text-blue-300 hover:bg-blue-900/20'}" onclick="UI.renderCrafting('create')">HERSTELLEN</button>
            <button class="flex-1 py-3 font-bold transition-colors uppercase tracking-wider ${tab==='scrap' ? 'bg-orange-900/40 text-orange-300 border-b-4 border-orange-500' : 'text-gray-600 hover:text-orange-300 hover:bg-orange-900/20'}" onclick="UI.renderCrafting('scrap')">ZERLEGEN</button>
        `;
        scrollContainer.appendChild(tabsDiv);

        const listContent = document.createElement('div');
        listContent.id = "crafting-list";
        listContent.className = "p-3 space-y-2 bg-[#00050a]";
        scrollContainer.appendChild(listContent);

        const footer = document.createElement('div');
        footer.className = "absolute bottom-0 left-0 w-full p-4 bg-black border-t-2 border-blue-900 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.9)]";
        footer.innerHTML = `
            <button onclick="UI.renderCity()" class="action-button w-full border-gray-600 text-gray-500 hover:text-white hover:border-white transition-colors py-3 font-bold tracking-widest uppercase bg-black">
                ZURÜCK ZUM ZENTRUM
            </button>
        `;

        wrapper.appendChild(scrollContainer);
        wrapper.appendChild(footer);
        view.appendChild(wrapper);

        if (tab === 'create') {
            const recipes = Game.recipes || [];
            const known = Game.state.knownRecipes || [];
            let knownCount = 0; 

            recipes.forEach(recipe => {
                if(recipe.type === 'cooking') return; 
                if(!known.includes(recipe.id) && recipe.lvl > 1) return; 

                if (recipe.out === 'camp_kit') {
                    const hasKit = Game.state.inventory.some(i => i.id === 'camp_kit');
                    const hasBuilt = !!Game.state.camp;
                    if (hasKit || hasBuilt) return;
                }

                knownCount++;

                const outItem = (recipe.out === 'AMMO' ? {name: "15x Munition"} : Game.items[recipe.out]) || {name: "Unbekanntes Item"};
                let reqHtml = '';
                let canCraft = true;
                
                for(let reqId in recipe.req) {
                    const countNeeded = recipe.req[reqId];
                    const invItem = Game.state.inventory.find(i => i.id === reqId);
                    const countHave = invItem ? invItem.count : 0;
                    const reqDef = Game.items[reqId];
                    const reqName = reqDef ? reqDef.name : reqId;
                    let color = "text-green-600";
                    if (countHave < countNeeded) { canCraft = false; color = "text-red-500 font-bold"; }
                    reqHtml += `<div class="${color} text-xs uppercase">• ${reqName}: ${countHave}/${countNeeded}</div>`;
                }
                
                if(Game.state.lvl < recipe.lvl) { canCraft = false; reqHtml += `<div class="text-red-500 text-xs mt-1 font-bold">Benötigt Level ${recipe.lvl}</div>`; }

                const div = document.createElement('div');
                div.className = `border ${canCraft ? 'border-green-600 bg-green-900/10' : 'border-gray-800 bg-black opacity-50'} p-3 flex justify-between items-center transition-all hover:bg-green-900/20`;
                div.innerHTML = `
                    <div>
                        <div class="font-bold ${canCraft ? 'text-green-300' : 'text-gray-500'} text-lg">${outItem.name}</div>
                        <div class="grid grid-cols-2 gap-x-4 mt-1 border-l-2 border-green-900 pl-2">${reqHtml}</div>
                    </div>
                    <button class="action-button text-sm px-4 py-2 border-2 ${canCraft ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-bold' : 'border-gray-600 text-gray-600 cursor-not-allowed'}" onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>FERTIGEN</button>
                `;
                listContent.appendChild(div);
            });
            if(knownCount === 0) listContent.innerHTML = '<div class="text-gray-500 italic mt-10 text-center">Keine bekannten Baupläne.</div>';
        } else {
            // SCRAP LIST
            let scrappables = [];
            Game.state.inventory.forEach((item, idx) => {
                const def = Game.items[item.id];
                if(!def) return;
                
                if (item.id === 'junk_metal' || item.id === 'camp_kit') return;
                if (def.type === 'blueprint') return;

                if (['weapon','body','head','legs','feet','arms','junk'].includes(def.type)) {
                    scrappables.push({idx, item, def});
                }
            });

            if(scrappables.length === 0) {
                listContent.innerHTML = '<div class="text-center text-gray-500 mt-10 p-4 border-2 border-dashed border-gray-800">Kein zerlegbarer Schrott im Inventar.</div>';
            } else {
                scrappables.forEach(entry => {
                    const name = entry.item.props && entry.item.props.name ? entry.item.props.name : entry.def.name;
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center p-3 border border-orange-800 bg-orange-900/10 hover:bg-orange-900/20 transition-colors";
                    div.innerHTML = `
                        <div class="font-bold text-orange-300">${name} <span class="text-xs text-orange-600 font-normal ml-2">(${entry.item.count}x)</span></div>
                        <button class="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black px-3 py-1 text-xs font-bold transition-colors uppercase" onclick="Game.scrapItem(${entry.idx})">ZERLEGEN</button>
                    `;
                    listContent.appendChild(div);
                });
            }
        }
    },

    renderShop: function(mode = 'buy') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = ''; 

        Game.state.view = 'shop';
        Game.checkShopRestock(); 

        const wrapper = document.createElement('div');
        wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black z-20 overflow-hidden";

        const scrollContainer = document.createElement('div');
        scrollContainer.className = "flex-1 overflow-y-auto overflow-x-hidden custom-scroll p-3 pb-24";
        
        const usedSlots = Game.getUsedSlots();
        const maxSlots = Game.getMaxSlots();
        const isFull = usedSlots >= maxSlots;
        const invColor = isFull ? "text-red-500 animate-pulse" : "text-yellow-300";

        scrollContainer.innerHTML = `
            <div class="flex justify-between items-end p-4 border-b-4 border-yellow-600 bg-[#1a1500] shadow-md mb-4">
                <div>
                    <h2 class="text-3xl text-yellow-400 font-bold font-vt323 tracking-wider">HANDELSPOSTEN</h2>
                    <div class="text-xs text-yellow-700 font-mono mt-1">HÄNDLER: <span class="font-bold text-yellow-500">${Game.state.shop.merchantCaps} KK</span></div>
                </div>
                <div class="flex gap-2">
                    <div class="bg-black/50 border-2 border-yellow-500 p-2 flex flex-col items-end shadow-inner">
                         <span class="text-[10px] text-yellow-600 uppercase tracking-widest">GEWICHT</span>
                         <span class="text-2xl ${invColor} font-bold font-vt323">${usedSlots} / ${maxSlots}</span>
                    </div>
                    <div class="bg-black/50 border-2 border-yellow-500 p-2 flex flex-col items-end shadow-inner">
                        <span class="text-[10px] text-yellow-600 uppercase tracking-widest">DEIN VERMÖGEN</span>
                        <span class="text-2xl text-yellow-300 font-bold font-vt323">${Game.state.caps} KK</span>
                    </div>
                </div>
            </div>
        `;

        const controlsDiv = document.createElement('div');
        controlsDiv.className = "bg-[#002200] border-b-2 border-green-500 p-3 shadow-lg mb-4";
        
        const getBtnClass = (val) => {
            if (UI.shopQty === val) return "bg-yellow-400 text-black border-yellow-400 font-bold shadow-[0_0_10px_#ffd700]"; 
            return "bg-black text-green-500 border-green-500 hover:border-yellow-400 hover:text-yellow-400"; 
        };

        let inputValue = (UI.shopQty === 'max') ? '' : UI.shopQty;

        controlsDiv.innerHTML = `
            <div class="flex flex-col gap-2">
                <div class="flex justify-between items-center text-xs text-green-400 mb-1">
                    <span class="uppercase tracking-widest font-bold">MENGENAUSWAHL</span>
                </div>
                <div class="flex gap-2 h-10">
                    <input type="number" id="shop-qty-input" value="${inputValue}" placeholder="Menge"
                        class="w-20 bg-black border-2 border-green-500 text-green-400 text-center font-bold text-xl focus:border-yellow-400 focus:text-yellow-400 outline-none"
                        oninput="UI.setShopQty(this.value, 'input')">
                    
                    <button onclick="UI.setShopQty(1)" class="flex-1 border-2 ${getBtnClass(1)} transition-all uppercase tracking-wider">
                        1x
                    </button>
                    <button onclick="UI.setShopQty(10)" class="flex-1 border-2 ${getBtnClass(10)} transition-all uppercase tracking-wider">
                        10x
                    </button>
                    <button onclick="UI.setShopQty('max')" class="flex-1 border-2 ${getBtnClass('max')} transition-all uppercase tracking-wider">
                        MAX
                    </button>
                </div>
            </div>
            
            <div class="flex mt-3 border-b border-green-800">
                <button onclick="UI.renderShop('buy')" class="flex-1 py-2 text-center font-bold ${mode==='buy' ? 'bg-green-500 text-black' : 'text-green-600 hover:text-green-300'}">KAUFEN</button>
                <button onclick="UI.renderShop('sell')" class="flex-1 py-2 text-center font-bold ${mode==='sell' ? 'bg-red-500 text-black' : 'text-red-600 hover:text-red-300'}">VERKAUFEN</button>
            </div>
        `;
        
        scrollContainer.appendChild(controlsDiv);

        const listContent = document.createElement('div');
        listContent.id = "shop-list";
        listContent.className = "space-y-2";
        scrollContainer.appendChild(listContent);

        const footer = document.createElement('div');
        footer.className = "absolute bottom-0 left-0 w-full p-4 bg-black border-t-2 border-yellow-900 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.9)]";
        footer.innerHTML = `<button class="action-button w-full border-2 border-yellow-800 text-yellow-700 hover:border-yellow-500 hover:text-yellow-400 transition-colors py-3 font-bold tracking-widest uppercase bg-black" onclick="UI.renderCity()">ZURÜCK ZUM ZENTRUM</button>`;

        wrapper.appendChild(scrollContainer);
        wrapper.appendChild(footer);
        view.appendChild(wrapper);

        if(mode === 'buy') this.renderShopBuy(listContent);
        else this.renderShopSell(listContent);
    },

    renderShopBuy: function(container) {
        if(!container) return;
        container.innerHTML = '';

        const stock = Game.state.shop.stock || {};
        const ammoStock = (Game.state.shop.ammoStock !== undefined) ? Game.state.shop.ammoStock : 0;
        const myCaps = Game.state.caps;

        const createRow = (icon, name, qty, price, key, isAmmo = false) => {
            const canBuy = myCaps >= price;
            
            let colorText = isAmmo ? 'text-blue-300' : 'text-yellow-200';
            let colorBorder = isAmmo ? 'border-blue-500' : 'border-yellow-700';
            let colorBg = isAmmo ? 'bg-blue-900/20 hover:bg-blue-600/40' : 'bg-yellow-900/10 hover:bg-yellow-600/40';
            let colorSub = isAmmo ? 'text-blue-600' : 'text-yellow-700';
            let colorBtn = isAmmo ? 'text-blue-400' : 'text-yellow-600';

            if (!canBuy) {
                colorText = 'text-gray-500';
                colorBorder = 'border-red-900';
                colorBg = 'bg-red-900/10 opacity-50';
                colorSub = 'text-red-900';
                colorBtn = 'text-red-900';
            }

            const row = document.createElement('div');
            row.className = `shop-item-row flex justify-between items-center mb-2 border-2 ${colorBorder} ${colorBg} h-16 relative z-10 transition-all select-none`;
            
            if (canBuy) {
                row.style.cursor = 'pointer';
                row.setAttribute('onclick', `Game.buyItem('${key}', UI.shopQty)`);
            } else {
                row.style.cursor = 'not-allowed';
            }

            row.innerHTML = `
                <div class="flex items-center gap-3 p-2 flex-grow overflow-hidden pointer-events-none">
                    <div class="text-3xl w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded">${icon}</div>
                    <div class="flex flex-col truncate">
                        <span class="font-bold text-lg font-vt323 truncate leading-none pt-1 ${colorText}">${name}</span>
                        <span class="text-xs ${colorSub} font-mono uppercase">Vorrat: ${qty} | Preis: ${price} KK</span>
                    </div>
                </div>
                <div class="h-full flex flex-col justify-center items-end border-l-2 ${colorBorder} bg-black/30 min-w-[100px]">
                    <button class="w-full h-full text-sm font-bold uppercase tracking-wider bg-transparent border-none ${colorBtn}" style="pointer-events: none;">
                        KAUFEN
                    </button>
                </div>
            `;
            return row;
        };

        if(ammoStock > 0) {
            container.appendChild(createRow("🧨", "10x MUNITION", ammoStock, 10, 'ammo', true));
            container.innerHTML += `<div class="h-px bg-yellow-900/50 my-4 mx-2"></div>`;
        }

        const categories = {
            'consumable': { title: '💊 MEDIZIN', items: [] },
            'weapon': { title: '🔫 WAFFEN', items: [] },
            'body': { title: '🛡️ RÜSTUNG', items: [] },
            'misc': { title: '📦 SONSTIGES', items: [] } 
        };

        Object.keys(stock).forEach(key => {
            if (key === 'fists' || key === 'vault_suit' || key === 'mele') return;
            if (key === 'camp_kit') return;
            if(stock[key] <= 0) return;
            
            const item = Game.items[key];
            if(!item) return;
            const cat = categories[item.type] || categories['misc'];
            cat.items.push({key, ...item});
        });

        for(let catKey in categories) {
            const cat = categories[catKey];
            if(cat.items.length > 0) {
                const header = document.createElement('h3');
                header.className = "text-yellow-600 font-bold border-b border-yellow-800 mt-4 mb-2 pl-1 text-xs uppercase tracking-widest font-mono";
                header.textContent = cat.title;
                container.appendChild(header);

                cat.items.forEach(data => {
                    let icon = "📦";
                    if(data.type==='weapon') icon="🔫"; if(data.type==='body') icon="🛡️"; if(data.type==='consumable') icon="💉";
                    container.appendChild(createRow(icon, data.name, stock[data.key], data.cost, data.key, false));
                });
            }
        }
    },

    renderShopSell: function(container) {
        if(!container) return;
        container.innerHTML = '';

        if(Game.state.inventory.length === 0) {
            container.innerHTML = '<div class="text-center text-green-800 mt-10 font-mono border-2 border-dashed border-green-900 p-6">INVENTAR LEER</div>';
            return;
        }

        Game.state.inventory.forEach((item, idx) => {
            const def = Game.items[item.id];
            if(!def) return;
            
            if (item.id === 'fists' || item.id === 'camp_kit') return;

            let valMult = item.props && item.props.valMult ? item.props.valMult : 1;
            let sellPrice = Math.floor((def.cost * 0.25) * valMult);
            if(sellPrice < 1) sellPrice = 1;
            const canSell = Game.state.shop.merchantCaps >= sellPrice;
            const name = item.props ? item.props.name : def.name;

            const div = document.createElement('div');
            div.className = `shop-item-row flex justify-between items-center mb-2 border-2 ${canSell ? 'border-green-700 bg-green-900/10 hover:bg-green-900/20' : 'border-red-900 opacity-50'} h-14 transition-all select-none relative z-10`;
            
            if(canSell) {
                div.style.cursor = 'pointer';
                div.setAttribute('onclick', `Game.sellItem(${idx}, UI.shopQty)`);
            } else {
                div.style.cursor = 'not-allowed';
            }

            div.innerHTML = `
                <div class="flex items-center gap-3 p-2 flex-grow overflow-hidden pointer-events-none">
                    <div class="text-green-500 font-bold text-lg font-vt323 truncate">${name} <span class="text-green-800 text-sm font-sans">x${item.count}</span></div>
                </div>
                <div class="h-full flex flex-col justify-center items-end border-l-2 border-green-800 bg-black/30 min-w-[100px] pointer-events-none">
                    <div class="font-bold text-green-400 text-lg w-full text-center border-b border-green-900 font-vt323">${sellPrice}</div>
                    <button class="flex-grow w-full h-full text-[10px] font-bold uppercase tracking-wider hover:bg-green-600 hover:text-black transition-colors text-green-700">VERKAUFEN</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    setShopQty: function(val, source) {
        if (source === 'input') {
            const parsed = parseInt(val);
            if (!isNaN(parsed) && parsed > 0) {
                this.shopQty = parsed;
            } else {
                this.shopQty = 1; 
            }
            this.updateShopQtyVisuals();
        } else {
            this.shopQty = val;
            const inputEl = document.getElementById('shop-qty-input');
            if (inputEl) {
                inputEl.value = (val === 'max') ? '' : val;
                inputEl.placeholder = (val === 'max') ? 'MAX' : 'Menge';
            }
            this.updateShopQtyVisuals();
        }
    },

    updateShopQtyVisuals: function() {
        if (document.activeElement.id !== 'shop-qty-input') {
            const sellBtn = document.querySelector('button.bg-red-500'); 
            const mode = sellBtn ? 'sell' : 'buy';
            this.renderShop(mode);
        }
    },

    renderClinic: function() {
        Game.state.view = 'clinic';
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black/95 relative";

        wrapper.innerHTML = `
            <div class="flex-shrink-0 p-4 border-b-2 border-red-600 bg-red-900/20 text-center shadow-lg shadow-red-900/20">
                <h2 class="text-3xl text-red-500 font-bold tracking-widest font-vt323">DR. ZIMMERMANN</h2>
                <div class="text-xs text-red-300 tracking-wider">MEDIZINISCHES ZENTRUM</div>
            </div>
            
            <div class="flex-grow flex flex-col items-center justify-center p-6 gap-6 text-center overflow-y-auto">
                <div class="text-7xl animate-pulse filter drop-shadow-[0_0_15px_red]">⚕️</div>
                
                <div class="border-2 border-red-800 p-4 bg-black/80 w-full max-w-md shadow-inner shadow-red-900/30">
                    <div class="text-red-400 mb-2 font-bold border-b border-red-900 pb-1 tracking-widest text-sm">PATIENTEN STATUS</div>
                    <div class="flex justify-between text-lg font-mono mb-1">
                        <span>GESUNDHEIT:</span> 
                        <span class="${Game.state.hp < Game.state.maxHp ? 'text-red-500 blink-red' : 'text-green-500'}">${Math.floor(Game.state.hp)} / ${Game.state.maxHp}</span>
                    </div>
                    <div class="flex justify-between text-lg font-mono">
                        <span>STRAHLUNG:</span> 
                        <span class="${Game.state.rads > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}">${Math.floor(Game.state.rads)} RADS</span>
                    </div>
                </div>

                <div class="text-gray-400 italic text-sm max-w-md leading-relaxed border-l-2 border-red-900 pl-3 text-left">
                    "Ich kann Sie wieder zusammenflicken. Entfernt Strahlung und heilt alle Verletzungen. Kostet aber ein bisschen was für die... Materialien."
                </div>

                <button onclick="Game.heal()" class="action-button w-full max-w-md py-4 text-xl border-2 border-red-500 text-red-500 hover:bg-red-900/50 font-bold transition-all" ${Game.state.caps < 25 ? 'disabled' : ''}>
                    KOMPLETTBEHANDLUNG (25 KK)
                </button>
            </div>

            <div class="flex-shrink-0 p-3 border-t border-red-900 bg-[#0a0000]">
                <button class="action-button w-full border-gray-600 text-gray-500 hover:text-white hover:border-white transition-colors" onclick="UI.renderCity()">ZURÜCK ZUM ZENTRUM</button>
            </div>
        `;
        view.appendChild(wrapper);
    }
});
