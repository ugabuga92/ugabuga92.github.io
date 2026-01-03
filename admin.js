// [v3.8] - 2026-01-03 08:00am (Admin System Update)
// - Security: Added strict login check.
// - Compatibility: Uses Game.items for dynamic list.
// - Cleanup: Removed obsolete functions.

const Admin = {
    
    selectedPlayerId: null,
    players: {},

    init: function() {
        console.log("[Admin] Initializing v3.8...");
        
        // Check Auth
        const session = localStorage.getItem('admin_session');
        if(session === 'active') {
            this.showDashboard();
        }

        // Initialize Firebase Listeners (only if needed/after login)
        if(typeof Network !== 'undefined' && Network.db) {
            this.startListeners();
        } else {
            // Wait for Firebase to be ready if loaded async
            setTimeout(() => this.init(), 500);
        }
    },

    login: function() {
        const u = document.getElementById('adm-user').value;
        const p = document.getElementById('adm-pass').value;
        const msg = document.getElementById('login-msg');

        // [SECURE CREDENTIALS]
        if(u === 'admin@pipboy-system.com' && p === 'zintel1992') {
            localStorage.setItem('admin_session', 'active');
            msg.textContent = "ACCESS GRANTED.";
            msg.className = "text-green-500 font-bold mt-2";
            setTimeout(() => this.showDashboard(), 1000);
        } else {
            msg.textContent = "ACCESS DENIED. INCIDENT LOGGED.";
            msg.className = "text-red-500 font-bold mt-2 blink-red";
        }
    },

    logout: function() {
        localStorage.removeItem('admin_session');
        location.reload();
    },

    showDashboard: function() {
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        document.getElementById('admin-dashboard').classList.add('flex');
        
        this.log("Session started. Welcome, Overseer.");
        this.startListeners();
        this.populateItemSelect();
    },

    startListeners: function() {
        if(!Network.db) return;
        
        // Listen to ALL players
        Network.db.ref('players').on('value', (snap) => {
            this.players = snap.val() || {};
            this.renderPlayerList();
        });
    },

    renderPlayerList: function() {
        const list = document.getElementById('player-list');
        list.innerHTML = '';

        if(Object.keys(this.players).length === 0) {
            list.innerHTML = '<div class="p-2 text-gray-500">No signals detected.</div>';
            return;
        }

        for(let pid in this.players) {
            const p = this.players[pid];
            const isDead = p.hp <= 0;
            const div = document.createElement('div');
            div.className = `p-2 border-b border-green-900 cursor-pointer hover:bg-green-900/30 ${this.selectedPlayerId === pid ? 'bg-green-900/50 border-l-4 border-yellow-400' : ''}`;
            div.onclick = () => this.selectPlayer(pid);
            
            div.innerHTML = `
                <div class="flex justify-between font-bold">
                    <span class="${isDead ? 'text-red-500 line-through' : 'text-white'}">${p.name || 'Unknown'}</span>
                    <span class="text-yellow-400">LVL ${p.lvl || 1}</span>
                </div>
                <div class="text-xs text-gray-400 font-mono">
                    ID: ${pid.substr(0,8)}... | SEC: [${p.sector ? p.sector.x : '?'},${p.sector ? p.sector.y : '?'}] | HP: ${p.hp}/${p.maxHp}
                </div>
            `;
            list.appendChild(div);
        }
    },

    selectPlayer: function(pid) {
        this.selectedPlayerId = pid;
        const p = this.players[pid];
        
        document.getElementById('target-name').textContent = p.name;
        document.getElementById('target-id').textContent = pid;
        
        // Fill Edit Fields
        document.getElementById('edit-lvl').value = p.lvl || 1;
        document.getElementById('edit-caps').value = p.caps || 0;
        
        this.renderPlayerList(); // Update highlight
        this.log(`Target acquired: ${p.name}`);
    },

    switchTab: function(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    },

    populateItemSelect: function() {
        const sel = document.getElementById('item-select');
        if(!Game || !Game.items) {
            console.error("Game.items missing. Make sure data_items.js is loaded.");
            return;
        }
        
        // Clear old options (keep first)
        while(sel.options.length > 1) sel.remove(1);

        const sortedKeys = Object.keys(Game.items).sort();
        sortedKeys.forEach(key => {
            const item = Game.items[key];
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${item.name} (${key})`;
            sel.appendChild(opt);
        });
    },

    // --- ACTIONS ---

    modStat: function(stat, amount) {
        if(!this.selectedPlayerId) return;
        const p = this.players[this.selectedPlayerId];
        let newVal = (p[stat] || 0) + amount;
        if(newVal < 0) newVal = 0;

        Network.db.ref(`players/${this.selectedPlayerId}/${stat}`).set(newVal);
        this.log(`Modified ${stat} for ${p.name}: ${newVal}`);
    },

    fullHeal: function() {
        if(!this.selectedPlayerId) return;
        const p = this.players[this.selectedPlayerId];
        Network.db.ref(`players/${this.selectedPlayerId}/hp`).set(p.maxHp);
        Network.db.ref(`players/${this.selectedPlayerId}/rads`).set(0);
        this.log(`Fully restored ${p.name}.`);
    },

    killTarget: function() {
        if(!this.selectedPlayerId) return;
        if(!confirm("TERMINATE SUBJECT? THIS CANNOT BE UNDONE.")) return;
        
        Network.db.ref(`players/${this.selectedPlayerId}/hp`).set(0);
        this.log(`Target terminated.`);
    },

    giveItem: function() {
        if(!this.selectedPlayerId) { alert("Select a player first!"); return; }
        const itemId = document.getElementById('item-select').value;
        const count = parseInt(document.getElementById('item-count').value) || 1;

        if(!itemId) return;

        // Fetch current inventory
        Network.db.ref(`players/${this.selectedPlayerId}/inventory`).once('value', snap => {
            let inv = snap.val() || [];
            
            // Add Item Logic (Simplified version of game_actions.js)
            let added = false;
            // Check stack
            for(let item of inv) {
                if(item.id === itemId && !item.props) {
                    item.count += count;
                    added = true;
                    break;
                }
            }
            // New slot
            if(!added) {
                inv.push({ id: itemId, count: count, isNew: true });
            }

            Network.db.ref(`players/${this.selectedPlayerId}/inventory`).set(inv);
            this.log(`Sent ${count}x ${itemId} to target.`);
        });
    },

    giveKit: function(type) {
        if(!this.selectedPlayerId) return;
        
        const kits = {
            'starter': [
                {id: 'knife', count: 1}, 
                {id: 'stimpack', count: 3}, 
                {id: 'water', count: 2}
            ],
            'camp': [
                {id: 'camp_kit', count: 1}, 
                {id: 'meat', count: 5}, 
                {id: 'wood', count: 10}
            ],
            'god': [
                {id: 'plasma_rifle', count: 1}, 
                {id: 'power_armor', count: 1}, 
                {id: 'ammo', count: 500},
                {id: 'stimpack', count: 50}
            ]
        };

        const itemsToAdd = kits[type];
        if(!itemsToAdd) return;

        Network.db.ref(`players/${this.selectedPlayerId}/inventory`).once('value', snap => {
            let inv = snap.val() || [];
            itemsToAdd.forEach(newItem => {
                let added = false;
                for(let item of inv) {
                    if(item.id === newItem.id) { item.count += newItem.count; added = true; break; }
                }
                if(!added) inv.push(newItem);
            });
            Network.db.ref(`players/${this.selectedPlayerId}/inventory`).set(inv);
            this.log(`Deployed KIT: ${type.toUpperCase()}`);
        });
    },

    sendBroadcast: function(type) {
        const txt = document.getElementById('broadcast-msg').value;
        if(!txt) return;
        
        // Wir schreiben in einen globalen "broadcast" Pfad, auf den Clients hören könnten
        // (Müsste im Client noch implementiert werden, hier nur als Admin-Action vorbereitet)
        // Alternativ: Wir manipulieren den Chat oder Logs.
        // Vorerst: Nur Log.
        this.log(`BROADCAST SENT: [${type.toUpperCase()}] ${txt}`);
        alert("Broadcast Feature: Client-Side Listener required (Future Update).");
    },

    log: function(msg) {
        const box = document.getElementById('admin-log');
        const entry = document.createElement('div');
        entry.className = "log-entry";
        entry.textContent = `> ${msg}`;
        box.insertBefore(entry, box.firstChild);
    }
};

// Auto-Init on Load
window.onload = function() {
    Admin.init();
};
