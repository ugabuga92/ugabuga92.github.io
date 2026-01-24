// [TIMESTAMP] 2026-01-24 23:00:00 - ui_view_town.js - ULTIMATE DEBUG

console.log(">> UI VIEW TOWN (GLOBAL DEBUG) GELADEN");

// Globale Notfall-Funktion, um Scope-Probleme zu umgehen
window.OPEN_SMITHY_DEBUG = function() {
    alert("DEBUG: Klick erkannt! Starte Schmied...");
    console.log("DEBUG: OPEN_SMITHY_DEBUG aufgerufen");

    try {
        const view = document.getElementById('view-container');
        if(!view) {
            alert("FEHLER: view-container nicht gefunden!");
            return;
        }
        
        // Screen leeren
        view.innerHTML = '';
        
        // Status setzen
        if(Game && Game.state) Game.state.view = 'smithy';

        // UI bauen
        const wrapper = document.createElement('div');
        wrapper.className = "absolute inset-0 w-full h-full flex flex-col bg-black z-50 overflow-hidden";
        wrapper.style.zIndex = "9999"; // Erzwinge Vordergrund

        wrapper.innerHTML = `
            <div class="p-4 border-b-2 border-orange-500 bg-orange-900/20">
                <h1 class="text-3xl text-orange-400 font-bold font-vt323">DER SCHMIED (DEBUG)</h1>
                <p class="text-white">Wenn du das liest, hat es funktioniert.</p>
            </div>
            <div class="p-4 text-center">
                <button class="border p-2 bg-red-500 text-white" onclick="UI.renderCity()">ZURÜCK</button>
            </div>
        `;
        
        view.appendChild(wrapper);
        console.log("DEBUG: Schmied-HTML eingefügt.");

    } catch(e) {
        alert("CRASH IN OPEN_SMITHY: " + e.message);
        console.error(e);
    }
};

Object.assign(UI, {
    
    shopQty: 1,

    renderCity: function(cityId = 'rusty_springs') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = ''; 
        
        Game.state.view = 'city';

        const wrapper = document.createElement('div');
        wrapper.className = "w-full h-full flex flex-col bg-black relative overflow-hidden";

        // Header (vereinfacht für Debug)
        const header = document.createElement('div');
        header.className = "p-4 border-b-4 border-green-900 bg-[#001100]";
        header.innerHTML = `<h1 class="text-4xl text-green-400 font-vt323">RUSTY SPRINGS</h1>`;
        wrapper.appendChild(header);

        const grid = document.createElement('div');
        grid.className = "flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 content-start bg-[#050a05]";

        const createCard = (label, icon, onClickFunc) => {
            const card = document.createElement('div');
            card.className = "relative p-4 flex items-center gap-4 border-2 border-green-600 bg-black/80 hover:bg-[#0a1a0a] cursor-pointer h-24";
            
            // WICHTIG: Hier binden wir das Event direkt
            card.onclick = function(e) {
                console.log("Klick auf Karte: " + label);
                e.preventDefault();
                e.stopPropagation();
                onClickFunc();
            };

            card.innerHTML = `
                <div class="text-4xl pointer-events-none">${icon}</div>
                <div class="flex flex-col pointer-events-none">
                    <span class="text-2xl font-bold text-green-500 font-vt323">${label}</span>
                </div>
            `;
            return card;
        };

        grid.appendChild(createCard("HANDELSPOSTEN", "🛒", () => UI.renderShop()));
        grid.appendChild(createCard("KLINIK", "⚕️", () => UI.renderClinic()));
        
        // HIER DER DEBUG-BUTTON
        grid.appendChild(createCard("DER SCHMIED [DEBUG]", "⚒️", () => {
            console.log("Schmied Button Lambda ausgeführt");
            window.OPEN_SMITHY_DEBUG();
        }));
        
        grid.appendChild(createCard("WERKBANK", "🛠️", () => UI.renderCrafting()));

        wrapper.appendChild(grid);

        const footer = document.createElement('div');
        footer.className = "p-3 border-t-4 border-green-900 bg-[#001100]";
        footer.innerHTML = `<button class="w-full border-2 border-green-600 text-green-500 py-3 font-bold" onclick="Game.leaveCity()">ZURÜCK</button>`;
        wrapper.appendChild(footer);

        view.appendChild(wrapper);
    },

    // Standard-Funktionen beibehalten, damit keine Fehler woanders auftreten
    renderShop: function() { 
        alert("Shop geht."); 
        // Falls du den Shop brauchst, hier wieder den alten Code einfügen oder einfach neu laden
    },
    renderClinic: function() { alert("Klinik geht."); },
    renderCrafting: function() { alert("Werkbank geht."); },
    renderSmithy: function() { window.OPEN_SMITHY_DEBUG(); }
});
