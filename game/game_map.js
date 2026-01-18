// [2026-01-18 18:30:00] game_map.js - Fixed: Move Crash & World/Local Logic Split

if(typeof Game === 'undefined') Game = {};

Object.assign(Game, {

    // Haupt-Bewegungsfunktion
    move: function(dx, dy) {
        if (!this.state || !this.state.player) return;

        // --- FALL 1: WELTKARTE (Overworld) ---
        if (this.state.view === 'map') {
            this.state.player.x += dx;
            this.state.player.y += dy;

            // Falls die Welt noch nicht generiert wurde (Sicherheitsnetz)
            if (typeof this.generateSector === 'function') {
                this.generateSector(this.state.player.x, this.state.player.y);
            }

            // UI Update
            if (typeof this.draw === 'function') this.draw();
            
            // Zufallskampf (Chance 5% pro Schritt)
            if (Math.random() < 0.05 && typeof this.startCombat === 'function') {
                this.startCombat();
            }
            return;
        }

        // --- FALL 2: LOKALE KARTE (Dungeon / Gebäude) ---
        // Nur ausführen, wenn wir wirklich eine Karte haben!
        if (this.state.currentMap && Array.isArray(this.state.currentMap)) {
            const p = this.state.player;
            const nx = p.x + dx;
            const ny = p.y + dy;

            // Grenzen prüfen (Crash-Schutz)
            if (ny >= 0 && ny < this.state.currentMap.length) {
                const row = this.state.currentMap[ny];
                if (row && nx >= 0 && nx < row.length) {
                    const tile = row[nx];
                    
                    // Kollision (Wand = #)
                    if (tile !== '#') {
                        p.x = nx;
                        p.y = ny;
                        
                        // Tile Events (Ausgänge, Loot etc.)
                        if (typeof this.checkTileEvent === 'function') {
                            this.checkTileEvent(nx, ny, tile);
                        }
                    }
                }
            }
            if (typeof this.draw === 'function') this.draw();
            return;
        }

        // Fallback: Falls wir im Nirvana sind
        console.warn("[GAME MAP] Move called without Map or Context!", this.state.view);
    },

    // Helfer: Ereignisse auf lokalen Tiles prüfen
    checkTileEvent: function(x, y, tile) {
        // Ausgang / Rückkehr zur Weltkarte
        if (tile === 'E' || tile === 'Exit') {
            this.leaveDungeon();
            return;
        }
        
        // Loot
        if (tile === 'L') {
            UI.log("Loot gefunden!", "text-yellow-400");
            if(typeof Game.generateLoot === 'function') {
                const item = Game.generateLoot();
                Game.addToInventory(item);
            }
            // Tile leeren
            this.state.currentMap[y] = this.state.currentMap[y].substring(0, x) + '.' + this.state.currentMap[y].substring(x+1);
        }
    },

    leaveDungeon: function() {
        this.state.view = 'map';
        this.state.currentMap = null; // Map löschen um Speicher zu sparen
        
        // Spieler zurück zur gesicherten Welt-Position setzen
        if (this.state.savedWorldPos) {
            this.state.player.x = this.state.savedWorldPos.x;
            this.state.player.y = this.state.savedWorldPos.y;
        }
        
        UI.log("Zurück im Ödland.", "text-green-400");
        if (typeof this.draw === 'function') this.draw();
        this.saveGame();
    },

    enterDungeon: function(mapId) {
        // Welt-Position sichern
        this.state.savedWorldPos = { x: this.state.player.x, y: this.state.player.y };
        
        this.state.view = 'dungeon';
        
        // Beispiel-Map (Fallback)
        this.state.currentMap = [
            "####################",
            "#S.................#",
            "#.###.#####.###....#",
            "#...#.#...#.#......#",
            "###.#.###.#.###..L.#",
            "#L....#.......#....#",
            "##################E#"
        ];
        
        // Startpunkt finden
        for(let y=0; y<this.state.currentMap.length; y++) {
            const x = this.state.currentMap[y].indexOf('S');
            if(x !== -1) {
                this.state.player.x = x;
                this.state.player.y = y;
                break;
            }
        }
        
        UI.log("Dungeon betreten...", "text-red-500");
        if (typeof this.draw === 'function') this.draw();
    }
});
