// [v3.9.5] - 2026-01-03 05:30pm (Complete Asset Overhaul)
// - FIX: Rusty Springs und Dungeons waren leer -> Fehlende Tiles (Straßen, Zäune, Terminals) hinzugefügt.
// - ENGINE: Tileset-Generator erweitert auf 16 Slots (inkl. Asphalt, Felsen, Türen, Terminals).
// - GFX: Spezielle Icons für Shop ($), Crafting (&) und Klinik (P) visuell aufgewertet.

Object.assign(Game, {
    gameTileset: null,

    // Erstellt jetzt ALLE benötigten Texturen (16 Stück)
    generateGameTileset: function() {
        if (this.gameTileset) return this.gameTileset;

        const TILE = 32;
        const cvs = document.createElement('canvas');
        cvs.width = TILE * 16; // Erweitert auf 16 Slots
        cvs.height = TILE;
        const ctx = cvs.getContext('2d');

        // Helper: Noise
        const noise = (x, y, color, intensity=0.1) => {
            ctx.fillStyle = color; ctx.fillRect(x, y, TILE, TILE);
            for(let i=0; i<40; i++) {
                ctx.fillStyle = Math.random()>0.5 ? `rgba(255,255,255,${intensity})` : `rgba(0,0,0,${intensity})`;
                ctx.fillRect(x + Math.random()*TILE, y + Math.random()*TILE, 2, 2);
            }
        };

        // 0. BODEN (.)
        noise(0, 0, '#4e342e', 0.1); // Braune Erde
        ctx.fillStyle = '#3e2723'; ctx.fillRect(5,5,2,2); ctx.fillRect(20,25,2,2);

        // 1. WAND (#)
        noise(32, 0, '#263238', 0.2); // Dunkles Metall/Beton
        ctx.fillStyle = '#000'; // Fugen
        ctx.fillRect(32, 0, 32, 2); ctx.fillRect(32, 30, 32, 2); ctx.fillRect(32, 0, 2, 32); ctx.fillRect(62, 0, 2, 32);
        ctx.fillRect(40, 10, 16, 12); // Vertiefung

        // 2. BAUM (t)
        ctx.clearRect(64, 0, 32, 32);
        ctx.fillStyle = '#3e2723'; ctx.fillRect(64+12, 18, 8, 14); // Stamm
        ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.arc(64+16, 14, 12, 0, Math.PI*2); ctx.fill(); // Krone
        ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(64+12, 10, 5, 0, Math.PI*2); ctx.fill(); // Licht

        // 3. TOTER BAUM (T)
        ctx.clearRect(96, 0, 32, 32);
        ctx.fillStyle = '#3e2723'; ctx.fillRect(96+14, 20, 4, 12); // Stamm
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth=2; 
        ctx.beginPath(); ctx.moveTo(96+16,20); ctx.lineTo(96+8,10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(96+16,22); ctx.lineTo(96+24,12); ctx.stroke();

        // 4. WASSER (~) / (W)
        noise(128, 0, '#004d40', 0.2); // Dunkles Wasser
        ctx.fillStyle = 'rgba(100,255,218,0.3)'; ctx.fillRect(132, 8, 8, 2); ctx.fillRect(145, 20, 10, 2);

        // 5. BERG (M)
        ctx.clearRect(160, 0, 32, 32);
        ctx.fillStyle = '#424242'; ctx.beginPath(); ctx.moveTo(160+16, 4); ctx.lineTo(160+30, 30); ctx.lineTo(160+2, 30); ctx.fill();

        // 6. KISTE (X)
        ctx.clearRect(192, 0, 32, 32);
        ctx.fillStyle = '#6d4c41'; ctx.fillRect(196, 8, 24, 20); 
        ctx.strokeStyle='#3e2723'; ctx.lineWidth=2; ctx.strokeRect(196,8,24,20);
        ctx.beginPath(); ctx.moveTo(196,8); ctx.lineTo(220,28); ctx.stroke(); ctx.moveTo(220,8); ctx.lineTo(196,28); ctx.stroke();

        // 7. STRASSE / ASPHALT (=) - Wichtig für Stadt!
        noise(224, 0, '#212121', 0.1); 
        ctx.fillStyle = '#fbc02d'; ctx.fillRect(224+4, 14, 6, 4); ctx.fillRect(224+22, 14, 6, 4); // Gelbe Markierung

        // 8. GRAS (")
        noise(256, 0, '#33691e', 0.2); 
        ctx.fillStyle = '#558b2f'; ctx.fillRect(260, 10, 2, 4); ctx.fillRect(270, 20, 2, 4);

        // 9. FELSEN (o)
        ctx.clearRect(288, 0, 32, 32);
        ctx.fillStyle = '#616161'; ctx.beginPath(); ctx.arc(288+16, 20, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#757575'; ctx.beginPath(); ctx.arc(288+14, 18, 4, 0, Math.PI*2); ctx.fill();

        // 10. ZAUN (x)
        ctx.clearRect(320, 0, 32, 32);
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth=3;
        ctx.strokeRect(320+2, 10, 28, 12); ctx.beginPath(); ctx.moveTo(320+10,10); ctx.lineTo(320+10,22); ctx.moveTo(320+22,10); ctx.lineTo(320+22,22); ctx.stroke();

        // 11. SÄULE / WANDSTÜCK (|)
        ctx.clearRect(352, 0, 32, 32);
        ctx.fillStyle = '#37474f'; ctx.fillRect(352+8, 4, 16, 24);
        ctx.fillStyle = '#263238'; ctx.fillRect(352+10, 6, 12, 20); // Innen

        // 12. TÜR / INTERACT (+)
        noise(384, 0, '#3e2723'); // Holzboden
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(384+4, 4, 24, 24); // Türplatte
        ctx.fillStyle = '#ffd600'; ctx.beginPath(); ctx.arc(384+24, 16, 2, 0, Math.PI*2); ctx.fill(); // Knauf

        // 13. GROSSER BAUM / PFLANZE (Y)
        ctx.clearRect(416, 0, 32, 32);
        ctx.fillStyle = '#3e2723'; ctx.fillRect(416+14, 16, 4, 16);
        ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.moveTo(416+16, 2); ctx.lineTo(416+28, 14); ctx.lineTo(416+4, 14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(416+16, 8); ctx.lineTo(416+30, 22); ctx.lineTo(416+2, 22); ctx.fill();

        // 14. TERMINAL / OBJEKT (U)
        ctx.clearRect(448, 0, 32, 32);
        ctx.fillStyle = '#212121'; ctx.fillRect(448+4, 10, 24, 18);
        ctx.fillStyle = '#00e676'; ctx.fillRect(448+6, 12, 20, 10); // Screen Green
        ctx.fillStyle = 'rgba(0,255,0,0.5)'; ctx.shadowBlur=5; ctx.shadowColor='#0f0'; ctx.fillRect(448+6,12,20,10); ctx.shadowBlur=0;

        // 15. FASS / HINDERNIS (F)
        ctx.clearRect(480, 0, 32, 32);
        ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(480+16, 16, 10, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#3e2723'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(480+16, 16, 10, 0, Math.PI*2); ctx.stroke();

        this.gameTileset = cvs;
        return cvs;
    },

    renderStaticMap: function() { 
        if(!this.cacheCtx) this.initCache();
        const ctx = this.cacheCtx; 
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height); 
        if(!this.state.currentMap) return;
        this.generateGameTileset();

        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                if(this.state.currentMap[y]) this.drawTile(ctx, x, y, this.state.currentMap[y][x]); 
            }
        }
    },

    draw: function() { 
        if(!this.ctx || !this.cacheCanvas || !this.state.currentMap) return;
        const ctx = this.ctx; const cvs = ctx.canvas; 
        ctx.imageSmoothingEnabled = false; 

        // Camera Logic
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        this.camera.x = Math.max(0, Math.min(targetCamX, (this.MAP_W * this.TILE) - cvs.width)); 
        this.camera.y = Math.max(0, Math.min(targetCamY, (this.MAP_H * this.TILE) - cvs.height)); 
        
        // Background
        ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, cvs.width, cvs.height); 
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        
        ctx.save(); 
        ctx.translate(-this.camera.x, -this.camera.y); 
        
        const startX = Math.floor(this.camera.x / this.TILE); 
        const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; 
        const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; 

        for(let y=startY; y<endY; y++) { 
            for(let x=startX; x<endX; x++) { 
                if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { 
                    const tileKey = `${secKey}_${x},${y}`;
                    const isCity = (this.state.zone && this.state.zone.includes("Stadt")); 
                    
                    // Fog of War (in Stadt deaktiviert für bessere Übersicht)
                    if(!isCity && !this.state.explored[tileKey]) {
                        ctx.fillStyle = "#000"; ctx.fillRect(x * this.TILE, y * this.TILE, this.TILE + 1, this.TILE + 1);
                        continue; 
                    }
                    if(!this.state.currentMap[y]) continue; 
                    const t = this.state.currentMap[y][x]; 

                    // Redraw special dynamic tiles
                    if(['V', 'S', 'C', 'G', 'H', 'R', '^', 'v', '<', '>', '$', '&', 'P', 'E', 'F', 'X'].includes(t)) { 
                        this.drawTile(ctx, x, y, t, pulse); 
                    } 
                    
                    // Hidden Items
                    if(this.state.hiddenItems && this.state.hiddenItems[`${x},${y}`]) {
                        const shimmer = (Math.sin(Date.now() / 150) + 1) / 2;
                        ctx.fillStyle = `rgba(255, 255, 100, ${shimmer * 0.8})`;
                        ctx.beginPath(); ctx.arc(x * this.TILE + this.TILE/2, y * this.TILE + this.TILE/2, 3, 0, Math.PI * 2); ctx.fill();
                    }
                } 
            } 
        } 
        
        // Multi-Player
        if(typeof Network !== 'undefined' && Network.otherPlayers) {
            for(let pid in Network.otherPlayers) {
                const p = Network.otherPlayers[pid];
                if(p.sector && p.sector.x === this.state.sector.x && p.sector.y === this.state.sector.y) {
                    const ox = p.x * this.TILE + this.TILE/2; const oy = p.y * this.TILE + this.TILE/2;
                    ctx.fillStyle = "#00ffff"; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI*2); ctx.fill();
                }
            }
        }

        // Spieler
        this.drawPlayerSprite(ctx);
        ctx.restore(); 

        // Scanlines
        ctx.fillStyle = "rgba(0, 255, 0, 0.03)";
        for(let i=0; i<cvs.height; i+=2) ctx.fillRect(0, i, cvs.width, 1);
    },

    drawPlayerSprite: function(ctx) {
        const px = this.state.player.x * this.TILE + this.TILE/2; 
        const py = this.state.player.y * this.TILE + this.TILE/2; 
        const bounce = Math.sin(Date.now() / 150) * 2;

        ctx.save();
        ctx.translate(px, py + bounce);
        
        // Schatten
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0, 10-bounce, 8, 4, 0, 0, Math.PI*2); ctx.fill();

        // Char
        ctx.fillStyle = "#0055ff"; ctx.fillRect(-6, -8, 12, 14); // Suit
        ctx.fillStyle = "#ffdd00"; ctx.fillRect(-2, -8, 4, 14); // Stripe
        ctx.fillStyle = "#ffccaa"; ctx.fillRect(-7, -18, 14, 10); // Head
        ctx.fillStyle = "#4e342e"; ctx.fillRect(-8, -20, 16, 5); // Hair
        
        // Eyes
        ctx.fillStyle = "black";
        if(Math.random()>0.02) { ctx.fillRect(-3, -15, 2, 2); ctx.fillRect(3, -15, 2, 2); }

        ctx.restore();
    },

    drawTile: function(ctx, x, y, type, pulse = 1) { 
        const ts = this.TILE; const px = x * ts; const py = y * ts; 
        const s = this.gameTileset;
        const d = (idx) => ctx.drawImage(s, idx*32, 0, 32, 32, px, py, ts, ts); // Helper

        // --- MAP TILES (Boden, Wände, Deko) ---
        // Basis Boden
        if(['=','+','|'].includes(type)) { /* Eigener Hintergrund im Tile */ }
        else if(type === 'W' || type === '~') { d(4); } // Wasser
        else if([',','_'].includes(type)) d(0); // Boden Variation
        else d(0); // Standard Boden drunter zeichnen für Transparenz

        switch(type) {
            case '#': d(1); break; // Wand
            case 't': d(2); break; // Baum
            case 'T': d(3); break; // Toter Baum
            case 'M': d(5); break; // Berg
            case 'X': d(6); break; // Kiste
            case '=': d(7); break; // Straße (Asphalt)
            case '"': d(8); break; // Gras
            case 'o': d(9); break; // Fels
            case 'x': d(10); break; // Zaun
            case '|': d(11); break; // Säule
            case '+': d(12); break; // Tür
            case 'Y': d(13); break; // Pflanze
            case 'U': d(14); break; // Terminal
            case 'F': d(15); break; // Fass
        }

        // --- ICONS & SPECIALS ---
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        
        if(['^', 'v', '<', '>'].includes(type)) { 
            ctx.fillStyle = "#000"; ctx.fillRect(px+4, py+4, 24, 24); 
            ctx.fillStyle = "#0f0"; ctx.font="20px monospace"; 
            ctx.fillText(type==='^'?'▲':(type==='v'?'▼':(type==='<'?'◄':'►')), px+ts/2, py+ts/2);
        }
        else if(type === '$') { // SHOP
            d(12); // Tür Hintergrund
            ctx.font="24px monospace"; ctx.shadowColor="#ff0"; ctx.shadowBlur=5; ctx.fillText("💰", px+ts/2, py+ts/2); ctx.shadowBlur=0;
        }
        else if(type === '&') { // CRAFTING
            d(6); // Kiste Hintergrund
            ctx.font="24px monospace"; ctx.fillText("🔨", px+ts/2, py+ts/2);
        }
        else if(type === 'P') { // ARZT
            ctx.fillStyle="#fff"; ctx.fillRect(px+4, py+4, 24, 24);
            ctx.font="24px monospace"; ctx.fillText("🏥", px+ts/2, py+ts/2);
        }
        else if(type === 'V') { // VAULT
            ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, 12, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle="#ff0"; ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle="#ff0"; ctx.font="12px monospace"; ctx.fillText("101", px+ts/2, py+ts/2);
        }
        else if(type === 'R') { // SUPER MART
            ctx.fillStyle="#b71c1c"; ctx.fillRect(px+2, py+10, 28, 12);
            ctx.fillStyle="#fff"; ctx.font="10px monospace"; ctx.fillText("MART", px+ts/2, py+ts/2);
        }
        else if(type === 'E') { // EXIT
            ctx.fillStyle = "rgba(255,0,0,0.5)"; ctx.fillRect(px, py, ts, ts);
            ctx.fillStyle = "#fff"; ctx.font="10px monospace"; ctx.fillText("EXIT", px+ts/2, py+ts/2);
        }
    }
});
