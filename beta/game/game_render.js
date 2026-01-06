Object.assign(Game, {
    drawHelpers: {
        // --- NATUR ---
        tree: function(ctx, x, y, size) {
            const wind = Math.sin(Date.now() / 1000 + x) * 2;
            ctx.fillStyle = "rgba(0,0,0,0.4)"; // Schatten
            ctx.beginPath(); ctx.ellipse(x + size/2, y + size - 2, size/3, size/5, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#4e342e"; ctx.fillRect(x + size/2 - size/8, y + size/2, size/4, size/2); // Stamm
            const cx = x + size/2 + wind; const cy = y + size/2 - 5;
            ctx.fillStyle = "#1b5e20"; ctx.beginPath(); ctx.arc(cx, cy, size/2.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#2e7d32"; ctx.beginPath(); ctx.arc(cx - 6, cy + 5, size/3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#388e3c"; ctx.beginPath(); ctx.arc(cx + 4, cy + 2, size/3.5, 0, Math.PI*2); ctx.fill();
        },
        mountain: function(ctx, x, y, size) {
            ctx.fillStyle = "#3e2723"; ctx.beginPath(); ctx.moveTo(x, y + size); ctx.lineTo(x + size/2, y + size/4); ctx.lineTo(x + size, y + size); ctx.fill();
            ctx.fillStyle = "#5d4037"; ctx.beginPath(); ctx.moveTo(x + size/2, y + size/4); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size/2, y + size); ctx.fill();
        },
        grass: function(ctx, x, y, size, density) {
            const count = (x * y) % density + 1; ctx.strokeStyle = "#33691e"; ctx.lineWidth = 1;
            for(let i=0; i<count; i++) {
                const ox = ((x * i * 17) % size); const oy = ((y * i * 23) % size);
                ctx.beginPath(); ctx.moveTo(x+ox, y+oy); ctx.lineTo(x+ox-2, y+oy-4); ctx.moveTo(x+ox, y+oy); ctx.lineTo(x+ox+2, y+oy-5); ctx.stroke();
            }
        },
        
        // --- STRUKTUREN ---
        wall: function(ctx, x, y, size) {
            const grad = ctx.createLinearGradient(x, y, x + size, y + size);
            grad.addColorStop(0, "#263238"); grad.addColorStop(0.5, "#455a64"); grad.addColorStop(1, "#1c2326");
            ctx.fillStyle = grad; ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = "#111"; ctx.strokeRect(x, y, size, size);
            // Nieten
            ctx.fillStyle = "#000"; 
            ctx.fillRect(x+2,y+2,2,2); ctx.fillRect(x+size-4,y+2,2,2);
            ctx.fillRect(x+2,y+size-4,2,2); ctx.fillRect(x+size-4,y+size-4,2,2);
        },
        hazard: function(ctx, x, y, size) { // Für 'X'
            ctx.fillStyle = "#FBC02D"; // Gelb
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = "#000"; // Schwarze Streifen
            ctx.beginPath();
            ctx.moveTo(x + size/2, y); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x, y + size/2); 
            ctx.fill();
            ctx.strokeStyle = "#F57F17"; ctx.strokeRect(x,y,size,size);
        },
        crater: function(ctx, x, y, size) { // Für 'O'
            ctx.fillStyle = "#3e2723"; // Dunkler Boden
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = "#000"; // Loch
            ctx.beginPath(); ctx.ellipse(x + size/2, y + size/2, size/3, size/4, 0, 0, Math.PI*2); ctx.fill();
        },
        fence: function(ctx, x, y, size) { // Für 'W'
            ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x+5, y+size); ctx.lineTo(x+5, y+5); // Pfosten links
            ctx.moveTo(x+size-5, y+size); ctx.lineTo(x+size-5, y+5); // Pfosten rechts
            ctx.moveTo(x, y+10); ctx.lineTo(x+size, y+10); // Latte oben
            ctx.moveTo(x, y+20); ctx.lineTo(x+size, y+20); // Latte unten
            ctx.stroke();
        },

        // --- CHARAKTERE ---
        player: function(ctx, x, y, size, color) {
             ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(x, y + size/3, size/2, size/4, 0, 0, Math.PI*2); ctx.fill(); // Schatten
             ctx.fillStyle = "#0277bd"; ctx.fillRect(x - size/3, y - size/3, size/1.5, size/1.5); // Körper
             ctx.fillStyle = "#ffeb3b"; ctx.fillRect(x - size/10, y - size/3, size/5, size/1.5); // Streifen
             ctx.fillStyle = "#ffccbc"; ctx.beginPath(); ctx.arc(x, y - size/4, size/3, 0, Math.PI*2); ctx.fill(); // Kopf
             ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, size/1.5, 0, Math.PI*2); ctx.stroke(); // Ring
        },

        // --- MONSTER ---
        enemy_rat: function(ctx, x, y) { 
            const breath = Math.sin(Date.now() / 200) * 2;
            ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(x, y + 80, 70, 20, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#f48fb1"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + 40, y + 40); ctx.quadraticCurveTo(x + 100, y + 50, x + 120, y + 20 + breath); ctx.stroke();
            ctx.fillStyle = "#5d4037"; ctx.beginPath(); ctx.ellipse(x, y + 20, 60, 45 + breath/2, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#6d4c41"; ctx.beginPath(); ctx.arc(x - 50, y + 10 + breath, 30, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#ff0000"; ctx.shadowBlur = 10; ctx.shadowColor = "red"; ctx.beginPath(); ctx.arc(x - 60, y + 5 + breath, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = "#fff"; ctx.fillRect(x - 75, y + 20 + breath, 5, 8);
        },
        enemy_raider: function(ctx, x, y) {
            const idle = Math.sin(Date.now() / 500) * 3;
            ctx.fillStyle = "#424242"; ctx.fillRect(x - 30, y - 20, 60, 80);
            ctx.fillStyle = "#ffccbc"; ctx.beginPath(); ctx.arc(x, y - 40 + idle, 25, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#d50000"; ctx.beginPath(); ctx.moveTo(x - 5, y - 60 + idle); ctx.lineTo(x + 15, y - 80 + idle); ctx.lineTo(x + 5, y - 55 + idle); ctx.fill();
            ctx.fillStyle = "#00ff00"; ctx.beginPath(); ctx.arc(x - 8, y - 41 + idle, 3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#212121"; ctx.fillRect(x + 20, y + 30 + idle, 40, 10);
        },
        enemy_generic: function(ctx, x, y) {
            ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#f00"; ctx.font = "bold 60px monospace"; ctx.textAlign = "center"; ctx.fillText("?", x, y + 20);
        }
    },

    renderWeather: function(ctx, width, height) {
        const time = Date.now();
        const opacity = 0.05 + Math.sin(time / 2000) * 0.02;
        ctx.fillStyle = `rgba(50, 255, 50, ${opacity})`;
        ctx.fillRect(0, 0, width, height);
    },

    renderCombat: function(ctx, w, h) {
        // 1. Hintergrund (Dunkel)
        const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, h);
        grad.addColorStop(0, "#222"); grad.addColorStop(1, "#000");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

        // 2. Retro Grid (Boden)
        ctx.strokeStyle = "#1b5e20"; ctx.lineWidth = 1; ctx.beginPath();
        for(let i=0; i<w; i+=50) { ctx.moveTo(i, h/2); ctx.lineTo((i - w/2)*3 + w/2, h); }
        ctx.stroke();
        
        // 3. Gegner Rendern
        if(this.state.enemy) {
            const name = (this.state.enemy.name || "Unbekannt").toLowerCase();
            const cx = w/2; 
            const cy = h/2 + 50;
            
            // Auswahl der Grafik
            if(name.includes("ratte") || name.includes("rat")) this.drawHelpers.enemy_rat(ctx, cx, cy);
            else if (name.includes("raider") || name.includes("plünderer")) this.drawHelpers.enemy_raider(ctx, cx, cy);
            else this.drawHelpers.enemy_generic(ctx, cx, cy);

            // 4. NAME UND LEBEN (Direkt auf Canvas malen, falls HTML fehlt)
            ctx.fillStyle = "#fff";
            ctx.font = "bold 24px monospace";
            ctx.textAlign = "center";
            ctx.shadowColor = "#0f0"; ctx.shadowBlur = 5;
            ctx.fillText(this.state.enemy.name.toUpperCase(), cx, cy - 100);
            
            // HP Balken
            const hpPct = Math.max(0, this.state.enemy.hp / (this.state.enemy.maxHp || 1));
            ctx.fillStyle = "#333"; ctx.fillRect(cx - 50, cy - 90, 100, 10);
            ctx.fillStyle = "#f00"; ctx.fillRect(cx - 50, cy - 90, 100 * hpPct, 10);
            ctx.shadowBlur = 0;

        } else {
            ctx.fillStyle = "#fff"; ctx.font = "20px monospace"; ctx.textAlign = "center";
            ctx.fillText("SCANNE UMGEBUNG...", w/2, h/2);
        }
    },

    renderStaticMap: function() { 
        if(!this.cacheCtx) this.initCache();
        const ctx = this.cacheCtx; 
        ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height); 
        if(!this.state.currentMap) return;
        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                if(this.state.currentMap[y]) this.drawTile(ctx, x, y, this.state.currentMap[y][x]);
            }
        }
    },

    draw: function() { 
        if(!this.ctx || !this.cacheCanvas) return; 
        const ctx = this.ctx; const cvs = ctx.canvas; 
        
        // --- VIEW SWITCH ---
        if (this.state.view === 'combat') {
            this.renderCombat(ctx, cvs.width, cvs.height);
            return;
        }
        
        // --- MAP ---
        if(!this.state.currentMap) return;
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width; const maxCamY = (this.MAP_H * this.TILE) - cvs.height; 
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX)); this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY)); 
        
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cvs.width, cvs.height); 
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        
        ctx.save(); ctx.translate(-this.camera.x, -this.camera.y); 
        
        const startX = Math.floor(this.camera.x / this.TILE); const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        const secKey = `${this.state.sector.x},${this.state.sector.y}`;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7; 

        for(let y=startY; y<endY; y++) { 
            for(let x=startX; x<endX; x++) { 
                if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { 
                    const tileKey = `${secKey}_${x},${y}`;
                    const isCity = (this.state.zone && this.state.zone.includes("Stadt")); 
                    if(!isCity && !this.state.explored[tileKey]) {
                        ctx.fillStyle = "#000"; ctx.fillRect(x * this.TILE, y * this.TILE, this.TILE, this.TILE); continue; 
                    }
                    if(!this.state.currentMap[y]) continue; 
                    const t = this.state.currentMap[y][x];
                    if(t === '~') {
                        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.beginPath();
                        const waveX = (Date.now()/200 + y*10) % this.TILE;
                        ctx.moveTo(x*this.TILE + waveX, y*this.TILE + this.TILE/2); ctx.lineTo(x*this.TILE + waveX + 5, y*this.TILE + this.TILE/2); ctx.stroke();
                    }
                    if(this.state.hiddenItems && this.state.hiddenItems[`${x},${y}`]) {
                        const shimmer = (Math.sin(Date.now() / 150) + 1) / 2; ctx.fillStyle = `rgba(255, 255, 100, ${shimmer})`;
                        ctx.beginPath(); ctx.arc(x * this.TILE + this.TILE/2, y * this.TILE + this.TILE/2, 2, 0, Math.PI * 2); ctx.fill();
                    }
                } 
            } 
        } 
        
        // Player render
        if(typeof Network !== 'undefined' && Network.otherPlayers) { 
            for(let pid in Network.otherPlayers) { 
                const p = Network.otherPlayers[pid]; 
                if(p.sector && (p.sector.x !== this.state.sector.x || p.sector.y !== this.state.sector.y)) continue; 
                this.drawHelpers.player(ctx, p.x * this.TILE + this.TILE/2, p.y * this.TILE + this.TILE/2, this.TILE, "#00bcd4"); 
            } 
        } 
        this.drawHelpers.player(ctx, this.state.player.x * this.TILE + this.TILE/2, this.state.player.y * this.TILE + this.TILE/2, this.TILE, "#76ff03"); 
        ctx.restore(); 
        
        if(!this.state.zone || !this.state.zone.includes("Bunker")) this.renderWeather(ctx, cvs.width, cvs.height);
    },

    drawTile: function(ctx, x, y, type, pulse = 1) { 
        const ts = this.TILE; const px = x * ts; const py = y * ts; 
        if(!['~', '#', 'M', 'W', 'X', 'O'].includes(type) && type !== '.') {
             if((x*y)%3 === 0) this.drawHelpers.grass(ctx, px, py, ts, 5);
             else if((x+y)%7 === 0) { ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(px + ts/2, py + ts/2 + 5, 2, 0, Math.PI*2); ctx.fill(); }
        }
        switch(type) {
            case '#': this.drawHelpers.wall(ctx, px, py, ts); break;
            case 't': case 'T': this.drawHelpers.tree(ctx, px, py, ts); break;
            case 'M': case '^': this.drawHelpers.mountain(ctx, px, py, ts); break;
            case 'X': this.drawHelpers.hazard(ctx, px, py, ts); break; // [NEU]
            case 'O': this.drawHelpers.crater(ctx, px, py, ts); break; // [NEU]
            case 'W': this.drawHelpers.fence(ctx, px, py, ts); break; // [NEU]
            case '~': ctx.fillStyle = "#01579b"; ctx.fillRect(px, py, ts, ts); break;
            case 'C': ctx.fillStyle = "#263238"; ctx.fillRect(px + 4, py + 8, ts-8, ts-8); ctx.fillStyle = `rgba(255, 193, 7, ${pulse})`; ctx.fillRect(px + 8, py + 15, 6, 6); break;
            case 'V': ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/2, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#000"; ctx.font="bold 12px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("101", px+ts/2, py+ts/2); break;
            case 'R': ctx.fillStyle = "#b71c1c"; ctx.beginPath(); ctx.moveTo(px+ts/2, py+5); ctx.lineTo(px+ts-5, py+ts-5); ctx.lineTo(px+5, py+ts-5); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font="10px monospace"; ctx.fillText("☠️", px+ts/2, py+ts/2+5); break;
            
            case '.': break; // Boden ist leer
            default: // Items & Unbekanntes
                if (['$','&','P'].includes(type) || type.match(/[a-z]/i)) { 
                    if(['$','&','P'].includes(type)) { ctx.fillStyle = "rgba(255, 255, 0, 0.2)"; ctx.beginPath(); ctx.arc(px+ts/2, py+ts/2, ts/3, 0, Math.PI*2); ctx.fill(); }
                    ctx.fillStyle = "#fff"; ctx.font="16px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(type, px+ts/2, py+ts/2); 
                } 
                break;
        }
        ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    }
});
