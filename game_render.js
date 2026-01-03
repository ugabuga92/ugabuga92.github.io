// [v4.1] - 2026-01-03 06:15pm (Visual Atmosphere Overhaul)
// - RENDER: Day/Night Cycle via 'Game.getAmbientLight()'.
// - RENDER: Dynamic Weather Particles (Rain, Ash, Rad-Fog).
// - GFX: Lightning Flashes during 'storm'.
// - GFX: Flickering Lights for POIs.

Object.assign(Game, {
    gameTileset: null,
    particles: [],
    lightningTimer: 0,
    lightningIntensity: 0,

    // --- TILES GENERATOR (Optimiert) ---
    generateGameTileset: function() {
        if (this.gameTileset) return this.gameTileset;
        const TILE = 32;
        const cvs = document.createElement('canvas');
        cvs.width = TILE * 16; cvs.height = TILE;
        const ctx = cvs.getContext('2d');

        // Helper
        const noise = (x, color, i=0.1) => {
            ctx.fillStyle = color; ctx.fillRect(x, 0, TILE, TILE);
            for(let j=0; j<40; j++) {
                ctx.fillStyle = Math.random()>0.5 ? `rgba(255,255,255,${i})` : `rgba(0,0,0,${i})`;
                ctx.fillRect(x+Math.random()*TILE, Math.random()*TILE, 2, 2);
            }
        };
        const draw = (idx, fn) => { ctx.save(); ctx.translate(idx*TILE, 0); fn(ctx); ctx.restore(); };

        // TEXTUREN
        noise(0, '#4e342e'); // 0: Boden
        draw(1, c => { noise(0, '#263238'); c.fillStyle='#111'; c.fillRect(0,0,32,2); c.fillRect(0,0,2,32); c.fillRect(8,8,16,16); }); // 1: Wand
        draw(2, c => { c.fillStyle='#3e2723'; c.fillRect(12,18,8,14); c.fillStyle='#1b5e20'; c.beginPath(); c.arc(16,14,12,0,7); c.fill(); }); // 2: Baum
        draw(3, c => { c.strokeStyle='#3e2723'; c.lineWidth=2; c.moveTo(16,32); c.lineTo(16,10); c.stroke(); c.moveTo(16,20); c.lineTo(8,10); c.stroke(); }); // 3: Toter Baum
        draw(4, c => { noise(0, '#004d40', 0.2); c.fillStyle='rgba(100,255,218,0.3)'; c.fillRect(5,5,10,2); }); // 4: Wasser
        draw(5, c => { c.fillStyle='#444'; c.beginPath(); c.moveTo(16,4); c.lineTo(30,30); c.lineTo(2,30); c.fill(); }); // 5: Berg
        draw(6, c => { c.fillStyle='#6d4c41'; c.fillRect(4,8,24,20); c.strokeStyle='#3e2723'; c.strokeRect(4,8,24,20); c.beginPath(); c.moveTo(4,8); c.lineTo(28,28); c.stroke(); }); // 6: Kiste
        draw(7, c => { noise(0, '#212121'); c.fillStyle='#fbc02d'; c.fillRect(14,12,4,8); }); // 7: Asphalt
        
        const icon = (idx, char, color) => draw(idx, c => { c.fillStyle=color; c.font="24px monospace"; c.textAlign="center"; c.textBaseline="middle"; c.fillText(char, 16, 16); });
        icon(10, '⚙️', '#ff0'); icon(11, '🛒', '#f00'); icon(12, '🏥', '#fff'); icon(13, '💰', '#fd0'); icon(14, '🔨', '#aaa'); icon(15, '☢️', '#0f0');

        this.gameTileset = cvs;
        return cvs;
    },

    // --- MAIN DRAW LOOP ---
    draw: function() { 
        if(!this.ctx || !this.cacheCanvas || !this.state.currentMap) return;
        const ctx = this.ctx; const cvs = ctx.canvas;
        
        // 1. Kamera Smooth Follow
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        this.camera.x += (targetCamX - this.camera.x) * 0.1; 
        this.camera.y += (targetCamY - this.camera.y) * 0.1;
        this.camera.x = Math.max(0, Math.min(this.camera.x, (this.MAP_W * this.TILE) - cvs.width)); 
        this.camera.y = Math.max(0, Math.min(this.camera.y, (this.MAP_H * this.TILE) - cvs.height)); 

        // 2. Render Basis Welt
        this.renderWorldLayer(ctx, cvs);

        // 3. Render Licht & Atmosphäre (Tag/Nacht/Wetter)
        this.renderAtmosphere(ctx, cvs);

        // 4. UI Overlay (Scanlines, Vignette, Zeit-Display)
        this.renderHUD(ctx, cvs);
    },

    renderWorldLayer: function(ctx, cvs) {
        if(!this.staticCacheCreated) { this.renderStaticMap(); this.staticCacheCreated = true; }
        
        ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, cvs.width, cvs.height); 
        ctx.imageSmoothingEnabled = false;

        const camX = Math.floor(this.camera.x);
        const camY = Math.floor(this.camera.y);

        ctx.drawImage(this.cacheCanvas, camX, camY, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height);

        ctx.save();
        ctx.translate(-camX, -camY);
        this.drawDynamicObjects(ctx);
        this.drawPlayerSprite(ctx);
        ctx.restore();
    },

    renderStaticMap: function() {
        if(!this.cacheCtx) this.initCache();
        const ctx = this.cacheCtx;
        const tileset = this.generateGameTileset();
        ctx.fillStyle = "#111"; ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height);

        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                if(!this.state.currentMap[y]) continue;
                const t = this.state.currentMap[y][x];
                const px = x*32, py = y*32;
                
                // Boden
                if(['=','+'].includes(t)) ctx.drawImage(tileset, 7*32,0,32,32,px,py,32,32);
                else if(t==='~') ctx.drawImage(tileset, 4*32,0,32,32,px,py,32,32);
                else ctx.drawImage(tileset, 0,0,32,32,px,py,32,32);

                // Objekte
                let idx = -1;
                if(t==='#') idx=1; if(t==='t') idx=2; if(t==='T') idx=3; 
                if(t==='M') idx=5; if(t==='X') idx=6;
                if(idx >= 0) ctx.drawImage(tileset, idx*32, 0, 32, 32, px, py, 32, 32);
            }
        }
    },

    drawDynamicObjects: function(ctx) {
        const tileset = this.generateGameTileset();
        const startX = Math.floor(this.camera.x / 32); const endX = startX + 25;
        const startY = Math.floor(this.camera.y / 32); const endY = startY + 20;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y<0||y>=this.MAP_H||x<0||x>=this.MAP_W) continue;
                const t = this.state.currentMap[y][x];
                const px = x*32, py = y*32;
                
                let idx = -1;
                if(t==='V') idx=10; if(t==='R') idx=11; if(t==='P') idx=12;
                if(t==='$') idx=13; if(t==='&') idx=14; 
                
                if(idx >= 0) {
                    const bounce = Math.sin(Date.now()/250)*2;
                    ctx.drawImage(tileset, idx*32, 0, 32, 32, px, py + (idx>9?bounce:0), 32, 32);
                }

                if(this.state.hiddenItems && this.state.hiddenItems[`${x},${y}`]) {
                    ctx.fillStyle = `rgba(255,215,0,${0.5+Math.sin(Date.now()/100)*0.5})`;
                    ctx.beginPath(); ctx.arc(px+16, py+16, 2, 0, 7); ctx.fill();
                }
            }
        }
    },

    drawPlayerSprite: function(ctx) {
        const px = this.state.player.x * 32 + 16;
        const py = this.state.player.y * 32 + 16;
        const walkBounce = Math.sin(Date.now() / 150) * 2;
        
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.ellipse(px, py+12, 10, 5, 0, 0, 7); ctx.fill();

        ctx.translate(px, py + walkBounce);
        ctx.fillStyle = "#222"; ctx.fillRect(-6, 8, 4, 6); ctx.fillRect(2, 8, 4, 6);
        ctx.fillStyle = "#0044aa"; ctx.fillRect(-8, -8, 16, 16); 
        ctx.fillStyle = "#e6c200"; ctx.fillRect(-2, -8, 4, 16); 
        ctx.fillStyle = "#f5d0a9"; ctx.fillRect(-7, -18, 14, 10);
        ctx.fillStyle = "#4e342e"; ctx.fillRect(-8, -20, 16, 5); ctx.fillRect(-8,-18,3,8); ctx.fillRect(5,-18,3,8);
        ctx.fillStyle = "#2e7d32"; ctx.fillRect(-10, 0, 4, 6);
        ctx.translate(-px, -(py + walkBounce));
    },

    renderAtmosphere: function(ctx, cvs) {
        const camX = this.camera.x;
        const camY = this.camera.y;
        const time = Game.getAmbientLight ? Game.getAmbientLight() : 1.0;
        const weather = Game.state.weather || 'clear';

        // --- 1. AMBIENT LIGHT LAYER ---
        ctx.globalCompositeOperation = 'multiply';
        
        // Wetter-Einfluss auf Licht
        let lightLevel = time;
        if(weather === 'rain') lightLevel *= 0.8;
        if(weather === 'storm') lightLevel *= 0.5;
        if(weather === 'fog') lightLevel *= 0.7;

        // Basis-Dunkelheit (Tag = Transparent, Nacht = Dunkelblau)
        // Wir invertieren lightLevel für Opacity (1.0 Hell = 0.0 Opacity)
        const darkness = 1.0 - Math.max(0.1, lightLevel); 
        ctx.fillStyle = `rgba(0, 5, 20, ${darkness})`; 
        
        // Radstorm: Grüner Tint
        if(weather === 'storm') ctx.fillStyle = `rgba(10, 30, 10, ${darkness + 0.2})`;

        ctx.fillRect(0, 0, cvs.width, cvs.height);


        // --- 2. DYNAMIC LIGHTS (Löcher in die Dunkelheit) ---
        ctx.globalCompositeOperation = 'destination-out';

        const light = (x, y, r, flicker=0) => {
            const px = (x * 32 + 16) - camX;
            const py = (y * 32 + 16) - camY;
            const radius = r + Math.random() * flicker;
            const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
            g.addColorStop(0, "rgba(255, 255, 255, 1)");
            g.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI*2); ctx.fill();
        };

        // Spieler Licht (immer an, aber schwächer am Tag)
        light(this.state.player.x, this.state.player.y, 140, 2);

        // Map Lichter
        const startX = Math.floor(camX / 32); const endX = startX + 25;
        const startY = Math.floor(camY / 32); const endY = startY + 20;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y<0||y>=this.MAP_H||x<0||x>=this.MAP_W) continue;
                const t = this.state.currentMap[y][x];
                // Flackernde Lichter
                const flick = (Math.random() > 0.9) ? 20 : 0; 
                if(t==='C' || t==='$' || t==='P') light(x, y, 90, flick); 
                if(t==='V') light(x, y, 110, 5); 
                if(t==='~') light(x, y, 50, 5); 
            }
        }
        
        // --- 3. BLITZE (Bei Sturm) ---
        if(weather === 'storm' && Math.random() < 0.005) {
            this.lightningIntensity = 1.0;
        }
        if(this.lightningIntensity > 0) {
            ctx.fillStyle = `rgba(200, 255, 200, ${this.lightningIntensity})`;
            ctx.fillRect(0, 0, cvs.width, cvs.height);
            this.lightningIntensity -= 0.1;
        }


        // --- 4. COLORED GLOW (Overlay) ---
        ctx.globalCompositeOperation = 'screen'; 

        const glow = (x, y, r, color) => {
            const px = (x * 32 + 16) - camX;
            const py = (y * 32 + 16) - camY;
            const g = ctx.createRadialGradient(px, py, 0, px, py, r);
            g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
        };

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y<0||y>=this.MAP_H||x<0||x>=this.MAP_W) continue;
                const t = this.state.currentMap[y][x];
                if(t==='~') glow(x, y, 60, "rgba(0, 255, 50, 0.3)");
                if(t==='V') glow(x, y, 90, "rgba(255, 255, 0, 0.2)");
                if(t==='R') glow(x, y, 90, "rgba(255, 0, 0, 0.3)");
            }
        }
        
        // PipBoy Monitor Glow (Grünlich)
        glow(this.state.player.x, this.state.player.y, 100, "rgba(50, 255, 50, 0.08)");

        // --- 5. PARTICLES (Wetter) ---
        ctx.globalCompositeOperation = 'source-over';
        this.renderParticles(ctx, cvs, weather);
    },

    renderParticles: function(ctx, cvs, weather) {
        // Init Particles
        if(this.particles.length < 100) {
            this.particles.push({
                x: Math.random() * cvs.width,
                y: Math.random() * cvs.height,
                vx: (Math.random() - 0.5) * 2,
                vy: 2 + Math.random() * 3,
                life: Math.random() * 100
            });
        }

        this.particles.forEach((p) => {
            // Logik je nach Wetter
            if(weather === 'rain' || weather === 'storm') {
                p.x += p.vx * 0.1; // Regen fällt fast gerade
                p.y += p.vy * 3;   // Schnell
                
                ctx.strokeStyle = (weather==='storm') ? "rgba(100, 255, 100, 0.3)" : "rgba(200, 200, 255, 0.3)";
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx, p.y - p.vy * 2); ctx.stroke();
            } else {
                // Asche / Staub (Langsam)
                p.x += p.vx * 0.5;
                p.y += p.vy * 0.2;
                ctx.fillStyle = "rgba(200, 200, 150, 0.3)";
                ctx.fillRect(p.x, p.y, 2, 2);
            }

            if(p.y > cvs.height) { p.y = -10; p.x = Math.random() * cvs.width; }
            if(p.x > cvs.width) p.x = 0;
            if(p.x < 0) p.x = cvs.width;
        });
    },

    renderHUD: function(ctx, cvs) {
        // Scanlines
        ctx.fillStyle = "rgba(0, 255, 0, 0.02)";
        for(let i=0; i<cvs.height; i+=3) ctx.fillRect(0, i, cvs.width, 1);

        // Vignette
        const g = ctx.createRadialGradient(cvs.width/2, cvs.height/2, cvs.height/2.5, cvs.width/2, cvs.height/2, cvs.height);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,20,0,0.6)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // Zeit & Wetter Anzeige (Oben Rechts im Canvas)
        if(Game.getTimeString) {
            const timeStr = Game.getTimeString();
            const wStr = (Game.state.weather || 'CLEAR').toUpperCase();
            
            ctx.font = "bold 16px monospace";
            ctx.textAlign = "right";
            
            // Schatten
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillText(`${timeStr} | ${wStr}`, cvs.width - 10 + 1, 25 + 1);
            
            // Text
            ctx.fillStyle = "#39ff14";
            if(Game.state.weather === 'storm') ctx.fillStyle = "#ff3333"; // Rot bei Sturm
            ctx.fillText(`${timeStr} | ${wStr}`, cvs.width - 10, 25);
        }
    }
});
