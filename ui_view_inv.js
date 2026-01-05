Object.assign(UI, {

    renderInventory: function() {
        const list = document.getElementById('inventory-list');
        const countDisplay = document.getElementById('inv-count');
        const capsDisplay = document.getElementById('inv-caps');
        
        if(!list) return;
        
        list.innerHTML = '';
        if(capsDisplay) capsDisplay.textContent = Game.state.caps;
        
        const usedSlots = Game.getUsedSlots();
        const maxSlots = Game.getMaxSlots();
        
        if(countDisplay) {
            countDisplay.textContent = `${usedSlots} / ${maxSlots}`;
            countDisplay.className = usedSlots >= maxSlots ? "text-red-500 font-bold animate-pulse" : "text-green-500 font-mono";
        }
        
        const getIcon = (type) => {
            switch(type) {
                case 'weapon': return '🔫'; case 'body': return '🛡️'; case 'head': return '🪖';
                case 'legs': return '👖'; case 'feet': return '🥾'; case 'arms': return '🦾';
                case 'back': return '🎒'; case 'consumable': return '💉'; case 'junk': return '⚙️';
                case 'component': return '🔩'; case 'ammo': return '🧨'; case 'blueprint': return '📜'; 
                case 'tool': return '⛺'; default: return '📦';
            }
        };

        const createBtn = (itemDef, count, props, isNew, isEquipped, label, onClick) => {
            const btn = document.createElement('div');
            let cssClass = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center transition-colors group";
            
            if(onClick) cssClass += " cursor-pointer hover:bg-green-500 hover:text-black";
            else cssClass += " cursor-default opacity-80"; 
            
            btn.className = cssClass;
            
            let displayName = props && props.name ? props.name : itemDef.name;
            let extraClass = props && props.color ? props.color : "";

            btn.innerHTML = `
                <div class="text-2xl">${getIcon(itemDef.type)}</div>
                <div class="text-[10px] truncate max-w-full px-1 font-bold ${extraClass}">${displayName}</div>
                <div class="absolute top-0 right-0 bg-green-900 text-white text-[10px] px-1 font-mono">${count}</div>
            `;

            if(isEquipped) {
                const overlay = document.createElement('div');
                overlay.className = "absolute inset-0 bg-black/60 border-2 border-green-500 flex items-center justify-center text-green-500 font-bold tracking-widest text-[10px] pointer-events-none";
                overlay.textContent = label || "AUSGERÜSTET";
                btn.appendChild(overlay);
                btn.style.borderColor = "#39ff14"; 
            }
            
            if(onClick) {
                btn.onclick = (e) => {
                    e.stopPropagation(); 
                    onClick();
                };
            }
            return btn;
        };

        const cats = {
            equip: { label: "🛡️ AUSRÜSTUNG", items: [] },
            aid:   { label: "💉 HILFSMITTEL", items: [] },
            misc:  { label: "⚙️ MATERIAL", items: [] }
        };

        const equippedList = [];

        Game.state.inventory.forEach((entry, index) => {
            if(entry.count <= 0) return;
            const item = Game.items[entry.id];
            if(!item) return;

            if(entry.id === 'camp_kit' && Game.state.camp) {
                 const btn = createBtn(item, entry.count, entry.props, false, true, "AUFGESTELLT", null);
                 equippedList.push(btn); 
                 return;
            }

            const onClick = () => UI.showItemConfirm(index);
            const btn = createBtn(item, entry.count, entry.props, entry.isNew, false, null, onClick);

            if(['weapon', 'head', 'body', 'arms', 'legs', 'feet', 'back', 'tool'].includes(item.type)) {
                cats.equip.items.push(btn);
            } else if (item.type === 'consumable') {
                cats.aid.items.push(btn);
            } else {
                cats.misc.items.push(btn);
            }
        });

        let hasItems = false;
        ['equip', 'aid', 'misc'].forEach(key => {
            if(cats[key].items.length > 0) {
                hasItems = true;
                const header = document.createElement('div');
                header.className = "col-span-4 bg-green-900/40 text-green-300 text-xs font-bold px-2 py-1 mt-2 border-b border-green-700 tracking-wider flex items-center gap-2";
                header.innerHTML = cats[key].label;
                list.appendChild(header);
                cats[key].items.forEach(btn => list.appendChild(btn));
            }
        });

        const slots = ['weapon', 'head', 'body', 'arms', 'legs', 'feet', 'back'];
        slots.forEach(slot => {
            const equippedItem = Game.state.equip[slot];
            if(!equippedItem || equippedItem.name === 'Fäuste' || equippedItem.name === 'Vault-Anzug' || equippedItem.name === 'Kein Rucksack') return;

            let baseDef = Game.items[equippedItem.id];
            if(!baseDef) {
                const key = Object.keys(Game.items).find(k => Game.items[k].name === equippedItem.name);
                if(key) baseDef = Game.items[key];
            }
            if(!baseDef) return; 

            const onClick = () => UI.showEquippedDialog(slot);

            const btn = createBtn(
                baseDef, 1, 
                equippedItem.props || { name: equippedItem.name, color: equippedItem.color, bonus: equippedItem.bonus }, 
                false, true, "AUSGERÜSTET", onClick 
            );
            equippedList.push(btn);
        });

        if(equippedList.length > 0) {
            const sep = document.createElement('div');
            sep.className = "col-span-4 flex items-center justify-center text-[10px] text-green-900 font-bold tracking-widest my-2 opacity-80 mt-6";
            sep.innerHTML = "<span class='bg-black px-2 border-b border-green-900 w-full text-center'>--- AKTIV AUSGERÜSTET ---</span>";
            list.appendChild(sep);
            equippedList.forEach(b => list.appendChild(b));
        }

        if(!hasItems && equippedList.length === 0) {
            list.innerHTML = '<div class="col-span-4 text-center text-gray-500 italic mt-10">Leerer Rucksack...</div>';
        }
    },

    renderChar: function(mode = 'stats') {
        const grid = document.getElementById('stat-grid');
        const perksContainer = document.getElementById('perk-container');
        if(!grid) return; 

        const lvlDisplay = document.getElementById('char-lvl');
        if(lvlDisplay) lvlDisplay.textContent = Game.state.lvl;

        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, (Game.state.xp / nextXp) * 100);
        
        const elExp = document.getElementById('char-exp');
        const elNext = document.getElementById('char-next');
        const elBar = document.getElementById('char-exp-bar');
        
        if(elExp) elExp.textContent = Game.state.xp;
        if(elNext) elNext.textContent = nextXp;
        if(elBar) elBar.style.width = `${expPct}%`;

        const pts = Game.state.statPoints || 0;
        const ptsEl = document.getElementById('char-points');
        if(ptsEl) {
            if (pts > 0) ptsEl.innerHTML = `<span class="text-red-500 animate-pulse text-2xl font-bold bg-red-900/20 px-2 border border-red-500">${pts} VERFÜGBAR!</span>`;
            else ptsEl.textContent = pts;
        }
        
        const btnStats = document.getElementById('btn-show-stats');
        const perkBtn = document.getElementById('btn-show-perks');

        if(perkBtn) {
             const pPoints = Game.state.perkPoints || 0;
             perkBtn.innerHTML = `PERKS ${pPoints > 0 ? `<span class="bg-yellow-400 text-black px-1 ml-1 text-xs animate-pulse">${pPoints}</span>` : ''}`;
        }
        
        if(btnStats && perkBtn) {
             if(mode === 'stats') {
                 btnStats.className = "flex-1 py-2 font-bold bg-green-900/40 text-green-400 border border-green-500 transition-colors";
                 perkBtn.className = "flex-1 py-2 font-bold bg-black text-gray-500 border border-gray-700 hover:text-green-400 transition-colors ml-[-1px]";
             } else {
                 btnStats.className = "flex-1 py-2 font-bold bg-black text-gray-500 border border-gray-700 hover:text-green-400 transition-colors";
                 perkBtn.className = "flex-1 py-2 font-bold bg-green-900/40 text-green-400 border border-green-500 transition-colors ml-[-1px]";
             }
        }

        if(mode === 'stats') {
             grid.style.display = 'block';
             if(perksContainer) perksContainer.style.display = 'none';
             
             const statOrder = ['STR', 'PER', 'END', 'INT', 'AGI', 'LUC'];
             grid.innerHTML = statOrder.map(k => {
                const val = Game.getStat(k);
                const btn = Game.state.statPoints > 0 ? `<button class="w-12 h-12 border-2 border-green-500 bg-green-900/50 text-green-400 font-bold ml-2 flex items-center justify-center hover:bg-green-500 hover:text-black transition-colors" onclick="Game.upgradeStat('${k}', event)" style="font-size: 1.5rem;">+</button>` : '';
                const label = (window.GameData && window.GameData.statLabels && window.GameData.statLabels[k]) ? window.GameData.statLabels[k] : k;
                return `<div class="flex justify-between items-center border-b border-green-900/30 py-1 h-14"><span>${label}</span> <div class="flex items-center"><span class="text-yellow-400 font-bold mr-4 text-xl">${val}</span>${btn}</div></div>`;
             }).join('');

             const equipContainer = document.getElementById('dynamic-equip-list') || this.ensureEquipContainer();
             if(equipContainer) {
                equipContainer.innerHTML = '';
                const slotConfig = [
                    { key: 'weapon', label: 'WAFFE', icon: '🔫' },
                    { key: 'head', label: 'KOPF', icon: '🪖' },
                    { key: 'body', label: 'KÖRPER', icon: '🛡️' },
                    { key: 'arms', label: 'ARME', icon: '🦾' },
                    { key: 'legs', label: 'BEINE', icon: '👖' },
                    { key: 'feet', label: 'FÜSSE', icon: '🥾' },
                    { key: 'back', label: 'RUCKSACK', icon: '🎒' }
                ];
                slotConfig.forEach(slot => {
                    const item = Game.state.equip[slot.key];
                    const isEmpty = !item || (slot.key === 'back' && !item.props) || (slot.key !== 'back' && (!item.name || item.name === 'Fäuste' || item.name === 'Vault-Anzug' || item.name === 'Kein Rucksack'));
                    
                    let name = isEmpty ? "---" : (item.props ? item.props.name : item.name);
                    if(isEmpty && slot.key === 'weapon') name = "Fäuste (2 DMG)";
                    if(isEmpty && slot.key === 'body') name = "Vault-Anzug";

                    const div = document.createElement('div');
                    div.className = "border-b border-green-900/30 pb-1 mb-1 relative";
                    div.innerHTML = `
                        <div class="text-[10px] text-green-600 font-mono tracking-widest mb-0.5 flex items-center gap-1"><span>${slot.icon}</span> ${slot.label}</div>
                        <div class="flex justify-between items-center pr-10">
                            <div class="font-bold ${item && item.props && item.props.color ? item.props.color : 'text-yellow-400'} text-sm truncate">${name}</div>
                        </div>`;
                    
                    if(!isEmpty && name !== 'Fäuste' && name !== 'Vault-Anzug') {
                        const btn = document.createElement('button');
                        btn.innerHTML = "✖";
                        btn.className = "absolute right-0 top-0 h-full w-8 bg-red-900/20 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center font-bold text-lg transition-colors";
                        btn.onclick = (e) => { e.stopPropagation(); Game.unequipItem(slot.key); };
                        div.appendChild(btn);
                    }
                    equipContainer.appendChild(div);
                });
             }

        } else {
             grid.style.display = 'none';
             if(perksContainer) {
                 perksContainer.style.display = 'block';
                 this.renderPerksList(perksContainer);
             }
        }
    },

    ensureEquipContainer: function() {
        const oldRef = document.getElementById('equip-weapon-name');
        if(oldRef) {
            const container = oldRef.parentElement.parentElement.parentElement;
            container.innerHTML = '<div id="dynamic-equip-list" class="flex flex-col gap-2"></div>';
            return document.getElementById('dynamic-equip-list');
        }
        return null;
    },

    // [v0.6.0] LEVELED PERK LISTE
    renderPerksList: function(container) {
        container.innerHTML = '';
        const points = Game.state.perkPoints || 0;
        
        container.innerHTML += `
            <div class="text-center mb-4 border-b border-green-900 pb-2">
                VERFÜGBARE PUNKTE: <span class="text-yellow-400 font-bold text-xl animate-pulse">${points}</span>
            </div>`;

        if(Game.perkDefs) {
            Game.perkDefs.forEach(p => {
                const currentLvl = Game.getPerkLevel(p.id);
                const maxLvl = p.max || 1;
                const isMaxed = currentLvl >= maxLvl;
                const canAfford = points > 0 && !isMaxed;
                
                // Visual Bar [■ ■ □ □ □]
                let levelBar = '';
                for(let i=0; i<maxLvl; i++) {
                    levelBar += (i < currentLvl) ? '<span class="text-yellow-400 text-lg">■</span>' : '<span class="text-gray-700 text-lg">□</span>';
                }

                let btnHtml = '';
                if(isMaxed) {
                    btnHtml = '<span class="text-green-500 font-bold border border-green-500 px-2 py-1 text-xs bg-green-900/20">MAX</span>';
                } else if(canAfford) {
                    btnHtml = `<button class="action-button text-xs px-3 py-1 bg-yellow-900/20 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold" onclick="Game.choosePerk('${p.id}')">LERNEN (+)</button>`;
                } else {
                    btnHtml = '<span class="text-gray-600 text-xs border border-gray-800 px-2 py-1">---</span>';
                }

                const div = document.createElement('div');
                div.className = `border ${isMaxed ? 'border-yellow-900 bg-yellow-900/5' : 'border-green-900 bg-green-900/10'} p-3 mb-2 flex justify-between items-center transition-all hover:bg-green-900/20`;
                
                div.innerHTML = `
                    <div class="flex items-start gap-3 flex-1">
                        <span class="text-3xl filter drop-shadow-[0_0_5px_rgba(0,255,0,0.3)] pt-1">${p.icon}</span>
                        <div class="flex flex-col w-full pr-2">
                            <div class="flex justify-between w-full">
                                <span class="font-bold ${isMaxed ? 'text-yellow-500' : 'text-green-300'} text-lg">${p.name}</span>
                                <div class="tracking-tighter">${levelBar}</div>
                            </div>
                            <span class="text-xs text-green-500/80 leading-tight">${p.desc}</span>
                            <span class="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Stufe ${currentLvl} / ${maxLvl}</span>
                        </div>
                    </div>
                    <div class="flex flex-col justify-center pl-2 border-l border-green-900/30">
                        ${btnHtml}
                    </div>
                `;
                container.appendChild(div);
            });
        }
    }
});
