// game.js
// Enthält alle globalen Spielvariablen, Konstanten und Kernlogik.

// Globale Konstanten
const TILE_SIZE = 30; 
const MAP_WIDTH = 20; 
const MAP_HEIGHT = 12; 
const WORLD_SIZE = 10; 
const START_SECTOR_X = 5;
const START_SECTOR_Y = 5;
const GOAL_SECTOR = { x: 0, y: 0 }; 
const BASE_STATS = { STR: 5, PER: 5, END: 5, INT: 5, AGI: 5, LUC: 5 };

// Welt- und Karten-Zustand (von Game.initNewGame() initialisiert)
let mapLayout = []; 
let worldState = {}; 
let animationFrameId = null; 

// Zustand des Spiels
let gameState = {};

// Canvas-Elemente (Zugriff von UI.js)
let canvas, ctx; 

// Game Data
const mapColors = {
    'V': '#39ff14', 
    'C': '#7a661f', 
    'X': '#ff3914', 
    'G': '#00ffff', 
    '.': 'var(--color-arid)', 
    '#': 'var(--color-path)', 
    '^': 'var(--color-rock)', 
    '~': 'var(--color-water)', 
    'fog': 'var(--color-fog)', 
    'player': '#ff3914' 
};

const monsters = {
    moleRat: { name: "Maulwurfsratte", hp: 30, damage: 15, loot: 10, key: 'moleRat', exp: 50, minLevel: 1, description: "Eine aggressive Nagerart, die schnell zuschlägt. Häufig im Ödland anzutreffen." }, 
    mutantRose: { name: "Mutanten Rose", hp: 45, damage: 20, loot: 15, key: 'mutantRose', exp: 75, minLevel: 1, description: "Eine durch Strahlung mutierte Pflanze, die mit giftigen Stacheln angreift." },
    deathclaw: { name: "Todesklaue", hp: 120, damage: 45, loot: 50, key: 'deathclaw', exp: 300, minLevel: 5, description: "Eines der furchteinflößendsten Raubtiere des Ödlands. Extrem schnell und tödlich." }
};

const items = {
    none_head: { name: "Kein Helm", slot: 'head', bonus: {}, requiredLevel: 1 },
    none_feet: { name: "Stiefel", slot: 'feet', bonus: {}, requiredLevel: 1 },
    fists: { name: "Fäuste", slot: 'weapon', bonus: {}, requiredLevel: 1, isRanged: false }, 
    knife: { name: "Messer", slot: 'weapon', bonus: { STR: 1 }, requiredLevel: 1, cost: 15, isRanged: false },
    pistol: { name: "10mm Pistole", slot: 'weapon', bonus: { AGI: 2 }, requiredLevel: 1, cost: 50, isRanged: true },
    armor_vault: { name: "Vault-Anzug", slot: 'body', bonus: { END: 1 }, requiredLevel: 1 },
    armor_leather: { name: "Lederharnisch", slot: 'body', bonus: { END: 2 }, requiredLevel: 1, cost: 30 },
    helmet_metal: { name: "Metallhelm", slot: 'head', bonus: { END: 1, PER: 1 }, requiredLevel: 1, cost: 20 },
    rifle_laser: { name: "Laser-Gewehr", slot: 'weapon', bonus: { PER: 3, INT: 1 }, requiredLevel: 5, cost: 300, isRanged: true },
    armor_combat: { name: "Kampf-Harnisch", slot: 'body', bonus: { END: 3, STR: 1 }, requiredLevel: 5, cost: 150 },
    helmet_combat: { name: "Kampfhelm", slot: 'head', bonus: { END: 2, PER: 2 }, requiredLevel: 5, cost: 75 },
    rifle_plasma: { name: "Plasma-Gewehr", slot: 'weapon', bonus: { PER: 4, INT: 2, LUC: 1 }, requiredLevel: 10, cost: 600, isRanged: true },
    armor_power: { name: "Power-Rüstung T-60", slot: 'body', bonus: { END: 5, STR: 5, AGI: -2 }, requiredLevel: 10, cost: 1000 },
    helmet_power: { name: "Power-Helm T-60", slot: 'head', bonus: { END: 3, PER: 3 }, requiredLevel: 10, cost: 400 },
};

// --- Kern-Logik Objekt ---
const Game = {
    // Exponiere den Zustand für UI.js
    gameState: gameState,
    worldState: worldState,
    mapLayout: mapLayout,
    monsters: monsters,
    items: items,
    mapColors: mapColors,
    animationFrameId: animationFrameId,
    
    // Hilfsfunktionen
    calculateMaxHP: function(endurance) {
        return 100 + (endurance - 5) * 10;
    },

    expToNextLevel: function(level) {
        return 100 + level * 50; 
    },
    
    getStat: function(key) {
        let val = Game.gameState.stats[key];
        if (Game.gameState.tempStatIncrease.key === key) {
            val += Game.gameState.tempStatIncrease.value;
        }
        for (const slot in Game.gameState.equipment) {
            const item = Game.gameState.equipment[slot];
            if (item && item.bonus[key]) {
                val += item.bonus[key];
            }
        }
        return val;
    },

    gainExp: function(amount) {
        if (Game.gameState.isGameOver) return;
        
        Game.gameState.exp += amount;
        UI.log(`+${amount} EXP erhalten.`, 'text-blue-400');
        
        let expNeeded = Game.expToNextLevel(Game.gameState.level);
        
        while (Game.gameState.exp >= expNeeded) {
            Game.gameState.level++;
            Game.gameState.statPoints++;
            Game.gameState.exp -= expNeeded;
            expNeeded = Game.expToNextLevel(Game.gameState.level);
            
            const maxHp = Game.calculateMaxHP(Game.getStat('END')); 
            Game.gameState.health = Math.min(maxHp, Game.gameState.health + 20); 
            
            UI.log(`LEVEL UP! Du bist jetzt Level ${Game.gameState.level}! +1 Stat-Punkt.`, 'text-red-500 bg-yellow-400/20');
        }
        UI.updateUI();
    },
    
    // --- MAP GENERATION ---
    getSectorKey: function(x, y) {
        return `${x},${y}`;
    },

    generateRandomMap: function(sectorX, sectorY) {
        const key = Game.getSectorKey(sectorX, sectorY);
        let sectorData = Game.worldState[key];
        
        if (sectorData && sectorData.layout) {
             return { layout: sectorData.layout.map(row => row.split('')), startX: MAP_WIDTH / 2, startY: MAP_HEIGHT / 2 };
        }
        
        let newMap = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill('.'));
        const spots = [];

        // 1. Mauern um die Map ziehen
        for (let y = 0; y < MAP_HEIGHT; y++) {
            newMap[y][0] = '^';
            newMap[y][MAP_WIDTH - 1] = '^';
        }
        for (let x = 0; x < MAP_WIDTH; x++) {
            newMap[0][x] = '^';
            newMap[MAP_HEIGHT - 1][x] = '^';
        }
        
        // 2. Tore ('G') an den Rändern
        const placeGate = (borderIndex) => {
            const range = borderIndex === 0 || borderIndex === 1 ? MAP_WIDTH - 2 : MAP_HEIGHT - 2;
            const pos = Math.floor(Math.random() * range) + 1;
            
            if (borderIndex === 0 && sectorY > 0) newMap[0][pos] = 'G'; // Oben
            if (borderIndex === 1 && sectorY < WORLD_SIZE - 1) newMap[MAP_HEIGHT - 1][pos] = 'G'; // Unten
            if (borderIndex === 2 && sectorX > 0) newMap[pos][0] = 'G'; // Links
            if (borderIndex === 3 && sectorX < WORLD_SIZE - 1) newMap[pos][MAP_WIDTH - 1] = 'G'; // Rechts
        };
        for (let i = 0; i < 4; i++) { placeGate(i); }

        // 3. Besondere Orte
        const minDistance = 5; 
        let hasPOI = false;
        let poiMarkers = [];

        if (sectorX === START_SECTOR_X && sectorY === START_SECTOR_Y) { poiMarkers.push('V'); }
        if (sectorX === GOAL_SECTOR.x && sectorY === GOAL_SECTOR.y) { poiMarkers.push('X'); }
        if (poiMarkers.length === 0 && Math.random() < 0.4) { poiMarkers.push('C'); }

        function isValidPlacement(x, y) {
            if (!newMap[y] || newMap[y][x] !== '.') return false;
            for (const spot of spots) {
                if (Math.hypot(spot.x - x, spot.y - y) < minDistance) { return false; }
            }
            return true;
        }

        for (const marker of poiMarkers) {
            let placed = false;
            let attempts = 100;
            while (!placed && attempts > 0) {
                const x = Math.floor(Math.random() * (MAP_WIDTH - 4)) + 2;
                const y = Math.floor(Math.random() * (MAP_HEIGHT - 4)) + 2;
                if (isValidPlacement(x, y)) {
                    newMap[y][x] = marker;
                    spots.push({ x, y, marker });
                    hasPOI = true;
                    placed = true;
                }
                attempts--;
            }
        }
        
        // 4. Wasser und Pfade
        if (!hasPOI) { 
            const waterSize = Math.floor(Math.random() * 2) + 2; 
            const waterStart = { x: Math.floor(Math.random() * (MAP_WIDTH - waterSize - 1)) + 1, 
                                 y: Math.floor(Math.random() * (MAP_HEIGHT - waterSize - 1)) + 1 };
            
            for (let y = waterStart.y; y < waterStart.y + waterSize; y++) {
                for (let x = waterStart.x; x < waterStart.x + waterSize; x++) {
                    if (newMap[y] && newMap[y][x] === '.') newMap[y][x] = '~';
                }
            }
        }

        const generatedMap = newMap.map(row => row.join(''));
        
        sectorData = {
            layout: generatedMap,
            explored: false,
            markers: spots.map(s => s.marker)
        };
        Game.worldState[key] = sectorData;

        let startX = Math.floor(MAP_WIDTH / 2);
        let startY = Math.floor(MAP_HEIGHT / 2);
        const vaultSpot = spots.find(s => s.marker === 'V');
        if (vaultSpot) { startX = vaultSpot.x; startY = vaultSpot.y + 1; }

        return { layout: newMap, startX, startY };
    },
    
    // --- DRAW LOOP ---
    draw: function() {
        if (Game.gameState.currentView !== 'map' || Game.gameState.isGameOver || !ctx) {
             if (Game.animationFrameId) {
                cancelAnimationFrame(Game.animationFrameId);
                Game.animationFrameId = null;
            }
            return;
        }
        
        const containerWidth = UI.els.viewContentArea.offsetWidth;
        const containerHeight = UI.els.viewContentArea.offsetHeight;
        
        let scaleX = containerWidth / canvas.width;
        let scaleY = containerHeight / canvas.height;
        let scale = Math.min(scaleX, scaleY);
        
        let offsetX = (containerWidth - canvas.width * scale) / 2;
        let offsetY = (containerHeight - canvas.height * scale) / 2;
        
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for(let y = 0; y < MAP_HEIGHT; y++) {
            for(let x = 0; x < MAP_WIDTH; x++) {
                const tile = mapLayout[y][x];
                const isExplored = Game.gameState.explored[`${x},${y}`];
                
                let color = mapColors.fog;
                if (isExplored) {
                    color = mapColors[tile] || mapColors['.']; 
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                if (isExplored && (tile === 'V' || tile === 'C' || tile === 'X' || tile === 'G')) {
                    ctx.fillStyle = mapColors.player; 
                    ctx.font = `${TILE_SIZE * 0.4}px 'VT323'`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    let symbol = tile === 'V' ? 'VLT' : tile === 'C' ? 'CITY' : tile === 'X' ? 'GOAL' : 'GATE';
                    ctx.fillText(symbol, x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2);
                }
            }
        }
        
        // Spieler zeichnen
        ctx.fillStyle = mapColors.player;
        ctx.beginPath();
        ctx.arc(
            Game.gameState.player.x * TILE_SIZE + TILE_SIZE / 2, 
            Game.gameState.player.y * TILE_SIZE + TILE_SIZE / 2, 
            TILE_SIZE / 4, 0, Math.PI * 2
        );
        ctx.fill();

        Game.animationFrameId = requestAnimationFrame(Game.draw); 
    },
    
    // --- MOVEMENT & ENCOUNTERS ---
    movePlayer: function(dx, dy) {
        if(Game.gameState.inDialog || Game.gameState.isGameOver || Game.gameState.currentView !== 'map') return;

        const nx = Game.gameState.player.x + dx;
        const ny = Game.gameState.player.y + dy;

        if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) {
            UI.log("Ende der Kartendaten erreicht (Fehler).", "text-gray-500");
            return; 
        }

        const tile = mapLayout[ny][nx];
        const oldX = Game.gameState.player.x;
        const oldY = Game.gameState.player.y;

        if (tile === '^' || tile === '~') { 
            UI.log(tile === '^' ? "Massive Felsen/Mauer. Nicht passierbar." : "Radioaktives Wasser. Geh weg!", "text-gray-500");
            return; 
        }

        Game.gameState.player.x = nx;
        Game.gameState.player.y = ny;
        
        Game.revealMap(nx, ny);

        if (tile === 'G') {
            Game.handleGate(nx, ny, oldX, oldY);
        } else if (tile === 'C') {
            Game.handleCityEntry();
        } else if (tile === 'X') {
            Game.victory();
        } else if (tile === 'V') {
            UI.log("Vault 111. Endlich Zuhause.", "text-blue-400");
        } else {
            Game.handleTileEvent(tile);
        }
    },
    
    handleGate: function(nx, ny, oldX, oldY) {
        let sectorDx = 0;
        let sectorDy = 0;
        if (ny === 0) sectorDy = -1; 
        else if (ny === MAP_HEIGHT - 1) sectorDy = 1; 
        else if (nx === 0) sectorDx = -1; 
        else if (nx === MAP_WIDTH - 1) sectorDx = 1; 

        const nextX = Game.gameState.currentSector.x + sectorDx;
        const nextY = Game.gameState.currentSector.y + sectorDy;
        
        if (nextX < 0 || nextX >= WORLD_SIZE || nextY < 0 || nextY >= WORLD_SIZE) {
            UI.log("Ende der Weltkarte erreicht. Weitergehen nicht möglich.", "text-red-500");
            Game.gameState.player.x = oldX; 
            Game.gameState.player.y = oldY;
            return;
        }

        UI.log("Tor zum nächsten Sektor in Reichweite.", "text-yellow-400");
        UI.els.text.innerHTML = `Möchtest du in Sektor <b>(${nextX},${nextY})</b> wechseln?`;
        Game.gameState.inDialog = true;
        
        UI.setDialogButtons(`
            <button class="action-button w-1/3 text-base" onclick="Game.confirmSectorChange(false, ${sectorDx}, ${sectorDy}, ${oldX}, ${oldY})">Bleiben</button>
            <button class="action-button w-2/3 text-lg font-extrabold bg-green-900 border-green-500" onclick="Game.confirmSectorChange(true, ${sectorDx}, ${sectorDy}, ${oldX}, ${oldY})">SEKTOR WECHSELN</button>
        `);
        UI.updateUI();
    },
    
    confirmSectorChange: function(change, dx, dy, playerX, playerY) {
        UI.clearDialogButtons(); 
        
        if (change) {
            UI.log("Tor durchschritten. Sektorwechsel beginnt...", "text-yellow-400");
            
            const nextX = Game.gameState.currentSector.x + dx;
            const nextY = Game.gameState.currentSector.y + dy;
            
            const currentSectorKey = Game.getSectorKey(Game.gameState.currentSector.x, Game.gameState.currentSector.y);
            Game.worldState[currentSectorKey].explored = true; 
            
            const mapResult = Game.generateRandomMap(nextX, nextY);
            mapLayout = mapResult.layout;
            
            let newPlayerX = mapResult.startX;
            let newPlayerY = mapResult.startY;
            if (dx === 1) newPlayerX = 1; 
            else if (dx === -1) newPlayerX = MAP_WIDTH - 2; 
            else if (dy === 1) newPlayerY = 1; 
            else if (dy === -1) newPlayerY = MAP_HEIGHT - 2; 

            Game.gameState.currentSector = { x: nextX, y: nextY };
            Game.gameState.player = { x: newPlayerX, y: newPlayerY }; 
            Game.gameState.explored = {}; 
            
            Game.gameState.maxHealth = Game.calculateMaxHP(Game.getStat('END'));

            UI.els.text.textContent = `Neuer Sektor (${nextX},${nextY})! Die Landschaft ist anders...`;
            Game.revealMap(Game.gameState.player.x, Game.gameState.player.y);
            UI.updateUI();
            UI.log(`Sektorwechsel abgeschlossen. Neue Zone erkunden.`, "text-yellow-400");
            
        } else {
            Game.gameState.inDialog = false;
            UI.els.text.textContent = "Ödland Ebene.";
            Game.gameState.player.x = playerX;
            Game.gameState.player.y = playerY;
            UI.updateUI();
        }
    },

    handleCityEntry: function() {
        UI.log("Rusty Springs in Reichweite.", "text-yellow-400");
        UI.els.text.innerHTML = "Möchtest du Rusty Springs betreten? Die Zeit steht still.";
        Game.gameState.inDialog = true;
        
        UI.setDialogButtons(`
            <button class="action-button w-1/3 text-base" onclick="Game.confirmCityEntry(false)">Weiter geht's!</button>
            <button class="action-button w-2/3 text-lg font-extrabold bg-green-900 border-green-500" onclick="Game.confirmCityEntry(true)">Betreten</button>
        `);
        UI.updateUI();
    },

    confirmCityEntry: function(enter) {
        UI.clearDialogButtons(); 
        if (enter) {
            UI.log("Rusty Springs betreten.", "text-yellow-400");
            UI.switchView('city'); 
        } else {
            Game.gameState.inDialog = false;
            UI.els.text.textContent = "Ödland Ebene.";
            UI.updateUI();
        }
    },

    revealMap: function(px, py) {
        const currentSectorKey = Game.getSectorKey(Game.gameState.currentSector.x, Game.gameState.currentSector.y);
        if (Game.worldState[currentSectorKey]) {
            Game.worldState[currentSectorKey].explored = true;
        }

        for(let y = py-1; y <= py+1; y++) {
            for(let x = px-1; x <= px+1; x++) {
                if (mapLayout[y] && mapLayout[y][x]) {
                     Game.gameState.explored[`${x},${y}`] = true;
                }
            }
        }
    },

    handleTileEvent: function(tile) {
        if (tile === '.' || tile === '#') {
            if (Math.random() < 0.15) Game.triggerRandomEncounter(); 
            else if (tile === '#') UI.els.text.textContent = "Sicherer Handelsweg. Schneller voran.";
            else UI.els.text.textContent = "Karges Ödland. Vorsicht geboten.";
        }
    },
    
    // --- COMBAT LOGIC ---
    triggerRandomEncounter: function() {
        const availableMonsters = Object.values(Game.monsters).filter(m => Game.gameState.level >= m.minLevel);

        if (availableMonsters.length === 0) {
            UI.log("Keine passenden Monster in dieser Region gefunden.", "text-gray-500");
            return; 
        }
        
        const randomMonster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
        const enemyTemplate = randomMonster;
        
        Game.gameState.currentEnemy = { ...enemyTemplate, maxHp: enemyTemplate.hp }; 

        UI.switchView('combat'); 

        UI.els.pipBoyCase.classList.add('screen-shake');
        setTimeout(() => UI.els.pipBoyCase.classList.remove('screen-shake'), 200);

        UI.els.text.innerHTML = `<b>GEFAHR!</b> Eine ${Game.gameState.currentEnemy.name} greift an!`;
        
        UI.setDialogButtons(`
            <button class="action-button" onclick="Game.resolveCombat()">Angreifen</button>
            <button class="action-button" onclick="Game.resolveFlee()">Flucht</button>
        `);
        
        UI.updateUI();
    },
    
    takeDamage: function(damage) {
        UI.els.gameScreen.classList.add('damage-flash');
        setTimeout(() => UI.els.gameScreen.classList.remove('damage-flash'), 100);
        Game.gameState.health -= damage;
        UI.log(`Schaden erlitten: -${Math.round(damage)} TP`, "text-red-500");
        Game.checkDeath();
    },

    resolveCombat: function() {
        if (!Game.gameState.currentEnemy) return;

        let currentWeapon = Game.gameState.equipment.weapon;
        const isRanged = currentWeapon.isRanged;
        
        if (isRanged && Game.gameState.ammo <= 0) {
            if (currentWeapon.name !== 'Fäuste') {
                Game.gameState.originalWeaponDuringCombat = currentWeapon;
                Game.gameState.equipment.weapon = Game.items.fists;
                currentWeapon = Game.items.fists;
                UI.log("Keine Munition! Automatisch auf Fäuste gewechselt.", "text-yellow-500");
            }
        } 
        
        if (isRanged && Game.gameState.ammo > 0 && currentWeapon.name !== 'Fäuste') {
            Game.gameState.ammo--;
        }

        const weaponBonusDamage = currentWeapon.bonus.STR || currentWeapon.bonus.AGI || 0;
        const playerDamage = Game.getStat('AGI') * 3 + Math.floor(Math.random() * Game.getStat('STR')) + weaponBonusDamage * 5;
        
        if (Math.random() > 0.3) { 
            Game.gameState.currentEnemy.hp -= playerDamage;
            let attackVerb = currentWeapon.name === 'Fäuste' ? 'Du schlägst' : currentWeapon.name === 'Messer' ? 'Du stichst' : 'Du feuerst';
            UI.log(`${attackVerb} mit ${currentWeapon.name} die ${Game.gameState.currentEnemy.name} für ${playerDamage} Schaden!`, "text-green-400");
        } else {
            UI.log("Du verfehlst das Ziel!", "text-yellow-400");
        }
        
        if (Game.gameState.currentEnemy.hp <= 0) {
            const loot = Game.gameState.currentEnemy.loot + Math.floor(Math.random()*Game.getStat('LUC'));
            const exp = Game.gameState.currentEnemy.exp; 
            
            Game.gameState.caps += loot;
            UI.log(`Sieg! Loot: ${loot} Kronenkorken erhalten.`, "text-green-400");
            Game.gainExp(exp); 
            
            Game.endCombat();
            return;
        }

        const defense = Game.getStat('END') * 2;
        const rawEnemyDamage = Game.gameState.currentEnemy.damage;
        const actualDamage = Math.max(1, rawEnemyDamage - defense); 
        
        if (Math.random() > 0.2) { 
            Game.takeDamage(actualDamage); 
        } else {
            UI.log(`${Game.gameState.currentEnemy.name} verfehlt dich.`, "text-green-600");
        }

        if (!Game.gameState.isGameOver) {
             UI.els.text.innerHTML = `<b>Kampf gegen ${Game.gameState.currentEnemy.name} läuft!</b> Wähle Aktion:`;
        }
        
        UI.updateUI();
    },

    resolveFlee: function(forced = false) {
        if (!Game.gameState.currentEnemy) return; 

        if (!forced) UI.log("Fluchtversuch...", "text-yellow-400");
        
        const fleeChance = 0.4 + (Game.getStat('AGI') * 0.05); 
        
        if (Math.random() < fleeChance || forced) { 
            UI.log("Entkommen."); 
            Game.endCombat();
        } else { 
            Game.takeDamage(10); 
            
            if(!Game.gameState.isGameOver) {
                UI.log("Flucht fehlgeschlagen! Der Kampf geht weiter.", "text-red-500"); 
                UI.els.text.innerHTML = `Flucht fehlgeschlagen. <b>Kampf gegen ${Game.gameState.currentEnemy.name} läuft!</b> Wähle Aktion:`;
            } else {
                Game.endCombat();
            }
        }
        
        UI.updateUI();
    },
    
    endCombat: function() {
        if (Game.gameState.originalWeaponDuringCombat) {
            Game.gameState.equipment.weapon = Game.gameState.originalWeaponDuringCombat;
            Game.gameState.originalWeaponDuringCombat = null;
            const newMaxHp = Game.calculateMaxHP(Game.getStat('END'));
            Game.gameState.maxHealth = newMaxHp;
            UI.log(`Zurück zur Waffe: ${Game.gameState.equipment.weapon.name}.`, 'text-green-500');
        }

        Game.gameState.currentEnemy = null;
        Game.gameState.inDialog = false; 
        UI.clearDialogButtons();
        UI.els.text.textContent = "Ödland Ebene.";
        
        if(Game.gameState.currentView === 'combat') {
            UI.switchView('map').then(() => { 
                 UI.updateUI(); 
            });
        } else {
            UI.updateUI();
        }
    },

    checkDeath: function() {
        if (Game.gameState.health <= 0) {
            Game.quitGame(true);
        }
    },
    
    victory: function() {
        Game.gameState.isGameOver = true;
        UI.els.text.innerHTML = "<b>ZIEL ERREICHT!</b>";
        UI.log("Die Vault ist gerettet. Du hast überlebt!", "text-green-400");
        UI.updateUI();
    },
    
    // --- INITIALISIERUNG & STATUS ---
    initNewGame: function() {
        UI.els.log.innerHTML = '';
        worldState = {}; 

        // 1. Ziel-Sektor festlegen
        let goalX, goalY;
        do {
            const edge = Math.floor(Math.random() * 4); 
            if (edge === 0) { goalY = 0; goalX = Math.floor(Math.random() * (WORLD_SIZE - 2)) + 1; } 
            else if (edge
