Object.assign(UI, {
    
    shopQty: 1,

    // --- KLINIK (Dr. Zimmermann) ---
    renderClinic: function() {
        // [v0.9.1] Set State explicitly
        Game.state.view = 'clinic';

        const view = document.getElementById('view-container');
        if(!view) return;
        
        view.innerHTML = `
            <div class="flex flex-col h-full bg-black/90">
                <div class="p-4 border-b border-red-500 bg-red-900/20 text-center">
                    <h2 class="text-3xl text-red-500 font-bold tracking-widest">DR. ZIMMERMANN</h2>
                    <div class="text-xs text-red-300">ZERTIFIZIERTER* MEDIZINER (*Zertifikat verloren)</div>
                </div>
                
                <div class="flex-grow flex flex-col items-center justify-center p-6 gap-6 text-center">
                    <div class="text-6xl animate-pulse filter drop-shadow-[0_0_10px_red]">⚕️</div>
                    
                    <div class="border border-red-900 p-4 bg-black w-full max-w-md">
                        <div class="text-green-400 mb-2 font-bold border-b border-green-900 pb-1">PATIENTEN STATUS</div>
                        <div class="flex justify-between text-lg font-mono">
                            <span>GESUNDHEIT:</span> 
                            <span class="${Game.state.hp < Game.state.maxHp ? 'text-red-500 blink-red' : 'text-green-500'}">${Math.floor(Game.state.hp)} / ${Game.state.maxHp}</span>
                        </div>
                        <div class="flex justify-between text-lg font-mono">
                            <span>STRAHLUNG:</span> 
                            <span class="${Game.state.rads > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}">${Math.floor(Game.state.rads)} RADS</span>
                        </div>
                    </div>

                    <div class="text-gray-400 italic text-sm max-w-md leading-relaxed">
                        "Ich kann Sie wieder zusammenflicken. Entfernt Strahlung und heilt alle Verletzungen. Kostet aber ein bisschen was für die... Materialien."
                    </div>

                    <button onclick="Game.heal()" class="action-button w-full max-w-md py-4 text-xl border-red-500 text-red-500 hover:bg-red-900 font-bold" ${Game.state.caps < 25 ? 'disabled' : ''}>
                        KOMPLETTBEHANDLUNG (25 KK)
                    </button>
                </div>

                <div class="p-4 border-t border-red-900">
                    <button class="action-button w-full border-gray-500 text-gray-500 hover:bg-gray-900" onclick="UI.renderCity()">ZURÜCK ZUM ZENTRUM</button>
                </div>
            </div>
        `;
    },

    // --- WERKBANK (Crafting & Scrapping) ---
    renderCrafting: function(tab = 'create') {
        // [v0.9.1] Set State explicitly (WICHTIG für scrapItem!)
        Game.state.view = 'crafting';

        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        // UI Aufbau
        view.innerHTML = `
            <div id="crafting-view" class="w-full h-full p-4 flex flex-col gap-4 text-green-500 font-mono bg-black/95">
                <div class="border-b-2 border-orange-500 pb-2 mb-2 flex justify-between items-end">
                    <h2 class="text-2xl font-bold text-orange-400">🛠️ WERKBANK</h2>
                    <div class="text-xs text-orange-300">Zustand: Rostig</div>
                </div>
                
                <div class="flex w-full border-b border-green-900 mb-2">
                    <button class="flex-1 py-2 font-bold transition-colors ${tab==='create' ? 'bg-green-900/40 text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-green-300'}" onclick="UI.renderCrafting('create')">HERSTELLEN</button>
                    <button class="flex-1 py-2 font-bold transition-colors ${tab==='scrap' ? 'bg-orange-900/40 text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-orange-300'}" onclick="UI.renderCrafting('scrap')">ZERLEGEN</button>
                </div>

                <div id="crafting-list" class="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-2"></div>
                
                <button onclick="UI.renderCity()" class="p-3 border border-gray-600 text-gray-500 hover:bg-gray-900/50 mt-2 font-bold w-full uppercase tracking-widest">Zurück zum Zentrum</button>
            </div>
        `;

        const container = document.getElementById('crafting-list');
        
        if (tab === 'create') {
            const recipes = Game.recipes || [];
            const known = Game.state.knownRecipes || [];
            let knownCount = 0; 

            recipes.forEach(recipe => {
                if(recipe.type === 'cooking') return; // Cooking gehört ans Campfire
                if(!known.includes(recipe.id) && recipe.lvl > 1) return; // Nur bekannte oder Level 1 Rezepte zeigen
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

                    let color = "text-green-500";
                    if (countHave < countNeeded) { canCraft = false; color = "text-red-500 font-bold"; }
                    reqHtml += `<div class="${color} text-xs">• ${reqName}: ${countHave}/${countNeeded}</div>`;
                }
                
                if(Game.state.lvl < recipe.lvl) { 
                    canCraft = false; 
                    reqHtml += `<div class="text-red-500 text-xs mt-1 font-bold">Benötigt Level ${recipe.lvl}</div>`; 
                }

                const div = document.createElement('div');
                div.className = `border ${canCraft ? 'border-green-500 bg-green-900/10' : 'border-gray-800 bg-black opacity-60'} p-3 mb-2 transition-colors`;
                
                div.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div class="font-bold text-yellow-400 text-lg">${outItem.name}</div>
                        <button class="action-button text-sm px-4 py-1 ${canCraft ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-black' : 'border-gray-600 text-gray-600 cursor-not-allowed'}" onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>BAUEN</button>
                    </div>
                    <div class="pl-2 border-l-2 border-green-900 grid grid-cols-2 gap-2">${reqHtml}</div>
                `;
                container.appendChild(div);
            });
            
            if(knownCount === 0) {
                container.innerHTML = '<div class="text-gray-500 italic mt-10 text-center border-t border-gray-800 pt-4">Du hast noch keine Baupläne gelernt.<br><span class="text-xs text-green-700">Suche in Dungeons oder der Wildnis nach Blueprints!</span></div>';
            }
        } 
        else {
            // SCRAP TAB
            let scrappables = [];
            Game.state.inventory.forEach((item, idx) => {
                const def = Game.items[item.id];
                if(!def) return;

                if (['weapon','body','head','legs','feet','arms','junk'].includes(def.type)) {
                    scrappables.push({idx, item, def});
                }
            });

            if(scrappables.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 mt-10 p-4 border border-gray-800 bg-black">Keine zerlegbaren Gegenstände (Waffen/Rüstung/Schrott) im Inventar.</div>';
            } else {
                container.innerHTML = '<div class="text-xs text-orange-400 mb-4 text-center bg-orange-900/20 p-2 border border-orange-900">WÄHLE EIN ITEM ZUM ZERLEGEN (GIBT SCHROTT)</div>';
                
                scrappables.forEach(entry => {
                    const name = entry.item.props && entry.item.props.name ? entry.item.props.name : entry.def.name;
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center p-3 mb-2 border border-orange-700 bg-orange-900/10 hover:bg-orange-900/20 transition-colors";
                    div.innerHTML = `
                        <div class="font-bold text-orange-200">${name} <span class="text-xs text-gray-500">(${entry.item.count}x)</span></div>
                        <button class="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black px-4 py-1 text-xs font-bold transition-colors uppercase" onclick="Game.scrapItem(${entry.idx})">ZERLEGEN</button>
                    `;
                    container.appendChild(div);
                });
            }
        }
    },

    // --- SHOP (Handelsposten) ---
    renderShop: function(mode = 'buy') {
        Game.state.view = 'shop';

        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        Game.checkShopRestock(); // Immer prüfen beim Öffnen

        // Header
        const header = document.createElement('div');
        header.className = "flex justify-between items-center p-3 border-b border-yellow-500 bg-yellow-900/20";
        header.innerHTML = `
            <div>
                <h2 class="text-2xl text-yellow-400 font-bold">HANDELSPOSTEN</h2>
                <div class="text-xs text-yellow-600">HÄNDLER: ${Game.state.shop.merchantCaps} KK</div>
            </div>
            <div class="text-xl font-bold text-yellow-400 border border-yellow-600 px-2 bg-black">
                DEIN GELD: ${Game.state.caps}
            </div>
        `;
        view.appendChild(header);

        // Tabs
        const tabs = document.createElement('div');
        tabs.className = "flex w-full border-b border-yellow-900 mb-2";
        tabs.innerHTML = `
            <button class="flex-1 py-2 font-bold ${mode==='buy' ? 'bg-yellow-500 text-black' : 'text-yellow-500 hover:bg-yellow-900/30'}" onclick="UI.renderShop('buy')">KAUFEN</button>
            <button class="flex-1 py-2 font-bold ${mode==='sell' ? 'bg-green-500 text-black' : 'text-green-500 hover:bg-green-900/30'}" onclick="UI.renderShop('sell')">VERKAUFEN</button>
        `;
        view.appendChild(tabs);

        // Menge Buttons
        const qtyContainer = document.createElement('div');
        qtyContainer.className = "flex justify-center gap-2 mb-2 px-2";
        const makeQtyBtn = (label, val) => {
            const isActive = (this.shopQty === val);
            return `<button class="px-4 py-1 text-xs font-bold border ${isActive ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-black text-yellow-500 border-yellow-500 hover:bg-yellow-900'}" onclick="UI.shopQty = '${val}'; UI.renderShop('${mode}')">${label}</button>`;
        };
        qtyContainer.innerHTML = makeQtyBtn("1x", 1) + makeQtyBtn("5x", 5) + makeQtyBtn("MAX", 'max');
        view.appendChild(qtyContainer);

        // Content
        const content = document.createElement('div');
        content.id = "shop-list";
        content.className = "flex-grow overflow-y-auto p-2 custom-scrollbar";
        view.appendChild(content);

        if(mode === 'buy') this.renderShopBuy(content);
        else this.renderShopSell(content);

        // Footer
        const footer = document.createElement('div');
        footer.className = "p-2 border-t border-yellow-900";
        footer.innerHTML = `<button class="action-button w-full border-gray-500 text-gray-500 hover:bg-gray-900" onclick="UI.renderCity()">ZURÜCK ZUM ZENTRUM</button>`;
        view.appendChild(footer);
    },

    renderShopBuy: function(container) {
        if(!container) container = document.getElementById('shop-list');
        if(!container) return;
        container.innerHTML = '';

        const stock = Game.state.shop.stock || {};
        const ammoStock = Game.state.shop.ammoStock || 0;

        // Ammo Section
        if(ammoStock > 0) {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center p-3 mb-2 border border-blue-500 bg-blue-900/20 cursor-pointer hover:bg-blue-900/40";
            const canBuy = Game.state.caps >= 10;
            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-2xl">🧨</span>
                    <div>
                        <div class="font-bold text-blue-300">Munition x10</div>
                        <div class="text-xs text-blue-500">Vorrat: ${ammoStock} Pakete</div>
                    </div>
                </div>
                <button class="action-button border-yellow-400 text-yellow-400" onclick="Game.buyAmmo(UI.shopQty)" ${canBuy ? '' : 'disabled'}>10 KK</button>
            `;
            container.appendChild(div);
        }

        // Categories
        const categories = {
            'consumable': { title: '💊 HILFSMITTEL', items: [] },
            'weapon': { title: '🔫 WAFFEN', items: [] },
            'body': { title: '🛡️ RÜSTUNG', items: [] },
            'back': { title: '🎒 RUCKSÄCKE', items: [] },
            'misc': { title: '📦 SONSTIGES', items: [] } 
        };

        const sortedKeys = Object.keys(stock).sort((a,b) => (Game.items[a]?.cost || 0) - (Game.items[b]?.cost || 0));
        
        sortedKeys.forEach(key => {
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
                header.className = "text-green-500 font-bold border-b border-green-700 mt-4 mb-2 pb-1 pl-2 text-sm uppercase tracking-widest bg-green-900/20";
                header.textContent = cat.title;
                container.appendChild(header);

                cat.items.forEach(data => {
                    const canAfford = Game.state.caps >= data.cost;
                    const div = document.createElement('div');
                    div.className = `flex justify-between items-center p-2 mb-2 border h-14 w-full ${canAfford ? 'border-green-500 bg-green-900/10 hover:bg-green-900/30' : 'border-red-900 bg-black/40 opacity-50'} transition-all`;
                    
                    div.innerHTML = `
                        <div class="font-bold ${canAfford ? 'text-green-200' : 'text-gray-500'}">${data.name} <span class="text-xs font-normal text-gray-500">(${stock[data.key]}x)</span></div>
                        <button class="action-button border-yellow-500 text-yellow-500 text-sm" onclick="Game.buyItem('${data.key}', UI.shopQty)">${data.cost} KK</button>
                    `;
                    container.appendChild(div);
                });
            }
        }

        if(ammoStock <= 0 && sortedKeys.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 mt-10">Alles ausverkauft! Komm später wieder.</div>';
        }
    },

    renderShopSell: function(container) {
        if(!container) container = document.getElementById('shop-list');
        if(!container) return;
        container.innerHTML = '';

        if(Game.state.inventory.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 mt-10 italic">Dein Inventar ist leer.</div>';
            return;
        }

        Game.state.inventory.forEach((item, idx) => {
            const def = Game.items[item.id];
            if(!def) return;
            
            let valMult = item.props && item.props.valMult ? item.props.valMult : 1;
            let sellPrice = Math.floor((def.cost * 0.25) * valMult);
            if(sellPrice < 1) sellPrice = 1;

            const name = item.props && item.props.name ? item.props.name : def.name;
            const canSell = Game.state.shop.merchantCaps >= sellPrice;

            const div = document.createElement('div');
            div.className = `flex justify-between items-center p-2 mb-2 border h-14 w-full ${canSell ? 'border-yellow-600 bg-yellow-900/10 hover:bg-yellow-900/30' : 'border-red-900 bg-black/40 opacity-50'} transition-all`;
            
            div.innerHTML = `
                <div>
                    <div class="font-bold text-yellow-200">${name}</div>
                    <div class="text-xs text-yellow-600">Menge: ${item.count} | Wert: ${sellPrice} KK</div>
                </div>
                <button class="action-button border-green-500 text-green-500 text-sm" onclick="Game.sellItem(${idx}, UI.shopQty)">VERKAUFEN</button>
            `;
            container.appendChild(div);
        });
    }
});
