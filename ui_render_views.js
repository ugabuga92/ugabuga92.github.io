// [v3.4b] - 2026-01-03 05:15am (Added renderChar Logic)
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
    
    // [v3.4b] New Char Render Function with Tabs
    renderChar: function(tab = 'stats') {
        const btnStats = document.getElementById('btn-show-stats');
        const btnPerks = document.getElementById('btn-show-perks');
        const divStats = document.getElementById('stat-grid');
        const divPerks = document.getElementById('perk-container');
        
        // 1. Tab Styling
        if(tab === 'stats') {
             if(btnStats) btnStats.className = "flex-1 py-2 font-bold bg-green-900/40 text-green-400 border border-green-500 hover:bg-green-500 hover:text-black transition-colors";
             if(btnPerks) btnPerks.className = "flex-1 py-2 font-bold bg-black text-gray-500 border border-gray-700 hover:text-green-400 transition-colors ml-[-1px]";
             if(divStats) divStats.classList.remove('hidden');
             if(divPerks) divPerks.classList.add('hidden');
             this.renderStatsGrid();
        } else {
             if(btnStats) btnStats.className = "flex-1 py-2 font-bold bg-black text-gray-500 border border-gray-700 hover:text-green-400 transition-colors";
             if(btnPerks) btnPerks.className = "flex-1 py-2 font-bold bg-green-900/40 text-green-400 border border-green-500 hover:bg-green-500 hover:text-black transition-colors ml-[-1px]";
             if(divStats) divStats.classList.add('hidden');
             if(divPerks) divPerks.classList.remove('hidden');
             this.renderPerksList();
        }

        // 2. Update Header Info
        const lvlEl = document.getElementById('char-lvl');
        const ptsEl = document.getElementById('char-points');
        const expBar = document.getElementById('char-exp-bar');
        const expVal = document.getElementById('char-exp');
        const nextVal = document.getElementById('char-next');
        const wepName = document.getElementById('equip-weapon-name');
        const wepStat = document.getElementById('equip-weapon-stats');
        const armName = document.getElementById('equip-body-name');
        const armStat = document.getElementById('equip-body-stats');

        if(lvlEl) lvlEl.textContent = Game.state.lvl;
        
        // Points: Show Stat points if in Stats tab, Perk points if in Perk tab (or combined if logic differs)
        // For now: display Total points available contextually
        let points = 0;
        if(tab === 'stats') points = Game.state.statPoints;
        else points = Game.state.perkPoints || 0;
        
        if(ptsEl) ptsEl.textContent = points;

        const nextXp = Game.expToNextLevel(Game.state.lvl);
        const expPct = Math.min(100, Math.floor((Game.state.xp / nextXp) * 100));
        
        if(expBar) expBar.style.width = `${expPct}%`;
        if(expVal) expVal.textContent = Math.floor(Game.state.xp);
        if(nextVal) nextVal.textContent = nextXp;

        // Equip
        const w = Game.state.equipment.weapon;
        if(wepName) wepName.textContent = w ? w.name : "Fäuste";
        if(wepStat) wepStat.textContent = w ? `DMG: ${w.val}` : "DMG: 1";

        const a = Game.state.equipment.body;
        if(armName) armName.textContent = a ? a.name : "Vault-Anzug";
        if(armStat) armStat.textContent = a ? `RÜST: ${a.val}` : "RÜST: 0";
    },

    renderStatsGrid: function() {
        const grid = document.getElementById('stat-grid');
        if(!grid) return;
        grid.innerHTML = '';
        
        const stats = {
            STR: "STÄRKE", PER: "WAHRNEHMUNG", END: "AUSDAUER",
            CHA: "CHARISMA", INT: "INTELLIGENZ", AGI: "BEWEGLICHKEIT", LUC: "GLÜCK"
        };
        
        for(let key in stats) {
            const val = Game.state.stats[key] || 1;
            const row = document.createElement('div');
            row.className = "flex items-center justify-between border-b border-green-900 pb-1";
            
            // Allow upgrade if points available
            const canUpgrade = Game.state.statPoints > 0;
            const btnHtml = canUpgrade ? `<button class="w-8 h-8 border border-yellow-400 text-yellow-400 font-bold hover:bg-yellow-900" onclick="Game.upgradeStat('${key}'); UI.renderChar('stats');">+</button>` : `<span class="w-8 h-8 flex items-center justify-center text-gray-600 font-bold"></span>`;
            
            row.innerHTML = `
                <div class="flex items-center w-32">
                    <span class="font-bold w-8 text-xl">${val}</span>
                    <span class="text-xs text-green-300 ml-2">${stats[key]}</span>
                </div>
                ${btnHtml}
            `;
            grid.appendChild(row);
        }
    },

    renderPerksList: function() {
        const container = document.getElementById('perk-container');
        if(!container) return;
        container.innerHTML = '';
        
        // Placeholder for perks data - assuming Game.state.perks is array or using GameData
        const perks = [
            { id: 'tough', name: 'Zähigkeit', desc: '+10 Max TP', cost: 1 },
            { id: 'scrounger', name: 'Schnorrer', desc: 'Mehr Munition in Containern', cost: 1 }
        ]; 
        
        // Use real perks if available in GameData or Game.state.unlockedPerks
        // For now, render available points and a simple list
        
        const points = Game.state.perkPoints || 0;
        
        if(points === 0) {
            const msg = document.createElement('div');
            msg.className = "text-center text-gray-500 italic mt-4";
            msg.textContent = "Keine Perk-Punkte verfügbar.";
            container.appendChild(msg);
        }

        // TODO: Connect to real Data.perks logic
        const demoNote = document.createElement('div');
        demoNote.className = "text-xs text-green-800 border border-green-900 p-2 mb-2";
        demoNote.textContent = "PERK SYSTEM: IN ARBEIT (DEMO)";
        container.appendChild(demoNote);
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
