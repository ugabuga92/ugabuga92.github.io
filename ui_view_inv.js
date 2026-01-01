// [v2.3] - 2026-01-01 16:20pm (UI Update) - Added Slot Counter (Used/Max) - Removed duplicate Ammo display - Added Backpack Slot to Char View
Object.assign(UI, {

    renderInventory: function() {
        const list = document.getElementById('inventory-list');
        const countDisplay = document.getElementById('inv-count');
        const capsDisplay = document.getElementById('inv-caps');
        
        if(!list || !Game.state.inventory) return;
        
        list.innerHTML = '';
        capsDisplay.textContent = Game.state.caps;
        
        // --- NEU: Slot Anzeige statt reiner Item-Zahl ---
        const usedSlots = Game.getUsedSlots();
        const maxSlots = Game.getMaxSlots();
        
        if(countDisplay) {
            countDisplay.textContent = `${usedSlots} / ${maxSlots}`;
            if(usedSlots >= maxSlots) {
                countDisplay.className = "text-red-500 font-bold animate-pulse";
            } else {
                countDisplay.className = "text-green-500 font-mono";
            }
        }
        
        // Icons Mapping
        const getIcon = (type) => {
            switch(type) {
                case 'weapon': return '🔫';
                case 'body': return '🛡️';
                case 'back': return '🎒'; // Icon für Rucksäcke
                case 'consumable': return '💉';
                case 'junk': return '⚙️';
                case 'ammo': return '🧨';
                case 'blueprint': return '📜'; 
                case 'tool': return '⛺';
                default: return '📦';
            }
        };

        // Render Grid
        Game.state.inventory.forEach((entry, index) => {
            if(entry.count <= 0) return;
            
            const item = Game.items[entry.id];
            if(!item) return;

            const btn = document.createElement('div');
            btn.className = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center cursor-pointer hover:bg-green-500 hover:text-black transition-colors group";
            
            // New Item Glow
            if(entry.isNew) {
                btn.style.boxShadow = "0 0 20px rgba(57, 255, 20, 1.0)"; 
                btn.style.zIndex = "10";
                btn.classList.replace('border-green-500', 'border-green-300'); 
                btn.onmouseenter = () => {
                    if(entry.isNew) {
                        entry.isNew = false;
                        btn.style.boxShadow = "none";
                        btn.style.zIndex = "auto";
                        btn.classList.replace('border-green-300', 'border-green-500');
                    }
                };
            }

            let displayName = item.name;
            let extraClass = "";

            if(entry.props) {
                displayName = entry.props.name;
                if(entry.props.color) {
                    extraClass = entry.props.color;
                }
            }

            btn.innerHTML = `
                <div class="text-2xl">${getIcon(item.type)}</div>
                <div class="text-[10px] truncate max-w-full px-1 font-bold ${extraClass}">${displayName}</div>
                <div class="absolute top-0 right-0 bg-green-900 text-white text-[10px] px-1 font-mono">${entry.count}</div>
            `;
            
            // Overlay: Equipped
            let isEquipped = false;
            let label = "AUSGERÜSTET";
            
            // Check Weapons/Armor/Backpack
            if(Game.state.equip.weapon && Game.state.equip.weapon.name === displayName) isEquipped = true;
            if(Game.state.equip.body && Game.state.equip.body.name === displayName) isEquipped = true;
            if(Game.state.equip.back && Game.state.equip.back.name === displayName) isEquipped = true;
            
            if(entry.id === 'camp_kit' && Game.state.camp) { isEquipped = true; label = "AUFGESTELLT"; }

            if(isEquipped) {
                const overlay = document.createElement('div');
                overlay.className = "absolute inset-0 bg-black/60 border-2 border-green-500 flex items-center justify-center text-green-500 font-bold tracking-widest text-[10px] pointer-events-none";
                overlay.textContent = label;
                btn.appendChild(overlay);
                btn.style.borderColor = "#39ff14"; 
            }
            
            btn.onclick = () => { UI.showItemConfirm(index); };
            list.appendChild(btn);
        });
        
        if(Game.state.inventory.length === 0) list.innerHTML = '<div class="col-span-4 text-center text-gray-500 italic mt-10">Leerer Rucksack...</div>';
    },

    renderChar: function(mode = 'stats') {
        const grid = document.getElementById('stat-grid');
        const perksContainer = document.getElementById('perk-container');
        if(!grid) return; 

        // Update Header Info
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

        // Points
        const pts = Game.state.statPoints || 0;
        const ptsEl = document.getElementById('char-points');
        if(ptsEl) {
            if (pts > 0) ptsEl.innerHTML = `<span class="text-red-500 animate-pulse text-2xl font-bold bg-red-900/20 px-2 border border-red-500">${pts} VERFÜGBAR!</span>`;
            else ptsEl.textContent = pts;
        }
        
        // Equipment Info & Unequip Logic
        const wpn = Game.state.equip.weapon || {name: "Fäuste", baseDmg: 2};
        const arm = Game.state.equip.body || {name: "Vault-Anzug", bonus: {END: 1}};
        const back = Game.state.equip.back || {name: "Kein Rucksack", props: {slots: 0}};
        
        const elWpnName = document.getElementById('equip-weapon-name');
        const elWpnStats = document.getElementById('equip-weapon-stats');
        const elArmName = document.getElementById('equip-body-name');
        const elArmStats = document.getElementById('equip-body-stats');
        
        // --- NEU: Rucksack Slot im Char Screen ---
        // (Falls du das HTML nicht anpasst, nutzen wir hier eine generische Injection oder gehen davon aus, dass du es noch einbaust.
        // Um sicherzugehen, hänge ich den Rucksack Info-Block dynamisch an, falls er im HTML fehlt)
        
        let elBackContainer = document.getElementById('equip-back-container');
        if(!elBackContainer) {
            // Create container dynamically if missing in HTML
            const parent = elArmName ? elArmName.parentElement.parentElement : null; // Try to find parent stats container
            if(parent) {
                elBackContainer = document.createElement('div');
                elBackContainer.id = 'equip-back-container';
                elBackContainer.className = "mb-2 border-b border-green-900/30 pb-2";
                elBackContainer.innerHTML = `
                    <div class="text-xs text-green-500 mb-1">RUCKSACK</div>
                    <div class="flex justify-between items-center">
                        <span id="equip-back-name" class="font-bold text-yellow-400">...</span>
                        <span id="equip-back-stats" class="text-xs font-mono"></span>
                    </div>
                `;
                parent.appendChild(elBackContainer);
            }
        }

        const elBackName = document.getElementById('equip-back-name');
        const elBackStats = document.getElementById('equip-back-stats');

        // Render Weapon
        if(elWpnName) {
            elWpnName.textContent = wpn.props ? wpn.props.name : wpn.name;
            const existingBtn = document.getElementById('btn-unequip-weapon');
            if(existingBtn) existingBtn.remove();
            
            if(wpn.name !== "Fäuste") {
                const btn = document.createElement('button');
                btn.id = 'btn-unequip-weapon';
                btn.innerHTML = "&#10006;";
                btn.title = "Waffe ablegen";
                btn.className = "ml-2 text-red-500 hover:text-white font-bold bg-black border border-red-900 px-1 rounded text-xs";
                btn.onclick = (e) => { e.stopPropagation(); Game.unequipItem('weapon'); };
                elWpnName.appendChild(btn);
            }
        }
        if(elWpnStats) {
            let dmg = wpn.baseDmg;
            if(wpn.props && wpn.props.dmgMult) dmg = Math.floor(dmg * wpn.props.dmgMult);
            let wpnStats = `DMG: ${dmg}`;
            if(wpn.bonus) { for(let s in wpn.bonus) wpnStats += ` ${s}:${wpn.bonus[s]}`; }
            elWpnStats.textContent = wpnStats;
        }

        // Render Armor
        if(elArmName) {
            elArmName.textContent = arm.props ? arm.props.name : arm.name;
            const existingBtn = document.getElementById('btn-unequip-body');
            if(existingBtn) existingBtn.remove();
            
            if(arm.name !== "Vault-Anzug") {
                const btn = document.createElement('button');
                btn.id = 'btn-unequip-body';
                btn.innerHTML = "&#10006;";
                btn.title = "Rüstung ablegen";
                btn.className = "ml-2 text-red-500 hover:text-white font-bold bg-black border border-red-900 px-1 rounded text-xs";
                btn.onclick = (e) => { e.stopPropagation(); Game.unequipItem('body'); };
                elArmName.appendChild(btn);
            }
        }
        if(elArmStats) {
            let armStats = "";
            if(arm.bonus) { for(let s in arm.bonus) armStats += `${s}:${arm.bonus[s]} `; }
            elArmStats.textContent = armStats || "Kein Bonus";
        }

        // Render Backpack
        if(elBackName) {
            elBackName.textContent = back.name;
            const existingBtn = document.getElementById('btn-unequip-back');
            if(existingBtn) existingBtn.remove();
            
            if(back.name !== "Kein Rucksack") {
                const btn = document.createElement('button');
                btn.id = 'btn-unequip-back';
                btn.innerHTML = "&#10006;";
                btn.title = "Rucksack ablegen";
                btn.className = "ml-2 text-red-500 hover:text-white font-bold bg-black border border-red-900 px-1 rounded text-xs";
                btn.onclick = (e) => { e.stopPropagation(); Game.unequipItem('back'); };
                elBackName.appendChild(btn);
            }
        }
        if(elBackStats) {
            elBackStats.textContent = back.props && back.props.slots ? `+${back.props.slots} SLOTS` : "";
        }
        
        // Perks Button
        const perkPoints = Game.state.perkPoints || 0;
        const perkBtn = document.getElementById('btn-show-perks');
        if(perkBtn) {
             perkBtn.innerHTML = `PERKS ${perkPoints > 0 ? `<span class="bg-yellow-400 text-black px-1 ml-1 text-xs animate-pulse">${perkPoints}</span>` : ''}`;
        }
        
        // Tab Switch Logic
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
        container.innerHTML += `<div class="text-center mb-4">VERFÜGBARE PUNKTE: <span class="text-yellow-400 font-bold text-xl">${points}</span></div>`;

        if(Game.perkDefs) {
            Game.perkDefs.forEach(p => {
                const hasPerk = Game.state.perks && Game.state.perks.includes(p.id);
                const canAfford = points > 0 && !hasPerk;
                let btnHtml = '';
                if(hasPerk) btnHtml = '<span class="text-green-500 font-bold border border-green-500 px-2 py-1 text-xs">GELERNT</span>';
                else if(canAfford) btnHtml = `<button class="action-button text-xs px-2 py-1" onclick="Game.choosePerk('${p.id}')">LERNEN</button>`;
                else btnHtml = '<span class="text-gray-600 text-xs">---</span>';

                const div = document.createElement('div');
                div.className = `border border-green-900 bg-green-900/10 p-2 mb-2 flex justify-between items-center ${hasPerk ? 'opacity-70' : ''}`;
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${p.icon}</span>
                        <div class="flex flex-col">
                            <span class="font-bold ${hasPerk ? 'text-green-300' : 'text-white'}">${p.name}</span>
                            <span class="text-xs text-green-500">${p.desc}</span>
                        </div>
                    </div>
                    <div>${btnHtml}</div>
                `;
                container.appendChild(div);
            });
        }
    }
});
