Object.assign(Game, {
    // [NEU] Helfer für prozedurale Grafik (Malen mit Code statt Bildern)
    drawHelpers: {
        tree: function(ctx, x, y, size) {
            // Schatten am Boden
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.ellipse(x + size/2, y + size - 2, size/2, size/4, 0, 0, Math.PI*2);
            ctx.fill();

            // Stamm
            ctx.fillStyle = "#5d4037"; // Braun
            ctx.fillRect(x + size/2 - size/8, y + size/2, size/4, size/2);

            // Krone (3 Kreise für Volumen)
            const crownY = y + size/2 - 5;
            
            ctx.fillStyle = "#1b5e20"; // Dunkelgrün (unten)
            ctx.beginPath(); ctx.arc(x + size/2, crownY, size/2.5, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = "#2e7d32"; // Mittelgrün (links)
            ctx.beginPath(); ctx.arc(x + size/2 - 6, crownY + 5, size/3, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = "#4caf50"; // Hellgrün (Lichtakzent rechts)
            ctx.beginPath(); ctx.arc(x + size/2 + 6, crownY + 2, size/3.5, 0, Math.PI*2); ctx.fill();
        },
        
        wall: function(ctx, x, y, size) {
            // 3D Metall-Block Effekt
            const grad = ctx.createLinearGradient(x, y, x + size, y);
            grad.addColorStop(0, "#222");
            grad.addColorStop(0.2, "#555"); // Lichtkante
            grad.addColorStop(0.5, "#333");
            grad.addColorStop(1, "#111");
            
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, size, size);
            
            // Details: Nieten in den Ecken
            ctx.fillStyle = "#000";
            ctx.fillRect(x+2, y+2, 2, 2);
            ctx.fillRect(x+size-4, y+2, 2, 2);
            ctx.fillRect(x+2, y+size-4, 2, 2);
            ctx.fillRect(x+size-4, y+size-4, 2, 2);
            
            // Rahmen
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, size, size);
        },

        player: function(ctx, x, y, size, color="#00ffff") {
             // Schatten
             ctx.fillStyle = "rgba(0,0,0,0.5)";
             ctx.beginPath();
             ctx.ellipse(x, y + size/3, size/2, size/4, 0, 0, Math.PI*2);
             ctx.fill();

             // Körper (Vault Suit Blau)
             ctx.fillStyle = "#0044ff"; 
             ctx.fillRect(x - size/3, y - size/3, size/1.5, size/1.5);
             
             // Goldener Streifen (Reißverschluss)
             ctx.fillStyle = "#ffd700";
             ctx.fillRect(x - size/10, y - size/3, size/5, size/1.5);

             // Kopf (Hautfarbe)
             ctx.fillStyle = "#ffccaa"; 
             ctx.beginPath();
             ctx.arc(x, y - size/4, size/3, 0, Math.PI*2);
             ctx.fill();
             
             // Ziel-Ring (Markierung)
             ctx.strokeStyle = color;
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.arc(x, y, size/1.5, 0, Math.PI*2);
             ctx.stroke();
        }
    },

    renderStaticMap: function() { 
        if(!this.cacheCtx) this.initCache();
        const ctx = this.cacheCtx; 
        
        // Dunkler Hintergrund (Canvas löschen)
        ctx.fillStyle = "#0a0a0a"; 
        ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height); 
        
        if(!this.state.currentMap) return;

        // Einmaliges Zeichnen der statischen Welt in den Cache
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
        
        // Kamera Berechnung
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width; 
        const maxCamY = (this.MAP_H * this.TILE) - cvs.height; 
        
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX)); 
        this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY)); 
        
        // Screen Clear
        ctx.fillStyle = "#000"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height); 
        
        // 1. Statische Map aus Cache zeichnen
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        
        ctx.save(); 
        ctx.translate(-this.camera.x, -this.camera.y); 
        
        // Sichtbereich berechnen
        const startX = Math.floor(this.camera.x / this.TILE); 
        const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; 
        const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; 

        // 2. Overlay Loop (Fog of War, Animationen, Items)
        for(let y=startY; y<endY; y++) { 
            for(let x=startX; x<endX; x++) { 
                if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { 
                    
                    const tileKey = `${secKey}_${x},${y}`;
                    const isCity = (this.state.zone && this.state.zone.includes("Stadt")); 
                    
                    // Fog of War (Schwarzes Rechteck drüber malen wenn nicht erkundet)
                    if(!isCity && !this.state.explored[tileKey]) {
                        ctx.fillStyle = "#000";
                        ctx.fillRect(x * this.TILE, y * this.TILE, this.TILE, this.TILE);
                        continue; 
                    }

                    if(!this.state.currentMap[y]) continue; 
                    const t = this.state.currentMap[y][x];

                    // Wasser Animation (Wellen)
                    if(t === '~') {
                        const px = x * this.TILE;
                        const py = y * this.TILE;
                        ctx.strokeStyle = "rgba(255,255,255,0.2)";
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        // Bewegt sich mit der Zeit
                        const waveOffset = (Date.now() / 150) % this.TILE;
                        ctx.moveTo(px, py + waveOffset);
                        ctx.lineTo(px + this.TILE, py + waveOffset);
                        ctx.stroke();
                    }
                    
                    // Versteckte Items (Glitzern)
                    if(this.state.hiddenItems && this.state.hiddenItems[`${x},${y}`]) {
                        const shimmer = (Math.sin(Date.now() / 200) + 1) / 2;
                        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + shimmer * 0.5})`;
                        ctx.beginPath();
                        ctx.arc(x * this.TILE + this.TILE/2, y * this.TILE + this.TILE/2, 3 + shimmer * 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } 
            } 
        } 
        
        // 3. Andere Spieler (Prozedural gezeichnet)
        if(typeof Network !== 'undefined' && Network.otherPlayers) { 
            for(let pid in Network.otherPlayers) { 
                const p = Network.otherPlayers[pid]; 
                if(p.sector && (p.sector.x !== this.state.sector.x || p.sector.y !== this.state.sector.y)) continue; 
                
                const ox = p.x * this.TILE + this.TILE/2; 
                const oy = p.y * this.TILE + this.TILE/2; 
                
                // Nutze den neuen Player-Renderer
                this.drawHelpers.player(ctx, ox, oy, this.TILE, "#00ffff");

                // Name tag
                ctx.font = "10px monospace"; 
                ctx.fillStyle = "white"; 
                ctx.fillText(p.name ? p.name.substring(0,3) : "P", ox+6, oy - 15); 
            } 
        } 
        
        // 4. Eigener Spieler (Prozedural gezeichnet)
        const px = this.state.player.x * this.TILE + this.TILE/2; 
        const py = this.state.player.y * this.TILE + this.TILE/2; 
        
        ctx.translate(px, py); 
        // Rotation optional: Wenn du willst, dass sich das Männchen dreht, lass es drin.
        // Wenn es immer gerade stehen soll, nimm die nächste Zeile raus.
        // ctx.rotate(this.state.player.rot); 
        ctx.translate(-px, -py); 
        
        this.drawHelpers.player(ctx, px, py, this.TILE, "#39ff14"); // Grün für dich selbst
        
        ctx.restore(); 
    },

    drawTile: function(ctx, x, y, type, pulse = 1) { 
        const ts = this.TILE; const px = x * ts; const py = y * ts; 
        
        switch(type) {
            case '#': // WAND (Prozedural)
                this.drawHelpers.wall(ctx, px, py, ts);
                break;
                
            case 't': // BAUM (Prozedural)
            case 'T':
                this.drawHelpers.tree(ctx, px, py, ts);
                break;
                
            case 'C': // STADT (Prozedural)
                ctx.fillStyle = "#222";
                // Gebäude Silhouette
                ctx.fillRect(px + 4, py + 10, ts/2, ts - 10);
                ctx.fillStyle = "#333";
                ctx.fillRect(px + 14, py + 5, ts/2, ts - 5);
                // Fenster (Leuchten)
                ctx.fillStyle = `rgba(255, 255, 0, ${pulse})`;
                ctx.fillRect(px + 6, py + 15, 4, 4);
                ctx.fillRect(px + 18, py + 10, 4, 4);
                ctx.fillRect(px + 18, py + 20, 4, 4);
                break;
                
            case '~': // WASSER (Basis-Farbe, Animation im draw Loop)
                ctx.fillStyle = "#0d47a1";
                ctx.fillRect(px, py, ts, ts);
                break;

            case '.': // BODEN (Zufällige Details)
                // Nur an manchen Stellen kleine Steine malen
                if((x * y) % 13 === 0) {
                     ctx.fillStyle = "#2a2a2a";
                     ctx.beginPath(); ctx.arc(px + ts/2, py + ts/2, 2, 0, Math.PI*2); ctx.fill();
                }
                break;

            default:
                // FALLBACK: Alter Code für Items, Vaults, etc.
                let bg = this.colors ? this.colors['.'] : '#111'; 
                if(this.colors && ['_', ',', ';', '=', 'W', 'M', '|', 'B'].includes(type)) bg = this.colors[type]; 
                
                if (bg) { ctx.fillStyle = bg; ctx.fillRect(px, py, ts, ts); }
                
                // Text Symbole (V, R, S) schön leuchtend rendern
                 if(['V', 'S', 'R', '$', 'P', 'E', 'F'].includes(type)) {
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 20px monospace";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.shadowColor = type === 'R' ? "#f00" : "#fff"; 
                    ctx.shadowBlur = 10;
                    ctx.fillText(type, px + ts/2, py + ts/2);
                    ctx.shadowBlur = 0;
                    ctx.textAlign = "start"; // Reset
                    ctx.textBaseline = "alphabetic";
                }
                break;
        }
    }
});
