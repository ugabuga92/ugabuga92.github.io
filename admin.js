// [TIMESTAMP] 2026-01-09 20:00:00 - admin.js - Added Bug Logic & Perk Editor

const Admin = {
    gatePass: "bimbo123",
    adminUser: "admin@pipboy-system.com",
    adminPass: "zintel1992",

    dbData: {}, 
    bugData: {}, // New: Bug Data Storage
    currentPath: null,
    currentUserData: null,
    itemsList: [], 

    unlock: function() {
        const input = document.getElementById('gate-pass').value;
        const msg = document.getElementById('gate-msg');
        
        if(input === this.gatePass) {
            msg.className = "mt-4 h-6 text-green-500 font-bold";
            msg.textContent = "ACCESS GRANTED. ESTABLISHING UPLINK...";
            this.connectFirebase();
        } else {
            msg.textContent = "ACCESS DENIED.";
            document.getElementById('gate-pass').value = '';
        }
    },

    connectFirebase: async function() {
        if (typeof Network !== 'undefined' && !Network.db) {
            try { if(typeof Network.init === 'function') Network.init(); } catch(e) {}
        }

        try {
            await Network.login(this.adminUser, this.adminPass);
            document.getElementById('gate-screen').classList.add('hidden');
            const app = document.getElementById('app-ui');
            app.classList.remove('hidden');
            setTimeout(() => app.classList.remove('opacity-0'), 50);
            document.getElementById('conn-dot').classList.replace('bg-red-500', 'bg-green-500');
            document.getElementById('conn-dot').classList.remove('animate-pulse');
            this.initData();
        } catch(e) {
            document.getElementById('gate-msg').textContent = "UPLINK FAILED: " + e.code;
            console.error(e);
        }
    },

    initData: function() {
        const items = (typeof Game !== 'undefined' && Game.items) ? Game.items : (window.GameData ? window.GameData.items : {});
        
        this.itemsList = Object.keys(items).sort().map(k => ({id: k, name: items[k].name}));
        const sel = document.getElementById('inv-add-select');
        sel.innerHTML = '';
        this.itemsList.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.textContent = `${i.name} (${i.id})`;
            sel.appendChild(opt);
        });

        // 1. Players Listener
        Network.db.ref('saves').on('value', snap => {
            this.dbData = snap.val() || {};
            this.renderUserList();
            if(this.currentPath) {
                const parts = this.currentPath.split('/'); 
                if(this.dbData[parts[1]] && this.dbData[parts[1]][parts[2]]) {
                    this.selectUser(this.currentPath, true); 
                }
            }
        });

        // 2. [NEU] Bug Reports Listener
        Network.db.ref('bug_reports').on('value', snap => {
            this.bugData = snap.val() || {};
            const count = Object.keys(this.bugData).length;
            
            const btn = document.getElementById('btn-bugs');
            const counter = document.getElementById('bug-count');
            
            if(count > 0) {
                btn.classList.remove('hidden');
                btn.classList.add('btn-bug-alert');
                counter.textContent = count;
            } else {
                btn.classList.remove('hidden'); // Optional: always show
                btn.classList.remove('btn-bug-alert');
                btn.classList.add('border-green-500', 'text-green-500'); // Normal Style
                btn.classList.remove('btn-danger');
                counter.textContent = "0";
            }
            this.renderBugs(); // Re-Render if open
        });
    },

    // [NEU] Bug Report Functions
    showBugs: function() {
        document.getElementById('bug-overlay').classList.remove('hidden');
        this.renderBugs();
    },

    renderBugs: function() {
        const list = document.getElementById('bug-list');
        list.innerHTML = '';
        
        const reports = [];
        for(let key in this.bugData) {
            reports.push({ id: key, ...this.bugData[key] });
        }
        // Neueste zuerst
        reports.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

        if(reports.length === 0) {
            list.innerHTML = '<div class="text-center text-green-500 italic mt-10">NO BUGS REPORTED. SYSTEM CLEAN.</div>';
            return;
        }

        reports.forEach(bug => {
            const date = new Date(bug.timestamp).toLocaleString();
            const div = document.createElement('div');
            div.className = "border border-red-500 bg-red-900/20 p-4 relative";
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2 border-b border-red-800 pb-2">
                    <div>
                        <span class="text-red-400 font-bold">${bug.error || "UNKNOWN ERROR"}</span>
                        <div class="text-xs text-gray-400">${date} | Player: <span class="text-white">${bug.playerName}</span></div>
                    </div>
                    <button onclick="Admin.deleteBug('${bug.id}')" class="btn btn-danger text-xs px-2 py-1">DELETE</button>
                </div>
                <div class="text-sm text-gray-300 font-mono mb-2">
                    <span class="text-red-600 font-bold">DESC:</span> ${bug.description}
                </div>
                <div class="text-[10px] text-gray-500 font-mono bg-black p-2 border border-gray-800">
                    LOC: ${bug.gameState?.sector || 'Unknown'} | VIEW: ${bug.gameState?.view} | USER-AGENT: ${bug.userAgent}
                </div>
            `;
            list.appendChild(div);
        });
    },

    deleteBug: function(id) {
        if(!confirm("Bug erledigt? Löschen?")) return;
        Network.db.ref('bug_reports/' + id).remove();
    },

    refresh: function() { location.reload(); },

    toggleSidebar: function() {
        const sb = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sb.classList.contains('-translate-x-full')) {
            sb.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        } else {
            sb.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    },

    renderUserList: function() {
        const list = document.getElementById('user-list');
        const filter = document.getElementById('search-player').value.toLowerCase();
        list.innerHTML = '';
        let count = 0;
        
        for(let uid in this.dbData) {
            const slots = this.dbData[uid];
            for(let slotIdx in slots) {
                const save = slots[slotIdx];
                const name = (save.playerName || "Unknown").toLowerCase();
                const path = `saves/${uid}/${slotIdx}`;
                
                if(filter && !name.includes(filter) && !uid.includes(filter)) continue;

                const div = document.createElement('div');
                const isSelected = this.currentPath === path;
                const isDead = (save.hp <= 0);
                
                div.className = `p-2 cursor-pointer border-b border-[#1a331a] flex justify-between items-center hover:bg-[#39ff14] hover:text-black transition-colors ${isSelected ? 'bg-[#39ff14] text-black font-bold' : 'text-[#39ff14]'}`;
                
                div.onclick = () => {
                    this.selectUser(path);
                    const sb = document.getElementById('sidebar');
                    if(!sb.classList.contains('-translate-x-full')) {
                        this.toggleSidebar();
                    }
                };
                
                div.innerHTML = `
                    <div class="flex flex-col overflow-hidden">
                        <span class="truncate uppercase">${isDead ? '💀 ' : ''}${save.playerName || 'NO_NAME'}</span>
                        <span class="text-[10px] opacity-60 font-mono">${save._userEmail || uid.substr(0,8)}</span>
                    </div>
                    <div class="text-right text-xs">
                        <div>LVL ${save.lvl || 1}</div>
                        <div>SEC ${save.sector ? `${save.sector.x},${save.sector.y}` : '?,?'}</div>
                    </div>
                `;
                list.appendChild(div);
                count++;
            }
        }
        document.getElementById('user-count').textContent = count;
    },

    selectUser: function(path, silent = false) {
        try {
            this.currentPath = path;
            const parts = path.split('/');
            const uid = parts[1];
            const slot = parts[2];
            this.currentUserData = this.dbData[uid][slot];
            const d = this.currentUserData;

            if(!silent) {
                this.tab('general');
            }

            document.getElementById('no-selection').classList.add('hidden');
            document.getElementById('editor-content').classList.remove('hidden');
            document.getElementById('editor-error').classList.add('hidden'); 
            
            document.getElementById('edit-name').textContent = d.playerName || "Unknown";
            document.getElementById('edit-uid').textContent = uid;
            document.getElementById('edit-slot').textContent = slot;
            document.getElementById('edit-email').textContent = d._userEmail || "No Email";
            
            document.getElementById('quick-lvl').value = d.lvl || 1;
            document.getElementById('quick-xp').value = d.xp || 0;

            this.fillGeneral(d);
            this.fillStats(d);
            this.fillInv(d);
            this.fillWorld(d);
            this.fillCamp(d); 
            this.fillRaw(d);
            
            if(!silent) this.renderUserList(); 

        } catch (e) {
            console.error(e);
            const errBox = document.getElementById('editor-error');
            errBox.textContent = "RENDER ERROR: " + e.message;
            errBox.classList.remove('hidden');
        }
    },

    fillGeneral: function(d) {
        document.getElementById('inp-hp').value = Math.round(d.hp || 0);
        document.getElementById('inp-maxhp').value = d.maxHp || 10;
        document.getElementById('inp-rads').value = d.rads || 0;
        document.getElementById('inp-caps').value = d.caps || 0;
    },

    fillStats: function(d) {
        const container = document.getElementById('special-container');
        container.innerHTML = '';
        const stats = d.stats || { STR:1, PER:1, END:1, CHA:1, INT:1, AGI:1, LUC:1 };
        
        // S.P.E.C.I.A.L.
        for(let key in stats) {
            const val = stats[key];
            const div = document.createElement('div');
            div.className = "panel-box p-2 flex justify-between items-center";
            div.innerHTML = `
                <span class="font-bold text-xl w-12">${key}</span>
                <input type="range" min="1" max="10" value="${val}" class="flex-grow mx-2 accent-[#39ff14]" 
                    onchange="document.getElementById('val-${key}').textContent=this.value; Admin.saveStat('${key}', this.value)">
                <span id="val-${key}" class="font-bold text-xl w-6 text-right">${val}</span>
            `;
            container.appendChild(div);
        }
        document.getElementById('inp-statPoints').value = d.statPoints || 0;
        document.getElementById('inp-perkPoints').value = d.perkPoints || 0;

        // [NEU] PERK EDITOR
        const perkContainer = document.getElementById('perk-list-container');
        if(perkContainer) {
            perkContainer.innerHTML = '';
            
            // Perks aus GameData holen
            const allPerks = (window.GameData && window.GameData.perks) ? window.GameData.perks : [];
            const userPerks = d.perks || {};

            if(allPerks.length === 0) {
                perkContainer.innerHTML = '<div class="col-span-2 text-gray-500">No Perk Definitions found via GameData.</div>';
            } else {
                allPerks.forEach(p => {
                    // Level holen (Objekt oder Array legacy support)
                    let lvl = userPerks[p.id] || 0;
                    if(Array.isArray(userPerks)) lvl = userPerks.includes(p.id) ? 1 : 0;

                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center bg-black p-1 border-b border-[#1a331a]";
                    
                    div.innerHTML = `
                        <div class="flex flex-col overflow-hidden mr-2">
                            <span class="text-xs font-bold text-green-300 truncate" title="${p.name}">${p.name}</span>
                            <span class="text-[10px] text-gray-500 truncate">Max: ${p.max || 1}</span>
                        </div>
                        <input type="number" min="0" max="${p.max || 5}" value="${lvl}" 
                            class="w-10 text-center text-xs bg-[#002200] border border-green-800 focus:border-green-400"
                            onchange="Admin.savePerk('${p.id}', this.value)">
                    `;
                    perkContainer.appendChild(div);
                });
            }
        }
    },

    saveStat: function(stat, val) {
        if(!this.currentPath) return;
        Network.db.ref(this.currentPath + '/stats/' + stat).set(Number(val));
    },

    // [NEU] Perk speichern
    savePerk: function(perkId, val) {
        if(!this.currentPath) return;
        const valNum = Number(val);
        // Wir speichern Perks jetzt sicher als Objekt-Map: { "medic": 2 }
        Network.db.ref(this.currentPath + '/perks/' + perkId).set(valNum);
    },

    fillInv: function(d) {
        const equipList = document.getElementById('equip-list');
        equipList.innerHTML = '';
        if(d.equip) {
            for(let slot in d.equip) {
                const item = d.equip[slot];
                if(item) {
                    const div = document.createElement('div');
                    div.className = "border border-[#1a551a] p-1 bg-[#001100] flex justify-between items-center";
                    div.innerHTML = `
                        <div><span class="text-xs text-gray-400 uppercase">${slot}:</span> <span class="text-green-300">${item.name}</span></div>
                        <button onclick="Admin.forceUnequip('${slot}')" class="text-red-500 text-xs hover:text-white px-1">UNEQUIP</button>
                    `;
                    equipList.appendChild(div);
                }
            }
        }

        const tbody = document.getElementById('inv-table-body');
        tbody.innerHTML = '';
        const inv = d.inventory || [];
        const items = (typeof Game !== 'undefined' && Game.items) ? Game.items : (window.GameData ? window.GameData.items : {});

        inv.forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-[#1a551a] hover:bg-[#002200]";
            
            let name = item.id;
            if(items[item.id]) name = items[item.id].name;
            if(item.props && item.props.name) name = item.props.name + "*";

            tr.innerHTML = `
                <td class="p-2 truncate max-w-[150px]" title="${name}">${name}</td>
                <td class="p-2 font-mono text-xs opacity-50 text-center">${item.count}</td>
                <td class="p-2 text-right">
                    <button onclick="Admin.invDelete(${idx})" class="text-red-500 font-bold hover:text-white px-2">X</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    fillCamp: function(d) {
        const container = document.getElementById('camp-data-content');
        if(!d.camp) {
            container.innerHTML = `
                <span class="text-gray-500 italic block mb-2">No camp deployed.</span>
                <button onclick="Admin.action('force-camp')" class="btn border-yellow-500 text-yellow-500 w-full text-sm">FORCE DEPLOY (Lvl 1)</button>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs text-green-600 mb-1">LEVEL</label>
                    <input type="number" value="${d.camp.level || 1}" class="text-2xl font-bold w-20 text-center"
                        onchange="Admin.saveVal('camp/level', this.value)">
                </div>
                <div>
                    <label class="block text-xs text-green-600 mb-1">LOCATION</label>
                    <div class="text-xs text-gray-500">Sector: ${d.camp.sector.x},${d.camp.sector.y}</div>
                </div>
            </div>
            <button onclick="Admin.action('destroy-camp')" class="btn btn-danger w-full mt-4">DESTROY CAMP</button>
        `;
    },

    fillWorld: function(d) {
        const sx = d.sector ? d.sector.x : 0;
        const sy = d.sector ? d.sector.y : 0;
        document.getElementById('view-sector').textContent = `${sx},${sy}`;
        document.getElementById('tele-x').value = sx;
        document.getElementById('tele-y').value = sy;

        const qList = document.getElementById('quest-list');
        qList.innerHTML = '';
        
        const active = d.activeQuests || d.quests || [];
        const completed = d.completedQuests || [];
        
        if(active.length === 0 && completed.length === 0) {
            qList.innerHTML = '<div class="text-gray-500 italic">No quest data found.</div>';
        }
        
        active.forEach(q => {
            const id = q.id || q;
            const progress = q.progress !== undefined ? `${q.progress}/${q.max}` : '?';
            const div = document.createElement('div');
            div.className = "flex justify-between border-b border-[#1a331a] p-2 text-sm bg-yellow-900/20";
            div.innerHTML = `
                <div>
                    <span class="font-bold text-yellow-400">${id}</span>
                    <div class="text-xs opacity-70">Progress: ${progress}</div>
                </div>
                <span class="text-yellow-500 text-xs">ACTIVE</span>
            `;
            qList.appendChild(div);
        });

        completed.forEach(qid => {
            const div = document.createElement('div');
            div.className = "flex justify-between border-b border-[#1a331a] p-2 text-sm opacity-60";
            div.innerHTML = `
                <span class="text-gray-400">${qid}</span>
                <span class="text-green-500 text-xs">DONE</span>
            `;
            qList.appendChild(div);
        });
    },

    fillRaw: function(d) {
        document.getElementById('raw-json').value = JSON.stringify(d, null, 2);
    },

    tab: function(id) {
        document.querySelectorAll('[id^="tab-btn-"]').forEach(b => {
            b.classList.replace('active-tab', 'inactive-tab');
        });
        const btn = document.getElementById('tab-btn-' + id);
        if(btn) btn.classList.replace('inactive-tab', 'active-tab');
        
        ['general', 'stats', 'inv', 'camp', 'world', 'raw'].forEach(t => {
            const el = document.getElementById('tab-' + t);
            if(el) el.classList.add('hidden');
        });
        
        const target = document.getElementById('tab-' + id);
        if(target) target.classList.remove('hidden');
    },

    saveVal: function(key, val) {
        if(!this.currentPath) return;
        if(!isNaN(val) && val !== "") val = Number(val);
        Network.db.ref(this.currentPath + '/' + key).set(val);
    },

    modVal: function(key, amount) {
        if(!this.currentUserData) return;
        let current = this.currentUserData[key] || 0;
        this.saveVal(key, current + amount);
    },

    action: function(type) {
        if(!this.currentPath) return;
        const updates = {};
        const p = this.currentPath;

        if (type === 'heal') {
            updates['hp'] = this.currentUserData.maxHp || 100;
            updates['rads'] = 0;
            updates['isGameOver'] = false;
        }
        else if (type === 'de-rad') {
            updates['rads'] = 0;
        }
        else if (type === 'kill') {
            if(!confirm("KILL PLAYER?")) return;
            updates['hp'] = 0;
            updates['isGameOver'] = true;
        }
        else if (type === 'revive') {
            updates['hp'] = 10;
            updates['isGameOver'] = false;
        }
        else if (type === 'delete') {
            if(!confirm("DELETE SAVEGAME PERMANENTLY?")) return;
            Network.db.ref(p).remove();
            this.currentPath = null;
            document.getElementById('editor-content').classList.add('hidden');
            document.getElementById('no-selection').classList.remove('hidden');
            return;
        }
        else if (type === 'reset-vault') {
            if(!confirm("RESET CHARACTER TO VAULT 101 (SECTOR 4,4)?")) return;
            updates['sector'] = {x: 4, y: 4};
            updates['player'] = {x: 100, y: 100}; 
            updates['view'] = 'map';
        }
        else if (type === 'destroy-camp') {
            if(!confirm("Destroy Camp?")) return;
            Network.db.ref(p + '/camp').remove();
            return;
        }
        else if (type === 'force-camp') {
            const sec = this.currentUserData.sector || {x:4, y:4};
            const pos = this.currentUserData.player || {x:100, y:100};
            updates['camp'] = {
                sector: sec,
                x: pos.x,
                y: pos.y,
                level: 1
            };
        }

        Network.db.ref(p).update(updates);
    },

    teleport: function() {
        const x = Number(document.getElementById('tele-x').value);
        const y = Number(document.getElementById('tele-y').value);
        Network.db.ref(this.currentPath + '/sector').set({x:x, y:y});
        Network.db.ref(this.currentPath + '/player').set({x:300, y:200}); 
    },

    invUpdate: function(idx, val) {
        val = Number(val);
        if(val <= 0) {
            this.invDelete(idx);
        } else {
            Network.db.ref(`${this.currentPath}/inventory/${idx}/count`).set(val);
        }
    },

    invDelete: function(idx) {
        if(!confirm("Remove Item?")) return;
        const inv = [...(this.currentUserData.inventory || [])];
        inv.splice(idx, 1);
        Network.db.ref(this.currentPath + '/inventory').set(inv);
    },

    invAdd: function() {
        const id = document.getElementById('inv-add-select').value;
        const count = Number(document.getElementById('inv-add-qty').value);
        if(!id || count < 1) return;

        const inv = [...(this.currentUserData.inventory || [])];
        let found = false;
        for(let item of inv) {
            if(item.id === id && !item.props) {
                item.count += count;
                found = true;
                break;
            }
        }
        if(!found) {
            inv.push({id: id, count: count, isNew: true});
        }
        Network.db.ref(this.currentPath + '/inventory').set(inv);
    },
    
    forceUnequip: function(slot) {
        if(!confirm(`Unequip ${slot}? This moves item to inventory.`)) return;
        const item = this.currentUserData.equip[slot];
        if(!item) return;
        
        const inv = [...(this.currentUserData.inventory || [])];
        inv.push({id: item.id, count: 1, props: item.props});
        Network.db.ref(this.currentPath + '/inventory').set(inv);
        Network.db.ref(this.currentPath + '/equip/' + slot).remove();
    },

    saveRaw: function() {
        try {
            const data = JSON.parse(document.getElementById('raw-json').value);
            if(confirm("OVERWRITE DATABASE WITH RAW JSON? THIS IS DESTRUCTIVE.")) {
                Network.db.ref(this.currentPath).set(data);
            }
        } catch(e) {
            alert("INVALID JSON: " + e.message);
        }
    }
};
