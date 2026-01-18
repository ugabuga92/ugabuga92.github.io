// [2026-01-18 19:15:00] game_render.js - FINAL GRAPHICS ENGINE OVERHAUL

if(typeof Game === 'undefined') Game = {};

Object.assign(Game, {
    
    // Speicher für Grafik-Assets (Canvases)
    tiles: {},
    tileSize: 32, // Größe eines Tiles in Pixeln

    // --- 1. TILE GENERATOR (Einmalig beim Start) ---
    generateTiles: function() {
        console.log("[RENDER] Building Graphics Assets...");
        
        const createTile = (key, colorBase, drawDetails) => {
            const canvas = document.createElement('canvas');
            canvas.width = this.tileSize;
            canvas.height = this.tileSize;
            const ctx = canvas.getContext('2d');

            // Basis-Farbe
            ctx.fillStyle = colorBase;
            ctx.fillRect(0, 0, this.tileSize, this.tileSize);

            // Details zeichnen
            if (drawDetails) drawDetails(ctx, this.tileSize);

            this.tiles[key] = canvas;
        };

        // > ÖDLAND (Basis) - Staubiges Braun
        createTile('wasteland', '#4e4033', (ctx, s) => { 
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            for(let i=0; i<10; i++) { 
                let x = Math.random() * s, y = Math.random() * s;
                ctx.fillRect(x, y, 2, 2);
            }
        });

        // > GRASLAND - Radioaktives Grün
        createTile('grass', '#1a331a', (ctx, s) => { 
            ctx.fillStyle = '#2b552b';
            for(let i=0; i<15; i++) { 
                let x = Math.random() * s, y = Math.random() * s;
                ctx.fillRect(x, y, 1, 4);
            }
        });

        // > WALD - Dunkel & Dicht
        createTile('forest', '#0a1a0a', (ctx, s) => {
            ctx.fillStyle = '#0f2f0f';
            // Baum 1 (Links)
            ctx.beginPath(); ctx.moveTo(8, 26); ctx.lineTo(16, 6); ctx.lineTo(24, 26); ctx.fill();
            // Baum 2 (Rechts)
            ctx.fillStyle = '#0a220a';
            ctx.beginPath(); ctx.moveTo(12, 28); ctx.lineTo(20, 10); ctx.lineTo(28, 28); ctx.fill();
        });

        // > WASSER - Dunkelblau & Wellen
        createTile('water', '#081820', (ctx, s) => {
            ctx.strokeStyle = '#103040';
            ctx.lineWidth = 1;
            for(let i=6; i<s; i+=8) {
                ctx.beginPath(); ctx.moveTo(2, i); ctx.lineTo(s-2, i); ctx.stroke();
            }
        });

        // > BERGE - Grau & Felsig
        createTile('mountain', '#2a2a2a', (ctx, s) => {
            ctx.fillStyle = '#1a1a1a'; // Berg-Körper
            ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(s/2, 2); ctx.lineTo(s, s); ctx.fill();
            ctx.fillStyle = '#555'; // Spitze (Schnee/Licht)
            ctx.beginPath(); ctx.moveTo(s/2 - 4, 10); ctx.lineTo(s/2, 2); ctx.lineTo(s/2 + 4, 10); ctx.fill();
        });

        // > STADT - Beton & Ruinen
        createTile('city', '#1a1a1a', (ctx, s) => {
            ctx.fillStyle = '#333'; 
            ctx.fillRect(4, 10, 8, 22); // Gebäude 1
            ctx.fillStyle = '#2a2a2a'; 
            ctx.fillRect(16, 6, 12, 26); // Gebäude 2
            
            // Leuchtendes Fenster
            ctx.fillStyle = 'rgba(57, 255, 20, 0.6)'; 
            ctx.fillRect(18, 10, 2, 2);
            ctx.fillRect(22, 18, 2, 2);
        });

        // > SUMPF - Matschig
        createTile('swamp', '#1f1f10', (ctx, s) => {
            ctx.fillStyle = 'rgba(40, 60, 20, 0.5)';
            ctx.fillRect(0,0, s, s);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.arc(10, 10, 6, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(24, 22, 4, 0, Math.PI*2); ctx.fill();
        });
    },

    // --- 2. HAUPT RENDER LOOP ---
    
    // WICHTIG: Das ersetzt die alte draw()-Funktion komplett!
    draw: function() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Pixel-Art Look erzwingen
        ctx.imageSmoothingEnabled = false;

        // Assets bauen (falls noch nicht da)
        if (!this.tiles['wasteland']) this.generateTiles();

        // Screen löschen (CRT Schwarz)
        ctx.fillStyle = '#000500';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Welchen Modus rendern wir?
        if (this.state.view === 'map') {
            this.renderWorldMap(ctx, canvas);
        } 
        else if (this.state.view === 'dungeon') {
            this.renderDungeonMap(ctx, canvas); // Neu hinzugefügt
        }
    },

    // --- 3. WELTKARTE (Overworld) ---
    renderWorldMap: function(ctx, canvas) {
        if (!this.state.player || !this.worldData) return;

        const pX = this.state.player.x;
        const pY = this.state.player.y;
        
        // Raster-Größe (Zoom) - etwas größer für bessere Sichtbarkeit
        const tileSize = 48; 
        
        // Tiles berechnen (+1 Puffer für Ränder)
        const tilesX = Math.ceil(canvas.width / tileSize) + 1;
        const tilesY = Math.ceil(canvas.height / tileSize) + 1;
        
        const startX = pX - Math.floor(tilesX / 2);
        const startY = pY - Math.floor(tilesY / 2);

        // A) KACHELN ZEICHNEN
        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                const worldX = startX + x;
                const worldY = startY + y;
                const key = `${worldX},${worldY}`;
                
                // Position auf dem Canvas
                const screenX = (x * tileSize) - (tileSize/2); // Leichter Offset
                const screenY = (y * tileSize) - (tileSize/2);

                const sector = this.worldData[key];
                let biome = 'wasteland';
                
                if (sector) {
                    biome = sector.biome || 'wasteland';
                    if (sector.isCity) biome = 'city';
                }

                const img = this.tiles[biome] || this.tiles['wasteland'];
                
                // Tile zeichnen
                ctx.drawImage(img, screenX, screenY, tileSize, tileSize);

                // Grid (sehr dezent)
                ctx.strokeStyle = 'rgba(0, 10, 0, 0.2)';
                ctx.strokeRect(screenX, screenY, tileSize, tileSize);
            }
        }

        // B) SPIELER (Zentriert)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Schatten unter Spieler
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 12, 12, 6, 0, 0, Math.PI*2);
        ctx.fill();

        // Spieler-Icon (Neon-Dreieck für Blickrichtung)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.state.player.rot || 0); // Rotation anwenden
        
        // Körper (Dreieck)
        ctx.fillStyle = '#39ff14'; // Pip-Boy Grün
        ctx.beginPath();
        ctx.moveTo(0, -12); // Spitze vorne
        ctx.lineTo(10, 12); // Rechts hinten
        ctx.lineTo(0, 8);   // Einbuchtung hinten
        ctx.lineTo(-10, 12);// Links hinten
        ctx.closePath();
        ctx.fill();
        
        // Rand
        ctx.strokeStyle = '#003300';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();

        // C) LOKATIONEN (Camp, POIs)
        // Wir iterieren nochmal über den sichtbaren Bereich für Overlays
        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                const worldX = startX + x;
                const worldY = startY + y;
                
                const screenX = (x * tileSize) - (tileSize/2);
                const screenY = (y * tileSize) - (tileSize/2);

                // Camp?
                if (this.state.camp && this.state.camp.x === worldX && this.state.camp.y === worldY) {
                    ctx.font = '24px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('⛺', screenX + tileSize/2, screenY + tileSize/2 + 8);
                }
            }
        }
    },

    // --- 4. DUNGEON RENDERER (Neu!) ---
    renderDungeonMap: function(ctx, canvas) {
        if (!this.state.currentMap) return;

        const map = this.state.currentMap;
        const pX = this.state.player.x;
        const pY = this.state.player.y;
        
        const tileSize = 40;
        const tilesX = Math.ceil(canvas.width / tileSize);
        const tilesY = Math.ceil(canvas.height / tileSize);
        
        const startX = pX - Math.floor(tilesX / 2);
        const startY = pY - Math.floor(tilesY / 2);

        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                const mapX = startX + x;
                const mapY = startY + y;
                const screenX = x * tileSize;
                const screenY = y * tileSize;

                // Außerhalb der Map? -> Schwarz
                if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(screenX, screenY, tileSize, tileSize);
                    continue;
                }

                const tile = map[mapY][mapX];

                // Wände (#)
                if (tile === '#') {
                    ctx.fillStyle = '#444'; // Dunkelgrau
                    ctx.fillRect(screenX, screenY, tileSize, tileSize);
                    ctx.strokeStyle = '#222';
                    ctx.strokeRect(screenX, screenY, tileSize, tileSize);
                } 
                // Boden (.)
                else {
                    ctx.fillStyle = '#111'; // Fast Schwarz
                    ctx.fillRect(screenX, screenY, tileSize, tileSize);
                    // Kleiner Punkt für Bodenstruktur
                    ctx.fillStyle = '#222';
                    ctx.fillRect(screenX + tileSize/2, screenY + tileSize/2, 2, 2);
                }

                // Loot (L)
                if (tile === 'L') {
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🎁', screenX + tileSize/2, screenY + tileSize/2 + 8);
                }
                
                // Ausgang (E)
                if (tile === 'E') {
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🚪', screenX + tileSize/2, screenY + tileSize/2 + 8);
                }
            }
        }

        // Spieler im Dungeon (Zentriert)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI*2);
        ctx.fill();
    },
    
    // Helfer: Canvas Größe anpassen
    resizeCanvas: function() {
        const canvas = document.getElementById('game-canvas');
        const container = document.getElementById('game-screen'); 
        if(canvas && container) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            this.draw();
        }
    }
});

// Listener
window.addEventListener('resize', () => { if(Game.resizeCanvas) Game.resizeCanvas(); });
setTimeout(() => { if(Game.resizeCanvas) Game.resizeCanvas(); }, 500);
