// [2026-01-17 14:30:00] ui_render_views.js - Fix Header Click Logic & Debugging

Object.assign(UI, {

    // [FIX] Robuste Klick-Logik mit Debugging und Typ-Sicherheit
    handleHeaderClick: function() {
        if(!Game.state) {
            console.warn("UI: HandleHeaderClick - Kein Game State!");
            return;
        }
        
        // Sicherstellen, dass es Zahlen sind (falls mal "1" als String kommt)
        const sPoints = Number(Game.state.statPoints || 0);
        const pPoints = Number(Game.state.perkPoints || 0);

        console.log(`UI: Header Clicked. Stats: ${sPoints}, Perks: ${pPoints}`);

        // Logik gemäß Anforderung: Prio Special > Prio Perks > Fallback Special
        if (sPoints > 0) {
            console.log("-> Gehe zu SPECIAL (Prio 1)");
            this.renderStats('special'); 
        } 
        else if (pPoints > 0) {
            console.log("-> Gehe zu PERKS (Prio 2)");
            this.renderStats('perks');   
        } 
        else {
            console.log("-> Gehe zu SPECIAL (Fallback/Details)");
            this.renderStats('special'); 
        }
    },

    renderStats: function(tab = 'stats', event = null) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        Game.state.view = 'char';
        Game.state.charTab = tab;
        
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = ''; 

        // Haupt-Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black z-20 overflow-hidden";
        wrapper.onclick = (e) => e.stopPropagation();

        // Scrollbarer Bereich
        const scrollContainer = document.createElement('div');
        scrollContainer.className = "flex-1 w-full overflow-y-auto pb-24 bg-black";

        const getTabClass = (t) => (tab === t) 
            ? "bg-green-500 text-black border-b-4 border-green-700 font-bold" 
            : "bg-[#001100] text-green-600 border-b border-green-900";

        // Sticky Header (Tabs)
        const header = document.createElement('div');
        header.className = "flex w-full border-b-2 border-green-900 bg-black sticky top-0 z-30"; 
        header.innerHTML = `
            <button onclick="UI.renderStats('stats', event)" class="flex-1 py-3 uppercase font-vt323 text-xl ${getTabClass('stats')}">STATUS</button>
            <button onclick="UI.renderStats('special', event)" class="flex-1 py-3 uppercase font-vt323 text-xl ${getTabClass('special')}">S.P.E.C.I.A.L.</button>
            <button onclick="UI.renderStats('perks', event)" class="flex-1 py-3 uppercase font-vt323 text-xl ${getTabClass('perks')}">PERKS</button>
        `;
        scrollContainer.appendChild(header);

        // Content Area
        const content = document.createElement('div');
        content.className = "w-full p-4";
        
        if (tab === 'stats') UI.renderCharacterVisuals(content);
        else if (tab === 'special') UI.renderSpecialStats(content);
        else if (tab === 'perks') UI.renderPerksList(content);

        scrollContainer.appendChild(content);
        wrapper.appendChild(scrollContainer);

        // Footer (Zurück)
        const footer = document.createElement('div');
        footer.className = "absolute bottom-0 left-0 w-full p-3 bg-black border-t-2 border-green-900 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.9)]";
        footer.innerHTML = `<button class="action-button w-full border-2 border-green-600 text-green-500 py-3 font-bold text-xl uppercase" onclick="UI.switchView('map')">ZURÜCK</button>`;
        wrapper.appendChild(footer);

        view.appendChild(wrapper);

        if (tab === 'stats') setTimeout(() => UI.drawVaultBoy('char-silhouette-canvas'), 100);
    },

    renderCharacterVisuals: function(container) {
        const p = Game.state;
        const eq = p.equip || {};

        const renderSlot = (slotName, item, iconFallback) => {
            const hasItem = !!item;
            const name = hasItem ? (item.props?.name || item.name) : "LEER";
            return `
                <div class="flex flex-col items-center justify-center p-2 border-2 ${hasItem ? 'border-green-500 bg-green-900/20' : 'border-green-900/50'} rounded min-h-[80px] z-10 relative cursor-pointer hover:bg-green-900/40 transition-colors" onclick="UI.openEquipMenu('${slotName}')">
                    <div class="text-[8px] uppercase opacity-50 mb-1 pointer-events-none">${slotName}</div>
                    <div class="text-2xl mb-1 pointer-events-none">${hasItem && item.icon ? item.icon : iconFallback}</div>
                    <div class="text-[9px] text-center font-bold truncate w-full pointer-events-none">${name}</div>
                </div>
            `;
        };
        
        let actionText = '<span class="ml-2 text-xs uppercase border border-green-700 px-1 rounded text-green-500 opacity-50">Details ▶</span>';
        let highlightClass = "";
        
        // Prüfung erzwingen für Visualisierung
        if ((p.statPoints || 0) > 0 || (p.perkPoints || 0) > 0) {
            actionText = '<span class="ml-2 text-xs uppercase border border-yellow-500 bg-yellow-900/40 px-1 rounded text-yellow-400 font-bold animate-pulse">LEVEL UP! ▶</span>';
            highlightClass = "border-yellow-500/50 bg-yellow-900/10 shadow-[0_0_15px_rgba(255,255,0,0.1)]"; 
        }

        container.innerHTML = `
            <div class="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div class="text-center w-full border-b border-green-900 pb-2 cursor-pointer hover:bg-green-900/20 transition-all group rounded p-2 relative z-50 ${highlightClass}" 
                     onclick="UI.handleHeaderClick(event)">
                    
                    <div class="text-4xl font-bold text-green-400 group-hover:text-yellow-400 transition-colors text-shadow-md pointer-events-none">${p.playerName}</div>
                    <div class="text-xs font-mono text-green-600 group-hover:text-green-300 mt-1 pointer-events-none">
                        LVL ${p.lvl} | XP: ${p.xp} / ${Game.expToNextLevel(p.lvl)}
                        ${actionText}
                    </div>
                </div>
                
                <div class="grid grid-cols-3 grid-rows-4 gap-2 w-full relative mt-2 z-10">
                    <div class="col-start-2 row-start-1">${renderSlot('head', eq.head, '🧢')}</div>
                    <div class="col-start-1 row-start-2">${renderSlot('weapon', eq.weapon, '👊')}</div>
                    <div class="col-start-2 row-start-2">${renderSlot('body', eq.body, '👕')}</div>
                    <div class="col-start-3 row-start-2">${renderSlot('arms', eq.arms, '💪')}</div>
                    <div class="col-start-2 row-start-3">${renderSlot('legs', eq.legs, '👖')}</div>
                    <div class="col-start-3 row-start-3">${renderSlot('back', eq.back, '🎒')}</div>
                    <div class="col-start-2 row-start-4">${renderSlot('feet', eq.feet, '🥾')}</div>
                    <div class="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none z-0">
                        <canvas id="char-silhouette-canvas" width="240" height="300"></canvas>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 w-full text-xs font-mono bg-green-900/10 p-3 rounded border border-green-900/50 mt-2 z-10">
                    <div class="flex justify-between border-b border-green-900/20 pb-1"><span>TP</span><span class="text-green-400 font-bold">${Math.round(p.hp)}/${p.maxHp}</span></div>
                    <div class="flex justify-between border-b border-green-900/20 pb-1"><span>DEF</span><span class="text-green-400 font-bold">${(typeof Game.getStat === 'function') ? Game.getStat('DEF') : 0}</span></div>
                    <div class="flex justify-between border-b border-green-900/20 pb-1"><span>KRIT</span><span class="text-green-400 font-bold">${p.critChance || 5}%</span></div>
                    <div class="flex justify-between border-b border-green-900/20 pb-1"><span>LOAD</span><span class="text-green-400 font-bold">${p.inventory?.length || 0}/${(typeof Game.getMaxSlots === 'function') ? Game.getMaxSlots() : 20}</span></div>
                </div>
            </div>
        `;
    },

    renderSpecialStats: function(container) {
        const stats = Game.state.stats || { STR:5, PER:5, END:5, INT:5, AGI:5, LUC:5 };
        const points = Game.state.statPoints || 0;
        const labels = window.GameData.statLabels || { STR: "STÄRKE", PER: "WAHRNEHMUNG", END: "AUSDAUER", INT: "INTELLIGENZ", AGI: "BEWEGLICHKEIT", LUC: "GLÜCK" };
        
        let html = `<div class="text-center mb-6"><div class="text-xs text-green-600 mb-2">VERFÜGBARE PUNKTE</div><div class="text-5xl font-bold ${points > 0 ? 'text-yellow-400' : 'text-gray-600'}">${points}</div></div><div class="space-y-3">`;
        
        for (let key in labels) {
            const val = stats[key] || 1;
            html += `<div class="flex items-center justify-between bg-black/40 p-3 border border-green-900">
                <div class="flex flex-col"><span class="text-2xl font-bold text-green-400 font-vt323">${key}</span><span class="text-[10px] text-green-700">${labels[key]}</span></div>
                <div class="flex items-center gap-4"><span class="text-3xl font-bold text-white">${val}</span>
                ${points > 0 && val < 10 ? `<button onclick="Game.upgradeStat('${key}', event)" class="w-10 h-10 bg-green-900 text-green-400 border border-green-500 font-bold text-xl rounded">+</button>` : ''}</div>
            </div>`;
        }
        container.innerHTML = html + '</div>';
    },

    renderPerksList: function(container) {
        const perks = window.GameData.perks || [];
        const myPerks = Game.state.perks || {};
        const points = Game.state.perkPoints || 0;
        
        let html = `<div class="text-center mb-6"><div class="text-xs text-green-600 mb-2">PERK-PUNKTE</div><div class="text-5xl font-bold ${points > 0 ? 'text-yellow-400' : 'text-gray-600'}">${points}</div></div><div class="space-y-3">`;
        
        perks.forEach(p => {
            const cur = myPerks[p.id] || 0;
            const maxLvl = p.max || 5;
            const canBuy = points > 0 && cur < maxLvl && Game.state.lvl >= (p.minLvl || 1);
            
            html += `<div class="p-3 border ${cur > 0 ? 'border-green-600 bg-green-900/10' : 'border-green-900/30'}">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-bold text-green-300 text-lg">${p.icon || ''} ${p.name}</div>
                        <div class="text-xs text-green-700">Rang: ${cur}/${maxLvl}</div>
                    </div>
                    <button class="px-3 py-1 border text-xs font-bold ${canBuy ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-600 hover:text-black' : 'border-gray-800 text-gray-600'}" 
                        ${canBuy ? `onclick="Game.choosePerk('${p.id}')"` : ''}>
                        ${cur >= maxLvl ? 'MAX' : 'LERNEN'}
                    </button>
                </div>
                <div class="text-xs text-gray-500 mt-1">${p.desc}</div>
            </div>`;
        });
        container.innerHTML = html + '</div>';
    },

    drawVaultBoy: function(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#1aff1a"; ctx.fillStyle = "#1aff1a"; ctx.lineWidth = 2.5;
        const cx = canvas.width / 2; const cy = canvas.height / 2;
        ctx.beginPath(); ctx.arc(cx, cy - 60, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 10, cy - 85, 12, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-18, cy-30); ctx.lineTo(cx+18, cy-30); ctx.lineTo(cx+22, cy+30); ctx.lineTo(cx-22, cy+30); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+18, cy-20); ctx.lineTo(cx+50, cy-40); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(cx-18, cy-20); ctx.lineTo(cx-40, cy); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(cx-12, cy+30); ctx.lineTo(cx-18, cy+85); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(cx+12, cy+30); ctx.lineTo(cx+18, cy+85); ctx.stroke(); 
        ctx.beginPath(); ctx.arc(cx - 10, cy - 65, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 10, cy - 65, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 60, 15, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    },

    renderCharacterSelection: function(saves) {
        this.charSelectMode = true; this.currentSaves = saves;
        if(this.els.loginScreen) this.els.loginScreen.style.display = 'none';
        if(this.els.charSelectScreen) this.els.charSelectScreen.style.display = 'flex';
        if(this.els.charSlotsList) this.els.charSlotsList.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = "char-slot border-2 border-green-900 bg-black/80 p-4 mb-2 cursor-pointer hover:border-yellow-400 flex justify-between items-center group relative";
            const save = saves[i];
            if (save) {
                const isDead = (save.hp !== undefined && save.hp <= 0);
                slot.innerHTML = `<div class="flex flex-col z-10"><span class="text-xl ${isDead ? 'text-red-500' : 'text-yellow-400'} font-bold">${isDead ? '💀' : '👤'} ${save.playerName}</span><span class="text-xs text-green-300 font-mono">Level ${save.lvl}</span></div><button class="bg-green-700 text-black font-bold px-4 py-1 text-xs rounded group-hover:bg-[#39ff14]">START ▶</button>`;
            } else {
                slot.innerHTML = `<div class="text-gray-500 font-bold">+ NEUEN CHARAKTER</div>`;
            }
            slot.onclick = () => { if(typeof this.selectSlot === 'function') this.selectSlot(i); };
            if(this.els.charSlotsList) this.els.charSlotsList.appendChild(slot);
        }
        if(typeof this.selectSlot === 'function') this.selectSlot(0);
    },

    renderSpawnList: function(players) {
        if(!this.els.spawnList) return;
        this.els.spawnList.innerHTML = '';
        for(let pid in players) {
            const p = players[pid];
            const btn = document.createElement('button');
            btn.className = "action-button w-full mb-2 text-left text-xs border-green-800 text-green-400 p-2";
            btn.innerHTML = `SIGNAL: ${p.name}`;
            btn.onclick = () => { if(this.els.spawnScreen) this.els.spawnScreen.style.display = 'none'; this.startGame(null, this.selectedSlot, null); };
            this.els.spawnList.appendChild(btn);
        }
    },

    renderCombat: function() {
        const enemy = Game.state.enemy; if(!enemy) return;
        const nameEl = document.getElementById('enemy-name'); if(nameEl) nameEl.textContent = enemy.name;
        const hpText = document.getElementById('enemy-hp-text'); if(hpText) hpText.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`;
        const hpBar = document.getElementById('enemy-hp-bar'); if(hpBar) hpBar.style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`;

        if(typeof Combat !== 'undefined' && Combat.bodyParts) {
             Combat.bodyParts.forEach((part, index) => {
                 const btn = document.getElementById(`btn-vats-${index}`);
                 if(btn) {
                     const chance = (typeof Combat.calculateHitChance === 'function') 
                        ? Combat.calculateHitChance(index) 
                        : 0;
                     
                     btn.innerHTML = `
                        <div class="pointer-events-none w-full h-full flex items-center justify-between px-4">
                            <span class="text-5xl font-bold text-gray-400 uppercase tracking-tighter drop-shadow-md">${part.name}</span>
                            <span class="font-bold ${chance > 50 ? 'text-green-400' : 'text-red-400'} text-6xl shadow-black drop-shadow-md">${chance}<span class="text-3xl align-top">%</span></span>
                        </div>
                     `;
                 }
             });
        }
    }
});
