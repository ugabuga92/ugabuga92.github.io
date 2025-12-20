if(window.UI) Object.assign(window.UI, {
    update: function() { 
        if (!Game.state) return; 
        if(this.els.name && typeof Network !== 'undefined') {
            const sectorStr = Game.state.sector ? ` [${Game.state.sector.x},${Game.state.sector.y}]` : "";
            this.els.name.textContent = (Network.myDisplayName || "SURVIVOR") + sectorStr;
        }
        if(this.els.lvl) {
            if(Game.state.statPoints > 0) { this.els.lvl.innerHTML = `${Game.state.lvl} <span class="text-yellow-400 animate-pulse ml-1 text-xs">LVL UP!</span>`; } 
            else { this.els.lvl.textContent = Game.state.lvl; }
        }
        if(this.els.ammo) this.els.ammo.textContent = Game.state.ammo;
        if(this.els.caps) this.els.caps.textContent = `${Game.state.caps}`; 
        const nextXp = Game.expToNextLevel(Game.state.lvl); const expPct = Math.min(100, Math.floor((Game.state.xp / nextXp) * 100)); 
        if(this.els.xpTxt) this.els.xpTxt.textContent = expPct; if(this.els.expBarTop) this.els.expBarTop.style.width = `${expPct}%`;
        const maxHp = Game.state.maxHp; 
        if(this.els.hp) this.els.hp.textContent = `${Math.round(Game.state.hp)}/${maxHp}`; 
        if(this.els.hpBar) this.els.hpBar.style.width = `${Math.max(0, (Game.state.hp / maxHp) * 100)}%`;
        
        let hasAlert = false;
        if(this.els.btnChar) {
            if(Game.state.statPoints > 0) { this.els.btnChar.classList.add('alert-glow-yellow'); hasAlert = true; } 
            else { this.els.btnChar.classList.remove('alert-glow-yellow'); }
        } 
        const unreadQuests = Game.state.quests.some(q => !q.read); 
        if(this.els.btnQuests) {
            if(unreadQuests) { this.els.btnQuests.classList.add('alert-glow-cyan'); hasAlert = true; } 
            else { this.els.btnQuests.classList.remove('alert-glow-cyan'); }
        } 
        if(this.els.btnMenu) {
            if(hasAlert) { this.els.btnMenu.classList.add('alert-glow-red'); } 
            else { this.els.btnMenu.classList.remove('alert-glow-red'); }
        }
        if(this.els.lvl) {
            if(Date.now() < Game.state.buffEndTime) this.els.lvl.classList.add('blink-red'); 
            else this.els.lvl.classList.remove('blink-red'); 
        }
        if(Game.state.view === 'map' && !Game.state.inDialog && this.els.dialog && this.els.dialog.innerHTML === '') { 
            this.els.dialog.style.display = 'none'; 
        }
    },

    toggleView: function(name) { 
        if (Game.state.view === name) this.switchView('map'); 
        else this.switchView(name); 
    },
    
    switchView: async function(name) { 
        this.stopJoystick(); 
        this.focusIndex = -1;
        if(this.els.navMenu) { this.els.navMenu.classList.add('hidden'); this.els.navMenu.style.display = 'none'; }
        if(this.els.playerList) this.els.playerList.style.display = 'none';

        const ver = document.getElementById('version-display') ? document.getElementById('version-display').textContent.trim() : Date.now(); 
        
        if (name === 'map') {
            this.els.view.innerHTML = `
                <div id="map-view" class="w-full h-full flex justify-center items-center bg-black relative">
                    <canvas id="game-canvas" class="w-full h-full object-contain" style="image-rendering: pixelated;"></canvas>
                    <button onclick="UI.switchView('worldmap')" class="absolute top-4 right-4 bg-black/80 border-2 border-green-500 text-green-500 p-2 rounded-full hover:bg-green-900 hover:text-white transition-all z-20 shadow-[0_0_15px_#39ff14] animate-pulse cursor-pointer" title="Weltkarte öffnen">
                        <span class="text-2xl">🌍</span>
                    </button>
                </div>`;
            Game.state.view = name;
            Game.initCanvas();
            this.restoreOverlay();
            this.toggleControls(true);
            this.updateButtonStates(name);
            this.update();
            return; 
        }

        try { 
            const res = await fetch(`views/${name}.html?v=${ver}`); 
            if (!res.ok) throw new Error(`View '${name}' not found`); 
            const html = await res.text(); 
            this.els.view.innerHTML = html; 
            Game.state.view = name; 
            this.restoreOverlay();
            if (name === 'combat') { 
                this.toggleControls(false); 
                if(typeof Combat !== 'undefined' && typeof Combat.render === 'function') Combat.render(); else this.renderCombat(); 
            } else { 
                this.toggleControls(false); 
            } 
            if (name === 'char') this.renderChar(); 
            if (name === 'inventory') this.renderInventory(); 
            if (name === 'wiki') this.renderWiki(); 
            if (name === 'worldmap') this.renderWorldMap(); 
            if (name === 'city') this.renderCity(); 
            if (name === 'combat') this.renderCombat(); 
            if (name === 'quests') this.renderQuests(); 
            if (name === 'crafting') this.renderCrafting(); 
            this.updateButtonStates(name); 
            this.update(); 
            setTimeout(() => this.refreshFocusables(), 100);
        } catch (e) { this.error(`Ladefehler: ${e.message}`); } 
    },

    updateButtonStates: function(activeName) {
        if(this.els.btnWiki) this.els.btnWiki.classList.toggle('active', activeName === 'wiki');
        if(this.els.btnMap) this.els.btnMap.classList.toggle('active', activeName === 'worldmap');
        if(this.els.btnChar) this.els.btnChar.classList.toggle('active', activeName === 'char');
        if(this.els.btnInv) this.els.btnInv.classList.toggle('active', activeName === 'inventory');
        if(this.els.btnQuests) this.els.btnQuests.classList.toggle('active', activeName === 'quests');
    },

    renderCharacterSelection: function(saves) {
        this.charSelectMode = true;
        this.currentSaves = saves;
        this.els.loginScreen.style.display = 'none';
        this.els.charSelectScreen.style.display = 'flex';
        this.els.charSlotsList.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = "char-slot";
            slot.dataset.index = i;
            const save = saves[i];
            if (save) {
                const name = save.playerName || "UNBEKANNT";
                const lvl = save.lvl || 1;
                const loc = save.sector ? `[${save.sector.x},${save.sector.y}]` : "[?,?]";
                slot.innerHTML = `<div class="flex flex-col"><span class="text-xl text-yellow-400 font-bold">${name}</span><span class="text-xs text-green-300">Level ${lvl} | Sektor ${loc}</span></div><div class="text-xs text-gray-500">SLOT ${i+1}</div>`;
            } else {
                slot.classList.add('empty-slot');
                slot.innerHTML = `<div class="flex flex-col"><span class="text-xl text-gray-400">[ LEER ]</span><span class="text-xs text-gray-600">Neuen Charakter erstellen</span></div><div class="text-xs text-gray-700">SLOT ${i+1}</div>`;
            }
            slot.onclick = () => this.selectSlot(i);
            this.els.charSlotsList.appendChild(slot);
        }
        this.selectSlot(0);
    },

    renderSpawnList: function(players) {
        if(!this.els.spawnList) return;
        this.els.spawnList.innerHTML = '';
        let count = 0;
        for(let id in players) {
            if(id === Network.myId) continue;
            const p = players[id];
            const btn = document.createElement('button');
            btn.className = "action-button w-full text-left p-2 flex justify-between";
            const sec = p.sector ? `${p.sector.x},${p.sector.y}` : "?,?";
            btn.innerHTML = `<span>${id}</span> <span class="text-cyan-400">Sektor ${sec}</span>`;
            btn.onclick = () => this.selectSpawn(p);
            this.els.spawnList.appendChild(btn);
            count++;
        }
        if(count === 0) {
            this.els.spawnList.innerHTML = '<div class="text-center italic opacity-50 p-2">Keine Signale. Starte Solo.</div>';
        }
    },
    
    togglePlayerList: function() {
        if(this.els.playerList.style.display === 'flex') {
            this.els.playerList.style.display = 'none';
        } else {
            this.updatePlayerList();
            this.els.playerList.style.display = 'flex';
            this.focusIndex = -1;
            this.refreshFocusables();
        }
    },

    updatePlayerList: function() {
        if(!this.els.playerListContent || typeof Network === 'undefined') return;
        let myLoc = "[?,?]";
        if (Game.state && Game.state.sector) {
            myLoc = `[${Game.state.sector.x},${Game.state.sector.y}]`;
        }
        let html = `<div class="text-green-400">> ${Network.myDisplayName || "DU"} <span class="text-yellow-400">${myLoc}</span></div>`;
        if(Network.otherPlayers) {
            for(let name in Network.otherPlayers) {
                const p = Network.otherPlayers[name];
                const loc = (p.sector) ? `[${p.sector.x},${p.sector.y}]` : '[?]';
                html += `<div class="text-cyan-400">> ${name} <span class="text-yellow-400">${loc}</span></div>`;
            }
        }
        this.els.playerListContent.innerHTML = html;
    },

    restoreOverlay: function() { 
        if(document.getElementById('joystick-base')) return; 
        const joystickHTML = `
            <div id="joystick-base" style="position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 2px solid rgba(57, 255, 20, 0.5); background: rgba(0, 0, 0, 0.2); display: none; pointer-events: none; z-index: 9999;"></div>
            <div id="joystick-stick" style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(57, 255, 20, 0.8); display: none; pointer-events: none; z-index: 10000; box-shadow: 0 0 10px #39ff14;"></div>
            <div id="dialog-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 50; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: auto; max-width: 90%;"></div> 
        `; 
        this.els.view.insertAdjacentHTML('beforeend', joystickHTML); 
        this.els.joyBase = document.getElementById('joystick-base'); 
        this.els.joyStick = document.getElementById('joystick-stick'); 
        this.els.dialog = document.getElementById('dialog-overlay'); 
    },
    
    // --- DIALOGS (PERMADEATH ETC) ---
    showPermadeathWarning: function() {
        if(!this.els.dialog) this.restoreOverlay();
        Game.state.inDialog = true;
        this.els.dialog.innerHTML = '';
        this.els.dialog.style.display = 'flex';
        const box = document.createElement('div');
        box.className = "bg-black border-4 border-red-600 p-6 shadow-[0_0_50px_red] max-w-lg text-center animate-pulse";
        box.innerHTML = `<div class="text-6xl text-red-600 mb-4 font-bold">☠️</div><h1 class="text-4xl font-bold text-red-600 mb-4 tracking-widest border-b-2 border-red-600 pb-2">PERMADEATH AKTIV</h1><p class="text-red-400 font-mono text-lg mb-6 leading-relaxed">WARNUNG, BEWOHNER!<br>Das Ödland kennt keine Gnade.<br>Wenn deine HP auf 0 fallen, wird dieser Charakter<br><span class="font-bold text-white bg-red-900 px-1">DAUERHAFT GELÖSCHT</span>.</p><button class="action-button w-full border-red-600 text-red-500 font-bold py-4 text-xl hover:bg-red-900" onclick="UI.leaveDialog()">ICH HABE VERSTANDEN</button>`;
        this.els.dialog.appendChild(box);
    },
    showDungeonWarning: function(callback) { if(!this.els.dialog) { this.restoreOverlay(); } Game.state.inDialog = true; this.els.dialog.innerHTML = ''; this.els.dialog.style.display = 'flex'; const box = document.createElement('div'); box.className = "bg-black border-2 border-red-600 p-4 shadow-[0_0_20px_red] max-w-sm text-center animate-pulse mb-4"; box.innerHTML = `<h2 class="text-3xl font-bold text-red-600 mb-2 tracking-widest">⚠️ WARNING ⚠️</h2><p class="text-red-400 mb-4 font-bold">HOHE GEFAHR!<br>Sicher, dass du eintreten willst?</p>`; const btnContainer = document.createElement('div'); btnContainer.className = "flex gap-2 justify-center w-full"; const btnYes = document.createElement('button'); btnYes.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full"; btnYes.textContent = "BETRETEN"; btnYes.onclick = () => { this.leaveDialog(); if(callback) callback(); }; const btnNo = document.createElement('button'); btnNo.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full"; btnNo.textContent = "FLUCHT"; btnNo.onclick = () => { this.leaveDialog(); }; btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo); box.appendChild(btnContainer); this.els.dialog.appendChild(box); this.refreshFocusables(); },
    showDungeonLocked: function(minutesLeft) { if(!this.els.dialog) { this.restoreOverlay(); } Game.state.inDialog = true; this.els.dialog.innerHTML = ''; this.els.dialog.style.display = 'flex'; const box = document.createElement('div'); box.className = "bg-black border-2 border-gray-600 p-4 shadow-[0_0_20px_gray] max-w-sm text-center mb-4"; box.innerHTML = `<h2 class="text-3xl font-bold text-gray-400 mb-2 tracking-widest">🔒 LOCKED</h2><p class="text-gray-300 mb-4 font-bold">Dieses Gebiet ist versiegelt.<br>Versuche es in ${minutesLeft} Minuten wieder.</p>`; const btn = document.createElement('button'); btn.className = "border border-gray-500 text-gray-500 hover:bg-gray-900 px-4 py-2 font-bold w-full"; btn.textContent = "VERSTANDEN"; btn.onclick = () => this.leaveDialog(); box.appendChild(btn); this.els.dialog.appendChild(box); this.refreshFocusables(); },
    showDungeonVictory: function(caps, lvl) { if(!this.els.dialog) { this.restoreOverlay(); } Game.state.inDialog = true; this.els.dialog.innerHTML = ''; this.els.dialog.style.display = 'flex'; const box = document.createElement('div'); box.className = "bg-black border-4 border-yellow-400 p-6 shadow-[0_0_30px_gold] max-w-md text-center mb-4 animate-bounce"; box.innerHTML = `<div class="text-6xl mb-2">👑⚔️</div><h2 class="text-4xl font-bold text-yellow-400 mb-2 tracking-widest text-shadow-gold">VICTORY!</h2><p class="text-yellow-200 mb-4 font-bold text-lg">DUNGEON (LVL ${lvl}) GECLEARED!</p><div class="text-2xl text-white font-bold border-t border-b border-yellow-500 py-2 mb-4 bg-yellow-900/30">+${caps} KRONKORKEN</div><p class="text-xs text-yellow-600">Komme in 10 Minuten wieder!</p>`; this.els.dialog.appendChild(box); },
    showGameOver: function() { if(this.els.gameOver) this.els.gameOver.classList.remove('hidden'); this.toggleControls(false); },
    showItemConfirm: function(itemId) { if(!this.els.dialog) this.restoreOverlay(); if(!Game.items[itemId]) return; const item = Game.items[itemId]; Game.state.inDialog = true; this.els.dialog.innerHTML = ''; this.els.dialog.style.display = 'flex'; let statsText = ""; if(item.type === 'consumable') statsText = `Effekt: ${item.effect} (${item.val})`; if(item.type === 'weapon') statsText = `Schaden: ${item.baseDmg}`; if(item.type === 'body') statsText = `Rüstung: +${item.bonus.END || 0} END`; const box = document.createElement('div'); box.className = "bg-black border-2 border-green-500 p-4 shadow-[0_0_15px_green] max-w-sm text-center mb-4"; box.innerHTML = `<h2 class="text-xl font-bold text-green-400 mb-2">${item.name}</h2><div class="text-xs text-green-200 mb-4 border-t border-b border-green-900 py-2">Typ: ${item.type.toUpperCase()}<br>Wert: ${item.cost} KK<br><span class="text-yellow-400">${statsText}</span></div><p class="text-green-200 mb-4 text-sm">Gegenstand benutzen / ausrüsten?</p>`; const btnContainer = document.createElement('div'); btnContainer.className = "flex gap-2 justify-center w-full"; const btnYes = document.createElement('button'); btnYes.className = "border border-green-500 text-green-500 hover:bg-green-900 px-4 py-2 font-bold w-full"; btnYes.textContent = "BESTÄTIGEN"; btnYes.onclick = () => { Game.useItem(itemId); this.leaveDialog(); }; const btnNo = document.createElement('button'); btnNo.className = "border border-red-500 text-red-500 hover:bg-red-900 px-4 py-2 font-bold w-full"; btnNo.textContent = "ABBRUCH"; btnNo.onclick = () => { this.leaveDialog(); }; btnContainer.appendChild(btnYes); btnContainer.appendChild(btnNo); box.appendChild(btnContainer); this.els.dialog.appendChild(box); this.refreshFocusables(); },
    
    renderInventory: function() { const list = document.getElementById('inventory-list'); const countDisplay = document.getElementById('inv-count'); const capsDisplay = document.getElementById('inv-caps'); if(!list || !Game.state.inventory) return; list.innerHTML = ''; capsDisplay.textContent = Game.state.caps; let totalItems = 0; const getIcon = (type) => { switch(type) { case 'weapon': return '🔫'; case 'body': return '🛡️'; case 'consumable': return '💉'; case 'junk': return '⚙️'; case 'component': return '🔩'; case 'rare': return '⭐'; default: return '📦'; } }; Game.state.inventory.forEach((entry, index) => { if(entry.count <= 0) return; totalItems += entry.count; const item = Game.items[entry.id]; const btn = document.createElement('div'); btn.className = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-green-500 hover:text-black transition-colors group"; btn.innerHTML = `<div class="text-2xl">${getIcon(item.type)}</div><div class="text-[10px] truncate max-w-full px-1 font-bold">${item.name}</div><div class="absolute top-0 right-0 bg-green-900 text-white text-[10px] px-1 font-mono">${entry.count}</div>`; btn.onclick = () => { if(item.type === 'junk' || item.type === 'component' || item.type === 'rare') {} else { this.showItemConfirm(entry.id); } }; list.appendChild(btn); }); countDisplay.textContent = totalItems; if(totalItems === 0) { list.innerHTML = '<div class="col-span-4 text-center text-gray-500 italic mt-10">Leerer Rucksack...</div>'; } },
    renderCrafting: function() { const container = document.getElementById('crafting-list'); if(!container) return; container.innerHTML = ''; Game.recipes.forEach(recipe => { const outItem = recipe.out === 'AMMO' ? {name: "15x Munition"} : Game.items[recipe.out]; const div = document.createElement('div'); div.className = "border border-green-900 bg-green-900/10 p-3 mb-2"; let reqHtml = ''; let canCraft = true; for(let reqId in recipe.req) { const countNeeded = recipe.req[reqId]; const invItem = Game.state.inventory.find(i => i.id === reqId); const countHave = invItem ? invItem.count : 0; let isEquipped = false; if (Game.state.equip.weapon && Object.keys(Game.items).find(k => Game.items[k].name === Game.state.equip.weapon.name) === reqId) isEquipped = true; if (Game.state.equip.body && Object.keys(Game.items).find(k => Game.items[k].name === Game.state.equip.body.name) === reqId) isEquipped = true; let color = "text-green-500"; if (isEquipped) { if (countHave < countNeeded) { canCraft = false; color = "text-red-500"; } } else { if (countHave < countNeeded) { canCraft = false; color = "text-red-500"; } } reqHtml += `<div class="${color} text-xs">• ${Game.items[reqId].name}: ${countHave}/${countNeeded} ${isEquipped ? '(E)' : ''}</div>`; } if(Game.state.lvl < recipe.lvl) { canCraft = false; reqHtml += `<div class="text-red-500 text-xs mt-1">Benötigt Level ${recipe.lvl}</div>`; } div.innerHTML = `<div class="flex justify-between items-start mb-2"><div class="font-bold text-yellow-400 text-lg">${outItem.name}</div><button class="action-button text-sm px-3" onclick="Game.craftItem('${recipe.id}')" ${canCraft ? '' : 'disabled'}>FERTIGEN</button></div><div class="pl-2 border-l-2 border-green-900">${reqHtml}</div>`; container.appendChild(div); }); },
    renderWiki: function(category = 'monsters') { const content = document.getElementById('wiki-content'); if(!content) return; ['monsters', 'items', 'crafting', 'locs'].forEach(cat => { const btn = document.getElementById(`wiki-btn-${cat}`); if(btn) { if(cat === category) { btn.classList.add('bg-green-500', 'text-black'); btn.classList.remove('text-green-500'); } else { btn.classList.remove('bg-green-500', 'text-black'); btn.classList.add('text-green-500'); } } }); let htmlBuffer = ''; if(category === 'monsters') { Object.keys(Game.monsters).forEach(k => { const m = Game.monsters[k]; const xpText = Array.isArray(m.xp) ? `${m.xp[0]}-${m.xp[1]}` : m.xp; let dropsText = "Nichts"; if(m.drops) { dropsText = m.drops.map(d => { const item = Game.items[d.id]; return `${item ? item.name : d.id} (${Math.round(d.c*100)}%)`; }).join(', '); } htmlBuffer += `<div class="border border-green-900 bg-green-900/10 p-3 mb-2"><div class="flex justify-between items-start"><div class="font-bold text-yellow-400 text-xl">${m.name} ${m.isLegendary ? '★' : ''}</div><div class="text-xs border border-green-700 px-1">LVL ${m.minLvl}+</div></div><div class="grid grid-cols-2 gap-2 text-sm mt-2"><div>HP: <span class="text-white">${m.hp}</span></div><div>DMG: <span class="text-red-400">${m.dmg}</span></div><div>XP: <span class="text-cyan-400">${xpText}</span></div><div>Caps: <span class="text-yellow-200">~${m.loot}</span></div></div><div class="mt-2 text-xs border-t border-green-900 pt-1 text-gray-400">Beute: <span class="text-green-300">${dropsText}</span></div></div>`; }); } else if (category === 'items') { const categories = {}; if (Game.items) { Object.keys(Game.items).forEach(k => { const i = Game.items[k]; if(!categories[i.type]) categories[i.type] = []; categories[i.type].push(i); }); for(let type in categories) { htmlBuffer += `<h3 class="text-lg font-bold border-b border-green-500 mt-4 mb-2 uppercase text-green-300">${type}</h3>`; categories[type].forEach(item => { let details = `Wert: ${item.cost}`; if(item.baseDmg) details += ` | DMG: ${item.baseDmg}`; if(item.bonus) details += ` | Bonus: ${JSON.stringify(item.bonus).replace(/["{}]/g, '').replace(/:/g, '+')}`; htmlBuffer += `<div class="flex justify-between items-center border-b border-green-900/30 py-1"><span class="font-bold text-white">${item.name}</span><span class="text-xs text-gray-400">${details}</span></div>`; }); } } } else if (category === 'crafting') { if (Game.recipes) { Game.recipes.forEach(r => { const outName = r.out === "AMMO" ? "Munition x15" : (Game.items[r.out] ? Game.items[r.out].name : r.out); const reqs = Object.keys(r.req).map(rid => { const iName = Game.items[rid] ? Game.items[rid].name : rid; return `${r.req[rid]}x ${iName}`; }).join(', '); htmlBuffer += `<div class="border border-green-900 p-2 mb-2 bg-green-900/10"><div class="font-bold text-yellow-400">${outName} <span class="text-xs text-gray-500 ml-2">(Lvl ${r.lvl})</span></div><div class="text-xs text-green-300 italic">Benötigt: ${reqs}</div></div>`; }); } } else if (category === 'locs') { const locs = [ {name: "Vault 101", desc: "Startpunkt. Sicherer Hafen. Bietet kostenlose Heilung."}, {name: "Rusty Springs", desc: "Zentrale Handelsstadt [3,3]. Händler, Heiler und Werkbank."}, {name: "Supermarkt", desc: "Zufällige Ruine. Mittlere Gefahr, viele Raider."}, {name: "Alte Höhlen", desc: "Zufälliger Dungeon. Dunkel, Skorpione und Insekten."}, {name: "Oasis", desc: "Sektor [0,0] bis [1,1]. Dichter Dschungel im Nordwesten."}, {name: "The Pitt", desc: "Sektor [6,6] bis [7,7]. Tödliche Wüste im Südosten."}, {name: "Sumpf", desc: "Sektor [6,0] bis [7,1]. Giftiges Wasser und Mirelurks."} ]; locs.forEach(l => { htmlBuffer += `<div class="mb-3 border-l-2 border-green-500 pl-2"><div class="font-bold text-cyan-400 text-lg uppercase">${l.name}</div><div class="text-sm text-green-200 leading-tight">${l.desc}</div></div>`; }); } content.innerHTML = htmlBuffer; },
    renderChar: function() { const grid = document.getElementById('stat-grid'); if(!grid) return; const lvlDisplay = document.getElementById('char-lvl'); if(lvlDisplay) lvlDisplay.textContent = Game.state.lvl; const statOrder = ['STR', 'PER', 'END', 'INT', 'AGI', 'LUC']; grid.innerHTML = statOrder.map(k => { const val = Game.getStat(k); const btn = Game.state.statPoints > 0 ? `<button class="w-12 h-12 border-2 border-green-500 bg-green-900/50 text-green-400 font-bold ml-2 flex items-center justify-center hover:bg-green-500 hover:text-black transition-colors" onclick="Game.upgradeStat('${k}')" style="font-size: 1.5rem;">+</button>` : ''; const label = (typeof window.GameData !== 'undefined' && window.GameData.statLabels && window.GameData.statLabels[k]) ? window.GameData.statLabels[k] : k; return `<div class="flex justify-between items-center border-b border-green-900/30 py-1 h-14"><span>${label}</span> <div class="flex items-center"><span class="text-yellow-400 font-bold mr-4 text-xl">${val}</span>${btn}</div></div>`; }).join(''); const nextXp = Game.expToNextLevel(Game.state.lvl); const expPct = Math.min(100, (Game.state.xp / nextXp) * 100); document.getElementById('char-exp').textContent = Game.state.xp; document.getElementById('char-next').textContent = nextXp; document.getElementById('char-exp-bar').style.width = `${expPct}%`; const pts = Game.state.statPoints; const ptsEl = document.getElementById('char-points'); if (pts > 0) { ptsEl.innerHTML = `<span class="text-red-500 animate-pulse text-2xl font-bold bg-red-900/20 px-2 border border-red-500">${pts} VERFÜGBAR!</span>`; } else { ptsEl.textContent = pts; } const wpn = Game.state.equip.weapon || {name: "Fäuste", baseDmg: 2}; const arm = Game.state.equip.body || {name: "Vault-Anzug", bonus: {END: 1}}; document.getElementById('equip-weapon-name').textContent = wpn.name; let wpnStats = `DMG: ${wpn.baseDmg}`; if(wpn.bonus) { for(let s in wpn.bonus) wpnStats += ` ${s}:${wpn.bonus[s]}`; } document.getElementById('equip-weapon-stats').textContent = wpnStats; document.getElementById('equip-body-name').textContent = arm.name; let armStats = ""; if(arm.bonus) { for(let s in arm.bonus) armStats += `${s}:${arm.bonus[s]} `; } document.getElementById('equip-body-stats').textContent = armStats || "Kein Bonus"; },
    renderCombat: function() { const enemy = Game.state.enemy; if(!enemy) return; document.getElementById('enemy-name').textContent = enemy.name; document.getElementById('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`; document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`; },
    
    // --- ACTIONS ---
    toggleControls: function(show) { if (!show && this.els.dialog) this.els.dialog.innerHTML = ''; },
    showGameOver: function() { if(this.els.gameOver) this.els.gameOver.classList.remove('hidden'); this.toggleControls(false); },
    enterVault: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const restBtn = document.createElement('button'); restBtn.className = "action-button w-full mb-1 border-blue-500 text-blue-300"; restBtn.textContent = "Ausruhen (Gratis)"; restBtn.onclick = () => { Game.rest(); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weiter geht's"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(restBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'flex'; },
    enterSupermarket: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-red-500 text-red-300"; enterBtn.textContent = "Ruine betreten (Gefahr!)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "market"); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(enterBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'block'; },
    enterCave: function() { Game.state.inDialog = true; this.els.dialog.innerHTML = ''; const enterBtn = document.createElement('button'); enterBtn.className = "action-button w-full mb-1 border-gray-500 text-gray-300"; enterBtn.textContent = "In die Tiefe (Dungeon)"; enterBtn.onclick = () => { Game.loadSector(0, 0, true, "cave"); this.leaveDialog(); }; const leaveBtn = document.createElement('button'); leaveBtn.className = "action-button w-full"; leaveBtn.textContent = "Weitergehen"; leaveBtn.onclick = () => this.leaveDialog(); this.els.dialog.appendChild(enterBtn); this.els.dialog.appendChild(leaveBtn); this.els.dialog.style.display = 'block'; },
    leaveDialog: function() { Game.state.inDialog = false; this.els.dialog.style.display = 'none'; this.update(); },
    renderWorldMap: function() { const grid = document.getElementById('world-grid'); if(!grid) return; grid.innerHTML = ''; for(let y=0; y<8; y++) { for(let x=0; x<8; x++) { const d = document.createElement('div'); d.className = "border border-green-900/30 flex justify-center items-center text-xs relative cursor-help"; d.title = `Sektor [${x},${y}]`; if(x === Game.state.sector.x && y === Game.state.sector.y) { d.style.backgroundColor = "#39ff14"; d.style.color = "black"; d.style.fontWeight = "bold"; d.textContent = "YOU"; } else if(Game.worldData[`${x},${y}`]) { const data = Game.worldData[`${x},${y}`]; d.style.backgroundColor = this.biomeColors[data.biome] || '#4a3d34'; if(data.poi) { d.textContent = data.poi; d.style.color = "white"; d.style.fontWeight = "bold"; d.style.textShadow = "0 0 2px black"; } } if(typeof Network !== 'undefined' && Network.otherPlayers) { const playersHere = Object.values(Network.otherPlayers).filter(p => p.sector && p.sector.x === x && p.sector.y === y); if(playersHere.length > 0) { const dot = document.createElement('div'); dot.className = "absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_cyan]"; if(x === Game.state.sector.x && y === Game.state.sector.y) { dot.style.top = "2px"; dot.style.right = "2px"; } d.appendChild(dot); } } grid.appendChild(d); } } grid.style.gridTemplateColumns = "repeat(8, 1fr)"; },
});
