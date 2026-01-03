// [v3.8] - 2026-01-03 04:40pm (Graphical Revolution)
// - FEATURE: Prozedurale Pixel-Art-Engine integriert (erstellt Tilesets zur Laufzeit).
// - GFX: Weltkarte nutzt nun 16-Bit Tiles (Wasteland, Forest, City, Mountain, etc.).
// - GFX: Spieler wird als animierter 'Chibi'-Pixel-Charakter dargestellt.
// - UI: Retro-Grid und Scanline-Effekte für die Karte.

Object.assign(UI, {
    worldTileset: null,
    
    // Generiert ein 16-Bit Tileset im Speicher (keine externen Bilder nötig!)
    generateWorldTileset: function() {
        if (this.worldTileset) return this.worldTileset;

        const TILE_SIZE = 32;
        const cvs = document.createElement('canvas');
        cvs.width = TILE_SIZE * 8; // Platz für 8 Biome
        cvs.height = TILE_SIZE;
        const ctx = cvs.getContext('2d');

        // Helper für Pixel-Noise
        const noise = (x, y, w, h, color, intensity = 20) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, w, h);
            for (let i = 0; i < (w * h) / 2; i++) {
                const px = x + Math.floor(Math.random() * w);
                const py = y + Math.floor(Math.random() * h);
                ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
                ctx.fillRect(px, py, 2, 2); // 2x2 "Pixel" für Retro-Look
            }
        };

        // 1. WASTELAND (Index 0)
        noise(0, 0, 32, 32, '#8b5a2b'); // Brauner Sand
        ctx.fillStyle = '#6b4a20';
        ctx.fillRect(5, 5, 4, 4); ctx.fillRect(20, 15, 6, 6); // Steine

        // 2. FOREST (Index 1)
        noise(32, 0, 32, 32, '#1a3300'); // Dunkler Boden
        ctx.fillStyle = '#2d4d00'; // Baumkronen Farbe
        // Zeichne "Bäume" (Dreiiecke/Kreise abstrahiert)
        const tree = (bx, by) => {
            ctx.fillStyle = '#112200'; ctx.fillRect(bx+3, by+8, 2, 4); // Stamm
            ctx.fillStyle = '#336600'; ctx.fillRect(bx, by+4, 8, 8); // Krone
            ctx.fillStyle = '#448800'; ctx.fillRect(bx+2, by+2, 4, 4); // Highlight
        };
        tree(34, 4); tree(45, 12); tree(36, 20);

        // 3. JUNGLE (Index 2)
        noise(64, 0, 32, 32, '#0f2405'); // Dichtes Grün
        ctx.fillStyle = '#1f440a';
        for(let i=0; i<10; i++) ctx.fillRect(64+Math.random()*28, Math.random()*28, 4, 8); // Lianen/Hohes Gras

        // 4. DESERT (Index 3)
        noise(96, 0, 32, 32, '#e0c060'); // Heller Sand
        ctx.fillStyle = '#c0a040';
        ctx.fillRect(96, 10, 32, 4); ctx.fillRect(96, 22, 32, 4); // Dünen-Schatten

        // 5. SWAMP (Index 4)
        noise(128, 0, 32, 32, '#2f2f1e'); // Matsch
        ctx.fillStyle = '#4a3b5c'; 
        ctx.fillRect(130, 10, 10, 10); ctx.fillRect(145, 20, 8, 5); // Lila Wasserlachen

        // 6. MOUNTAIN (Index 5)
        noise(160, 0, 32, 32, '#444'); // Fels
        ctx.fillStyle = '#777'; // Bergspitze
        ctx.beginPath(); ctx.moveTo(160+16, 5); ctx.lineTo(160+5, 25); ctx.lineTo(160+27, 25); ctx.fill();
        ctx.fillStyle = '#fff'; // Schnee
        ctx.fillRect(160+14, 5, 4, 4);

        // 7. CITY (Index 6)
        noise(192, 0, 32, 32, '#222'); // Asphalt
        ctx.fillStyle = '#445'; // Gebäude
        ctx.fillRect(195, 5, 10, 20); ctx.fillRect(210, 10, 8, 15);
        ctx.fillStyle = '#667'; // Fenster
        ctx.fillRect(197, 8, 2, 2); ctx.fillRect(197, 12, 2, 2);

        // 8. VAULT (Index 7)
        noise(224, 0, 32, 32, '#001133'); 
        ctx.fillStyle = '#cca000'; // Goldener Rahmen
        ctx.beginPath(); ctx.arc(224+16, 16, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(224+16, 16, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#cca000'; ctx.fillText("101", 224+8, 20);

        this.worldTileset = cvs;
        return cvs;
    },

    // Malt einen kleinen Pixel-Helden
    drawChibiPlayer: function(ctx, x, y, pulse) {
        // Schatten
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.ellipse(x, y+6, 6, 3, 0, 0, Math.PI*2); ctx.fill();

        const bounce = Math.sin(Date.now() / 150) * 2;
        const py = y - 4 + bounce;

        // Körper (Pip-Boy Anzug Blau/Gelb)
        ctx.fillStyle = "#0044aa"; // Blau
        ctx.fillRect(x-4, py, 8, 8); 
        ctx.fillStyle = "#cca000"; // Gelb
        ctx.fillRect(x-1, py, 2, 8); // Zipper

        // Kopf
        ctx.fillStyle = "#ffccaa"; // Haut
        ctx.fillRect(x-5, py-9, 10, 9);
        
        // Haare
        ctx.fillStyle = "#553311";
        ctx.fillRect(x-6, py-10, 12, 4);

        // Augen (Blinken)
        if(Math.random() > 0.05) {
            ctx.fillStyle = "black";
            ctx.fillRect(x-3, py-6, 2, 2);
            ctx.fillRect(x+1, py-6, 2, 2);
        }
    },

    renderWorldMap: function() {
        const cvs = document.getElementById('world-map-canvas');
        const details = document.getElementById('sector-details');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        
        // Anti-Aliasing aus für scharfe Pixel
        ctx.imageSmoothingEnabled = false; 

        const W = 10, H = 10; 
        const TILE_W = cvs.width / W;
        const TILE_H = cvs.height / H;

        // Tileset holen (oder erstellen)
        const tileset = this.generateWorldTileset();
        const SRC_SIZE = 32; // Größe im Tileset

        // Mapping Biome -> Index im Tileset
        const biomeIndex = {
            'wasteland': 0, 'forest': 1, 'jungle': 2,
            'desert': 3, 'swamp': 4, 'mountain': 5,
            'city': 6, 'vault': 7
        };

        // Hintergrund (Deep Space Black)
        ctx.fillStyle = "#050505"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        const pulse = (Date.now() % 1000) / 1000;
        
        // Camp Coordinate Fix
        if(Game.state.camp && !Game.state.camp.sector && Game.state.camp.sx !== undefined) {
             Game.state.camp.sector = { x: Game.state.camp.sx, y: Game.state.camp.sy };
        }

        // Loop über alle Sektoren
        for(let y=0; y<H; y++) {
            for(let x=0; x<W; x++) {
                const key = `${x},${y}`;
                const isVisited = Game.state.visitedSectors && Game.state.visitedSectors.includes(key);
                const isCurrent = (x === Game.state.sector.x && y === Game.state.sector.y);

                let fixedPOI = null;
                let randomDungeon = null;

                if(Game.state.worldPOIs) {
                    fixedPOI = Game.state.worldPOIs.find(p => p.x === x && p.y === y);
                }

                if(!fixedPOI) {
                    const mapSeed = (x + 1) * 5323 + (y + 1) * 8237 + 9283;
                    if(typeof WorldGen !== 'undefined') {
                        WorldGen.setSeed(mapSeed);
                        const rng = () => WorldGen.rand();
                        if(rng() < 0.35) {
                            const r = rng();
                            if(r < 0.3) randomDungeon = 'S'; 
                            else if(r < 0.6) randomDungeon = 'H'; 
                        }
                    }
                }

                // 1. TILE ZEICHNEN
                if(isVisited) {
                    const biome = WorldGen.getSectorBiome(x, y);
                    const idx = biomeIndex[biome] !== undefined ? biomeIndex[biome] : 0;
                    
                    // Zeichne Tile aus dem generierten Sheet
                    ctx.drawImage(tileset, 
                        idx * SRC_SIZE, 0, SRC_SIZE, SRC_SIZE, // Source
                        x * TILE_W, y * TILE_H, TILE_W + 1, TILE_H + 1 // Dest (mit +1 gegen Lücken)
                    );

                    // Dunkler Overlay für nicht-aktuelle Sektoren für Tiefe
                    if(!isCurrent) {
                        ctx.fillStyle = "rgba(0,0,0,0.2)";
                        ctx.fillRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
                    }
                } else {
                    // Unexplored: "Fog of War" Pattern
                    ctx.fillStyle = "#111";
                    ctx.fillRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
                    
                    ctx.fillStyle = "#222"; // Kleines Gittermuster im Nebel
                    ctx.fillRect(x * TILE_W + TILE_W/2 - 2, y * TILE_H + TILE_H/2 - 2, 4, 4);
                }

                const cx = x * TILE_W + TILE_W/2;
                const cy = y * TILE_H + TILE_H/2;

                // 2. POI ICONS (Schattenwurf für 3D Effekt)
                if (fixedPOI) {
                    let icon = "❓";
                    let color = "#fff";
                    let fontSize = "24px"; // Größer für Chibi Style

                    if(fixedPOI.type === 'C') { icon = "🏙️"; color = "#00ffff"; }
                    else if(fixedPOI.type === 'V') { icon = "⚙️"; color = "#ffff00"; }
                    else if(fixedPOI.type === 'M') { icon = "🏰"; color = "#ff5555"; }
                    else if(fixedPOI.type === 'R') { icon = "☠️"; color = "#ffaa00"; }
                    else if(fixedPOI.type === 'T') { icon = "📡"; color = "#55ff55"; }
                    
                    if(isVisited) {
                        ctx.font = `${fontSize} monospace`;
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        
                        // Drop Shadow
                        ctx.fillStyle = "rgba(0,0,0,0.7)";
                        ctx.fillText(icon, cx + 2, cy + 2);
                        
                        ctx.fillStyle = color;
                        ctx.fillText(icon, cx, cy);
                    }
                }
                else if (randomDungeon && isVisited) {
                    let icon = randomDungeon === 'S' ? '🛒' : '🦇'; 
                    ctx.font = "20px monospace";
                    ctx.fillStyle = "rgba(0,0,0,0.7)";
                    ctx.fillText(icon, cx + 2, cy + 2);
                    ctx.fillStyle = "#a020f0";
                    ctx.fillText(icon, cx, cy);
                }

                // 3. CAMP ICON
                if(Game.state.camp && Game.state.camp.sector && Game.state.camp.sector.x === x && Game.state.camp.sector.y === y) {
                    ctx.font = "20px monospace";
                    ctx.fillText("⛺", x * TILE_W + 8, y * TILE_H + 8);
                }

                // Detail-Text Update
                if(isCurrent && details) {
                    let info = `SEKTOR [${x},${y}]`;
                    if(randomDungeon) info += " <span class='text-purple-400 animate-pulse'>[SIGNAL]</span>";
                    details.innerHTML = info;
                }
            }
        }

        // 4. GRID OVERLAY (Feines Gitter für den Taktik-Look)
        ctx.strokeStyle = "rgba(26, 255, 26, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<=W; i++) { ctx.moveTo(i*TILE_W, 0); ctx.lineTo(i*TILE_W, cvs.height); }
        for(let i=0; i<=H; i++) { ctx.moveTo(0, i*TILE_H); ctx.lineTo(cvs.width, i*TILE_H); }
        ctx.stroke();

        // 5. SPIELER RENDERN (Chibi Style)
        const relX = Game.state.player.x / Game.MAP_W; 
        const relY = Game.state.player.y / Game.MAP_H; 
        
        const px = Game.state.sector.x * TILE_W + (relX * TILE_W);
        const py = Game.state.sector.y * TILE_H + (relY * TILE_H);
        
        // Rufe die neue Chibi-Funktion auf
        this.drawChibiPlayer(ctx, px, py, pulse);

        // Loop
        if(Game.state.view === 'worldmap') {
            requestAnimationFrame(() => this.renderWorldMap());
        }
    }
});
