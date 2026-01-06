Object.assign(UI, {

    // [v0.9.1] CITY DASHBOARD SYSTEM
    renderCity: function(cityId = 'rusty_springs') {
        const view = document.getElementById('view-container');
        if(!view) return;
        view.innerHTML = ''; 
        
        // WICHTIG: Status setzen, damit das Spiel weiß, dass wir im Menü sind
        Game.state.view = 'city';

        const cityData = {
            'rusty_springs': {
                name: "RUSTY SPRINGS",
                pop: 142, sec: "HOCH", rad: "NIEDRIG",
                flairs: [
                    "Die Luft riecht nach Rost und Ozon.",
                    "Ein Generator brummt in der Ferne.",
                    "Händler schreien ihre Preise aus.",
                    "Der sicherste Ort im Sektor."
                ]
            }
        };

        const data = cityData[cityId] || cityData['rusty_springs'];
        const flair = data.flairs[Math.floor(Math.random() * data.flairs.length)];

        // 1. HEADER
        const header = document.createElement('div');
        header.className = "city-header flex flex-col items-center justify-center relative";
        
        header.innerHTML = `
            <div class="text-5xl font-bold text-green-400 tracking-widest text-shadow-glow mb-1 font-vt323">${data.name}</div>
            <div class="flex gap-4 text-xs text-green-700 font-mono border-t border-green-900 pt-2">
                <span>POP: <span class="text-green-400">${data.pop}</span></span>
                <span>SEC: <span class="text-cyan-400">${data.sec}</span></span>
                <span>RAD: <span class="text-yellow-600">${data.rad}</span></span>
            </div>
            <div class="text-gray-500 text-xs italic mt-2">"${flair}"</div>
            
            <div class="absolute right-4 top-4 bg-black/80 border border-yellow-600 px-3 py-1 rounded text-yellow-400 font-bold shadow-[0_0_10px_orange]">
                💰 ${Game.state.caps}
            </div>
        `;
        view.appendChild(header);

        // 2. GRID DASHBOARD
        const grid = document.createElement('div');
        grid.className = "city-grid flex-grow overflow-y-auto custom-scrollbar";

        // A. HÄNDLER
        this.createCityCard(grid, {
            icon: "🛒", label: "HANDELSPOSTEN", sub: "Waffen • Munition", type: "trader",
            onClick: () => {
                // Prüfen ob Funktion existiert
                if(UI.renderShop) UI.renderShop(); 
                else console.error("UI.renderShop is missing!");
            }
        });

        // B. ARZT
        this.createCityCard(grid, {
            icon: "⚕️", label: "KLINIK", sub: "Dr. Zimmermann", color: "text-red-400",
            onClick: () => {
                if(UI.renderClinic) UI.renderClinic();
                else console.error("UI.renderClinic is missing!");
            }
        });

        // C. WERKBANK
        this.createCityCard(grid, {
            icon: "🛠️", label: "WERKBANK", sub: "Zerlegen & Bauen", color: "text-blue-400",
            onClick: () => {
                if(UI.renderCrafting) UI.renderCrafting();
                else console.error("UI.renderCrafting is missing!");
            }
        });

        // (Baracke entfernt)

        view.appendChild(grid);

        // 3. FOOTER
        const footer = document.createElement('div');
        footer.className = "p-4 border-t border-green-900 bg-black";
        footer.innerHTML = `
            <button class="action-button w-full border-green-500 text-green-500 py-3 font-bold text-xl hover:bg-green-900" onclick="Game.leaveCity()">
                ZURÜCK INS ÖDLAND (ESC)
            </button>
        `;
        view.appendChild(footer);
    },

    createCityCard: function(container, conf) {
        const card = document.createElement('div');
        card.className = `city-card ${conf.type || ''}`;
        card.onclick = conf.onClick;
        
        const colorClass = conf.color || ""; 
        const iconSize = conf.type === 'trader' ? 'text-6xl' : 'text-4xl';

        card.innerHTML = `
            <div class="icon ${iconSize} ${colorClass}">${conf.icon}</div>
            <div class="label ${colorClass}">${conf.label}</div>
            <div class="sub ${conf.type === 'trader' ? 'text-yellow-200' : 'text-gray-500'}">${conf.sub}</div>
        `;
        container.appendChild(card);
    }
});
