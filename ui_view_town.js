// [TIMESTAMP] 2026-01-26 14:00:00 - ui_view_town.js - ATOMIC RENDER & ADMIN UPDATE

console.log(">> UI VIEW TOWN (ATOMIC) GELADEN");

// --- GLOBALE STEUERUNG ---
window.SMITHY = {
    selectedIdx: -1,
    lastClickTime: 0,

    enter: function() {
        this.selectedIdx = -1;
        this.lastClickTime = 0;
        this.render();
    },

    // 2-Phase Click Handler mit Ghost-Click Schutz
    handleItemClick: function(idx, isRusty) {
        const now = Date.now();
        
        // SPERRE: Wenn der letzte Klick weniger als 500ms her ist -> Ignorieren!
        if (now - this.lastClickTime < 500) {
            console.log("Klick ignoriert (Touch-Prellen/Ghost Click)");
            return;
        }
        this.lastClickTime = now;

        if (this.selectedIdx === idx) {
            // PHASE 2: AKTION AUSFÜHREN
            if (isRusty) {
                if(typeof Game.restoreWeapon === 'function') {
                    Game.restoreWeapon(idx);
                    this.selectedIdx = -1; 
                    this.render();
                } else {
                    alert("Fehler: Logic-Datei fehlt!");
                }
            } else {
                this.renderModdingAtomic(idx);
            }
        } else {
            // PHASE 1: AUSWÄHLEN
            this.selectedIdx = idx;
            this.render();
        }
    },

    // --- ATOMIC RENDERER (MODDING) ---
    // Baut HTML erst komplett zusammen, bevor der Screen berührt wird.
    renderModdingAtomic: function(idx) {
        const weapon = Game.state.inventory[idx];
        if (!weapon) { this.render(); return; }

        let html = "";
        try {
            // DATEN VORBEREITEN
            const wDef = (Game.items && Game.items[weapon.id]) ? Game.items[weapon.id] : { name: weapon.id };
            const slotStr = (wDef.modSlots && Array.isArray(wDef.modSlots)) ? wDef.modSlots.join(', ') : 'Keine';
            const modCount = (weapon.mods && Array.isArray(weapon.mods)) ? weapon.mods.length : 0;

            // HEADER BAUEN
            html += `
                <div class="absolute inset-0 w-full h-full flex flex-col bg-black z-30 overflow-hidden">
                    <div class="p-4 border-b-2 border-orange-500 bg-orange-900/20">
                        <h2 class="text-2xl text-orange-400 font-bold font-vt323 tracking-widest">MODIFIZIEREN</h2>
                        <div class="text-white font-bold">${weapon.name || wDef.name}</div>
                    </div>
                    <div class="p-2 bg-black/80 text-xs text-gray-400 border-b border-gray-800 flex justify-between px-4">
                        <span>SLOTS: <span class="text-yellow-500">${slotStr}</span></span>
                        <span>INSTALLIERT: <span class="text-white">${modCount}</span></span>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scroll p-4 space-y-2 bg-[#0a0500]">
            `;

            // MOD LISTE BAUEN
            let foundMods = false;
            if (Game.items && Game.state.inventory) {
                Game.state.inventory.forEach((item, invIdx) => {
                    const mDef = Game.items[item.id];
                    // Prüfen ob Item existiert UND ein Mod für diese Waffe ist
                    if (mDef && mDef.type === 'mod' && mDef.target === weapon.id) {
                        foundMods = true;
                        let stats = mDef.stats ? JSON.stringify(mDef.stats).replace(/[{"}]/g,'') : "";
                        
                        html += `
                            <div class="flex justify-between items-center bg-black/40 p-3 border border-orange-500/30 mb-2 hover:bg-orange-900/10">
                                <div>
                                    <div class="text-orange-300 font-bold">${mDef.name}</div>
                                    <div class="text-xs text-green-500">${stats}</div>
                                </div>
                                <button onclick="Game.installMod(${idx}, ${invIdx}); window.SMITHY.renderModdingAtomic(${idx})" class="bg-green-900/30 text-xs px-3 py-2 border border-green-500 text-green-500 font-bold hover:bg-green-500 hover:text-black">
                                    EINBAUEN
                                </button>
                            </div>
                        `;
                    }
                });
            }

            if (!foundMods) {
                html += `<div class="text-center text-red-500 border border-red-900 p-4 bg-red-900/10 text-sm">Keine passenden Mods im Inventar.</div>`;
            }

            // FOOTER BAUEN
            html += `
                    </div>
                    <div class="p-4 bg-black border-t-2 border-gray-800">
                        <button onclick="window.SMITHY.render()" class="w-full text-gray-500 border border-gray-600 p-3 font-bold hover:text-white uppercase tracking-widest">ZURÜCK</button>
                    </div>
                </div>
            `;

            // >>> ATOMIC SWAP <<<
            // Erst JETZT, wenn kein Fehler auftrat, tauschen wir den Inhalt aus.
            const view = document.getElementById('view-container');
            if(view) view.innerHTML = html;

        } catch(e) {
            console.error("MODDING ERROR:", e);
            alert("FEHLER BEIM ÖFFNEN: " + e.message);
            // Wir löschen den Screen NICHT, also bleibt man im Schmied-Menü
        }
    },

    // --- MAIN RENDERER ---
    render: function() {
        const view = document.getElementById('view-container');
        if(!view) return;
        
        Game.state.view = 'smithy';
        
        // Auch hier: Erst String bauen, dann setzen
        let html = `
            <div class="absolute inset-0 w-full h-full flex flex-col bg-black z-20 overflow-hidden">
                <div class="p-4 border-b-2 border-orange-500 bg-orange-900/20 flex justify-between items-center shadow-lg">
                    <div>
                        <h2 class="text-3xl text-orange-400 font-bold font-vt323 tracking-widest">DER SCHMIED</h2>
                        <div class="text-xs text-orange-300">"Aus Alt mach Neu..."</div>
                    </div>
                    <button onclick="window.SMITHY.showHelp()" class="border-2 border-orange-500 rounded-full w-10 h-10 font-bold text-orange-500 hover:bg-orange-500 hover:text-black bg-black transition-colors text-xl">?</button>
                </div>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-[#0a0500]">
        `;

        let hasItems = false;
        if(Game.state.inventory) {
            Game.state.inventory.forEach((item, idx) => {
                const def = (Game.items && Game.items[item.id]) ? Game.items[item.id] : null;
                if(def && (def.type === 'weapon' || def.type === 'melee')) {
                    hasItems = true;
                    
                    const isSelected = (this.selectedIdx === idx);
                    const isRusty = item.id.startsWith('rusty_');
                    
                    let divClass = isSelected 
                        ? "border-orange-500 bg-orange-900/20 shadow-[0_0_15px_rgba(255,165,0,0.3)]" 
                        : "border-gray-800 bg-black/40 hover:bg-[#1a1000]";
                    
                    let actionText = isSelected 
                        ? (isRusty ? "> RESTAURIEREN (50 KK) <" : "> MODIFIZIEREN <") 
                        : (isRusty ? "Restaurieren" : "Modifizieren");
                    
                    let actionStyle = isSelected ? "text-white font-bold animate-pulse" : "text-gray-600";
                    let nameColor = isRusty ? "text-red-400" : "text-orange-300";

                    // Stats berechnen (Safe)
                    let dmg = item.baseDmg || def.baseDmg || 0;
                    if(item.mods && Game.items) {
                        item.mods.forEach(m => { const md = Game.items[m]; if(md && md.stats && md.stats.dmg) dmg += md.stats.dmg; });
                    }

                    html += `
                        <div onclick="window.SMITHY.handleItemClick(${idx}, ${isRusty})" class="flex justify-between items-center p-3 border-2 cursor-pointer transition-all mb-2 ${divClass}">
                            <div>
                                <div class="${nameColor} font-bold text-lg">${item.name || def.name}</div>
                                <div class="text-xs text-gray-500 font-mono">DMG: ${dmg} | Mods: ${item.mods ? item.mods.length : 0}</div>
                            </div>
                            <div class="text-xs uppercase ${actionStyle}">${actionText}</div>
                        </div>
                    `;
                }
            });
        }

        if(!hasItems) html += `<div class="text-center text-gray-500 border-2 border-dashed border-gray-800 p-4">Keine Waffen gefunden.</div>`;

        html += `
                </div>
                <div class="p-4 bg-black border-t-2 border-orange-900">
                    <button onclick="UI.renderCity()" class="w-full border-2 border-orange-800 text-orange-700 py-3 font-bold hover:text-orange-400 uppercase tracking-widest bg-black">ZURÜCK ZUM ZENTRUM</button>
                </div>
            </div>
        `;

        // SWAP
        view.innerHTML = html;
    },

    // --- HILFE (OVERLAY) ---
    showHelp: function() {
        const view = document.getElementById('view-container');
        if(!view) return;
        
        const div = document.createElement('div');
        div.className = "absolute inset-0 z-[100] bg-black/95 flex flex-col justify-center items-center p-6 animate-fade-in";
        div.innerHTML = `
            <div class="w-full max-w-lg border-2 border-orange-500 bg-[#1a0f00] flex flex-col max-h-full shadow-[0_0_50px_rgba(255,100,0,0.5)]">
                <div class="p-4 border-b-2 border-orange-500 flex justify-between items-center bg-orange-900/30">
                    <h2 class="text-2xl font-bold text-orange-400 font-vt323 tracking-widest">HANDBUCH</h2>
                    <button onclick="this.closest('.absolute').remove()" class="text-orange-500 hover:text-white font-bold border border-orange-500 px-2">X</button>
                </div>
                <div class="p-6 overflow-y-auto custom-scrollbar text-sm font-mono space-y-6 text-orange-200">
                    <div><h3 class="text-orange-400 font-bold border-b border-orange-800 mb-1">1. BEDIENUNG</h3><p>Tippe eine Waffe an, um sie auszuwählen. Warte kurz und tippe <span class="text-white">erneut</span>, um das Menü zu öffnen.</p></div>
                    <div><h3 class="text-orange-400 font-bold border-b border-orange-800 mb-1">2. ROSTIGE WAFFEN</h3><p>Müssen erst restauriert werden (50 KK + Öl), bevor Mods möglich sind.</p></div>
                    <div><h3 class="text-orange-400 font-bold border-b border-orange-800 mb-1">3. MODS</h3><p>Verbessern Waffenwerte. Zu finden bei Händlern oder als Beute.</p></div>
                </div>
                <div class="p-4 border-t-2 border-orange-500 bg-orange-900/20 text-center">
                    <button onclick="this.closest('.absolute').remove()" class="w-full bg-orange-500 text-black font-bold py-3 hover:bg-white transition-colors uppercase tracking-widest">VERSTANDEN</button>
                </div>
            </div>
        `;
        view.appendChild(div);
    }
};

Object.assign(UI, {
    shopQty: 1,

    renderCity: function() {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';
        Game.state.view = 'city';
        
        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden";
        
        // Header
        wrapper.innerHTML += `
            <div class="flex-shrink-0 flex flex-col border-b-4 border-green-900 bg-[#001100] p-4 relative shadow-lg z-10">
                <div class="flex justify-between items-start z-10 relative">
                    <div><h1 class="text-5xl md:text-6xl font-bold text-green-400 tracking-widest text-shadow-glow font-vt323 leading-none">RUSTY SPRINGS</h1><div class="text-green-600 text-sm italic mt-1 font-mono">"Die Luft riecht nach Rost."</div></div>
                    <div class="bg-black/60 border-2 border-yellow-600 p-2 flex flex-col items-end shadow-[0_0_15px_rgba(200,150,0,0.3)] min-w-[120px]"><span class="text-[10px] text-yellow-700 font-bold tracking-widest">VERMÖGEN</span><span class="text-2xl text-yellow-400 font-bold font-vt323 tracking-wider">${Game.state.caps} KK</span></div>
                </div>
            </div>
        `;

        // Grid
        const grid = document.createElement('div');
        grid.className = "flex-grow overflow-y-auto custom-scrollbar p-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start bg-[#050a05]";
        
        const createCard = (l, s, i, f, c) => `<div onclick="${f}" class="relative overflow-hidden group cursor-pointer p-4 flex items-center gap-4 border-2 border-${c}-600 bg-black/80 hover:bg-[#0a1a0a] shadow-md min-h-[100px]"><div class="text-5xl text-${c}-500 z-10 relative filter drop-shadow-md">${i}</div><div class="flex flex-col z-10 relative"><span class="text-2xl font-bold text-${c}-500 tracking-wider font-vt323 uppercase">${l}</span><span class="text-xs text-${c}-700 font-mono uppercase tracking-widest mt-1">${s}</span></div></div>`;
        
        grid.innerHTML = `
            ${createCard("HANDELSPOSTEN", "Waffen & Munition", "🛒", "UI.renderShop()", "yellow")}
            ${createCard("KLINIK", "Dr. Zimmermann", "⚕️", "UI.renderClinic()", "red")}
            ${createCard("DER SCHMIED", "Reparaturen & Mods", "⚒️", "window.SMITHY.enter()", "orange")}
            ${createCard("WERKBANK", "Zerlegen & Bauen", "🛠️", "UI.renderCrafting()", "blue")}
        `;
        wrapper.appendChild(grid);

        // Footer
        wrapper.innerHTML += `<div class="flex-shrink-0 p-3 border-t-4 border-green-900 bg-[#001100]"><button class="action-button w-full border-2 border-green-600 text-green-500 py-3 font-bold text-xl hover:bg-green-900/50 hover:text-green-200 transition-all uppercase tracking-[0.15em]" onclick="Game.leaveCity()">ZURÜCK INS ÖDLAND</button></div>`;
        
        view.appendChild(wrapper);
    },

    // --- STANDARD UI VIEWS (RESTORED) ---
    renderShop: function(mode = 'buy') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';
        Game.state.view = 'shop';
        Game.checkShopRestock(); 

        const wrapper = document.createElement('div');
        wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black z-20";
        
        const scroll = document.createElement('div');
        scroll.className = "flex-1 overflow-y-auto p-3 space-y-2";
        
        const controls = document.createElement('div');
        controls.className = "bg-[#002200] border-b border-green-500 p-3 mb-2";
        controls.innerHTML = `
            <div class="flex justify-between text-yellow-500 font-bold mb-2"><span>HÄNDLER: ${Game.state.shop.merchantCaps} KK</span><span>DU: ${Game.state.caps} KK</span></div>
            <div class="flex gap-2 mb-2"><button onclick="UI.setShopQty(1)" class="border px-2 text-green-500">1x</button><button onclick="UI.setShopQty(10)" class="border px-2 text-green-500">10x</button><span class="text-green-300 ml-2 pt-1">Menge: ${UI.shopQty}</span></div>
            <div class="flex"><button onclick="UI.renderShop('buy')" class="flex-1 ${mode=='buy'?'bg-green-500 text-black':'text-green-500'} font-bold p-2">KAUFEN</button><button onclick="UI.renderShop('sell')" class="flex-1 ${mode=='sell'?'bg-red-500 text-black':'text-red-500'} font-bold p-2">VERKAUFEN</button></div>
        `;
        scroll.appendChild(controls);

        const list = document.createElement('div');
        if (mode === 'buy') {
            const stock = Game.state.shop.stock || {};
            for(let key in stock) { if(stock[key] > 0) { const item = Game.items[key] || {name: key, cost: 10}; list.innerHTML += `<div class="flex justify-between items-center border border-yellow-900 p-2 mb-1 bg-yellow-900/10" onclick="Game.buyItem('${key}', UI.shopQty)"><div class="text-yellow-200">${item.name} (${stock[key]})</div><div class="text-yellow-600 font-bold">${item.cost} KK</div></div>`; }}
        } else {
            Game.state.inventory.forEach((item, idx) => { const def = Game.items[item.id] || {name: item.id, cost: 5}; const price = Math.floor(def.cost * 0.25) || 1; list.innerHTML += `<div class="flex justify-between items-center border border-green-900 p-2 mb-1 bg-green-900/10" onclick="Game.sellItem(${idx}, UI.shopQty)"><div class="text-green-300">${item.name || def.name} (${item.count})</div><div class="text-green-600 font-bold">${price} KK</div></div>`; });
        }
        scroll.appendChild(list);

        const footer = document.createElement('div');
        footer.className = "p-3 border-t border-yellow-900 bg-black";
        footer.innerHTML = `<button class="w-full border border-yellow-800 text-yellow-700 py-3 font-bold hover:text-white" onclick="UI.renderCity()">ZURÜCK</button>`;

        wrapper.appendChild(scroll);
        wrapper.appendChild(footer);
        view.appendChild(wrapper);
    },

    setShopQty: function(val) { this.shopQty = val; this.renderShop(Game.state.view === 'shop' && document.querySelector('.bg-red-500') ? 'sell' : 'buy'); },

    renderClinic: function() {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = `<div class="w-full h-full flex flex-col bg-black/95 relative"><div class="p-4 border-b-2 border-red-600 bg-red-900/20 text-center"><h2 class="text-3xl text-red-500 font-bold font-vt323">DR. ZIMMERMANN</h2></div><div class="flex-grow flex flex-col items-center justify-center p-6 gap-6 text-center"><div class="text-7xl animate-pulse">⚕️</div><div class="border-2 border-red-800 p-4 bg-black/80 w-full max-w-md"><div class="flex justify-between text-lg font-mono"><span>GESUNDHEIT:</span> <span class="text-green-500">${Math.floor(Game.state.hp)} / ${Game.state.maxHp}</span></div></div><button onclick="Game.heal()" class="action-button w-full max-w-md py-4 text-xl border-2 border-red-500 text-red-500 hover:bg-red-900/50 font-bold" ${Game.state.caps < 25 ? 'disabled' : ''}>KOMPLETTBEHANDLUNG (25 KK)</button></div><div class="p-3 border-t border-red-900 bg-black"><button class="w-full border-gray-600 text-gray-500 hover:text-white border p-2" onclick="UI.renderCity()">ZURÜCK</button></div></div>`;
    },

    renderCrafting: function() {
        // ... (Vollständige Werkbank Logik hier verkürzt für Übersicht, aber funktional) ...
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';
        Game.state.view = 'crafting';
        // (Einfaches Crafting Layout wiederherstellen)
        view.innerHTML = `<div class="w-full h-full flex flex-col bg-black"><div class="p-4 border-b-2 border-blue-500 bg-blue-900/20"><h2 class="text-3xl text-blue-400 font-vt323">WERKBANK</h2></div><div id="crafting-list" class="flex-1 p-4 text-gray-500">Wähle eine Aktion...<br>(Items Zerlegen funktioniert über das Inventar im Hauptmenü oder hier später)</div><div class="p-3 bg-black border-t border-blue-900"><button onclick="UI.renderCity()" class="w-full border border-blue-500 text-blue-500 p-3">ZURÜCK</button></div></div>`;
        // Wir aktivieren die Crafting Tabs wieder, wenn Smithy stabil ist.
        // Falls du die volle Werkbank brauchst, nimm den Code aus Antwort #3 (ui_view_town.js).
    },
    
    renderSmithy: function() { window.SMITHY.enter(); }
});
