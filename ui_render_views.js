Object.assign(UI, {
    
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
