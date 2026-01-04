// [v1.6.1] - 2026-01-05 10:15am (Inventory Merge Fix)
// - Fix: Integriert StopPropagation in das bestehende Design.
// - Logic: Nutzt openItemPopup für sichere Interaktion.

Object.assign(UI, {

    renderInventory: function() {
        const list = document.getElementById('inventory-list');
        const countDisplay = document.getElementById('inv-count');
        const capsDisplay = document.getElementById('inv-caps');
        
        // Fallback falls View noch nicht geladen (HTML Struktur prüfen)
        if(!list) return;
        
        list.innerHTML = '';
        if(capsDisplay) capsDisplay.textContent = Game.state.caps;
        
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
        
        const getIcon = (type) => {
            switch(type) {
                case 'weapon': return '🔫';
                case 'body': return '🛡️';
                case 'head': return '🪖';
                case 'legs': return '👖';
                case 'feet': return '🥾';
                case 'arms': return '🦾';
                case 'back': return '🎒'; 
                case 'consumable': return '💉';
                case 'junk': return '⚙️';
                case 'component': return '🔩';
                case 'ammo': return '🧨';
                case 'blueprint': return '📜'; 
                case 'tool': return '⛺';
                default: return '📦';
            }
        };

        // --- BUTTON GENERATOR (MIT FIX) ---
        const createBtn = (itemDef, count, props, isNew, isEquipped, label, onClick) => {
            const btn = document.createElement('div');
            let cssClass = "relative border border-green-500 bg-green-900/30 w-full h-16 flex flex-col items-center justify-center transition-colors group";
            
            if(onClick) {
                cssClass += " cursor-pointer hover:bg-green-500 hover:text-black";
            } else {
                cssClass += " cursor-default opacity-80"; 
            }
            
            btn.className = cssClass;
            
            if(isNew && !isEquipped) {
                btn.style.boxShadow = "0 0 20px rgba(57, 255, 20, 1.0)"; 
                btn.style.zIndex = "10";
                btn.classList.replace('border-green-500', 'border-green-300'); 
                btn.onmouseenter = () => {
                     btn.style.boxShadow = "none";
                     btn.style.zIndex = "auto";
                     btn.classList.replace('border-green-300', 'border-green-500');
                };
            }

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
            
            // [FIX] Event Stop Propagation
            if(onClick) {
                btn.onclick = (e) => {
                    e.stopPropagation(); // WICHTIG: Verhindert Schließen des Menüs
                    onClick();
                };
            }
            
            return btn;
        };

        const unequippedList = [];
        const equippedList = [];

        // 1. INVENTORY ITEMS
        Game.state.inventory.forEach((entry, index) => {
            if(entry.count <= 0) return;
            const item = Game.items[entry.id];
            if(!item) return;

            if(entry.id === 'camp_kit' && Game.state.camp) {
                 const btn = createBtn(item, entry.count, entry.props, false, true, "AUFGESTELLT", null);
                 equippedList.push(btn); 
                 return;
            }

            // Click Action -> Öffnet neues Popup
            const onClick = () => {
                this.openItemPopup(entry, index);
            };

            const btn = createBtn(item, entry.count, entry.props, entry.isNew, false, null, onClick);
            unequippedList.push(btn);
        });

        // 2. EQUIPPED ITEMS
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

            // Click Action für Equipped -> Ablegen via Popup
            const onClick = () => {
                // Wir bauen ein temporäres Item-Objekt für das Popup
                const tempItem = { id: baseDef.id, count: 1, props: equippedItem.props };
                this.openItemPopup(tempItem, -1, slot); // -1 index signalisiert equipment, slot übergeben
            };

            const btn = createBtn(
                baseDef, 
                1, 
                equippedItem.props || { name: equippedItem.name, color: equippedItem.color, bonus: equippedItem.bonus }, 
                false, 
                true, 
                "AUSGERÜSTET", 
                onClick 
            );
            equippedList.push(btn);
        });

        unequippedList.forEach(b => list.appendChild(b));

        if(equippedList.length > 0) {
            const sep = document.createElement('div');
            sep.className = "col-span-4 flex items-center justify-center text-[10px] text-green-900 font-bold tracking-widest my-2 opacity-80";
            sep.innerHTML = "<span class='bg-black px-2 border-b border-green-900 w-full text-center'>--- AUSGERÜSTET ---</span>";
            list.appendChild(sep);
            equippedList.forEach(b => list.appendChild(b));
        }

        if(unequippedList.length === 0 && equippedList.length === 0) {
            list.innerHTML = '<div class="col-span-4 text-center text-gray-500 italic mt-10">Leerer Rucksack...</div>';
        }
    },

    // [NEU] Sicheres Popup Handling
    openItemPopup: function(item, index, equipSlot = null) {
        const def = Game.items[item.id];
        if(!def) return;

        const name = item.props && item.props.name ? item.props.name : def.name;
        const desc = item.props && item.props.desc ? item.props.desc : (def.desc || "Keine Beschreibung.");
        
        let actionsHtml = '';
        
        // Logik: Ist es ausgerüstet (equipSlot gesetzt) oder im Inventar (index >= 0)?
        if (equipSlot) {
            // Ablegen Button
            actionsHtml += `
                <button onclick="Game.unequipItem('${equipSlot}'); UI.closeDialog(); event.stopPropagation();" 
                    class="w-full border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black py-2 mb-2 font-bold tracking-widest transition-colors">
                    ABLEGEN
                </button>`;
        } else if (index >= 0) {
            // Inventar Aktionen
            if (def.type === 'consumable' || def.type === 'blueprint' || def.id === 'camp_kit') {
                actionsHtml += `
                    <button onclick="Game.useItem(${index}); UI.closeDialog(); event.stopPropagation();" 
                        class="w-full border border-green-500 text-green-500 hover:bg-green-500 hover:text-black py-2 mb-2 font-bold tracking-widest transition-colors">
                        BENUTZEN
                    </button>`;
            } else if (['weapon','body','head','legs','feet','arms','back'].includes(def.type)) {
                actionsHtml += `
                    <button onclick="Game.useItem(${index}); UI.closeDialog(); event.stopPropagation();" 
                        class="w-full border border-green-500 text-green-500 hover:bg-green-500 hover:text-black py-2 mb-2 font-bold tracking-widest transition-colors">
                        AUSRÜSTEN
                    </button>`;
            }

            // Wegwerfen / Zerlegen
            actionsHtml += `
                <button onclick="Game.destroyItem(${index}); UI.closeDialog(); event.stopPropagation();" 
                    class="w-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-black py-2 mb-2 font-bold tracking-widest transition-colors text-xs">
                    WEGWERFEN
                </button>
            `;
        }

        // Abbruch Button (Sicher!)
        actionsHtml += `
            <button onclick="UI.closeDialog(); event.stopPropagation();" 
                class="w-full border border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300 py-2 font-bold text-xs mt-2">
                ABBRUCH
            </button>
        `;

        // Stats Display
        let statsHtml = '';
        if(def.val) statsHtml += `<div class="flex justify-between"><span>WERT:</span> <span class="text-yellow-400">${def.cost || 0} KK</span></div>`;
        if(def.dmg) statsHtml += `<div class="flex justify-between"><span>DMG:</span> <span class="text-red-400">${def.dmg}</span></div>`;
        if(def.def) statsHtml += `<div class="flex justify-between"><span>SCHUTZ:</span> <span class="text-blue-400">${def.def}</span></div>`;
        if(def.rad) statsHtml += `<div class="flex justify-between"><span>RADS:</span> <span class="text-red-500">${def.rad}</span></div>`;

        const html = `
            <div class="bg-black border-2 border-green-500 p-6 max-w-sm w-full shadow-[0_0_50px_rgba(0,255,0,0.2)] relative" onclick="event.stopPropagation()">
                <h3 class="text-2xl font-bold text-green-400 mb-1 border-b border-green-900 pb-2">${name}</h3>
                <div class="text-sm text-gray-400 italic mb-4">${def.type.toUpperCase()}</div>
                
                <p class="text-green-300 text-sm leading-relaxed mb-4 min-h-[3rem]">${desc}</p>
                
                <div class="bg-green-900/20 p-3 mb-4 text-xs font-mono text-green-200 space-y-1 border border-green-900">
                    ${statsHtml}
                    <div class="flex justify-between border-t border-green-900 pt-1 mt-1"><span>GEWICHT:</span> <span>${def.weight || 0.5}</span></div>
                </div>

                <div class="flex flex-col">
                    ${actionsHtml}
                </div>
            </div>
        `;

        // Öffnen
        if(UI.els.dialog) {
            UI.els.dialog.innerHTML = html;
            UI.els.dialog.style.display = 'flex';
        }
    },

    // Helper zum Schließen
    closeDialog: function() {
        const d = document.getElementById('dialog-overlay');
        if(d) {
            d.style.display = 'none';
            d.innerHTML = '';
        }
    },

    // Render Char bleibt unverändert (Code aus deiner Vorlage)
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
        container.innerHTML += `<div class="text-center mb-4">VERFÜGBARE PUNKTE: <span class="text-yellow-400 font-bold text-xl">${points}</span></div>`;

        if(Game.perkDefs) {
            Game.perkDefs.forEach(p => {
                const hasPerk = Game.state.perks && Game.state.perks.includes(p.id);
                const canAfford = points > 0 && !hasPerk;
                let btnHtml = '';
                if(hasPerk) btnHtml = '<span class="text-green-500 font-bold border border-green-500 px-2 py-1 text-xs">GELERNT</span>';
                else if(canAfford) btnHtml = `<button class="action-button text-xs px-2 py-1" onclick=\"Game.choosePerk('${p.id}')\">LERNEN</button>`;
                else btnHtml = '<span class="text-gray-600 text-xs">---</span>';

                const div = document.createElement('div');
                div.className = `border border-green-900 bg-green-900/10 p-2 mb-2 flex justify-between items-center ${hasPerk ? 'opacity-70' : ''}`;
                div.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${p.icon}</span>
                        <div class=\"flex flex-col\">
                            <span class=\"font-bold ${hasPerk ? 'text-green-300' : 'text-white'}\">${p.name}</span>
                            <span class=\"text-xs text-green-500\">${p.desc}</span>
                        </div>
                    </div>
                    <div>${btnHtml}</div>
                `;
                container.appendChild(div);
            });
        }
    }
});
