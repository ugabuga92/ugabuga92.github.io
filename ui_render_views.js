// [2026-01-15 22:15:00] ui_render_views.js - Full Recovery with Procedural Vault-Boy Canvas

Object.assign(UI, {

    // ==========================================
    // === CHARAKTER & STATS MENU ===
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

        // WICHTIG: Das Männchen zeichnen, nachdem das HTML im DOM ist
        if(tab === 'stats') {
            setTimeout(() => this.drawVaultBoy('char-silhouette-canvas'), 50);
        }
    },

    // UNTERFUNKTION: Das "Paper Doll" Layout
    renderCharacterVisuals: function(container) {
        const p = Game.state;
        const eq = p.equip;

        const renderSlot = (slotName, item, iconFallback) => {
            const hasItem = !!item;
            const name = hasItem ? (item.props && item.props.name ? item.props.name : item.name) : "LEER";
            const style = hasItem ? "border-green-500 bg-green-900/20 text-green-300 shadow-[0_0_10px_rgba(57,255,20,0.2)]" : "border-green-900/50 text-green-900 bg-black";
            
            return `
                <div class="flex flex-col items-center justify-center p-2 border-2 ${style} rounded min-h-[80px] transition-all relative group cursor-pointer z-10" onclick="UI.openEquipMenu('${slotName}')">
                    <div class="text-[8px] uppercase tracking-widest opacity-50 mb-1">${slotName}</div>
                    <div class="text-2xl mb-1">${hasItem && item.icon ? item.icon : iconFallback}</div>
                    <div class="text-[9px] text-center font-bold uppercase leading-tight max-w-full overflow-hidden text-ellipsis">${name}</div>
                    ${hasItem ? '<div class="absolute top-1 right-1 text-[8px] text-red-500 opacity-0 group-hover:opacity-100">X</div>' : ''}
                </div>
            `;
        };

        container.innerHTML = `
            <div class="flex flex-col items-center gap-6 max-w-md mx-auto">
                <div class="w-full text-center border-b border-green-900 pb-4">
                    <div class="text-4xl font-bold text-green-400 mb-1 tracking-tighter">${p.playerName}</div>
                    <div class="flex justify-center gap-4 text-xs font-mono text-green-600">
                        <span>LEVEL ${p.lvl}</span>
                        <span>XP: ${p.xp} / ${Game.expToNextLevel(p.lvl)}</span>
                        <span>HP: ${Math.round(p.hp)}/${p.maxHp}</span>
                    </div>
                </div>

                <div class="grid grid-cols-3 grid-rows-4 gap-3 w-full relative">
                    <div class="col-start-2 row-start-1">${renderSlot('head', eq.head, '🧢')}</div>
                    <div class="col-start-1 row-start-2">${renderSlot('weapon', eq.weapon, '👊')}</div>
                    <div class="col-start-2 row-start-2">${renderSlot('body', eq.body, '👕')}</div>
                    <div class="col-start-3 row-start-2">${renderSlot('arms', eq.arms, '💪')}</div>
                    <div class="col-start-2 row-start-3">${renderSlot('legs', eq.legs, '👖')}</div>
                    <div class="col-start-3 row-start-3">${renderSlot('back', eq.back, '🎒')}</div>
                    <div class="col-start-2 row-start-4">${renderSlot('feet', eq.feet, '🥾')}</div>
                    
                    <div class="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none z-0">
                         <canvas id="char-silhouette-canvas" width="240" height="300"></canvas>
                    </div>
                </div>

                <div class="w-full mt-4 grid grid-cols-2 gap-3 text-xs bg-green-900/10 p-4 rounded border border-green-900/50 font-mono">
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span class="opacity-70">ABWEHR</span>
                        <span class="font-bold text-green-400">${Game.getStat('DEF') || 0}</span>
                    </div>
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span class="opacity-70">SCHADEN</span>
                        <span class="font-bold text-green-400">${eq.weapon ? (eq.weapon.baseDmg || 2) : 2}</span>
                    </div>
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span class="opacity-70">KRIT %</span>
                        <span class="font-bold text-green-400">${p.critChance || 5}%</span>
                    </div>
                    <div class="flex justify-between border-b border-green-900/30 pb-1">
                        <span class="opacity-70">TRAGLAST</span>
                        <span class="font-bold text-green-400">${p.inventory ? p.inventory.length : 0}/${Game.getMaxSlots()}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Die neue Zeichenfunktion
    drawVaultBoy: function(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = "#1aff1a"; 
        ctx.fillStyle = "#1aff1a";
        ctx.lineWidth = 2.5;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Kopf
        ctx.beginPath(); ctx.arc(cx, cy - 60, 30, 0, Math.PI * 2); ctx.stroke();
        // Haare (Tolle)
        ctx.beginPath(); ctx.arc(cx - 10, cy - 85, 12, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 5, cy - 85, 10, Math.PI, 0); ctx.stroke();
        // Torso
        ctx.beginPath(); ctx.moveTo(cx - 18, cy - 30); ctx.lineTo(cx + 18, cy - 30);
        ctx.lineTo(cx + 22, cy + 30); ctx.lineTo(cx - 22, cy + 30); ctx.closePath(); ctx.stroke();
        // Rechter Arm (Daumen hoch)
        ctx.beginPath(); ctx.moveTo(cx + 18, cy - 20); ctx.lineTo(cx + 50, cy - 35);
        ctx.lineTo(cx + 50, cy - 55); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 50, cy - 62, 6, 0, Math.PI * 2); ctx.fill();
        // Linker Arm (Hüfte)
        ctx.beginPath(); ctx.moveTo(cx - 18, cy - 20); ctx.lineTo(cx - 40, cy - 5);
        ctx.lineTo(cx - 20, cy + 15); ctx.stroke();
        // Beine
        ctx.beginPath(); ctx.moveTo(cx - 12, cy + 30); ctx.lineTo(cx - 18, cy + 85); ctx.lineTo(cx - 30, cy + 85); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 12, cy + 30); ctx.lineTo(cx + 18, cy + 85); ctx.lineTo(cx + 30, cy + 85); ctx.stroke();
        // Gesicht
        ctx.beginPath(); ctx.arc(cx - 10, cy - 65, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 10, cy - 65, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 60, 15, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
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
            let btnText = maxed ? "MAX" : (canBuy ? "LERNEN" : (Game.state.lvl < p.reqLvl ? `LVL ${p.reqLvl}` : "LOCKED"));
            let btnClass = maxed ? "border-green-800 text-green-800 bg-green-900/20" : (canBuy ? "border-yellow-500 text-yellow-400 animate-pulse" : "border-gray-800 text-gray-600");
            html += `
                <div class="flex flex-col p-3 border ${currentLvl > 0 ? 'border-green-600 bg-green-900/10' : 'border-green-900/30 bg-black'}">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="font-bold text-lg ${currentLvl > 0 ? 'text-green-300' : 'text-gray-400'}">${p.name}</div>
                            <div class="text-xs text-green-700">Rang: ${currentLvl} / ${p.maxLvl}</div>
                        </div>
                        <button class="px-3 py-1 border text-xs font-bold uppercase transition-colors ${btnClass}" ${canBuy ? `onclick="Game.learnPerk('${p.id}')"` : ''}>
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

    renderCharacterSelection: function(saves) {
        this.charSelectMode = true;
        this.currentSaves = saves;
        if(this.els.loginScreen) this.els.loginScreen.style.display = 'none';
        if(this.els.charSelectScreen) this.els.charSelectScreen.style.display = 'flex';
        if(this.els.charSlotsList) this.els.charSlotsList.innerHTML = '';
        const btnBack = document.getElementById('btn-char-back');
        if (btnBack) {
            btnBack.onclick = () => {
                this.charSelectMode = false;
                if(this.els.charSelectScreen) this.els.charSelectScreen.style.display = 'none';
                if(this.els.loginScreen) this.els.loginScreen.style.display = 'flex'; 
            };
        }
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = "char-slot border-2 border-green-900 bg-black/80 p-4 mb-2 cursor-pointer hover:border-yellow-400 transition-all flex justify-between items-center group relative overflow-hidden";
            const save = saves[i];
            if (save) {
                const isDead = (save.hp !== undefined && save.hp <= 0);
                slot.innerHTML = `
                    <div class="flex flex-col z-10">
                        <span class="text-xl ${isDead ? 'text-red-500' : 'text-yellow-400'} font-bold tracking-wider">${isDead ? '💀' : '👤'} ${save.playerName}</span>
                        <span class="text-xs text-green-300 font-mono">Level ${save.lvl} | Sektor [${save.sector.x},${save.sector.y}]</span>
                    </div>
                    <div class="z-10 flex items-center gap-2">
                        <button class="bg-green-700 text-black font-bold px-4 py-1 text-xs rounded group-hover:bg-[#39ff14]">START ▶</button>
                    </div>
                `;
            } else {
                slot.className = "char-slot border-2 border-dashed border-gray-700 bg-black/50 p-4 mb-2 cursor-pointer hover:border-yellow-400 flex justify-center items-center group min-h-[80px]";
                slot.innerHTML = `<div class="text-gray-500 group-hover:text-yellow-400 font-bold">+ NEUEN CHARAKTER</div>`;
            }
            slot.onclick = () => { if(typeof this.selectSlot === 'function') this.selectSlot(i); };
            if(this.els.charSlotsList) this.els.charSlotsList.appendChild(slot);
        }
        if(typeof this.selectSlot === 'function') this.selectSlot(0);
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
            btn.className = "action-button w-full mb-2 text-left text-xs border-green-800 text-green-400 p-2";
            btn.innerHTML = `<div>SIGNAL: ${p.name}</div><div class="text-[10px] text-gray-400 float-right mt-[-1rem]">[${p.sector.x},${p.sector.y}]</div>`;
            btn.onclick = () => {
                if(this.els.spawnScreen) this.els.spawnScreen.style.display = 'none';
                this.startGame(null, this.selectedSlot, null); 
                if(Game.state && Game.state.player) {
                    Game.state.player.x = p.x; Game.state.player.y = p.y;
                    if(p.sector) { Game.state.sector = p.sector; Game.changeSector(p.sector.x, p.sector.y); }
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
                    btn.classList.toggle('bg-green-500', i === Combat.selectedPart);
                    btn.classList.toggle('text-black', i === Combat.selectedPart);
                }
            }
        }
    }
});
