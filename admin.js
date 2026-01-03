// [v3.9] - 2026-01-03 09:45am (Admin Logic Classic)
// Features: Login, Player List, Stats Edit, Item Spawner, No Hazards.

const Admin = {
    selectedId: null,
    players: {},

    init: function() {
        // Auto-Login Check
        if(localStorage.getItem('admin_session') === 'active') {
            this.showDashboard();
        }
    },

    login: function() {
        const u = document.getElementById('adm-user').value;
        const p = document.getElementById('adm-pass').value;
        const msg = document.getElementById('login-msg');

        if(u === 'admin@pipboy-system.com' && p === 'zintel1992') {
            localStorage.setItem('admin_session', 'active');
            msg.textContent = "ZUGRIFF ERLAUBT.";
            msg.className = "mt-4 text-green-500 font-bold";
            setTimeout(() => this.showDashboard(), 800);
        } else {
            msg.textContent = "ZUGRIFF VERWEIGERT.";
            msg.className = "mt-4 text-red-500 font-bold animate-pulse";
        }
    },

    logout: function() {
        localStorage.removeItem('admin_session');
        location.reload();
    },

    showDashboard: function() {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('flex');
        
        this.populateItems();
        this.startListener();
    },

    startListener: function() {
        if(!Network.db) { setTimeout(() => this.startListener(), 500); return; }
        
        Network.db.ref('players').on('value', snap => {
            this.players = snap.val() || {};
            this.renderList();
            if(this.selectedId && this.players[this.selectedId]) {
                this.updateDetailView(this.players[this.selectedId]);
            }
        });
    },

    renderList: function() {
        const list = document.getElementById('player-list');
        list.innerHTML = '';

        const ids = Object.keys(this.players);
        if(ids.length === 0) {
            list.innerHTML = '<div class="p-4 text-gray-500 text-center">Keine Spieler online.</div>';
            return;
        }

        ids.forEach(pid => {
            const p = this.players[pid];
            const div = document.createElement('div');
            div.className = `player-item flex justify-between items-center ${this.selectedId === pid ? 'active' : ''}`;
            div.onclick = () => this.selectPlayer(pid);
            
            const isDead = p.hp <= 0;
            const statusIcon = isDead ? '💀' : '👤';
            
            div.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-bold text-lg">${statusIcon} ${p.name}</span>
                    <span class="text-xs opacity-70 font-mono">${pid.substr(0,6)}...</span>
                </div>
                <div class="text-right">
                    <div class="font-bold">Lvl ${p.lvl || 1}</div>
                    <div class="text-xs opacity-70">Sektor [${p.sector?.x || 0},${p.sector?.y || 0}]</div>
                </div>
            `;
            list.appendChild(div);
        });
    },

    selectPlayer: function(pid) {
        this.selectedId = pid;
        this.renderList(); // Highlight update
        
        const panel = document.getElementById('control-panel');
        const overlay = document.getElementById('no-selection-msg');
        
        panel.classList.remove('opacity-50', 'pointer-events-none');
        overlay.classList.add('hidden');

        if(this.players[pid]) this.updateDetailView(this.players[pid]);
    },

    updateDetailView: function(p) {
        document.getElementById('target-name').textContent = p.name;
        document.getElementById('target-id').textContent = `ID: ${this.selectedId}`;
        document.getElementById('target-lvl').textContent = p.lvl || 1;
        document.getElementById('target-hp').textContent = `${Math.round(p.hp)}/${p.maxHp}`;
        
        // Farbe bei Low HP
        const hpEl = document.getElementById('target-hp');
        hpEl.className = p.hp < (p.maxHp * 0.3) ? 'text-red-500 font-bold blink-red' : 'text-green-400';
    },

    populateItems: function() {
        const sel = document.getElementById('item-select');
        if(!Game || !Game.items) return;

        // Sortierte Liste
        const keys = Object.keys(Game.items).sort();
        keys.forEach(k => {
            const item = Game.items[k];
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = `${item.name} (${k})`;
            sel.appendChild(opt);
        });
    },

    // --- ACTIONS ---

    modStat: function(stat, val) {
        if(!this.selectedId) return;
        const p = this.players[this.selectedId];
        let current = p[stat] || 0;
        let next = current + val;
        if(next < 0) next = 0;
        
        Network.db.ref(`players/${this.selectedId}/${stat}`).set(next);
    },

    fullHeal: function() {
        if(!this.selectedId) return;
        const p = this.players[this.selectedId];
        Network.db.ref(`players/${this.selectedId}/hp`).set(p.maxHp);
        Network.db.ref(`players/${this.selectedId}/rads`).set(0);
        Network.db.ref(`players/${this.selectedId}/isGameOver`).set(false); // Revive flag just in case
    },

    killTarget: function() {
        if(!this.selectedId) return;
        if(confirm("Diesen Spieler wirklich töten? (HP auf 0)")) {
            Network.db.ref(`players/${this.selectedId}/hp`).set(0);
        }
    },

    giveItem: function() {
        if(!this.selectedId) return;
        const item = document.getElementById('item-select').value;
        const count = parseInt(document.getElementById('item-count').value) || 1;
        
        if(!item) { alert("Bitte Item wählen!"); return; }

        this.sendToInv(this.selectedId, [{id: item, count: count}]);
    },

    giveKit: function(type) {
        if(!this.selectedId) return;
        
        const kits = {
            'starter': [{id:'knife',count:1}, {id:'stimpack',count:3}, {id:'water',count:2}],
            'camp': [{id:'camp_kit',count:1}, {id:'wood',count:10}, {id:'meat',count:5}],
            'god': [{id:'plasma_rifle',count:1}, {id:'power_armor',count:1}, {id:'ammo',count:500}, {id:'stimpack',count:50}]
        };

        if(kits[type]) this.sendToInv(this.selectedId, kits[type]);
    },

    sendToInv: function(pid, itemsToAdd) {
        Network.db.ref(`players/${pid}/inventory`).once('value', snap => {
            let inv = snap.val() || [];
            
            itemsToAdd.forEach(newItem => {
                let added = false;
                // Stack check
                for(let i of inv) {
                    if(i.id === newItem.id && !i.props) {
                        i.count += newItem.count;
                        added = true;
                        break;
                    }
                }
                if(!added) inv.push({ id: newItem.id, count: newItem.count, isNew: true });
            });

            Network.db.ref(`players/${pid}/inventory`).set(inv);
            alert(`${itemsToAdd.length} Items gesendet.`);
        });
    }
};

window.onload = function() { Admin.init(); };
