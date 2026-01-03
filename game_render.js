// [v4.0] - 2026-01-03 05:45pm (Atmosphere & Lighting Engine)
// - ENGINE: Neue 'Lighting Layer' implementiert (Multi-Pass Rendering).
// - GFX: Dynamisches Lichtsystem (Spieler-Licht, Ambient Occlusion, farbige Lichtquellen).
// - GFX: Partikel-System für Atmosphäre (Asche/Staub in der Luft).
// - VISUAL: CRT-Scanlines und Vignette werden nun direkt im Canvas gerendert für mehr Immersion.

Object.assign(Game, {
    // Cache für das Tileset (wie vorher)
    gameTileset: null,
    particles: [],

    // --- TILES GENERATOR (Bleibt als Basis, leicht optimiert) ---
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

        // TEXTUREN DEFINITIONEN
        noise(0, '#4e342e'); // 0: Boden
        draw(1, c => { noise(0, '#222'); c.fillStyle='#000'; c.fillRect(0,0,32,2); c.fillRect(0,0,2,32); c.fillRect(8,8,16,16); }); // 1: Wand
        draw(2, c => { c.fillStyle='#3e2723'; c.fillRect(12,18,8,14); c.fillStyle='#1b5e20'; c.beginPath(); c.arc(16,14,12,0,7); c.fill(); }); // 2: Baum
        draw(3, c => { c.strokeStyle='#3e2723'; c.lineWidth=2; c.moveTo(16,32); c.lineTo(16,10); c.stroke(); c.moveTo(16,20); c.lineTo(8,10); c.stroke(); }); // 3: Toter Baum
        draw(4, c => { noise(0, '#004d40', 0.2); c.fillStyle='rgba(100,255,218,0.3)'; c.fillRect(5,5,10,2); }); // 4: Wasser
        draw(5, c => { c.fillStyle='#444'; c.beginPath(); c.moveTo(16,4); c.lineTo(30,30); c.lineTo(2,30); c.fill(); }); // 5: Berg
        draw(6, c => { c.fillStyle='#6d4c41'; c.fillRect(4,8,24,20); c.strokeStyle='#3e2723'; c.strokeRect(4,8,24,20); c.beginPath(); c.moveTo(4,8); c.lineTo(28,28); c.stroke(); }); // 6: Kiste
        draw(7, c => { noise(0, '#212121'); c.fillStyle='#fbc02d'; c.fillRect(14,12,4,8); }); // 7: Asphalt
        
        // Icons als Texturen rendern (Performance)
        const icon = (idx, char, color) => draw(idx, c => { c.fillStyle=color; c.font="24px monospace"; c.textAlign="center"; c.textBaseline="middle"; c.fillText(char, 16, 16); });
        icon(10, '⚙️', '#ff0'); // Vault
        icon(11, '🛒', '#f00'); // Mart
        icon(12, '🏥', '#fff'); // Clinic
        icon(13, '💰', '#fd0'); // Shop
        icon(14, '🔨', '#aaa'); // Craft
        icon(15, '☢️', '#0f0'); // Rad

        this.gameTileset = cvs;
        return cvs;
    },

    // --- MAIN RENDER LOOP ---
    draw: function() { 
        if(!this.ctx || !this.cacheCanvas || !this.state.currentMap) return;
        const ctx = this.ctx; const cvs = ctx.canvas;
        
        // 1. Setup Camera
        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        this.camera.x += (targetCamX - this.camera.x) * 0.1; // Smooth Camera Movement!
        this.camera.y += (targetCamY - this.camera.y) * 0.1;

        // Clamp
        this.camera.x = Math.max(0, Math.min(this.camera.x, (this.MAP_W * this.TILE) - cvs.width)); 
        this.camera.y = Math.max(0, Math.min(this.camera.y, (this.MAP_H * this.TILE) - cvs.height)); 

        // 2. Render World Layer (Basis)
        this.renderWorldLayer(ctx, cvs);

        // 3. Render Lighting Layer (Dunkelheit & Lichtquellen)
        this.renderLightingLayer(ctx, cvs);

        // 4. Render Particle Layer (Asche/Regen)
        this.renderParticles(ctx, cvs);

        // 5. Render UI Overlay (Scanlines, Vignette)
        this.renderCRTOverlay(ctx, cvs);
    },

    renderWorldLayer: function(ctx, cvs) {
        // Cache aktualisieren falls nötig
        if(!this.staticCacheCreated) {
            this.renderStaticMap(); // Malt alles in this.cacheCanvas
            this.staticCacheCreated = true;
        }

        ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, cvs.width, cvs.height); 
        ctx.imageSmoothingEnabled = false;

        // Offset für Camera
        const camX = Math.floor(this.camera.x);
        const camY = Math.floor(this.camera.y);

        // Zeichne statische Map aus Cache (Performance!)
        ctx.drawImage(this.cacheCanvas, camX, camY, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height);

        ctx.save();
        ctx.translate(-camX, -camY);

        // Dynamische Objekte (Player, NPCs, blinkende Dinge)
        this.drawDynamicObjects(ctx);

        // Spieler
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
                
                // Boden Draw
                if(['=','+'].includes(t)) ctx.drawImage(tileset, 7*32,0,32,32,px,py,32,32); // Asphalt
                else if(t==='~') ctx.drawImage(tileset, 4*32,0,32,32,px,py,32,32); // Wasser
                else ctx.drawImage(tileset, 0,0,32,32,px,py,32,32); // Erde

                // Objekt Draw
                let idx = -1;
                if(t==='#') idx=1; if(t==='t') idx=2; if(t==='T') idx=3; 
                if(t==='M') idx=5; if(t==='X') idx=6;
                if(idx >= 0) ctx.drawImage(tileset, idx*32, 0, 32, 32, px, py, 32, 32);
            }
        }
    },

    drawDynamicObjects: function(ctx) {
        const tileset = this.generateGameTileset();
        const startX = Math.floor(this.camera.x / 32); const endX = startX + 20;
        const startY = Math.floor(this.camera.y / 32); const endY = startY + 15;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y<0||y>=this.MAP_H||x<0||x>=this.MAP_W) continue;
                const t = this.state.currentMap[y][x];
                const px = x*32, py = y*32;
                
                // Icons & Spezial Tiles
                let idx = -1;
                if(t==='V') idx=10; if(t==='R') idx=11; if(t==='P') idx=12;
                if(t==='$') idx=13; if(t==='&') idx=14; if(t==='W') idx=4; // Animiertes Wasser später
                
                if(idx >= 0) {
                    const bounce = Math.sin(Date.now()/200)*2;
                    ctx.drawImage(tileset, idx*32, 0, 32, 32, px, py + (idx>9?bounce:0), 32, 32);
                }

                // Hidden Item Sparkle
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
        
        // Schatten
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); ctx.ellipse(px, py+12, 10, 5, 0, 0, 7); ctx.fill();

        // Sprite Character
        ctx.translate(px, py + walkBounce);
        // Beine
        ctx.fillStyle = "#222"; ctx.fillRect(-6, 8, 4, 6); ctx.fillRect(2, 8, 4, 6);
        // Körper
        ctx.fillStyle = "#0044aa"; ctx.fillRect(-8, -8, 16, 16); 
        ctx.fillStyle = "#e6c200"; ctx.fillRect(-2, -8, 4, 16); // Reißverschluss
        // Kopf
        ctx.fillStyle = "#f5d0a9"; ctx.fillRect(-7, -18, 14, 10);
        // Haare
        ctx.fillStyle = "#4e342e"; ctx.fillRect(-8, -20, 16, 5); ctx.fillRect(-8,-18,3,8); ctx.fillRect(5,-18,3,8);
        // PipBoy Arm
        ctx.fillStyle = "#2e7d32"; ctx.fillRect(-10, 0, 4, 6);
        
        ctx.translate(-px, -(py + walkBounce));
    },

    renderLightingLayer: function(ctx, cvs) {
        const camX = this.camera.x;
        const camY = this.camera.y;

        // 1. Dunkler Overlay (Nacht/Dungeon)
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = "rgba(0, 5, 15, 0.85)"; // Dunkles Blau/Schwarz
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // 2. Licht-Modus (Löcher in die Dunkelheit schneiden)
        ctx.globalCompositeOperation = 'destination-out';

        // Helper für Lichtkreise
        const light = (x, y, r, flicker=0) => {
            const px = (x * 32 + 16) - camX;
            const py = (y * 32 + 16) - camY;
            const radius = r + Math.random() * flicker;
            
            const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
            g.addColorStop(0, "rgba(255, 255, 255, 1)"); // Kern ist voll transparent (hell)
            g.addColorStop(1, "rgba(255, 255, 255, 0)");
            
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI*2); ctx.fill();
        };

        // Spieler Taschenlampe
        light(this.state.player.x, this.state.player.y, 120, 5);

        // Welt-Lichtquellen
        const startX = Math.floor(camX / 32); const endX = startX + 20;
        const startY = Math.floor(camY / 32); const endY = startY + 15;

        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y<0||y>=this.MAP_H||x<0||x>=this.MAP_W) continue;
                const t = this.state.currentMap[y][x];
                
                if(t==='C' || t==='$' || t==='P') light(x, y, 80, 2); // Stadtlichter
                if(t==='V') light(x, y, 100, 5); // Vault Eingang
                if(t==='~' || t==='W') light(x, y, 40, 5); // Radioaktives Leuchten
            }
        }

        // 3. Farbige Licht-Akzente (Wieder normaler Blend Mode, aber 'screen' oder 'overlay')
        ctx.globalCompositeOperation = 'screen'; // Macht Farben leuchtend

        const colorLight = (x, y, r, color) => {
            const px = (x * 32 + 16) - camX;
            const py = (y * 32 + 16) - camY;
            const g = ctx.createRadialGradient(px, py, 0, px, py, r);
            g.addColorStop(0, color);
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
        };

        // Grünes Leuchten für Wasser/Säure
        for(let y=startY; y<endY; y++) {
            for(let x=startX; x<endX; x++) {
                if(y<0||y>=this.MAP_H||x<0||x>=this.MAP_W) continue;
                const t = this.state.currentMap[y][x];
                if(t==='~') colorLight(x, y, 60, "rgba(0, 255, 50, 0.4)");
                if(t==='V') colorLight(x, y, 90, "rgba(255, 255, 0, 0.3)");
                if(t==='R') colorLight(x, y, 90, "rgba(255, 0, 0, 0.4)"); // Rotes Warnlicht
                if(t==='$') colorLight(x, y, 70, "rgba(255, 150, 50, 0.3)"); // Warmes Ladenlicht
            }
        }
        
        // PipBoy Monitor Glow (Grünlich um den Spieler)
        colorLight(this.state.player.x, this.state.player.y, 80, "rgba(50, 255, 50, 0.1)");

        ctx.globalCompositeOperation = 'source-over'; // Reset
    },

    renderParticles: function(ctx, cvs) {
        // Init Particles
        if(this.particles.length < 50) {
            this.particles.push({
                x: Math.random() * cvs.width,
                y: Math.random() * cvs.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: 0.5 + Math.random(),
                life: Math.random() * 100
            });
        }

        ctx.fillStyle = "rgba(200, 255, 200, 0.3)";
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            if(p.y > cvs.height) p.y = 0;
            
            // Ascheflocken / Staub
            ctx.fillRect(p.x, p.y, 2, 2);
        });
    },

    renderCRTOverlay: function(ctx, cvs) {
        // 1. Scanlines
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        for(let i=0; i<cvs.height; i+=3) {
            ctx.fillRect(0, i, cvs.width, 1);
        }

        // 2. Vignette (Dunkle Ränder)
        const g = ctx.createRadialGradient(cvs.width/2, cvs.height/2, cvs.height/3, cvs.width/2, cvs.height/2, cvs.height);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(0,20,0,0.6)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
});
