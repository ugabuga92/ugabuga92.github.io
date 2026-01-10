// [TIMESTAMP] 2026-01-10 22:35:00 - ui_view_town.js - RESTORED CLASSIC VATS DESIGN

Object.assign(UI, {
    
    shopQty: 1,

    // ==========================================
    // === VAULT 101 (HOME BASE) ===
    // ==========================================
    renderVault: function() {
        Game.state.view = 'vault';
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black/95 relative overflow-hidden";

        // HEADER
        wrapper.innerHTML = `
            <div class="flex-shrink-0 p-4 border-b-2 border-green-500 bg-green-900/20 text-center shadow-[0_0_20px_rgba(0,255,0,0.2)]">
                <div class="absolute top-2 left-2 text-[10px] text-green-600 animate-pulse">SYS.STATUS: ONLINE</div>
                <h2 class="text-4xl text-green-400 font-bold tracking-widest font-vt323 drop-shadow-md">VAULT 101</h2>
                <div class="text-xs text-green-300 tracking-[0.3em] mt-1 uppercase">SICHERHEIT - STABILITÄT - ZUKUNFT</div>
            </div>
            
            <div class="flex-grow flex flex-col items-center justify-start p-6 gap-6 text-center overflow-y-auto custom-scrollbar">
                
                <div class="relative w-24 h-24 flex items-center justify-center mb-2">
                    <div class="absolute inset-0 border-4 border-green-900 rounded-full animate-spin-slow opacity-50"></div>
                    <div class="text-5xl filter drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]">⚙️</div>
                </div>

                <div class="border-2 border-green-800 p-4 bg-black/80 w-full max-w-md shadow-inner shadow-green-900/30">
                    <div class="text-green-500 mb-2 font-bold border-b border-green-900 pb-1 tracking-widest text-sm">BIOMETRIE SCAN</div>
                    <div class="flex justify-between text-lg font-mono mb-1">
                        <span>GESUNDHEIT:</span> 
                        <span class="${Game.state.hp < Game.state.maxHp ? 'text-yellow-400' : 'text-green-400'}">${Math.floor(Game.state.hp)} / ${Game.state.maxHp}</span>
                    </div>
                    <div class="flex justify-between text-lg font-mono mb-1">
                        <span>STRAHLUNG:</span> 
                        <span class="${Game.state.rads > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}">${Math.floor(Game.state.rads)} RADS</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-3 w-full max-w-md">
                    <button onclick="Game.rest()" class="py-4 border-2 border-blue-500 text-blue-400 hover:bg-blue-900/30 font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-3">
                        <span class="text-2xl">💤</span> AUSRUHEN (HP REGEN)
                    </button>
                </div>

                <div class="w-full max-w-md border-t-2 border-dashed border-green-900 pt-4 mt-4">
                    <div class="text-[10px] text-green-600 uppercase tracking-widest mb-2 font-bold">--- SIMULATION MODE (TEST) ---</div>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="border border-green-600 text-green-600 text-xs py-2 hover:bg-green-900 hover:text-white transition-colors" onclick="UI.startMinigame('hacking')">
                            💻 HACKING
                        </button>
                        <button class="border border-green-600 text-green-600 text-xs py-2 hover:bg-green-900 hover:text-white transition-colors" onclick="UI.startMinigame('lockpicking')">
                            🔒 SCHLOSS
                        </button>
                        <button class="border border-yellow-600 text-yellow-500 text-xs py-2 hover:bg-yellow-900 hover:text-white transition-colors" onclick="UI.startMinigame('dice')">
                            🎲 DICE (LUCK)
                        </button>
                        <button class="border border-red-600 text-red-500 text-xs py-2 hover:bg-red-900 hover:text-white transition-colors" onclick="UI.startMinigame('defusal')">
                            💣 BOMBE (AGI)
                        </button>
                    </div>
                </div>

            </div>

            <div class="flex-shrink-0 p-3 border-t-2 border-green-900 bg-[#001100]">
                <button class="action-button w-full border-gray-600 text-gray-500 hover:text-white hover:border-white transition-colors uppercase tracking-[0.2em] py-3 font-bold" onclick="UI.switchView('map')">
                    <span class="mr-2">☢️</span> ZURÜCK INS ÖDLAND
                </button>
            </div>
        `;
        view.appendChild(wrapper);
    },

    // ==========================================
    // === COMBAT SCREEN (DESIGN RESTORED) ===
    // ==========================================
    renderCombat: function() {
        Game.state.view = 'combat';
        const view = document.getElementById('view-container');
        if(!view) return;
        
        if(!Combat.enemy) {
            UI.switchView('map');
            return;
        }

        view.innerHTML = ''; 

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden select-none";

        // Feedback Layer
        const feedbackLayer = document.createElement('div');
        feedbackLayer.id = "combat-feedback-layer";
        feedbackLayer.className = "absolute inset-0 pointer-events-none z-50 overflow-hidden";
        wrapper.appendChild(feedbackLayer);

        // Flash Effect Layer
        const flashLayer = document.createElement('div');
        flashLayer.id = "damage-flash";
        flashLayer.className = "absolute inset-0 bg-red-500 pointer-events-none z-40 hidden transition-opacity duration-300 opacity-0";
        wrapper.appendChild(flashLayer);

        // --- ENEMY CONTAINER (Upper Area) ---
        const enemyContainer = document.createElement('div');
        enemyContainer.className = "flex-grow flex flex-col items-center justify-center relative bg-gradient-to-b from-black to-[#051005]";
        
        // Gegner Infos (Oben Zentriert)
        let hpPercent = (Combat.enemy.hp / Combat.enemy.maxHp) * 100;
        let hpColor = "bg-red-600";
        if (Combat.enemy.isLegendary) hpColor = "bg-yellow-500"; 

        const infoBar = document.createElement('div');
        infoBar.className = "absolute top-4 w-full max-w-md px-4 z-10 flex flex-col items-center";
        infoBar.innerHTML = `
            <div class="flex flex-col w-full items-center mb-1">
                <span class="text-2xl font-bold ${Combat.enemy.isLegendary ? 'text-yellow-400 drop-shadow-[0_0_5px_gold]' : 'text-red-500'} font-vt323 tracking-wider uppercase">
                    ${Combat.enemy.name} ${Combat.enemy.isLegendary ? '⭐' : ''}
                </span>
                <span class="text-xs text-red-300 font-mono">${Math.ceil(Combat.enemy.hp)} / ${Combat.enemy.maxHp} HP</span>
            </div>
            <div class="w-full h-6 bg-red-900/30 border-2 border-red-700 skew-x-[-10deg] shadow-[0_0_10px_rgba(255,0,0,0.2)]">
                <div class="h-full ${hpColor} transition-all duration-300" style="width: ${hpPercent}%"></div>
            </div>
        `;
        enemyContainer.appendChild(infoBar);

        // Gegner Bild (Mitte Groß)
        const visual = document.createElement('div');
        visual.id = "enemy-img";
        visual.className = "text-[9rem] filter drop-shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-transform duration-100 flex items-center justify-center h-full pb-10";
        visual.textContent = Combat.enemy.symbol || "💀";
        enemyContainer.appendChild(visual);

        // --- VATS OVERLAY (Unten im Bild) ---
        if(Combat.turn === 'player') {
            const vats = document.createElement('div');
            vats.className = "absolute bottom-4 flex gap-2 w-full max-w-md justify-center px-2 z-20";
            
            Combat.bodyParts.forEach((part, idx) => {
                const hitChance = Combat.calculateHitChance(idx);
                const isSelected = (idx === Combat.selectedPart);
                
                let btnClass = "flex-1 border-2 py-3 px-1 flex flex-col items-center justify-center transition-all bg-black/90 cursor-pointer ";
                
                // Old School Styling Logic
                if(isSelected) {
                    btnClass += "border-yellow-400 text-yellow-400 bg-yellow-900/40 shadow-[0_0_15px_#ccaa00] scale-105 z-30";
                } else {
                    btnClass += "border-green-700 text-green-700 hover:border-green-500 hover:text-green-500 hover:bg-green-900/20";
                }

                const btn = document.createElement('button');
                btn.id = `btn-vats-${idx}`;
                btn.className = btnClass;
                // Direktes Selektieren per Klick
                btn.onclick = (e) => { 
                    e.stopPropagation(); 
                    Combat.selectPart(idx); 
                    Combat.confirmSelection(); 
                };
                
                // Anzeige: Name, Prozent, Schaden-Mod
                btn.innerHTML = `
                    <span class="text-[10px] font-bold tracking-[0.2em] uppercase mb-1">${part.name}</span>
                    <span class="text-3xl font-bold font-vt323 leading-none">${hitChance}%</span>
                    <span class="text-[9px] mt-1 font-mono opacity-80">${part.dmgMod}x DMG</span>
                `;
                vats.appendChild(btn);
            });
            enemyContainer.appendChild(vats);
        } else {
            // Enemy Turn Indicator
            const wait = document.createElement('div');
            wait.className = "absolute bottom-10 text-red-500 font-bold text-2xl animate-pulse tracking-widest border-y-2 border-red-500 px-8 py-2 bg-black/80";
            wait.textContent = "⚠️ GEGNER AM ZUG ⚠️";
            enemyContainer.appendChild(wait);
        }

        wrapper.appendChild(enemyContainer);

        // --- LOG AREA & FOOTER ---
        const footerArea = document.createElement('div');
        footerArea.className = "flex-shrink-0 flex flex-col bg-black border-t-4 border-green-800";

        const logArea = document.createElement('div');
        logArea.id = "combat-log";
        logArea.className = "h-32 p-3 font-mono text-xs overflow-hidden flex flex-col justify-end text-green-400 leading-relaxed opacity-90 shadow-inner bg-[#000500]";
        footerArea.appendChild(logArea);

        // Action Button (Attack / Flee)
        const btnRow = document.createElement('div');
        btnRow.className = "flex p-2 gap-2 bg-[#051005] border-t border-green-600";
        
        if(Combat.turn === 'player') {
            btnRow.innerHTML = `
                <button onclick="Combat.confirmSelection()" class="flex-grow action-button py-4 text-xl font-bold border-yellow-500 text-yellow-500 hover:bg-yellow-900/50 shadow-[0_0_10px_rgba(255,255,0,0.2)] tracking-widest">
                    [ SPACE ] ANGRIFF
                </button>
                <button onclick="Combat.flee()" class="w-1/3 action-button py-4 text-gray-500 border-gray-600 hover:text-white hover:border-white">
                    FLUCHT
                </button>
            `;
        } else {
            btnRow.innerHTML = `<button disabled class="w-full action-button py-4 text-gray-600 border-gray-800 cursor-wait bg-gray-900/20">WARTEN...</button>`;
        }
        footerArea.appendChild(btnRow);

        wrapper.appendChild(footerArea);
        view.appendChild(wrapper);
    },

    // ==========================================
    // === CITY HUB ===
    // ==========================================
    renderCity: function(cityId = 'rusty_springs') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = ''; 
        Game.state.view = 'city';

        const data = { name: "RUSTY SPRINGS", pop: 142, sec: "HOCH", rad: "NIEDRIG" };

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden";

        const header = document.createElement('div');
        header.className = "flex-shrink-0 flex flex-col border-b-4 border-green-900 bg-[#001100] p-4 relative shadow-lg z-10";
        header.innerHTML = `
            <div class="flex justify-between items-start z-10 relative">
                <div>
                    <h1 class="text-5xl md:text-6xl font-bold text-green-400 tracking-widest text-shadow-glow font-vt323 leading-none">${data.name}</h1>
                    <div class="text-green-600 text-sm italic mt-1 font-mono">"Der sicherste Ort im Sektor."</div>
                </div>
                <div class="bg-black/60 border-2 border-yellow-600 p-2 flex flex-col items-end">
                    <span class="text-[10px] text-yellow-700 font-bold tracking-widest">VERMÖGEN</span>
                    <span class="text-2xl text-yellow-400 font-bold font-vt323 tracking-wider">${Game.state.caps} KK</span>
                </div>
            </div>
        `;
        wrapper.appendChild(header);

        const grid = document.createElement('div');
        grid.className = "flex-grow overflow-y-auto custom-scrollbar p-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start bg-[#050a05]";

        const createCard = (conf) => {
            const card = document.createElement('div');
            let baseClass = "relative overflow-hidden group cursor-pointer p-4 flex items-center gap-4 border-2 transition-all duration-200 bg-black/80 hover:bg-[#0a1a0a] shadow-md min-h-[100px]";
            
            let themeColor = "green";
            if(conf.type === 'trader') { themeColor = "yellow"; baseClass += " md:col-span-2 border-yellow-600 hover:border-yellow-400"; }
            else if (conf.type === 'clinic') { themeColor = "red"; baseClass += " border-red-600 hover:border-red-400"; }
            else if (conf.type === 'craft') { themeColor = "blue"; baseClass += " border-blue-600 hover:border-blue-400"; }
            else { baseClass += " border-green-600 hover:border-green-400"; }

            card.className = baseClass;
            card.onclick = conf.onClick;

            card.innerHTML = `
                <div class="icon flex-shrink-0 text-5xl z-10 relative filter drop-shadow-md">${conf.icon}</div>
                <div class="flex flex-col z-10 relative">
                    <span class="text-2xl font-bold text-${themeColor}-500 tracking-wider font-vt323 uppercase">${conf.label}</span>
                    <span class="text-xs text-${themeColor}-700 font-mono uppercase tracking-widest mt-1">${conf.sub}</span>
                </div>
            `;
            return card;
        };

        grid.appendChild(createCard({
            type: 'trader', icon: "🛒", label: "HANDELSPOSTEN", sub: "Waffen • Munition",
            onClick: () => { if(UI.renderShop) UI.renderShop(); }
        }));
        grid.appendChild(createCard({
            type: 'clinic', icon: "⚕️", label: "KLINIK", sub: "Dr. Zimmermann",
            onClick: () => { if(UI.renderClinic) UI.renderClinic(); }
        }));
        grid.appendChild(createCard({
            type: 'craft', icon: "🛠️", label: "WERKBANK", sub: "Zerlegen & Bauen",
            onClick: () => { if(UI.renderCrafting) UI.renderCrafting(); }
        }));

        wrapper.appendChild(grid);

        const footer = document.createElement('div');
        footer.className = "flex-shrink-0 p-3 border-t-4 border-green-900 bg-[#001100]";
        footer.innerHTML = `
            <button class="action-button w-full border-2 border-green-600 text-green-500 py-3 font-bold text-xl hover:bg-green-900/50 hover:text-green-200 transition-all uppercase tracking-[0.15em]" onclick="Game.leaveCity()">
                <span class="mr-2">🚪</span> ZURÜCK INS ÖDLAND (ESC)
            </button>
        `;
        wrapper.appendChild(footer);
        view.appendChild(wrapper);
    },

    // ==========================================
    // === KLINIK ===
    // ==========================================
    renderClinic: function() {
        Game.state.view = 'clinic';
        const view = document.getElementById('view-container');
        view.innerHTML = '';
        view.innerHTML = `
            <div class="w-full h-full flex flex-col bg-black/95 relative p-4 items-center justify-center text-center">
                <h2 class="text-3xl text-red-500 font-bold mb-4 font-vt323">DR. ZIMMERMANN</h2>
                <div class="text-7xl animate-pulse mb-6">⚕️</div>
                <div class="border border-red-800 p-4 w-full max-w-md mb-6">
                    <div class="flex justify-between text-lg"><span>HP:</span> <span class="text-white">${Math.floor(Game.state.hp)}/${Game.state.maxHp}</span></div>
                    <div class="flex justify-between text-lg"><span>RADS:</span> <span class="text-red-500">${Math.floor(Game.state.rads)}</span></div>
                </div>
                <div class="text-gray-400 italic text-sm max-w-md mb-6">"Ich kann Sie wieder zusammenflicken. Kostet 25 KK."</div>
                <button onclick="Game.heal()" class="action-button w-full max-w-md py-3 text-red-500 border-red-500 mb-4" ${Game.state.caps < 25 ? 'disabled' : ''}>BEHANDLUNG (25 KK)</button>
                <button class="action-button w-full max-w-md border-gray-600 text-gray-500" onclick="UI.renderCity()">ZURÜCK</button>
            </div>
        `;
    },

    // ==========================================
    // === WERKBANK ===
    // ==========================================
    renderCrafting: function(tab = 'create') {
        Game.state.view = 'crafting';
        const view = document.getElementById('view-container');
        view.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black/95 relative";

        wrapper.innerHTML = `
            <div class="flex-shrink-0 p-4 border-b-2 border-blue-500 bg-blue-900/20 flex justify-between items-end shadow-lg">
                <div><h2 class="text-3xl text-blue-400 font-bold font-vt323">WERKBANK</h2></div>
                <div class="text-4xl text-blue-500 opacity-50">🛠️</div>
            </div>
            <div class="flex-shrink-0 flex w-full border-b border-blue-900 bg-black">
                <button class="flex-1 py-3 font-bold ${tab==='create' ? 'bg-blue-900/40 text-blue-300 border-b-4 border-blue-500' : 'text-gray-600 hover:text-blue-300'}" onclick="UI.renderCrafting('create')">HERSTELLEN</button>
                <button class="flex-1 py-3 font-bold ${tab==='scrap' ? 'bg-orange-900/40 text-orange-300 border-b-4 border-orange-500' : 'text-gray-600 hover:text-orange-300'}" onclick="UI.renderCrafting('scrap')">ZERLEGEN</button>
            </div>
            <div id="crafting-list" class="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#00050a]"></div>
            <div class="flex-shrink-0 p-3 border-t border-blue-900 bg-[#000205]">
                <button onclick="UI.renderCity()" class="action-button w-full border-gray-600 text-gray-500 hover:text-white">ZURÜCK</button>
            </div>
        `;
        view.appendChild(wrapper);

        const container = wrapper.querySelector('#crafting-list');
        
        if (tab === 'create') {
            const recipes = Game.recipes || [];
            const known = Game.state.knownRecipes || [];
            let knownCount = 0; 

            recipes.forEach(recipe => {
                if(recipe.type === 'cooking') return; 
                if(!known.includes(recipe.id) && recipe.lvl > 1) return; 
                knownCount++;

                const outItem = (recipe.out === 'AMMO' ? {name: "15x Munition"} : Game.items[recipe.out]) || {name: "Unbekannt"};
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
                div.className = `border ${canCraft ? 'border-green-600 bg-green-900/10' : 'border-gray-800 bg-black opacity-50'} p-3 flex justify-between items-center transition-all`;
                div.innerHTML = `
                    <div>
                        <div class="font-bold ${canCraft ? 'text-green-300' : 'text-gray-500'} text-lg">${outItem.name}</div>
                        <div class="grid grid-cols-2 gap-x-4 mt-1 border-l-2 border-green-900 pl-2">${reqHtml}</div>
                    </div>
                    <button class="action-button text-sm px-4 py-2 border-2 ${canCraft ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-bold' : 'border-gray-600 text-gray-600 cursor-not-allowed'}" onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>FERTIGEN</button>
                `;
                container.appendChild(div);
            });
            if(knownCount === 0) container.innerHTML = '<div class="text-gray-500 italic mt-10 text-center">Keine bekannten Baupläne.</div>';
        } else {
            // SCRAP TAB
            let scrappables = [];
            Game.state.inventory.forEach((item, idx) => {
                const def = Game.items[item.id];
                if(!def) return;
                if (item.id === 'junk_metal') return;
                if (def.type === 'blueprint') return;
                if (['weapon','body','head','legs','feet','arms','junk'].includes(def.type)) {
                    scrappables.push({idx, item, def});
                }
            });

            if(scrappables.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 mt-10 p-4 border-2 border-dashed border-gray-800">Kein zerlegbarer Schrott.</div>';
            } else {
                scrappables.forEach(entry => {
                    const name = entry.item.props && entry.item.props.name ? entry.item.props.name : entry.def.name;
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center p-3 border border-orange-800 bg-orange-900/10 hover:bg-orange-900/20 transition-colors";
                    div.innerHTML = `
                        <div class="font-bold text-orange-300">${name} <span class="text-xs text-orange-600 font-normal ml-2">(${entry.item.count}x)</span></div>
                        <button class="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black px-3 py-1 text-xs font-bold transition-colors uppercase" onclick="Game.scrapItem(${entry.idx})">ZERLEGEN</button>
                    `;
                    container.appendChild(div);
                });
            }
        }
    },

    // ==========================================
    // === SHOP LOGIC ===
    // ==========================================
    renderShop: function(mode = 'buy') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';
        Game.state.view = 'shop';
        Game.checkShopRestock(); 

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative";

        // Shop Header
        wrapper.innerHTML = `
            <div class="flex-shrink-0 flex justify-between items-end p-4 border-b-4 border-yellow-600 bg-[#1a1500] shadow-md z-10">
                <div>
                    <h2 class="text-3xl text-yellow-400 font-bold font-vt323 tracking-wider">HANDELSPOSTEN</h2>
                    <div class="text-xs text-yellow-700 font-mono mt-1">HÄNDLER: <span class="font-bold text-yellow-500">${Game.state.shop.merchantCaps} KK</span></div>
                </div>
                <div class="bg-black/50 border-2 border-yellow-500 p-2 flex flex-col items-end">
                    <span class="text-[10px] text-yellow-600 uppercase tracking-widest">DEIN VERMÖGEN</span>
                    <span class="text-2xl text-yellow-300 font-bold font-vt323">${Game.state.caps} KK</span>
                </div>
            </div>
            
            <div class="flex-shrink-0 bg-[#002200] border-b-2 border-green-500 p-3 z-20 shadow-lg">
                <div class="flex flex-col gap-2">
                    <div class="flex gap-2 h-10">
                        <input type="number" id="shop-qty-input" value="${UI.shopQty === 'max' ? '' : UI.shopQty}" placeholder="Menge"
                            class="w-20 bg-black border-2 border-green-500 text-green-400 text-center font-bold text-xl outline-none"
                            oninput="UI.setShopQty(this.value, 'input')">
                        <button onclick="UI.setShopQty(1)" class="flex-1 border-2 ${UI.shopQty === 1 ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-black text-green-500 border-green-500'} font-bold">1x</button>
                        <button onclick="UI.setShopQty(10)" class="flex-1 border-2 ${UI.shopQty === 10 ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-black text-green-500 border-green-500'} font-bold">10x</button>
                        <button onclick="UI.setShopQty('max')" class="flex-1 border-2 ${UI.shopQty === 'max' ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-black text-green-500 border-green-500'} font-bold">MAX</button>
                    </div>
                </div>
                <div class="flex mt-3 border-b border-green-800">
                    <button onclick="UI.renderShop('buy')" class="flex-1 py-2 text-center font-bold ${mode==='buy' ? 'bg-green-500 text-black' : 'text-green-600 hover:text-green-300'}">KAUFEN</button>
                    <button onclick="UI.renderShop('sell')" class="flex-1 py-2 text-center font-bold ${mode==='sell' ? 'bg-red-500 text-black' : 'text-red-600 hover:text-red-300'}">VERKAUFEN</button>
                </div>
            </div>

            <div id="shop-list" class="flex-grow overflow-y-auto p-3 custom-scrollbar bg-[#0a0800]"></div>

            <div class="flex-shrink-0 p-3 border-t-4 border-yellow-900 bg-[#1a1500]">
                <button class="action-button w-full border-2 border-yellow-800 text-yellow-700 hover:border-yellow-500 hover:text-yellow-400 transition-colors py-3 font-bold" onclick="UI.renderCity()">ZURÜCK</button>
            </div>
        `;
        view.appendChild(wrapper);

        const content = wrapper.querySelector('#shop-list');
        if(mode === 'buy') this.renderShopBuy(content);
        else this.renderShopSell(content);
    },

    renderShopBuy: function(container) {
        if(!container) return;
        container.innerHTML = '';
        const stock = Game.state.shop.stock || {};
        const ammoStock = Game.state.shop.ammoStock || 0;
        
        if(ammoStock > 0) {
            this.createShopRow(container, "🧨", "10x MUNITION", ammoStock, 10, 'ammo', true);
            container.innerHTML += `<div class="h-px bg-yellow-900/50 my-4 mx-2"></div>`;
        }

        const categories = { 'consumable': '💊 MEDIZIN', 'weapon': '🔫 WAFFEN', 'body': '🛡️ RÜSTUNG', 'misc': '📦 SONSTIGES' };
        
        for(let type in categories) {
            let items = [];
            Object.keys(stock).forEach(key => {
                if(stock[key] <= 0 || key === 'camp_kit') return; 
                const item = Game.items[key];
                if(item && (item.type === type || (type === 'misc' && !categories[item.type]))) items.push({key, ...item});
            });

            if(items.length > 0) {
                container.innerHTML += `<h3 class="text-yellow-600 font-bold border-b border-yellow-800 mt-4 mb-2 pl-1 text-xs uppercase">${categories[type]}</h3>`;
                items.forEach(i => {
                    let icon = "📦"; if(i.type==='weapon') icon="🔫"; if(i.type==='consumable') icon="💉";
                    this.createShopRow(container, icon, i.name, stock[i.key], i.cost, i.key);
                });
            }
        }
    },

    createShopRow: function(container, icon, name, qty, price, key, isAmmo=false) {
        const canBuy = Game.state.caps >= price;
        const colorBorder = canBuy ? (isAmmo ? 'border-blue-500' : 'border-yellow-700') : 'border-red-900 opacity-50';
        const div = document.createElement('div');
        div.className = `flex justify-between items-center mb-2 border-2 ${colorBorder} bg-black/40 h-16 p-2 ${canBuy ? 'cursor-pointer hover:bg-yellow-900/20' : 'cursor-not-allowed'}`;
        if(canBuy) div.onclick = () => Game.buyItem(key, UI.shopQty);
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="text-2xl">${icon}</div>
                <div>
                    <div class="font-bold text-yellow-200">${name}</div>
                    <div class="text-xs text-yellow-700">Vorrat: ${qty} | Preis: ${price}</div>
                </div>
            </div>
            <button class="px-4 py-1 text-sm font-bold bg-transparent border border-yellow-800 text-yellow-600 uppercase">KAUFEN</button>
        `;
        container.appendChild(div);
    },

    renderShopSell: function(container) {
        if(!container) return;
        container.innerHTML = '';
        if(Game.state.inventory.length === 0) {
            container.innerHTML = '<div class="text-center text-yellow-800 mt-10">TASCHEN LEER</div>';
            return;
        }
        Game.state.inventory.forEach((item, idx) => {
            const def = Game.items[item.id];
            if(!def || item.id === 'fists') return;
            let sellPrice = Math.floor(def.cost * 0.25);
            if(sellPrice < 1) sellPrice = 1;
            
            const div = document.createElement('div');
            div.className = "flex justify-between items-center mb-2 border-2 border-green-700 bg-green-900/10 h-14 p-2 cursor-pointer hover:bg-green-900/30";
            div.onclick = () => Game.sellItem(idx, UI.shopQty);
            div.innerHTML = `
                <div class="font-bold text-green-400">${item.props?.name || def.name} x${item.count}</div>
                <div class="font-bold text-green-600">${sellPrice} KK</div>
            `;
            container.appendChild(div);
        });
    },

    setShopQty: function(val, source) {
        if (source === 'input') {
            const parsed = parseInt(val);
            if (!isNaN(parsed) && parsed > 0) this.shopQty = parsed; else this.shopQty = 1;
        } else {
            this.shopQty = val;
            const input = document.getElementById('shop-qty-input');
            if(input) input.value = (val === 'max') ? '' : val;
        }
        this.renderShop(document.querySelector('button.bg-red-500') ? 'sell' : 'buy');
    }
});
