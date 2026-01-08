Object.assign(UI, {
    
    shopQty: 1,

    // --- KLINIK & WERKBANK ---
    renderClinic: function() {
        Game.state.view = 'clinic';
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        // WRAPPER
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
    },

    renderCrafting: function(tab = 'create') {
        Game.state.view = 'crafting';
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        // WRAPPER
        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black/95 relative";

        wrapper.innerHTML = `
            <div class="flex-shrink-0 p-4 border-b-2 border-blue-500 bg-blue-900/20 flex justify-between items-end shadow-lg shadow-blue-900/20">
                <div>
                    <h2 class="text-3xl text-blue-400 font-bold font-vt323 tracking-widest">WERKBANK</h2>
                    <div class="text-xs text-blue-300 tracking-wider">Zustand: Rostig, aber funktional</div>
                </div>
                <div class="text-4xl text-blue-500 opacity-50">🛠️</div>
            </div>
            
            <div class="flex-shrink-0 flex w-full border-b border-blue-900 bg-black">
                <button class="flex-1 py-3 font-bold transition-colors uppercase tracking-wider ${tab==='create' ? 'bg-blue-900/40 text-blue-300 border-b-4 border-blue-500' : 'text-gray-600 hover:text-blue-300 hover:bg-blue-900/20'}" onclick="UI.renderCrafting('create')">HERSTELLEN</button>
                <button class="flex-1 py-3 font-bold transition-colors uppercase tracking-wider ${tab==='scrap' ? 'bg-orange-900/40 text-orange-300 border-b-4 border-orange-500' : 'text-gray-600 hover:text-orange-300 hover:bg-orange-900/20'}" onclick="UI.renderCrafting('scrap')">ZERLEGEN</button>
            </div>

            <div id="crafting-list" class="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#00050a]"></div>
            
            <div class="flex-shrink-0 p-3 border-t border-blue-900 bg-[#000205]">
                <button onclick="UI.renderCity()" class="action-button w-full border-gray-600 text-gray-500 hover:text-white hover:border-white transition-colors">ZURÜCK ZUM ZENTRUM</button>
            </div>
        `;
        view.appendChild(wrapper);

        // Content Logik
        const container = wrapper.querySelector('#crafting-list');
        
        if (tab === 'create') {
            const recipes = Game.recipes || [];
            const known = Game.state.knownRecipes || [];
            let knownCount = 0; 

            recipes.forEach(recipe => {
                if(recipe.type === 'cooking') return; 
                if(!known.includes(recipe.id) && recipe.lvl > 1) return; 
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
                container.appendChild(div);
            });
            if(knownCount === 0) container.innerHTML = '<div class="text-gray-500 italic mt-10 text-center">Keine bekannten Baupläne.</div>';
        } else {
            // SCRAP
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
                container.innerHTML = '<div class="text-center text-gray-500 mt-10 p-4 border-2 border-dashed border-gray-800">Kein zerlegbarer Schrott im Inventar.</div>';
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

    // --- SHOP REDESIGN ---
    renderShop: function(mode = 'buy') {
        Game.state.view = 'shop';
        Game.checkShopRestock(); 

        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        // WRAPPER
        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative";

        // 1. HEADER
        const header = document.createElement('div');
        header.className = "flex-shrink-0 flex justify-between items-end p-4 border-b-4 border-yellow-600 bg-[#1a1500] shadow-md z-10";
        
        const usedSlots = Game.getUsedSlots();
        const maxSlots = Game.getMaxSlots();
        const isFull = usedSlots >= maxSlots;
        const invColor = isFull ? "text-red-500 animate-pulse" : "text-yellow-300";

        header.innerHTML = `
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
        `;
        wrapper.appendChild(header);

        // 2. CONTROLS
        const controls = document.createElement('div');
        controls.className = "flex-shrink-0 bg-[#110d00] border-b-2 border-yellow-900 p-3 flex flex-col gap-3 shadow-inner";
        
        controls.innerHTML = `
            <div class="flex w-full gap-2">
                <button class="flex-1 py-2 font-bold text-lg uppercase tracking-wider border-2 transition-all ${mode==='buy' ? 'bg-yellow-500 text-black border-yellow-500 shadow-inner' : 'bg-black text-yellow-700 border-yellow-900 hover:text-yellow-500'}" onclick="UI.renderShop('buy')">KAUFEN</button>
                <button class="flex-1 py-2 font-bold text-lg uppercase tracking-wider border-2 transition-all ${mode==='sell' ? 'bg-green-600 text-black border-green-600 shadow-inner' : 'bg-black text-green-700 border-green-900 hover:text-green-500'}" onclick="UI.renderShop('sell')">VERKAUFEN</button>
            </div>
        `;
        
        const qtyRow = document.createElement('div');
        qtyRow.className = "flex justify-center gap-2 px-2 pt-1";
        const makeQtyBtn = (label, val) => {
            const isActive = (this.shopQty === val);
            return `<button class="px-4 py-1 text-xs font-bold border uppercase tracking-widest transition-all ${isActive ? 'bg-yellow-600 text-black border-yellow-600' : 'bg-[#1a1500] text-yellow-600 border-yellow-900 hover:border-yellow-600'}" onclick="UI.shopQty = '${val}'; UI.renderShop('${mode}')">${label}</button>`;
        };
        qtyRow.innerHTML = `<span class="text-xs text-yellow-900 self-center mr-2 font-bold">MENGE:</span>` + makeQtyBtn("1x", 1) + makeQtyBtn("5x", 5) + makeQtyBtn("MAX", 'max');
        controls.appendChild(qtyRow);
        wrapper.appendChild(controls);

        // 3. LIST
        const content = document.createElement('div');
        content.id = "shop-list";
        content.className = "flex-grow overflow-y-auto p-3 custom-scrollbar bg-[#0a0800]";
        wrapper.appendChild(content);

        // 4. FOOTER
        const footer = document.createElement('div');
        footer.className = "flex-shrink-0 p-3 border-t-4 border-yellow-900 bg-[#1a1500]";
        footer.innerHTML = `<button class="action-button w-full border-2 border-yellow-800 text-yellow-700 hover:border-yellow-500 hover:text-yellow-400 transition-colors py-3 font-bold tracking-widest uppercase" onclick="UI.renderCity()">ZURÜCK ZUM ZENTRUM</button>`;
        wrapper.appendChild(footer);

        view.appendChild(wrapper);

        if(mode === 'buy') this.renderShopBuy(content);
        else this.renderShopSell(content);
    },

    renderShopBuy: function(container) {
        if(!container) container = document.getElementById('shop-list');
        if(!container) return;
        container.innerHTML = '';

        const stock = Game.state.shop.stock || {};
        const ammoStock = Game.state.shop.ammoStock || 0;

        const createSlot = (icon, name, stock, price, onClick, isHighlight=false) => {
            const canBuy = Game.state.caps >= price;
            const borderColor = isHighlight ? 'border-blue-600' : (canBuy ? 'border-yellow-700' : 'border-red-900');
            const bgClass = isHighlight ? 'bg-blue-900/20' : (canBuy ? 'bg-yellow-900/10' : 'bg-red-900/10 opacity-50');
            const textClass = isHighlight ? 'text-blue-300' : (canBuy ? 'text-yellow-200' : 'text-gray-500');
            
            const el = document.createElement('div');
            el.className = `flex justify-between items-center mb-2 border-2 ${borderColor} ${bgClass} h-16 transition-all ${canBuy ? 'hover:bg-yellow-900/30 cursor-pointer group' : ''}`;
            
            el.innerHTML = `
                <div class="flex items-center gap-3 p-2 flex-grow overflow-hidden">
                    <div class="text-3xl w-12 h-12 flex items-center justify-center bg-black/40 border border-yellow-900/50 rounded">${icon}</div>
                    <div class="flex flex-col truncate">
                        <span class="font-bold ${textClass} text-lg font-vt323 truncate leading-none pt-1">${name}</span>
                        <span class="text-xs text-yellow-700 font-mono uppercase">Lager: ${stock}</span>
                    </div>
                </div>
                <div class="h-full flex flex-col justify-center items-end border-l-2 ${borderColor} bg-black/30 min-w-[80px]">
                    <div class="font-bold ${canBuy ? 'text-yellow-400' : 'text-red-500'} text-lg w-full text-center border-b border-white/10 font-vt323">${price}</div>
                    <button class="flex-grow w-full text-[10px] font-bold uppercase tracking-wider hover:bg-yellow-500 hover:text-black transition-colors ${canBuy ? 'text-yellow-600' : 'text-red-900'}" ${canBuy?'':'disabled'}>KAUFEN</button>
                </div>
            `;
            if(canBuy) {
                el.onclick = onClick;
                el.querySelector('button').onclick = (e) => { e.stopPropagation(); onClick(); };
            }
            return el;
        };

        if(ammoStock > 0) {
            container.appendChild(createSlot("🧨", "10x MUNITION", ammoStock, 10, () => Game.buyAmmo(UI.shopQty), true));
            container.innerHTML += `<div class="h-px bg-yellow-900/50 my-4 mx-2"></div>`;
        }

        const categories = {
            'consumable': { title: '💊 MEDIZIN', items: [] },
            'weapon': { title: '🔫 WAFFEN', items: [] },
            'body': { title: '🛡️ RÜSTUNG', items: [] },
            'misc': { title: '📦 SONSTIGES', items: [] } 
        };

        Object.keys(stock).forEach(key => {
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
                    container.appendChild(createSlot(icon, data.name, stock[data.key], data.cost, () => Game.buyItem(data.key, UI.shopQty)));
                });
            }
        }
    },

    renderShopSell: function(container) {
        if(!container) container = document.getElementById('shop-list');
        if(!container) return;
        container.innerHTML = '';

        if(Game.state.inventory.length === 0) {
            container.innerHTML = '<div class="text-center text-green-800 mt-10 font-mono border-2 border-dashed border-green-900 p-6">INVENTAR LEER</div>';
            return;
        }

        Game.state.inventory.forEach((item, idx) => {
            const def = Game.items[item.id];
            if(!def) return;
            
            let valMult = item.props && item.props.valMult ? item.props.valMult : 1;
            let sellPrice = Math.floor((def.cost * 0.25) * valMult);
            if(sellPrice < 1) sellPrice = 1;
            const canSell = Game.state.shop.merchantCaps >= sellPrice;
            const name = item.props ? item.props.name : def.name;

            const div = document.createElement('div');
            div.className = `flex justify-between items-center mb-2 border-2 ${canSell ? 'border-green-700 bg-green-900/10 hover:bg-green-900/20 cursor-pointer' : 'border-red-900 opacity-50'} h-14 transition-all`;
            
            div.innerHTML = `
                <div class="flex items-center gap-3 p-2 flex-grow overflow-hidden">
                    <div class="text-green-500 font-bold text-lg font-vt323 truncate">${name} <span class="text-green-800 text-sm font-sans">x${item.count}</span></div>
                </div>
                <div class="h-full flex flex-col justify-center items-end border-l-2 border-green-800 bg-black/30 min-w-[80px]">
                    <div class="font-bold text-green-400 text-lg w-full text-center border-b border-green-900 font-vt323">${sellPrice}</div>
                    <button class="flex-grow w-full text-[10px] font-bold uppercase tracking-wider hover:bg-green-600 hover:text-black transition-colors text-green-700">VERKAUFEN</button>
                </div>
            `;
            if(canSell) {
                div.onclick = () => Game.sellItem(idx, UI.shopQty);
            }
            container.appendChild(div);
        });
    },

    // [v0.9.3] CITY DASHBOARD - LAYOUT FIX
    renderCity: function(cityId = 'rusty_springs') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = ''; 
        
        Game.state.view = 'city';

        const cityData = {
            'rusty_springs': {
                name: "RUSTY SPRINGS",
                pop: 142, sec: "HOCH", rad: "NIEDRIG",
                flairs: [
                    "Die Luft riecht nach Rost und Ozon.",
                    "Ein Generator brummt in der Ferne.",
                    "Händler schreien ihre Preise aus.",
                    "Der sicherste Ort im Sektor."
                ]
            }
        };

        const data = cityData[cityId] || cityData['rusty_springs'];
        const flair = data.flairs[Math.floor(Math.random() * data.flairs.length)];

        // --- WRAPPER (DAS LÖST DAS LAYOUT PROBLEM) ---
        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden";

        // 1. HEADER
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
                    <span class="text-2xl text-yellow-400 font-bold font-vt323 tracking-wider">${Game.state.caps} 📜</span>
                </div>
            </div>

            <div class="flex gap-4 mt-2 pt-2 border-t border-green-900/50 text-xs font-mono z-10 uppercase tracking-widest">
                <div class="bg-green-900/30 px-2 py-1 border-l-2 border-green-500">POP: <span class="text-green-300 font-bold">${data.pop}</span></div>
                <div class="bg-cyan-900/30 px-2 py-1 border-l-2 border-cyan-500">SEC: <span class="text-cyan-300 font-bold">${data.sec}</span></div>
                <div class="bg-yellow-900/30 px-2 py-1 border-l-2 border-yellow-500">RAD: <span class="text-yellow-300 font-bold">${data.rad}</span></div>
            </div>
        `;
        wrapper.appendChild(header);

        // 2. GRID DASHBOARD
        const grid = document.createElement('div');
        grid.className = "flex-grow overflow-y-auto custom-scrollbar p-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start bg-[#050a05]";

        const createCard = (conf) => {
            const card = document.createElement('div');
            let baseClass = "relative overflow-hidden group cursor-pointer p-4 flex items-center gap-4 border-2 transition-all duration-200 bg-black/80 hover:bg-[#0a1a0a] shadow-md min-h-[100px]";
            
            let themeColor = "green";
            if(conf.type === 'trader') {
                themeColor = "yellow";
                baseClass += " md:col-span-2 border-yellow-600 hover:border-yellow-400 shadow-yellow-900/20 h-32";
            } else if (conf.type === 'clinic') {
                themeColor = "red";
                baseClass += " border-red-600 hover:border-red-400 shadow-red-900/20";
            } else if (conf.type === 'craft') {
                themeColor = "blue";
                baseClass += " border-blue-600 hover:border-blue-400 shadow-blue-900/20";
            } else {
                baseClass += " border-green-600 hover:border-green-400 shadow-green-900/20";
            }

            card.className = baseClass;
            card.onclick = conf.onClick;

            const iconSize = conf.type === 'trader' ? 'text-6xl' : 'text-5xl';
            
            // Tailwind safe colors
            let titleClass = `text-${themeColor}-500 group-hover:text-${themeColor}-300`;
            let subClass = `text-${themeColor}-700 group-hover:text-${themeColor}-500`;
            
            // Manuelle Korrektur für Trader Yellow, da Tailwind manchmal dynamische Klassen purgt
            if(conf.type === 'trader') { titleClass = "text-yellow-500 group-hover:text-yellow-300"; subClass = "text-yellow-700 group-hover:text-yellow-500"; }

            card.innerHTML = `
                <div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-${themeColor}-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                
                <div class="icon flex-shrink-0 ${iconSize} z-10 relative filter drop-shadow-md">${conf.icon}</div>
                <div class="flex flex-col z-10 relative">
                    <span class="text-2xl font-bold ${titleClass} tracking-wider font-vt323 uppercase">${conf.label}</span>
                    <span class="text-xs ${subClass} font-mono uppercase tracking-widest mt-1">${conf.sub}</span>
                </div>
                <div class="absolute right-4 text-2xl opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${titleClass}">▶</div>
            `;
            return card;
        };

        // A. HÄNDLER
        grid.appendChild(createCard({
            type: 'trader', icon: "🛒", label: "HANDELSPOSTEN", sub: "Waffen • Munition • An- & Verkauf",
            onClick: () => { if(UI.renderShop) UI.renderShop(); }
        }));

        // B. KLINIK
        grid.appendChild(createCard({
            type: 'clinic', icon: "⚕️", label: "KLINIK", sub: "Dr. Zimmermann",
            onClick: () => { if(UI.renderClinic) UI.renderClinic(); }
        }));

        // C. WERKBANK
        grid.appendChild(createCard({
            type: 'craft', icon: "🛠️", label: "WERKBANK", sub: "Zerlegen & Bauen",
            onClick: () => { if(UI.renderCrafting) UI.renderCrafting(); }
        }));

        wrapper.appendChild(grid);

        // 3. FOOTER
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
});
