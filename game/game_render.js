Object.assign(Game, {
    // Initialisiert den Cache-Kontext, falls noch nicht geschehen
    initCache: function() {
        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = this.MAP_W * this.TILE;
        this.cacheCanvas.height = this.MAP_H * this.TILE;
        this.cacheCtx = this.cacheCanvas.getContext('2d');
    },

    // Zeichnet die gesamte Karte einmalig auf die Offscreen-Canvas
    renderStaticMap: function() { 
        if(!this.cacheCtx) this.initCache();
        const ctx = this.cacheCtx; 
        
        // Hintergrund löschen (schwarz)
        ctx.fillStyle = "#000"; 
        ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height); 
        
        if(!this.state.currentMap) return;

        // Alle Tiles der Karte durchgehen und zeichnen
        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                if(this.state.currentMap[y]) {
                    this.drawTile(ctx, x, y, this.state.currentMap[y][x]); 
                }
            }
        }
    },

    // Haupt-Zeichenfunktion, wird in jedem Frame aufgerufen
    draw: function() { 
        if(!this.ctx || !this.cacheCanvas) return; 
        if(!this.state.currentMap) return;

        const ctx = this.ctx; 
        const cvs = ctx.canvas; 
        
        // Kamera-Position berechnen (zentriert auf den Spieler)
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        
        // Maximale Kamera-Grenzen berechnen
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width; 
        const maxCamY = (this.MAP_H * this.TILE) - cvs.height; 
        
        // Kamera innerhalb der Grenzen halten
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX)); 
        this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY)); 
        
        // Sichtbaren Bereich löschen
        ctx.fillStyle = "#000"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height); 
        
        // Den relevanten Ausschnitt aus dem Cache auf die sichtbare Canvas kopieren
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        
        // Kontext für dynamische Objekte vorbereiten (Kamera-Verschiebung)
        ctx.save(); 
        ctx.translate(-this.camera.x, -this.camera.y); 
        
        // Sichtbaren Bereich in Tile-Koordinaten berechnen
        const startX = Math.floor(this.camera.x / this.TILE); 
        const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; 
        const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; // Pulsierender Effekt

        // Über den sichtbaren Bereich iterieren
        for(let y=startY; y<endY; y++) { 
            for(let x=startX; x<endX; x++) { 
                if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { 
                    
                    const tileKey = `${secKey}_${x},${y}`;
                    const isCity = (this.state.zone && this.state.zone.includes("Stadt")); 
                    
                    // Fog of War: Nicht erkundete Bereiche schwarz übermalen (außer in Städten)
                    if(!isCity && !this.state.explored[tileKey]) {
                        ctx.fillStyle = "#000";
                        ctx.fillRect(x * this.TILE, y * this.TILE, this.TILE, this.TILE);
                        continue; 
                    }

                    if(!this.state.currentMap[y]) continue; 

                    const t = this.state.currentMap[y][x]; 
                    
                    // Dynamische/Animierte Tiles neu zeichnen (über den statischen Hintergrund)
                    // [v3.3] Added 'R' to special render list
                    if(['V', 'S', 'C', 'G', 'H', 'R', '^', 'v', '<', '>', '$', '&', 'P', 'E', 'F', 'X'].includes(t)) { 
                        this.drawTile(ctx, x, y, t, pulse); 
                    } 
                    
                    // Versteckte Items zeichnen (schimmernd)
                    if(this.state.hiddenItems && this.state.hiddenItems[`${x},${y}`]) {
                        const shimmer = (Math.sin(Date.now() / 200) + 1) / 2;
                        ctx.globalAlpha = 0.3 + (shimmer * 0.5);
                        ctx.fillStyle = "#ffffff";
                        ctx.beginPath();
                        ctx.arc(x * this.TILE + this.TILE/2, y * this.TILE + this.TILE/2, 4 + shimmer * 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                    }
                } 
            } 
        } 
        
        // Andere Spieler zeichnen
        if(typeof Network !== 'undefined' && Network.otherPlayers) { 
            for(let pid in Network.otherPlayers) { 
                const p = Network.otherPlayers[pid]; 
                // Nur Spieler im gleichen Sektor zeichnen
                if(p.sector && (p.sector.x !== this.state.sector.x || p.sector.y !== this.state.sector.y)) continue; 
                
                const ox = p.x * this.TILE + this.TILE/2; 
                const oy = p.y * this.TILE + this.TILE/2; 
                
                // Spieler-Punkt (Cyan)
                ctx.fillStyle = "#00ffff"; 
                ctx.shadowBlur = 5; 
                ctx.shadowColor = "#00ffff"; 
                ctx.beginPath(); 
                ctx.arc(ox, oy, 5, 0, Math.PI*2); 
                ctx.fill(); 
                
                // Spieler-Name
                ctx.font = "10px monospace"; 
                ctx.fillStyle = "white"; 
                ctx.fillText(p.name ? p.name.substring(0,3) : "P", ox+6, oy); 
                ctx.shadowBlur = 0; 
            } 
        } 
        
        // Eigenen Spieler zeichnen (Dreieck)
        const px = this.state.player.x * this.TILE + this.TILE/2; 
        const py = this.state.player.y * this.TILE + this.TILE/2; 
        
        ctx.save();
        ctx.translate(px, py); 
        ctx.rotate(this.state.player.rot); 
        ctx.translate(-px, -py); 
        
        ctx.fillStyle = "#39ff14"; 
        ctx.shadowBlur = 10; 
        ctx.shadowColor = "#39ff14"; 
        ctx.beginPath(); 
        ctx.moveTo(px, py - 8); 
        ctx.lineTo(px + 6, py + 8); 
        ctx.lineTo(px, py + 5); 
        ctx.lineTo(px - 6, py + 8); 
        ctx.fill(); 
        ctx.shadowBlur = 0; 
        
        ctx.restore(); // Rotation zurücksetzen
        
        ctx.restore(); // Kamera-Translation zurücksetzen
    },

    // Zeichnet ein einzelnes Tile
    drawTile: function(ctx, x, y, type, pulse = 1) { 
        const ts = this.TILE; const px = x * ts; const py = y * ts; 
        
        // Hintergrundfarbe bestimmen
        let bg = this.colors['.']; 
        if(['_', ',', ';', '=', 'W', 'M', '~', '|', 'B'].includes(type)) bg = this.colors[type]; 
        
        // Hintergrund zeichnen (außer bei speziellen Symbolen)
        if (!['^','v','<','>'].includes(type) && type !== '#') { ctx.fillStyle = bg; ctx.fillRect(px, py, ts, ts); } 
        
        // Rahmen zeichnen (außer bei speziellen Symbolen)
        if(!['^','v','<','>','M','W','~','X'].includes(type) && type !== '#') { ctx.strokeStyle = "rgba(40, 90, 40, 0.05)"; ctx.lineWidth = 1; ctx.strokeRect(px, py, ts, ts); } 
        
        // Pfeile (Ausgänge) zeichnen
        if(['^', 'v', '<', '>'].includes(type)) { 
            ctx.fillStyle = "#000"; ctx.fillRect(px, py, ts, ts); ctx.fillStyle = "#1aff1a"; ctx.strokeStyle = "#000"; ctx.beginPath(); 
            if (type === '^') { ctx.moveTo(px + ts/2, py + 5); ctx.lineTo(px + ts - 5, py + ts - 5); ctx.lineTo(px + 5, py + ts - 5); } 
            else if (type === 'v') { ctx.moveTo(px + ts/2, py + ts - 5); ctx.lineTo(px + ts - 5, py + 5); ctx.lineTo(px + 5, py + 5); } 
            else if (type === '<') { ctx.moveTo(px + 5, py + ts/2); ctx.lineTo(px + ts - 5, py + 5); ctx.lineTo(px + ts - 5, py + ts - 5); } 
            else if (type === '>') { ctx.moveTo(px + ts - 5, py + ts/2); ctx.lineTo(px + 5, py + 5); ctx.lineTo(px + 5, py + ts - 5); } 
            ctx.fill(); ctx.stroke(); return; 
        }
        
        ctx.beginPath(); 
        
        // Spezielle Symbole zeichnen
        switch(type) { 
            case '#': ctx.fillStyle = "#222"; ctx.fillRect(px, py, ts, ts); ctx.lineWidth=1; ctx.strokeStyle="#444"; ctx.strokeRect(px, py, ts, ts); break; 
            case 't': ctx.fillStyle = this.colors['t']; ctx.moveTo(px + ts/2, py + 2); ctx.lineTo(px + ts - 4, py + ts - 2); ctx.lineTo(px + 4, py + ts - 2); ctx.fill(); break;
            case 'T': ctx.fillStyle = this.colors['T']; ctx.moveTo(px + ts/2, py + 2); ctx.lineTo(px + ts - 2, py + ts - 2); ctx.lineTo(px + 2, py + ts - 2); ctx.fill(); break;
            case 'x': ctx.strokeStyle = this.colors['x']; ctx.lineWidth = 2; ctx.moveTo(px+5, py+ts-5); ctx.lineTo(px+ts-5, py+5); ctx.moveTo(px+5, py+5); ctx.lineTo(px+ts-5, py+ts-5); ctx.stroke(); break;
            case '"': ctx.strokeStyle = this.colors['"']; ctx.lineWidth = 1; ctx.moveTo(px+5, py+ts-5); ctx.lineTo(px+5, py+10); ctx.moveTo(px+15, py+ts-5); ctx.lineTo(px+15, py+5); ctx.moveTo(px+25, py+ts-5); ctx.lineTo(px+25, py+12); ctx.stroke(); break;
            case 'Y': ctx.strokeStyle = this.colors['Y']; ctx.lineWidth = 3; ctx.moveTo(px+15, py+ts-5); ctx.lineTo(px+15, py+5); ctx.moveTo(px+15, py+15); ctx.lineTo(px+5, py+10); ctx.moveTo(px+15, py+10); ctx.lineTo(px+25, py+5); ctx.stroke(); break;
            case 'o': ctx.fillStyle = this.colors['o']; ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); break;
            case '+': ctx.fillStyle = this.colors['+']; ctx.fillRect(px+5, py+10, 5, 5); ctx.fillRect(px+15, py+20, 4, 4); ctx.fillRect(px+20, py+5, 6, 6); break;
            case 'M': ctx.fillStyle = "#3e2723"; ctx.moveTo(px + ts/2, py + 2); ctx.lineTo(px + ts, py + ts); ctx.lineTo(px, py + ts); ctx.fill(); break;
            case 'W': ctx.strokeStyle = "#4fc3f7"; ctx.lineWidth = 2; ctx.moveTo(px+5, py+15); ctx.lineTo(px+15, py+10); ctx.lineTo(px+25, py+15); ctx.stroke(); break;
            case '~': ctx.strokeStyle = "#556b2f"; ctx.lineWidth = 2; ctx.moveTo(px+5, py+15); ctx.lineTo(px+15, py+10); ctx.lineTo(px+25, py+15); ctx.stroke(); break;
            case '=': ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2; ctx.moveTo(px, py+5); ctx.lineTo(px+ts, py+5); ctx.moveTo(px, py+25); ctx.lineTo(px+ts, py+25); ctx.stroke(); break;
            case 'U': ctx.fillStyle = "#000"; ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI, true); ctx.fill(); break;
            
            // VAULT 101
            case 'V': 
                ctx.globalAlpha = 1; 
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ffff00";
                ctx.fillStyle = "#ffff00"; 
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "35px monospace"; 
                ctx.fillText("⚙️", px + ts/2, py + ts/2);
                
                ctx.font = "bold 10px monospace";
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "#000";
                ctx.shadowBlur = 4;
                ctx.fillText("VAULT 101", px + ts/2, py + ts - 2); 

                ctx.shadowBlur = 0;
                ctx.textAlign = "start";
                ctx.textBaseline = "alphabetic";
                break; 

            // [v3.3] SUPER-MART (Raider Fortress)
            case 'R':
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#ff0000"; // Red danger glow
                
                // Icon: Shopping Cart
                ctx.fillStyle = "#ff3333"; 
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "30px monospace"; 
                ctx.fillText("🛒", px + ts/2, py + ts/2);
                
                // Label
                ctx.shadowBlur = 2;
                ctx.shadowColor = "black";
                ctx.font = "bold 9px monospace";
                ctx.fillStyle = "#ffffff";
                ctx.fillText("SUPER-MART", px + ts/2, py + ts - 2); 

                ctx.shadowBlur = 0;
                ctx.textAlign = "start";
                ctx.textBaseline = "alphabetic";
                break;

            case 'C': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['C']; ctx.fillRect(px+6, py+14, 18, 12); ctx.beginPath(); ctx.moveTo(px+4, py+14); ctx.lineTo(px+15, py+4); ctx.lineTo(px+26, py+14); ctx.fill(); break; 
            case 'S': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['S']; ctx.arc(px+ts/2, py+12, 6, 0, Math.PI*2); ctx.fill(); ctx.fillRect(px+10, py+18, 10, 6); break; 
            case 'H': ctx.globalAlpha = pulse; ctx.fillStyle = this.colors['H']; ctx.arc(px+ts/2, py+ts/2, ts/2.5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/4, 0, Math.PI*2); ctx.fill(); break; 
            case '$': ctx.fillStyle = this.colors['$']; ctx.fillText("$$", px+5, py+20); break;
            case '&': ctx.fillStyle = this.colors['&']; ctx.fillText("🔧", px+5, py+20); break;
            case 'P': ctx.fillStyle = this.colors['P']; ctx.fillText("✚", px+8, py+20); break;
            case 'E': ctx.fillStyle = this.colors['E']; ctx.fillText("EXIT", px+2, py+20); break;
            case 'F': ctx.fillStyle = this.colors['F']; ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); break;
            case '|': ctx.fillStyle = this.colors['|']; ctx.fillRect(px, py, ts, ts); break;
            case 'X': ctx.fillStyle = this.colors['X']; ctx.fillRect(px+5, py+10, 20, 15); ctx.fillStyle = "#ffd700"; ctx.fillRect(px+12, py+15, 6, 5); break;
        } 
        ctx.globalAlpha = 1; 
    }
});
