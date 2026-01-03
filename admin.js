// [v4.0] - 2026-01-03 (Admin System Overhaul)
// - Gatekeeper: "bimbo123" protects the UI.
// - Auto-Auth: Uses 'admin@pipboy-system.com' internally.
// - Full Management: Inventory, Stats, Location, Raw Data.

const Admin = {
    // Config
    gatePass: "bimbo123",
    adminUser: "admin@pipboy-system.com",
    adminPass: "zintel1992",

    // State
    dbData: {}, // Full snapshot of 'saves'
    currentPath: null, // e.g., 'saves/UID/0'
    currentUserData: null, // Local copy of selected save
    itemsList: [], // Loaded from data_items.js

    // --- 1. GATEKEEPER & INIT ---
    
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
        // Init Network if not ready
        if (typeof Network !== 'undefined' && !Network.db) {
            try { if(typeof Network.init === 'function') Network.init(); } catch(e) {}
        }

        try {
            // Real Auth
            await Network.login(this.adminUser, this.adminPass);
            
            // Switch UI
            document.getElementById('gate-screen').classList.add('hidden');
            const app = document.getElementById('app-ui');
            app.classList.remove('hidden');
            // Fade In
            setTimeout(() => app.classList.remove('opacity-0'), 50);
            
            // Start Data Flow
            document.getElementById('conn-dot').classList.replace('bg-red-500', 'bg-green-500');
            document.getElementById('conn-dot').classList.remove('animate-pulse');
            
            this.initData();

        } catch(e) {
            document.getElementById('gate-msg').textContent = "UPLINK FAILED: " + e.code;
            console.error(e);
        }
    },

    initData: function() {
        // Load Game Items for Dropdown
        if(typeof Game !== 'undefined' && Game.items) {
            this.itemsList = Object.keys(Game.items).sort().map(k => ({id: k, name: Game.items[k].name}));
            const sel = document.getElementById('inv-add-select');
            sel.innerHTML = '';
            this.itemsList.forEach(i => {
                const opt = document.createElement('option');
                opt.value = i.id;
                opt.textContent = `${i.name} (${i.id})`;
                sel.appendChild(opt);
            });
        }

        // Start Firebase Listener on 'saves' (The Master Record)
        Network.db.ref('saves').on('value', snap => {
            this.dbData = snap.val() || {};
            this.renderUserList();
            // Auto-refresh selected view if active
            if(this.currentPath) {
                const parts = this.currentPath.split('/'); // saves, uid, slot
                if(this.dbData[parts[1]] && this.dbData[parts[1]][parts[2]]) {
                    this.selectUser(this.currentPath, true); // true = silent update
                }
            }
        });
    },

    refresh: function() {
        location.reload(); // Hard refresh to clear memory/cache
    },

    // --- 2. USER LIST ---

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
                
                // Filter
                if(filter && !name.includes(filter) && !uid.includes(filter)) continue;

                const div = document.createElement('div');
                const isSelected = this.currentPath === path;
                const isDead = (save.hp <= 0);
                
                div.className = `p-2 cursor-pointer border-b border-[#1a331a] flex justify-between items-center hover:bg-[#39ff14] hover:text-black transition-colors ${isSelected ? 'bg-[#39ff14] text-black font-bold' : 'text-[#39ff14]'}`;
                div.onclick = () => this.selectUser(path);
                
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
        this.currentPath = path;
        
        // Extract Data
        const parts = path.split('/');
        const uid = parts[1];
        const slot = parts[2];
        this.currentUserData = this.dbData[uid][slot];
        const d = this.currentUserData;

        // UI Update
        if(!silent) {
            document.querySelectorAll('.active-tab').forEach(el => {
                el.classList.remove('active-tab');
                el.classList.add('inactive-tab');
            });
            document.getElementById('tab-btn-general').classList.add('active-tab');
            document.getElementById('tab-btn-general').classList.remove('inactive-tab');
            this.tab('general');
        }

        // Header Info
        document.getElementById('no-selection').classList.add('hidden');
        document.getElementById('editor-content').classList.remove('hidden');
        
        document.getElementById('edit-name').textContent = d.playerName || "Unknown";
        document.getElementById('edit-uid').textContent = uid;
        document.getElementById('edit-slot').textContent = slot;
        document.getElementById('edit-email').textContent = d._userEmail || "No Email";
        
        document.getElementById('quick-lvl').value = d.lvl || 1;
        document.getElementById('quick-xp').value = d.xp || 0;

        // Fill Tabs
        this.fillGeneral(d);
        this.fillStats(d);
        this.fillInv(d);
        this.fillWorld(d);
        this.fillRaw(d);
        
        // Refresh List Highlight
        if(!silent) this.renderUserList(); 
    },

    // --- 3. EDITOR FILLERS ---

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
    },

    fillInv: function(d) {
        const tbody = document.getElementById('inv-table-body');
        tbody.innerHTML = '';
        
        const inv = d.inventory || [];
        inv.forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-[#1a551a] hover:bg-[#002200]";
            
            // Name resolve
            let name = item.id;
            if(Game.items[item.id]) name = Game.items[item.id].name;
            if(item.props && item.props.name) name = item.props.name + "*"; // Custom item

            tr.innerHTML = `
                <td class="p-2">${name}</td>
                <td class="p-2 font-mono text-xs opacity-50">${item.id}</td>
                <td class="p-2">
                    <input type="number" class="w-16 bg-black border border-[#1a551a] text-center" 
                        value="${item.count}" onchange="Admin.invUpdate(${idx}, this.value)">
                </td>
                <td class="p-2 text-right">
                    <button onclick="Admin.invDelete(${idx})" class="text-red-500 font-bold hover:text-white px-2">X</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    fillWorld: function(d) {
        const sx = d.sector ? d.sector.x : 0;
        const sy = d.sector ? d.sector.y : 0;
        document.getElementById('view-sector').textContent = `${sx},${sy}`;
        document.getElementById('tele-x').value = sx;
        document.getElementById('tele-y').value = sy;

        // Quests
        const qList = document.getElementById('quest-list');
        qList.innerHTML = '';
        const quests = d.quests || [];
        
        if(quests.length === 0) qList.innerHTML = '<div class="text-gray-500 italic">No active quests.</div>';
        
        quests.forEach((q, idx) => {
            const div = document.createElement('div');
            div.className = "flex justify-between border-b border-[#1a331a] p-1 text-sm";
            div.innerHTML = `
                <span>${q.id} <span class="text-xs opacity-50">(${q.stage})</span></span>
                <span class="${q.completed ? 'text-green-500' : 'text-yellow-500'}">${q.completed ? 'DONE' : 'ACTIVE'}</span>
            `;
            qList.appendChild(div);
        });
    },

    fillRaw: function(d) {
        document.getElementById('raw-json').value = JSON.stringify(d, null, 2);
    },

    // --- 4. ACTIONS & SAVING ---

    tab: function(id) {
        document.querySelectorAll('[id^="tab-btn-"]').forEach(b => {
            b.classList.replace('active-tab', 'inactive-tab');
        });
        document.getElementById('tab-btn-' + id).classList.replace('inactive-tab', 'active-tab');
        
        document.getElementById('tab-general').classList.add('hidden');
        document.getElementById('tab-stats').classList.add('hidden');
        document.getElementById('tab-inv').classList.add('hidden');
        document.getElementById('tab-world').classList.add('hidden');
        document.getElementById('tab-raw').classList.add('hidden');
        
        document.getElementById('tab-' + id).classList.remove('hidden');
    },

    saveVal: function(key, val) {
        if(!this.currentPath) return;
        // Convert numbers
        if(!isNaN(val) && val !== "") val = Number(val);
        Network.db.ref(this.currentPath + '/' + key).set(val);
    },

    modVal: function(key, amount) {
        if(!this.currentUserData) return;
        let current = this.currentUserData[key] || 0;
        this.saveVal(key, current + amount);
    },

    saveStat: function(stat, val) {
        if(!this.currentPath) return;
        Network.db.ref(this.currentPath + '/stats/' + stat).set(Number(val));
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
            updates['player'] = {x: 100, y: 100}; // Safe Pixel Coords
            
            // Optional: Reset local view flags
            updates['view'] = 'map';
        }

        Network.db.ref(p).update(updates);
    },

    teleport: function() {
        const x = Number(document.getElementById('tele-x').value);
        const y = Number(document.getElementById('tele-y').value);
        
        Network.db.ref(this.currentPath + '/sector').set({x:x, y:y});
        // Reset player pixel pos to center to avoid getting stuck in walls in new sector
        Network.db.ref(this.currentPath + '/player').set({x:300, y:200}); 
    },

    // Inventory Logic
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
        // Firebase arrays are tricky. We fetch, splice, set.
        const inv = [...(this.currentUserData.inventory || [])];
        inv.splice(idx, 1);
        Network.db.ref(this.currentPath + '/inventory').set(inv);
    },

    invAdd: function() {
        const id = document.getElementById('inv-add-select').value;
        const count = Number(document.getElementById('inv-add-qty').value);
        if(!id || count < 1) return;

        const inv = [...(this.currentUserData.inventory || [])];
        
        // Stack?
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
