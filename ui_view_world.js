// [v3.7b] - 2026-01-03 07:45am (World View Cleanup)
// - CLEANUP: Camp-Funktionen entfernt (jetzt in ui_view_camp.js).
// - LOGIC: Nur noch für die renderWorldMap zuständig.

Object.assign(UI, {

    renderWorldMap: function() {
        const cvs = document.getElementById('world-map-canvas');
        const details = document.getElementById('sector-details');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        const W = 10, H = 10; 
        const TILE_W = cvs.width / W;
        const TILE_H = cvs.height / H;

        // Hintergrund
        ctx.fillStyle = "#050a05"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        const biomeColors = {
            'wasteland': '#4a4036', 'forest': '#1a3300', 'jungle': '#0f2405',
            'desert': '#8b5a2b', 'swamp': '#1e1e11', 'mountain': '#333333',
            'city': '#444455', 'vault': '#002244'
        };

        const pulse = (Date.now() % 1000) / 1000;
        const glowAlpha = 0.3 + (Math.sin(Date.now() / 200) + 1) * 0.2; 
        
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

                // Zeichne Kachel
                if(isVisited) {
                    const biome = WorldGen.getSectorBiome(x, y);
                    ctx.fillStyle = biomeColors[biome] || '#222';
                    ctx.fillRect(x * TILE_W - 0.5, y * TILE_H - 0.5, TILE_W + 1, TILE_H + 1);
                } else {
                    ctx.fillStyle = "#000";
                    ctx.fillRect(x * TILE_W, y * TILE_H, TILE_W, TILE_H);
                }

                const cx = x * TILE_W + TILE_W/2;
                const cy = y * TILE_H + TILE_H/2;

                ctx.font = "bold 20px monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // POI Icons
                if (fixedPOI) {
                    let icon = "❓";
                    let color = "#fff";
                    let fontSize = "20px";
                    let label = null;

                    if(fixedPOI.type === 'C') { icon = "🏙️"; color = "#00ffff"; }
                    else if(fixedPOI.type === 'V') { 
                        icon = "⚙️"; color = "#ffff00"; fontSize = "25px"; label = "VAULT 101"; 
                    }
                    else if(fixedPOI.type === 'M') { icon = "🏰"; color = "#ff5555"; }
                    else if(fixedPOI.type === 'R') { icon = "☠️"; color = "#ffaa00"; }
                    else if(fixedPOI.type === 'T') { icon = "📡"; color = "#55ff55"; }
                    
                    if(isVisited) {
                        ctx.font = `bold ${fontSize} monospace`;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = color;
                        ctx.fillStyle = color;
                        ctx.fillText(icon, cx, cy);
                        ctx.shadowBlur = 0;
                        
                        if(label) {
                            ctx.font = "bold 10px monospace";
                            ctx.fillStyle = "#ffffff";
                            ctx.shadowColor = "#000";
                            ctx.shadowBlur = 4;
                            ctx.fillText(label, cx, cy + TILE_H/2 - 5);
                            ctx.shadowBlur = 0;
                        }
                    } else {
                        ctx.globalAlpha = 0.5;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = color;
                        ctx.fillStyle = color;
                        ctx.fillText("?", cx, cy);
                        ctx.shadowBlur = 0;
                        ctx.globalAlpha = 1.0;
                    }
                }
                else if (randomDungeon) {
                    let color = "#a020f0"; 
                    let icon = randomDungeon === 'S' ? '🛒' : '🦇'; 
                    
                    if(isVisited) {
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = color;
                        ctx.fillStyle = color;
                        ctx.fillText(icon, cx, cy);
                        ctx.shadowBlur = 0;
                    } else {
                        ctx.fillStyle = `rgba(160, 32, 240, ${glowAlpha})`; 
                        ctx.fillRect(x * TILE_W + 2, y * TILE_H + 2, TILE_W - 4, TILE_H - 4);
                        ctx.fillStyle = "#fff";
                        ctx.font = "10px monospace";
                        ctx.fillText("?", cx, cy);
                    }
                }

                // Zelt-Icon auf Karte (WICHTIG: Das bleibt hier!)
                if(Game.state.camp && Game.state.camp.sector && Game.state.camp.sector.x === x && Game.state.camp.sector.y === y) {
                    ctx.font = "bold 20px monospace";
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText("⛺", x * TILE_W + TILE_W/4, y * TILE_H + TILE_H/4);
                }

                // Detail-Text Update
                if(isCurrent && details) {
                    let info = `SEKTOR [${x},${y}]`;
                    if(randomDungeon) info += " <span class='text-purple-400 animate-pulse'>[SIGNAL]</span>";
                    details.innerHTML = info;
                }
            }
        }

        // Spieler Position (Grüner Punkt)
        const relX = Game.state.player.x / Game.MAP_W; 
        const relY = Game.state.player.y / Game.MAP_H; 
        
        const px = Game.state.sector.x * TILE_W + (relX * TILE_W);
        const py = Game.state.sector.y * TILE_H + (relY * TILE_H);
        
        ctx.beginPath();
        ctx.arc(px, py, 4 + (pulse * 8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57, 255, 20, ${0.6 - pulse * 0.6})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#39ff14";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Loop
        if(Game.state.view === 'worldmap') {
            requestAnimationFrame(() => this.renderWorldMap());
        }
    }
});
