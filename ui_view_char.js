// [v2.0.0] - 2026-01-05 01:05pm (Character UI New)
Object.assign(UI, {
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
        
        const charView = document.getElementById('view-char');
        let equipContainer = document.getElementById('dynamic-equip-list');
        
        if(!equipContainer) {
            const oldRef = document.getElementById('equip-weapon-name');
            if(oldRef) {
                const oldContainer = oldRef.parentElement.parentElement.parentElement; 
                oldContainer.innerHTML = '<div id="dynamic-equip-list" class="flex flex-col gap-2"></div>';
                equipContainer = document.getElementById('dynamic-equip-list');
            }
        }

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
                
                let name = "---";
                let statsText = "";
                let canUnequip = false;

                if(item) {
                    name = item.props ? item.props.name : item.name;
                    if(slot.key === 'weapon') {
                        let dmg = item.baseDmg || 0;
                        if(item.props && item.props.dmgMult) dmg = Math.floor(dmg * item.props.dmgMult);
                        statsText = `DMG: ${dmg}`;
                    } else if (slot.key === 'back') {
                        if(item.props && item.props.slots) statsText = `+${item.props.slots} Slots`;
                    } else {
                        let bonus = item.bonus || (item.props ? item.props.bonus : {});
                        if(bonus) {
                             statsText = Object.entries(bonus).map(([k,v]) => `${k}:${v}`).join(' ');
                        }
                    }
                    if(item.name !== 'Fäuste' && item.name !== 'Vault-Anzug' && item.name !== 'Kein Rucksack') {
                        canUnequip = true;
                    }
                }

                if(isEmpty) {
                    if(slot.key === 'weapon') name = "Fäuste (2 DMG)";
                    if(slot.key === 'body') name = "Vault-Anzug";
                }

                const div = document.createElement('div');
                div.className = "border-b border-green-900/30 pb-1 mb-1 relative"; 
                div.innerHTML = `
                    <div class="text-[10px] text-green-600 font-mono tracking-widest mb-0.5 flex items-center gap-1">
                        <span>${slot.icon}</span> ${slot.label}
                    </div>
                    <div class="flex justify-between items-center pr-10"> 
                        <div class="font-bold ${item && item.props && item.props.color ? item.props.color : 'text-yellow-400'} text-sm truncate">${name}</div>
                        <div class="text-xs font-mono text-green-400 text-right whitespace-nowrap">${statsText}</div>
                    </div>
                `;
                
                if(canUnequip) {
                    const btn = document.createElement('button');
                    btn.innerHTML = "✖"; 
                    btn.className = "absolute right-0 top-0 h-full w-8 bg-red-900/20 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center font-bold text-lg transition-colors";
                    btn.onclick = (e) => { e.stopPropagation(); Game.unequipItem(slot.key); };
                    div.appendChild(btn);
                }

                equipContainer.appendChild(div);
            });
        }

        const perkPoints = Game.state.perkPoints || 0;
        const perkBtn = document.getElementById('btn-show-perks');
        if(perkBtn) {
             perkBtn.innerHTML = `PERKS ${perkPoints > 0 ? `<span class="bg-yellow-400 text-black px-1 ml-1 text-xs animate-pulse">${perkPoints}</span>` : ''}`;
        }
        
        const btnStats = document.getElementById('btn-show-stats');
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
                const label = (typeof window.GameData !== 'undefined' && window.GameData.statLabels && window.GameData.statLabels[k]) ? window.GameData.statLabels[k] : k;
                return `<div class="flex justify-between items-center border-b border-green-900/30 py-1 h-14"><span>${label}</span> <div class="flex items-center"><span class="text-yellow-400 font-bold mr-4 text-xl">${val}</span>${btn}</div></div>`;
             }).join('');

        } else {
             grid.style.display = 'none';
             if(perksContainer) {
                 perksContainer.style.display = 'block';
                 this.renderPerksList(perksContainer);
             }
        }
    },

    renderPerksList: function(container) {
        if(!container) return;
        container.innerHTML = '';
        const points = Game.state.perkPoints || 0;
        container.innerHTML += `<div class="text-center mb-4 border-b border-green-900 pb-2">VERFÜGBARE PUNKTE: <span class="text-yellow-400 font-bold text-xl">${points}</span></div>`;

        if(Game.perkDefs) {
            Game.perkDefs.forEach(p => {
                const currentRank = Game.getPerkRank(p.id);
                const maxRank = p.maxRank || 1;
                const isMaxed = currentRank >= maxRank;
                const canAfford = points > 0 && !isMaxed;
                
                // Stars logic
                let stars = '';
                for(let i=0; i<maxRank; i++) {
                    if(i < currentRank) stars += '<span class="text-yellow-400">★</span>';
                    else stars += '<span class="text-gray-700">☆</span>';
                }

                // Description based on rank
                const descRank = isMaxed ? currentRank : currentRank + 1;
                const descText = typeof p.desc === 'function' ? p.desc(descRank) : p.desc;

                let btnHtml = '';
                if(isMaxed) {
                    btnHtml = '<span class="text-green-500 font-bold border border-green-500 px-2 py-1 text-xs bg-green-900/20">MAX</span>';
                } else if(canAfford) {
                    const label = currentRank === 0 ? "LERNEN" : "UPGRADE";
                    btnHtml = `<button class="border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold text-xs px-2 py-1 transition-colors" onclick=\"Game.choosePerk('${p.id}')\">${label}</button>`;
                } else {
                    btnHtml = '<span class="text-gray-600 text-xs border border-gray-700 px-2 py-1">---</span>';
                }

                const div = document.createElement('div');
                div.className = `border border-green-900 bg-green-900/5 p-3 mb-2 flex justify-between items-center ${isMaxed ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`;
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">${p.icon}</span>
                        <div class="flex flex-col">
                            <div class="flex items-center gap-2">
                                <span class="font-bold ${currentRank > 0 ? 'text-green-300' : 'text-gray-400'}">${p.name}</span>
                                <span class="text-xs tracking-tighter">${stars}</span>
                            </div>
                            <span class="text-xs text-green-600 italic mt-1 max-w-[180px]">${descText}</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        ${btnHtml}
                        <span class="text-[10px] text-gray-500">Rang ${currentRank}/${maxRank}</span>
                    </div>
                `;
                container.appendChild(div);
            });
        }
    }
});
