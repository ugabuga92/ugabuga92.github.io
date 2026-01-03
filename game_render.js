// [v3.9] - 2026-01-03 05:15pm (Game View Overhaul)
// - GFX: Komplette Umstellung auf Prozedurale Pixel-Art (keine Vektor-Formen mehr).
// - ENGINE: 'generateGameTileset' erstellt nun Texturen für Wände, Böden, Bäume etc.
// - CHAR: Spieler ist jetzt ein animierter Sprite (kein grünes Viereck mehr).
// - VISUAL: Dynamische Schatten und 16-Bit Rendering für die lokale Karte.

Object.assign(Game, {
    gameTileset: null,

    // Erstellt die Texturen für das Spiel (Wände, Boden, Objekte)
    generateGameTileset: function() {
        if (this.gameTileset) return this.gameTileset;

        const TILE = 32;
        const cvs = document.createElement('canvas');
        cvs.width = TILE * 8; // Platz für 8 Tile-Typen
        cvs.height = TILE;
        const ctx = cvs.getContext('2d');

        // Helper: Noise Funktion für Textur
        const noise = (x, y, color, intensity) => {
            ctx.fillStyle = color; ctx.fillRect(x, y, TILE, TILE);
            for(let i=0; i<40; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)';
                ctx.fillRect(x + Math.random()*TILE, y + Math.random()*TILE, 2, 2);
            }
        };

        // 0. BODEN (.) - Index 0
        noise(0, 0, '#5d4037', 20); // Dunkle Erde
        ctx.fillStyle = '#4e342e'; ctx.fillRect(5, 5, 4, 4); ctx.fillRect(20, 20, 6, 2); // Details

        // 1. WAND (#) - Index 1
        noise(32, 0, '#333', 30); // Dunkler Beton/Metall
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(32, 0, 32, 32); // Rand
        ctx.fillStyle = '#111'; ctx.fillRect(34, 4, 10, 4); ctx.fillRect(48, 16, 10, 4); // Fugen

        // 2. BAUM (t) - Index 2
        // Transparenter Hintergrund für Objekte
        ctx.clearRect(64, 0, 32, 32); 
        // Stamm
        ctx.fillStyle = '#3e2723'; ctx.fillRect(64+12, 16, 8, 16);
        // Krone
        ctx.fillStyle = '#2e7d32'; 
        ctx.beginPath(); ctx.arc(64+16, 12, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1b5e20'; // Schatten in Krone
        ctx.beginPath(); ctx.arc(64+12, 10, 6, 0, Math.PI*2); ctx.fill();

        // 3. TOTER BAUM (T) - Index 3
        ctx.clearRect(96, 0, 32, 32);
        ctx.fillStyle = '#4e342e'; // Stamm
        ctx.fillRect(96+14, 16, 4, 16);
        ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 2; // Äste
        ctx.beginPath(); ctx.moveTo(96+16, 20); ctx.lineTo(96+8, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(96+16, 22); ctx.lineTo(96+24, 12); ctx.stroke();

        // 4. WASSER (~) - Index 4
        noise(128, 0, '#2e7d32', 10); // Giftgrünes Wasser
        ctx.fillStyle = 'rgba(200,255,200,0.2)'; // Glanz
        ctx.fillRect(130, 8, 10, 2); ctx.fillRect(145, 20, 8, 2);

        // 5. BERG/FELS (M) - Index 5
        ctx.clearRect(160, 0, 32, 32);
        ctx.fillStyle = '#555'; ctx.beginPath(); ctx.moveTo(160+16, 2); ctx.lineTo(160+30, 30); ctx.lineTo(160+2, 30); ctx.fill();
        ctx.fillStyle = '#777'; ctx.beginPath(); ctx.moveTo(160+16, 2); ctx.lineTo(160+22, 15); ctx.lineTo(160+10, 15); ctx.fill(); // Spitze

        // 6. KISTE (X) - Index 6
        ctx.clearRect(192, 0, 32, 32);
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(196, 8, 24, 20); // Holzbox
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.strokeRect(196, 8, 24, 20);
        ctx.beginPath(); ctx.moveTo(196, 8); ctx.lineTo(220, 28); ctx.stroke(); // X drauf

        // 7. BODEN VARIANTE (,) - Index 7
        noise(224, 0, '#6d4c41', 20); // Hellerer Dreck

        this.gameTileset = cvs;
        return cvs;
    },

    renderStaticMap: function() { 
        if(!this.cacheCtx) this.initCache();
        const ctx = this.cacheCtx; 
        
        // Pixel Art Settings
        ctx.imageSmoothingEnabled = false;

        // Reset
        ctx.fillStyle = "#000"; 
        ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height); 
        
        if(!this.state.currentMap) return;

        // Tileset vorbereiten
        this.generateGameTileset();

        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                if(this.state.currentMap[y]) {
                    this.drawTile(ctx, x, y, this.state.currentMap[y][x]); 
                }
            }
        }
    },

    draw: function() { 
        if(!this.ctx || !this.cacheCanvas) return; 
        if(!this.state.currentMap) return;

        const ctx = this.ctx; const cvs = ctx.canvas; 
        ctx.imageSmoothingEnabled = false; // WICHTIG FÜR PIXEL LOOK

        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width; 
        const maxCamY = (this.MAP_H * this.TILE) - cvs.height; 
        
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX)); 
        this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY)); 
        
        // Hintergrund löschen
        ctx.fillStyle = "#050505"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height); 
        
        // Statische Map zeichnen (Boden, Wände)
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        
        ctx.save(); 
        ctx.translate(-this.camera.x, -this.camera.y); 
        
        const startX = Math.floor(this.camera.x / this.TILE); 
        const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; 
        const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; 

        // Dynamische Objekte Loop
        for(let y=startY; y<endY; y++) { 
            for(let x=startX; x<endX; x++) { 
                if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { 
                    
                    const tileKey = `${secKey}_${x},${y}`;
                    const isCity = (this.state.zone && this.state.zone.includes("Stadt")); 
                    
                    // Fog of War
                    if(!isCity && !this.state.explored[tileKey]) {
                        ctx.fillStyle = "#000";
                        ctx.fillRect(x * this.TILE, y * this.TILE, this.TILE + 1, this.TILE + 1);
                        continue; 
                    }

                    if(!this.state.currentMap[y]) continue; 
                    const t = this.state.currentMap[y][x]; 

                    // Spezial-Objekte über dem Boden zeichnen
                    if(['V', 'S', 'C', 'G', 'H', 'R', '^', 'v', '<', '>', '$', '&', 'P', 'E', 'F', 'X'].includes(t)) { 
                        this.drawTile(ctx, x, y, t, pulse); 
                    } 
                    
                    // Hidden Items Glitzern
                    if(this.state.hiddenItems && this.state.hiddenItems[`${x},${y}`]) {
                        const shimmer = (Math.sin(Date.now() / 150) + 1) / 2;
                        ctx.fillStyle = `rgba(255, 255, 100, ${shimmer * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(x * this.TILE + this.TILE/2, y * this.TILE + this.TILE/2, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } 
            } 
        } 
        
        // SPIELER RENDERN (NEU: PIXEL SPRITE STATT DREIECK)
        this.drawPlayerSprite(ctx);

        ctx.restore(); 
        
        // Scanline Overlay für Retro Feeling
        ctx.fillStyle = "rgba(0, 255, 0, 0.02)";
        for(let i=0; i<cvs.height; i+=4) {
            ctx.fillRect(0, i, cvs.width, 1);
        }
    },

    // Neuer Player Renderer
    drawPlayerSprite: function(ctx) {
        const px = this.state.player.x * this.TILE + this.TILE/2; 
        const py = this.state.player.y * this.TILE + this.TILE/2; 

        ctx.save();
        ctx.translate(px, py);
        
        // Schatten
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.ellipse(0, 10, 8, 4, 0, 0, Math.PI*2); ctx.fill();

        // Bounce Animation beim Gehen (optional, hier einfacher Idle-Bounce)
        const bounce = Math.sin(Date.now() / 200) * 2;
        ctx.translate(0, bounce);

        // Körper
        ctx.fillStyle = "#0044aa"; // Vault Blau
        ctx.fillRect(-6, -6, 12, 14);
        ctx.fillStyle = "#cca000"; // Gelb
        ctx.fillRect(-2, -6, 4, 14); // Streifen

        // Kopf
        ctx.fillStyle = "#ffccaa"; // Haut
        ctx.fillRect(-7, -16, 14, 10);
        
        // Haare
        ctx.fillStyle = "#4a3b2a"; // Braun
        ctx.fillRect(-8, -18, 16, 4); 
        ctx.fillRect(-8, -18, 4, 10); // Seiten

        // Augen (Richtung schauen)
        // Einfache Logik: Wir wissen rot nicht exakt in Grad, aber nutzen wir einfach 2 Augen
        ctx.fillStyle = "black";
        ctx.fillRect(-3, -13, 2, 2);
        ctx.fillRect(2, -13, 2, 2);

        ctx.restore();
    },

    drawTile: function(ctx, x, y, type, pulse = 1) { 
        const ts = this.TILE; const px = x * ts; const py = y * ts; 
        const sheet = this.gameTileset;
        
        // Mapping Char -> Sheet Index
        // 0=Boden, 1=Wand, 2=Baum, 3=TotBaum, 4=Wasser, 5=Berg, 6=Kiste, 7=Boden2
        
        // 1. BODEN ZEICHNEN (Immer als Basis)
        if(sheet) {
            if([',', '_', ';'].includes(type)) {
                 ctx.drawImage(sheet, 7*32, 0, 32, 32, px, py, ts, ts); // Boden Var
            } else if(type !== ' ' && type !== 'M' && type !== 'W') { // M und W haben eigene Fills oft
                 ctx.drawImage(sheet, 0, 0, 32, 32, px, py, ts, ts); // Standard Boden
            }
        } else {
             // Fallback falls Sheet fehlt
             ctx.fillStyle = "#332211"; ctx.fillRect(px, py, ts, ts);
        }

        // 2. OBJEKTE DRAUF ZEICHNEN
        if (sheet) {
            if(type === '#') {
                ctx.drawImage(sheet, 1*32, 0, 32, 32, px, py, ts, ts); // Wand
                return;
            }
            if(type === 't') {
                ctx.drawImage(sheet, 2*32, 0, 32, 32, px, py, ts, ts); // Baum
                return;
            }
            if(type === 'T') {
                ctx.drawImage(sheet, 3*32, 0, 32, 32, px, py, ts, ts); // Toter Baum
                return;
            }
            if(type === 'W' || type === '~') {
                ctx.drawImage(sheet, 4*32, 0, 32, 32, px, py, ts, ts); // Wasser
                return;
            }
            if(type === 'M') {
                ctx.drawImage(sheet, 5*32, 0, 32, 32, px, py, ts, ts); // Berg
                return;
            }
            if(type === 'X') {
                 ctx.drawImage(sheet, 6*32, 0, 32, 32, px, py, ts, ts); // Kiste
                 return;
            }
        }

        // SPECIAL ITEMS (bleiben Vektor oder Text, weil spezifisch)
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        
        if(['^', 'v', '<', '>'].includes(type)) { 
            ctx.fillStyle = "#111"; ctx.fillRect(px, py, ts, ts); // Loch
            ctx.font = "20px monospace"; ctx.fillStyle = "#39ff14"; 
            ctx.fillText(type === '^' ? '▲' : (type==='v'?'▼':'►'), px+ts/2, py+ts/2);
            return;
        }
        
        if(type === 'V') { ctx.font="24px monospace"; ctx.fillText("⚙️", px+ts/2, py+ts/2); return; }
        if(type === 'R') { ctx.font="24px monospace"; ctx.fillText("🛒", px+ts/2, py+ts/2); return; }
        if(type === '$') { ctx.font="20px monospace"; ctx.fillText("💰", px+ts/2, py+ts/2); return; }
        if(type === 'P') { ctx.font="20px monospace"; ctx.fillText("🏥", px+ts/2, py+ts/2); return; }
        if(type === '&') { ctx.font="20px monospace"; ctx.fillText("🔨", px+ts/2, py+ts/2); return; }
    }
});
