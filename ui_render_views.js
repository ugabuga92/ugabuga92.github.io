Object.assign(UI, {

    // ==========================================
    // === CHARAKTER & STATS MENU (NEU) ===
    // ==========================================
    renderStats: function(tab = 'stats') {
        Game.state.view = 'stats';
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = '';

        // 1. Wrapper (Absolut Fullscreen wie Shop)
        const wrapper = document.createElement('div');
        wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black z-20 overflow-hidden";

        // 2. Tab Navigation (Fixiert oben)
        const getTabClass = (t) => {
            return (tab === t) 
                ? "bg-green-500 text-black border-b-4 border-green-700 font-bold shadow-[0_0_15px_#39ff14]" 
                : "bg-[#001100] text-green-600 border-b border-green-900 hover:text-green-400 hover:bg-green-900/30";
        };

        const header = document.createElement('div');
        header.className = "flex-shrink-0 flex w-full border-b-2 border-green-900 bg-black z-30";
        header.innerHTML = `
            <button onclick="UI.renderStats('stats')" class="flex-1 py-3 transition-all uppercase tracking-widest font-vt323 text-xl ${getTabClass('stats')}">
                STATUS
            </button>
            <button onclick="UI.renderStats('special')" class="flex-1 py-3 transition-all uppercase tracking-widest font-vt323 text-xl ${getTabClass('special')}">
                S.P.E.C.I.A.L.
            </button>
            <button onclick="UI.renderStats('perks')" class="flex-1 py-3 transition-all uppercase tracking-widest font-vt323 text-xl ${getTabClass('perks')}">
                PERKS
            </button>
        `;
        wrapper.appendChild(header);

        // 3. Scrollbarer Inhalt
        const content = document.createElement('div');
        content.className = "flex-1 w-full overflow-y-auto custom-scroll p-4 pb-24 bg-[radial-gradient(circle_at_center,_#0a1a0a_0%,_#000000_100%)]";
        
        // Inhalt basierend auf Tab
        if (tab === 'stats') {
            this.renderCharacterVisuals(content);
        } else if (tab === 'special') {
            this.renderSpecialStats(content);
        } else if (tab === 'perks') {
            this.renderPerksList(content);
        }

        wrapper.appendChild(content);

        // 4. Footer (Fixiert unten)
        const footer = document.createElement('div');
        footer.className = "absolute bottom-0 left-0 w-full p-3 bg-black border-t-2 border-green-900 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.9)]";
        footer.innerHTML = `
            <button class="action-button w-full border-2 border-green-600 text-green-500 py-3 font-bold text-xl hover:bg-green-900/50 hover:text-green-200 transition-all uppercase tracking-[0.15em]" onclick="UI.switchView('map')">
                <span class="mr-2">📺</span> ZURÜCK ZUR KARTE (TAB)
            </button>
        `;
        wrapper.appendChild(footer);

        view.appendChild(wrapper);
    },

    // UNTERFUNKTION: Das "Paper Doll" Layout (Die Visualisierung)
    renderCharacterVisuals: function(container) {
        const p = Game.state;
        const eq = p.equip;

        // Helper für Slot-Darstellung
        const renderSlot = (slotName, item, iconFallback) => {
            const hasItem = !!item;
            const name = hasItem ? (item.props && item.props.name ? item.props.name : item.name) : "LEER";
            const style = hasItem ? "border-green-500 bg-green-900/20 text-green-300 shadow-[0_0_10px_rgba(57,255,20,0.2)]" : "border-green-900/50 text-green-900 bg-black";
            
            return `
                <div class="flex flex-col items-center justify-center p-2 border-2 ${style} rounded min-h-[80px] transition-all relative group cursor-pointer" onclick="UI.openEquipMenu('${slotName}')">
                    <div class="text-xs uppercase tracking-widest opacity-50 mb-1">${slotName}</div>
                    <div class="text-2xl mb-1">${hasItem && item.icon ? item.icon : iconFallback}</div>
                    <div class="text-[10px] text-center font-bold uppercase leading-tight max-w-full overflow-hidden text-ellipsis">${name}</div>
                    ${hasItem ? '<div class="absolute top-1 right-1 text-[8px] text-red-500 opacity-0 group-hover:opacity-100">ABLEGEN</div>' : ''}
                </div>
            `;
        };

        container.innerHTML = `
            <div class="flex flex-col items-center gap-6">
                
                <div class="w-full text-center border-b border-green-900 pb-4">
                    <div class="text-4xl font-bold text-green-400 mb-1">${p.playerName}</div>
                    <div class="flex justify-center gap-4 text-xs font-mono text-green-600">
                        <span>LEVEL ${p.lvl}</span>
                        <span>XP: ${p.xp} / ${Game.expToNextLevel(p.lvl)}</span>
                        <span>HP: ${p.hp}/${p.maxHp}</span>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4 w-full max-w-md mx-auto relative">
                    
                    <div class="col-start-2">
                        ${renderSlot('head', eq.head, '🧢')}
                    </div>

                    <div class="col-start-1 row-start-2">
                        ${renderSlot('weapon', eq.weapon, '👊')}
                    </div>

                    <div class="col-start-2 row-start-2">
                        ${renderSlot('body', eq.body, '👕')}
                    </div>

                    <div class="col-start-3 row-start-2">
                        ${renderSlot('arms', eq.arms, '💪')}
                    </div>

                    <div class="col-start-2 row-start-3">
                        ${renderSlot('legs', eq.legs, '👖')}
                    </div>

                    <div class="col-start-2 row-start-4">
                        ${renderSlot('feet', eq.feet, '🥾')}
                    </div>

                    <div class="col-start-3 row-start-3">
                        ${renderSlot('back', eq.back, '🎒')}
                    </div>
                </div>

                <div class="w-full mt-6 grid grid-cols-2 gap-4 text-sm bg-green-900/10 p-4 rounded border border-green-900">
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span>RÜSTUNG (DEF)</span>
                        <span class="font-bold text-green-400">${Game.getStat('DEF') || 0}</span>
                    </div>
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span>SCHADEN (DMG)</span>
                        <span class="font-bold text-green-400">${eq.weapon ? (eq.weapon.baseDmg || 2) : 2}</span>
                    </div>
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span>CRIT CHANCE</span>
                        <span class="font-bold text-green-400">${p.critChance || 5}%</span>
                    </div>
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span>TRAGEKRAFT</span>
                        <span class="font-bold text-green-400">${Game.getMaxSlots()} Slots</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderSpecialStats: function(container) {
        const stats = Game.state.stats;
        const points = Game.state.statPoints;
        
        let html = `
            <div class="text-center mb-6">
                <div class="text-xs text-green-600 uppercase tracking-widest mb-2">VERFÜGBARE PUNKTE</div>
                <div class="text-4xl font-bold ${points > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-600'}">${points}</div>
            </div>
            <div class="space-y-3 max-w-md mx-auto">
        `;

        const labels = {
            STR: "STÄRKE (Nahkampf, Tragekraft)",
            PER: "WAHRNEHMUNG (Trefferchance, Loot)",
            END: "AUSDAUER (Lebenspunkte, Resistenz)",
            INT: "INTELLIGENZ (Hacken, XP-Bonus)",
            AGI: "BEWEGLICHKEIT (Ausweichen, AP)",
            LUC: "GLÜCK (Kritische Treffer)"
        };

        for (let key in stats) {
            const val = stats[key];
            const canAdd = points > 0 && val < 10;
            
            html += `
                <div class="flex items-center justify-between bg-black/40 p-3 border border-green-900 hover:border-green-500 transition-colors">
                    <div class="flex flex-col">
                        <span class="text-2xl font-bold text-green-400 font-vt323 w-12">${key}</span>
                        <span class="text-[10px] text-green-700 uppercase">${labels[key]}</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-3xl font-bold text-white">${val}</span>
                        ${canAdd ? `<button onclick="Game.addStat('${key}')" class="w-10 h-10 flex items-center justify-center bg-green-900 text-green-400 border border-green-500 hover:bg-green-400 hover:text-black font-bold text-xl rounded">+</button>` : ''}
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    renderPerksList: function(container) {
        const perks = Game.perkDefs || [];
        const myPerks = Game.state.perks || {};
        const points = Game.state.perkPoints || 0;

        let html = `
            <div class="text-center mb-6">
                <div class="text-xs text-green-600 uppercase tracking-widest mb-2">VERFÜGBARE PERK-PUNKTE</div>
                <div class="text-4xl font-bold ${points > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-600'}">${points}</div>
            </div>
            <div class="grid grid-cols-1 gap-3">
        `;

        perks.forEach(p => {
            const currentLvl = myPerks[p.id] || 0;
            const maxed = currentLvl >= p.maxLvl;
            const canBuy = points > 0 && !maxed && Game.state.lvl >= p.reqLvl;
            
            let btnState = "";
            let btnClass = "border-gray-800 text-gray-600 cursor-not-allowed";
            let btnText = "LOCKED";

            if (maxed) {
                btnClass = "border-green-800 text-green-800 bg-green-900/20";
                btnText = "MAX";
            } else if (canBuy) {
                btnClass = "border-yellow-500 text-yellow-400 hover:bg-yellow-400 hover:text-black cursor-pointer animate-pulse";
                btnText = "LERNEN";
                btnState = `onclick="Game.learnPerk('${p.id}')"`;
            } else if (Game.state.lvl < p.reqLvl) {
                 btnText = `LVL ${p.reqLvl}`;
            }

            html += `
                <div class="flex flex-col p-3 border ${currentLvl > 0 ? 'border-green-600 bg-green-900/10' : 'border-green-900/30 bg-black'} transition-all">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="font-bold text-lg ${currentLvl > 0 ? 'text-green-300' : 'text-gray-400'}">${p.name}</div>
                            <div class="text-xs text-green-700">Rang: ${currentLvl} / ${p.maxLvl}</div>
                        </div>
                        <button class="px-3 py-1 border text-xs font-bold uppercase transition-colors ${btnClass}" ${btnState}>
                            ${btnText}
                        </button>
                    </div>
                    <div class="text-sm text-gray-500 leading-tight">${p.desc}</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    // ==========================================
    // === DEIN BESTEHENDER CODE ===
    // ==========================================
    renderCharacterSelection: function(saves) {
        this.charSelectMode = true;
        this.currentSaves = saves;
        
        // Screens umschalten
        if(this.els.loginScreen) this.els.loginScreen.style.display = 'none';
        if(this.els.charSelectScreen) this.els.charSelectScreen.style.display = 'flex';
        
        // Slots leeren
        if(this.els.charSlotsList) this.els.charSlotsList.innerHTML = '';

        // ZURÜCK-BUTTON LOGIK
        const btnBack = document.getElementById('btn-char-back');
        if (btnBack) {
            btnBack.onclick = () => {
                this.charSelectMode = false;
                if(this.els.charSelectScreen) this.els.charSelectScreen.style.display = 'none';
                if(this.els.loginScreen) {
                    this.els.loginScreen.style.display = 'flex'; 
                }
            };
        }

        // Slots rendern
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            // Basis-Style: 'group' ist wichtig für den Hover-Effekt auf den Button
            slot.className = "char-slot border-2 border-green-900 bg-black/80 p-4 mb-2 cursor-pointer hover:border-yellow-400 transition-all flex justify-between items-center group relative overflow-hidden";
            slot.dataset.index = i;
            
            const save = saves[i];
            
            if (save) {
                const name = save.playerName || "UNBEKANNT";
                const lvl = save.lvl || 1;
                const loc = save.sector ? `[${save.sector.x},${save.sector.y}]` : "[?,?]";
                
                const isDead = (save.hp !== undefined && save.hp <= 0);
                const statusIcon = isDead ? "💀" : "👤";
                const statusClass = isDead ? "text-red-500" : "text-yellow-400";

                /* ÄNDERUNGEN HIER:
                   1. Button hat jetzt 'group-hover:...' Klassen. Das bedeutet:
                      Wenn man über den Slot (group) fährt, ändert sich der Button.
                   2. Das Hintergrund-Div (overlay), das das Bild abgedunkelt hat, wurde entfernt.
                */
                slot.innerHTML = `
                    <div class="flex flex-col z-10">
                        <span class="text-xl ${statusClass} font-bold tracking-wider">${statusIcon} ${name}</span>
                        <span class="text-xs text-green-300 font-mono">Level ${lvl} | Sektor ${loc}</span>
                    </div>
                    <div class="z-10 flex items-center gap-2">
                        <div class="text-xs text-gray-500 font-bold mr-2">SLOT ${i+1}</div>
                        <button class="bg-green-700 text-black font-bold px-4 py-1 text-xs rounded transition-all duration-200 shadow-[0_0_5px_#1b5e20] 
                                       group-hover:bg-[#39ff14] group-hover:shadow-[0_0_20px_#39ff14] group-hover:scale-110">
                            START ▶
                        </button>
                    </div>
                `;
            } else {
                // LEERER SLOT
                slot.className = "char-slot border-2 border-dashed border-gray-700 bg-black/50 p-4 mb-2 cursor-pointer hover:border-yellow-400 hover:bg-yellow-900/10 transition-all flex justify-center items-center group min-h-[80px]";
                slot.innerHTML = `
                    <div class="text-gray-500 group-hover:text-yellow-400 font-bold tracking-widest flex items-center gap-2 transition-colors">
                        <span class="text-3xl">+</span> NEUEN CHARAKTER ERSTELLEN
                    </div>
                `;
            }
            
            slot.onclick = () => {
                if(typeof this.selectSlot === 'function') {
                    this.selectSlot(i);
                }
            };
            
            if(this.els.charSlotsList) this.els.charSlotsList.appendChild(slot);
        }
        
        if(typeof this.selectSlot === 'function') {
            this.selectSlot(0);
        }
    },

    renderSpawnList: function(players) {
        if(!this.els.spawnList) return;
        this.els.spawnList.innerHTML = '';
        
        if(!players || Object.keys(players).length === 0) {
            this.els.spawnList.innerHTML = '<div class="text-gray-500 italic p-2">Keine Signale gefunden...</div>';
            return;
        }
        
        for(let pid in players) {
            const p = players[pid];
            const btn = document.createElement('button');
            btn.className = "action-button w-full mb-2 text-left text-xs border-green-800 hover:border-green-500 text-green-400 p-2";
            
            const sectorStr = p.sector ? `[${p.sector.x},${p.sector.y}]` : "[?,?]";
            
            btn.innerHTML = `
                <div class="font-bold">SIGNAL: ${p.name}</div>
                <div class="text-[10px] text-gray-400 float-right mt-[-1rem]">${sectorStr}</div>
            `;
            
            btn.onclick = () => {
                if(this.els.spawnScreen) this.els.spawnScreen.style.display = 'none';
                this.startGame(null, this.selectedSlot, null); 
                if(Game.state && Game.state.player) {
                    Game.state.player.x = p.x;
                    Game.state.player.y = p.y;
                    if(p.sector) {
                        Game.state.sector = p.sector;
                        Game.changeSector(p.sector.x, p.sector.y);
                    }
                }
            };
            this.els.spawnList.appendChild(btn);
        }
    },

    renderCombat: function() {
        const enemy = Game.state.enemy;
        if(!enemy) return;
        
        const nameEl = document.getElementById('enemy-name');
        if(nameEl) nameEl.textContent = enemy.name;
        
        const hpText = document.getElementById('enemy-hp-text');
        const hpBar = document.getElementById('enemy-hp-bar');
        
        if(hpText) hpText.textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp} TP`;
        if(hpBar) hpBar.style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`;
        
        if(typeof Combat !== 'undefined' && typeof Combat.calculateHitChance === 'function') {
             const cHead = Combat.calculateHitChance(0);
             const cTorso = Combat.calculateHitChance(1);
             const cLegs = Combat.calculateHitChance(2);
             
             const elHead = document.getElementById('chance-vats-0');
             const elTorso = document.getElementById('chance-vats-1');
             const elLegs = document.getElementById('chance-vats-2');
             
             if(elHead) elHead.textContent = cHead + "%";
             if(elTorso) elTorso.textContent = cTorso + "%";
             if(elLegs) elLegs.textContent = cLegs + "%";
        }
        
        if(typeof Combat !== 'undefined' && Combat.selectedPart !== undefined) {
            for(let i=0; i<3; i++) {
                const btn = document.getElementById(`btn-vats-${i}`);
                if(btn) {
                    if(i === Combat.selectedPart) {
                        btn.classList.add('bg-green-500', 'text-black');
                        btn.classList.remove('bg-green-900/20');
                    } else {
                        btn.classList.remove('bg-green-500', 'text-black');
                        btn.classList.add('bg-green-900/20');
                    }
                }
            }
        }
    }
});
