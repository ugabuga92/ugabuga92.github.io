Object.assign(UI, {

    renderWiki: function(category = 'monsters') {
        const content = document.getElementById('wiki-content');
        if(!content) return;
        
        ['monsters', 'items', 'crafting', 'locs'].forEach(cat => {
            const btn = document.getElementById(`wiki-btn-${cat}`);
            if(btn) {
                if(cat === category) {
                    btn.classList.add('bg-green-500', 'text-black');
                    btn.classList.remove('text-green-500');
                } else {
                    btn.classList.remove('bg-green-500', 'text-black');
                    btn.classList.add('text-green-500');
                }
            }
        });

        let htmlBuffer = '';
        if(category === 'monsters') {
            Object.keys(Game.monsters).forEach(k => {
                const m = Game.monsters[k];
                const xpText = Array.isArray(m.xp) ? `${m.xp[0]}-${m.xp[1]}` : m.xp;
                let dropsText = "Nichts";
                if(m.drops) {
                    dropsText = m.drops.map(d => {
                        const item = Game.items[d.id];
                        return `${item ? item.name : d.id} (${Math.round(d.c*100)}%)`;
                    }).join(', ');
                }
                htmlBuffer += `
                    <div class="border border-green-900 bg-green-900/10 p-3 mb-2">
                        <div class="flex justify-between items-start">
                            <div class="font-bold text-yellow-400 text-xl">${m.name} ${m.isLegendary ? '★' : ''}</div>
                            <div class="text-xs border border-green-700 px-1">LVL ${m.minLvl}+</div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div>HP: <span class="text-white">${m.hp}</span></div>
                            <div>DMG: <span class="text-red-400">${m.dmg}</span></div>
                            <div>XP: <span class="text-cyan-400">${xpText}</span></div>
                            <div>Caps: <span class="text-yellow-200">~${m.loot}</span></div>
                        </div>
                        <div class="mt-2 text-xs border-t border-green-900 pt-1 text-gray-400">
                            Beute: <span class="text-green-300">${dropsText}</span>
                        </div>
                    </div>`;
            });
        } else if (category === 'items') {
            const categories = {};
            if (Game.items) {
                Object.keys(Game.items).forEach(k => {
                    const i = Game.items[k];
                    i._key = k; 
                    if(!categories[i.type]) categories[i.type] = [];
                    categories[i.type].push(i);
                });
                for(let type in categories) {
                    htmlBuffer += `<h3 class="text-lg font-bold border-b border-green-500 mt-4 mb-2 uppercase text-green-300">${type}</h3>`;
                    categories[type].forEach(item => {
                        let details = `Wert: ${item.cost}`;
                        if(item.baseDmg) details += ` | DMG: ${item.baseDmg}`;
                        if(item.bonus) details += ` | Bonus: ${JSON.stringify(item.bonus).replace(/["{}]/g, '').replace(/:/g, '+')}`;
                        htmlBuffer += `
                            <div class="flex justify-between items-center border-b border-green-900/30 py-1">
                                <span class="font-bold text-white">${item.name}</span>
                                <span class="text-xs text-gray-400">${details}</span>
                            </div>`;
                    });
                }
            }
        } else if (category === 'crafting') {
            if (Game.recipes && Game.recipes.length > 0) {
                Game.recipes.forEach(r => {
                    if(Game.state.knownRecipes && !Game.state.knownRecipes.includes(r.id)) return;
                    
                    const outName = r.out === "AMMO" ? "Munition x15" : (Game.items[r.out] ? Game.items[r.out].name : r.out);
                    const reqs = Object.keys(r.req).map(rid => {
                        const iName = Game.items[rid] ? Game.items[rid].name : rid;
                        return `${r.req[rid]}x ${iName}`;
                    }).join(', ');
                    htmlBuffer += `
                        <div class="border border-green-900 p-2 mb-2 bg-green-900/10">
                            <div class="font-bold text-yellow-400">${outName} <span class="text-xs text-gray-500 ml-2">(Lvl ${r.lvl})</span></div>
                            <div class="text-xs text-green-300 italic">Benötigt: ${reqs}</div>
                        </div>`;
                });
            } else {
                htmlBuffer = '<div class="text-center text-gray-500 mt-10">Keine Baupläne in Datenbank.</div>';
            }
        } else if (category === 'locs') {
             const locs = [
                {name: "Vault 101", desc: "Startpunkt. Sicherer Hafen. Bietet kostenlose Heilung."},
                {name: "Rusty Springs", desc: "Zentrale Handelsstadt [3,3]. Händler, Heiler und Werkbank."},
                {name: "Supermarkt", desc: "Zufällige Ruine. Mittlere Gefahr, viele Raider."},
                {name: "Alte Höhlen", desc: "Zufälliger Dungeon. Dunkel, Skorpione und Insekten."},
                {name: "Oasis", desc: "Sektor [0,0] bis [1,1]. Dichter Dschungel im Nordwesten."},
                {name: "The Pitt", desc: "Sektor [6,6] bis [7,7]. Tödliche Wüste im Südosten."},
                {name: "Sumpf", desc: "Sektor [6,0] bis [7,1]. Giftiges Wasser und Mirelurks."}
            ];
            locs.forEach(l => {
                htmlBuffer += `
                    <div class="mb-3 border-l-2 border-green-500 pl-2">
                        <div class="font-bold text-cyan-400 text-lg uppercase">${l.name}</div>
                        <div class="text-sm text-green-200 leading-tight">${l.desc}</div>
                    </div>`;
            });
        }
        content.innerHTML = htmlBuffer;
    },

    renderQuests: function() {
        const list = document.getElementById('quest-list');
        if(!list) return;
        list.innerHTML = '';
        
        if(!this.questTab) this.questTab = 'active';

        const tabsContainer = document.createElement('div');
        tabsContainer.className = "flex w-full border-b border-green-900 mb-4";
        
        const btnActive = document.createElement('button');
        btnActive.className = `flex-1 py-2 font-bold text-center transition-colors ${this.questTab === 'active' ? 'bg-green-900/40 text-green-400 border-b-2 border-green-500' : 'bg-black text-gray-600 hover:text-green-500'}`;
        btnActive.textContent = "AKTIV";
        btnActive.onclick = (e) => { e.stopPropagation(); this.questTab = 'active'; this.renderQuests(); };
        
        const btnCompleted = document.createElement('button');
        btnCompleted.className = `flex-1 py-2 font-bold text-center transition-colors ${this.questTab === 'completed' ? 'bg-green-900/40 text-green-400 border-b-2 border-green-500' : 'bg-black text-gray-600 hover:text-green-500'}`;
        btnCompleted.textContent = "ERLEDIGT";
        btnCompleted.onclick = (e) => { e.stopPropagation(); this.questTab = 'completed'; this.renderQuests(); };
        
        tabsContainer.appendChild(btnActive);
        tabsContainer.appendChild(btnCompleted);
        list.appendChild(tabsContainer);

        if(this.questTab === 'active') {
            const quests = Game.state.activeQuests || [];
            if(quests.length === 0) {
                list.innerHTML += '<div class="text-gray-500 italic text-center mt-10">Keine aktiven Aufgaben.<br><span class="text-xs">Erkunde die Welt, um Quests zu finden!</span></div>';
                return;
            }
            quests.forEach(q => {
                const def = Game.questDefs ? Game.questDefs.find(d => d.id === q.id) : null;
                const title = def ? def.title : "Unbekannte Quest";
                const desc = def ? def.desc : "???";
                const pct = Math.min(100, Math.floor((q.progress / q.max) * 100));
                
                const div = document.createElement('div');
                div.className = "border border-green-900 bg-green-900/10 p-3 mb-2 relative overflow-hidden";
                div.innerHTML = `
                    <div class="font-bold text-yellow-400 text-lg mb-1 flex justify-between">
                        <span>${title}</span>
                        <span class="text-xs text-gray-400 border border-gray-600 px-1 rounded">LVL ${def ? def.minLvl : 1}</span>
                    </div>
                    <div class="text-green-200 text-sm leading-relaxed mb-3">${desc}</div>
                    <div class="w-full bg-black border border-green-700 h-4 relative">
                        <div class="bg-green-600 h-full transition-all duration-500" style="width: ${pct}%"></div>
                        <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow-black">
                            ${q.progress} / ${q.max} (${pct}%)
                        </div>
                    </div>
                    <div class="mt-2 text-right text-xs text-yellow-600">
                        Belohnung: ${def && def.reward ? (def.reward.caps ? def.reward.caps + ' KK, ' : '') + def.reward.xp + ' XP' : '?'}
                    </div>
                `;
                list.appendChild(div);
            });
        } else {
            const completedIds = Game.state.completedQuests || [];
            if(completedIds.length === 0) {
                list.innerHTML += '<div class="text-gray-500 italic text-center mt-10">Noch keine Aufgaben abgeschlossen.</div>';
                return;
            }
            completedIds.forEach(qId => {
                const def = Game.questDefs ? Game.questDefs.find(d => d.id === qId) : null;
                if(!def) return;
                const div = document.createElement('div');
                div.className = "border border-gray-800 bg-black p-3 mb-2 opacity-70 hover:opacity-100 transition-opacity";
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-gray-400 line-through decoration-green-500 decoration-2">${def.title}</span>
                        <span class="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded">ERLEDIGT</span>
                    </div>
                    <div class="text-gray-600 text-xs italic">${def.desc}</div>
                `;
                list.appendChild(div);
            });
        }
    }
});
