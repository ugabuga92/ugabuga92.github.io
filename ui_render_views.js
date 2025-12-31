// [v2.2] - 2025-12-31 16:30pm (Refactoring) - Split large file into modules (ui_view_inv, ui_view_world, etc.)
// This file now only contains core system views.
Object.assign(UI, {
    
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
                slot.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-xl text-yellow-400 font-bold">${name}</span>
                        <span class="text-xs text-green-300">Level ${lvl} | Sektor ${loc}</span>
                    </div>
                    <div class="text-xs text-gray-500">SLOT ${i+1}</div>
                `;
            } else {
                slot.classList.add('empty-slot');
                slot.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-xl text-gray-400">[ LEER ]</span>
                        <span class="text-xs text-gray-600">Neuen Charakter erstellen</span>
                    </div>
                    <div class="text-xs text-gray-700">SLOT ${i+1}</div>
                `;
            }
            slot.onclick = () => this.selectSlot(i);
            this.els.charSlotsList.appendChild(slot);
        }
        this.selectSlot(0);
    },

    renderSpawnList: function(players) {
        if(!this.els.spawnList) return;
        this.els.spawnList.innerHTML = '';
        if(Object.keys(players).length === 0) {
            this.els.spawnList.innerHTML = '<div class="text-gray-500 italic">Keine Signale gefunden...</div>';
            return;
        }
        for(let pid in players) {
            const p = players[pid];
            const btn = document.createElement('button');
            btn.className = "action-button w-full mb-2 text-left text-xs";
            btn.innerHTML = `SIGNAL: ${p.name} <span class="float-right">[${p.sector.x},${p.sector.y}]</span>`;
            btn.onclick = () => {
                this.els.spawnScreen.style.display = 'none';
                this.startGame(null, this.selectedSlot, null);
                Game.state.player.x = p.x;
                Game.state.player.y = p.y;
                Game.state.sector = p.sector;
                Game.changeSector(p.sector.x, p.sector.y);
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
    }
});
