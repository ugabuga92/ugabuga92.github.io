// [v3.5] - 2026-01-03 15:30 (Graphics Engine Overhaul)
// - Implemented Tile-Based Rendering System (Pixel Art Support)
// - Added Runtime-Tileset-Generator (Creates placeholder pixel art assets on startup)
// - Enabled 'image-rendering: pixelated' for crisp retro visuals

Object.assign(Game, {
    // Defines where each character on the map pulls its graphic from the tileset
    // format: [xIndex, yIndex] on the 16x16 grid
    tileAtlas: {
        '.': [0, 0], // Grass
        ',': [1, 0], // Dry Grass
        '_': [2, 0], // Dirt
        '#': [3, 0], // Wall
        '~': [4, 0], // Water
        't': [0, 1], // Tree
        'T': [1, 1], // Dead Tree
        'M': [2, 1], // Mountain
        '=': [3, 1], // Bridge
        '"': [4, 1], // Tall Grass
        'o': [0, 2], // Rock
        'Y': [1, 2], // Big Tree
        '|': [2, 2], // Fence
        'x': [3, 2], // Barricade
        
        // POI & Buildings (Abstracted to Building Tiles)
        'V': [0, 3], // Vault
        'R': [1, 3], // Raider/Mart
        'C': [2, 3], // City
        'S': [3, 3], // Shop
        'P': [4, 3], // Clinic
        'H': [5, 3], // Cave
        
        // Items/Interactive
        '$': [0, 4],
        '&': [1, 4],
        'B': [2, 4], // Box/Chest
        'X': [2, 4], 
        'F': [3, 4], // Fire
        
        // Default
        'default': [5, 0]
    },

    sprites: null,
    SPRITE_SIZE: 16, // The source resolution of one tile

    initRenderSystem: function() {
        if(!this.cacheCtx) this.initCache();
        
        // Generate the pixel art tileset procedurally so we have assets without files
        this.sprites = this.generateProceduralTileset();
        console.log("[Render] Pixel Art Tileset Generated.");
    },

    generateProceduralTileset: function() {
        const cvs = document.createElement('canvas');
        const ts = this.SPRITE_SIZE;
        cvs.width = 256;
        cvs.height = 256;
        const ctx = cvs.getContext('2d');
        
        // Helper to draw a pixel
        const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
        const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
        
        // 1. Grass [0,0]
        rect(0, 0, ts, ts, '#2e4c1f'); // Dark Green Base
        for(let i=0; i<8; i++) p(Math.random()*ts, Math.random()*ts, '#4d7a36'); // Lighter blades
        
        // 2. Dry Grass [1,0]
        rect(ts, 0, ts, ts, '#5d5438'); 
        for(let i=0; i<8; i++) p(ts+Math.random()*ts, Math.random()*ts, '#8c8258');

        // 3. Dirt [2,0]
        rect(ts*2, 0, ts, ts, '#4a3c2a');
        p(ts*2+4, 4, '#382d20'); p(ts*2+10, 10, '#382d20');

        // 4. Wall [3,0] (Brick style)
        rect(ts*3, 0, ts, ts, '#555');
        ctx.fillStyle = '#333';
        ctx.fillRect(ts*3, 0, ts, 1); // Top outline
        ctx.fillRect(ts*3, 4, ts, 1); // Mortar line 1
        ctx.fillRect(ts*3, 9, ts, 1); // Mortar line 2
        ctx.fillRect(ts*3, 14, ts, 1); // Mortar line 3
        ctx.fillRect(ts*3+4, 5, 1, 4); // Vertical
        ctx.fillRect(ts*3+10, 10, 1, 4); // Vertical

        // 5. Water [4,0]
        rect(ts*4, 0, ts, ts, '#2b6a85');
        rect(ts*4+2, 4, 6, 1, '#4fa4c7'); // Highlight
        rect(ts*4+8, 10, 6, 1, '#4fa4c7');

        // 6. Tree [0,1]
        rect(0, ts, ts, ts, '#2e4c1f'); // Grass BG
        rect(6, ts+8, 4, 8, '#5d4037'); // Trunk
        ctx.beginPath(); ctx.fillStyle = '#1b5e20'; ctx.arc(8, ts+6, 6, 0, Math.PI*2); ctx.fill(); // Leaves

        // 7. Dead Tree [1,1]
        rect(ts, ts, ts, ts, '#5d5438'); // Dry BG
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ts+8, ts+14); ctx.lineTo(ts+8, ts+6); 
        ctx.lineTo(ts+4, ts+2); ctx.moveTo(ts+8, ts+8); ctx.lineTo(ts+12, ts+4); ctx.stroke();

        // 8. Mountain [2,1]
        rect(ts*2, ts, ts, ts, '#4a3c2a');
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.moveTo(ts*2+2, ts+14); ctx.lineTo(ts*2+8, ts+2); ctx.lineTo(ts*2+14, ts+14); ctx.fill();
        ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.moveTo(ts*2+6, ts+6); ctx.lineTo(ts*2+8, ts+2); ctx.lineTo(ts*2+10, ts+6); ctx.fill(); // Snow cap

        // 9. Vault [0,3] - Gear Icon
        rect(0, ts*3, ts, ts, '#222');
        ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(8, ts*3+8, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(8, ts*3+8, 2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(8, ts*3+2); ctx.lineTo(8, ts*3+14); ctx.moveTo(1, ts*3+8); ctx.lineTo(15, ts*3+8); ctx.stroke();

        // 10. Shop/Raider [1,3] - Red Building
        rect(ts, ts*3, ts, ts, '#4a3c2a');
        rect(ts+2, ts*3+4, 12, 10, '#800'); // Building
        rect(ts+5, ts*3+8, 4, 6, '#000'); // Door

        // 11. City [2,3] - Grey Buildings
        rect(ts*2, ts*3, ts, ts, '#222');
        rect(ts*2+1, ts*3+2, 4, 10, '#555');
        rect(ts*2+6, ts*3+4, 4, 10, '#666');
        rect(ts*2+11, ts*3+1, 4, 10, '#555');

        // 12. Chest [2,4]
        rect(ts*2, ts*4, ts, ts, '#333');
        rect(ts*2+3, ts*4+5, 10, 8, '#8d6e63');
        rect(ts*2+3, ts*4+7, 10, 1, '#000'); // Lid line

        return cvs;
    },

    renderStaticMap: function() { 
        if(!this.sprites) this.initRenderSystem();
        const ctx = this.cacheCtx; 
        
        // Clear with base color
        ctx.fillStyle = "#111"; 
        ctx.fillRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height); 
        
        if(!this.state.currentMap) return;

        // Render Layer 1: Terrain
        for(let y=0; y<this.MAP_H; y++) {
            for(let x=0; x<this.MAP_W; x++) {
                if(this.state.currentMap[y]) {
                    const char = this.state.currentMap[y][x];
                    this.drawTile(ctx, x, y, char);
                }
            }
        }
    },

    draw: function() { 
        if(!this.ctx || !this.cacheCanvas) return; 
        if(!this.state.currentMap) return;

        const ctx = this.ctx; const cvs = ctx.canvas; 
        
        // Ensure tileset is ready
        if(!this.sprites) this.initRenderSystem();

        let targetCamX = (this.state.player.x * this.TILE) - (cvs.width / 2); 
        let targetCamY = (this.state.player.y * this.TILE) - (cvs.height / 2); 
        const maxCamX = (this.MAP_W * this.TILE) - cvs.width; 
        const maxCamY = (this.MAP_H * this.TILE) - cvs.height; 
        
        this.camera.x = Math.max(0, Math.min(targetCamX, maxCamX)); 
        this.camera.y = Math.max(0, Math.min(targetCamY, maxCamY)); 
        
        ctx.fillStyle = "#050505"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height); 
        
        // Draw cached map (background)
        ctx.drawImage(this.cacheCanvas, this.camera.x, this.camera.y, cvs.width, cvs.height, 0, 0, cvs.width, cvs.height); 
        
        ctx.save(); 
        ctx.translate(-this.camera.x, -this.camera.y); 
        
        const startX = Math.floor(this.camera.x / this.TILE); 
        const startY = Math.floor(this.camera.y / this.TILE); 
        const endX = startX + Math.ceil(cvs.width / this.TILE) + 1; 
        const endY = startY + Math.ceil(cvs.height / this.TILE) + 1; 
        
        const pulse = Math.sin(Date.now() / 200) * 0.2 + 1.0; 

        // Dynamic Layer (Items, Highlights, Overlays)
        for(let y=startY; y<endY; y++) { 
            for(let x=startX; x<endX; x++) { 
                if(y>=0 && y<this.MAP_H && x>=0 && x<this.MAP_W) { 
                    
                    const isCity = (this.state.zone && this.state.zone.includes("Stadt")); 
                    
                    // Fog of War (Blackout)
                    if(!isCity && !this.state.explored[`${this.state.sector.x},${this.state.sector.y}_${x},${y}`]) {
                        ctx.fillStyle = "#000";
                        ctx.fillRect(x * this.TILE, y * this.TILE, this.TILE, this.TILE);
                        continue; 
                    }

                    // Hidden Items Sparkle
                    if(this.state.hiddenItems && this.state.hiddenItems[`${x},${y}`]) {
                        const shimmer = (Math.sin(Date.now() / 150) + 1) / 2;
                        ctx.fillStyle = `rgba(255, 255, 200, ${shimmer * 0.6})`;
                        ctx.beginPath();
                        ctx.arc(x * this.TILE + this.TILE/2, y * this.TILE + this.TILE/2, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Highlight Interactive Tiles (Subtle Glow)
                    const t = this.state.currentMap[y][x];
                    if(['$', '&', 'P', 'E', 'F', 'X'].includes(t)) {
                        ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x * this.TILE, y * this.TILE, this.TILE, this.TILE);
                    }
                } 
            } 
        } 
        
        // Draw Other Players
        if(typeof Network !== 'undefined' && Network.otherPlayers) { 
            for(let pid in Network.otherPlayers) { 
                const p = Network.otherPlayers[pid]; 
                if(p.sector && (p.sector.x !== this.state.sector.x || p.sector.y !== this.state.sector.y)) continue; 
                
                const ox = p.x * this.TILE; 
                const oy = p.y * this.TILE; 
                
                // Simple Player Sprite
                ctx.fillStyle = "#00ffff"; 
                ctx.fillRect(ox + 4, oy + 4, this.TILE - 8, this.TILE - 8);
                ctx.fillStyle = "white";
                ctx.font = "8px monospace";
                ctx.fillText(p.name ? p.name.substring(0,3) : "P", ox, oy - 2);
            } 
        } 
        
        // Draw Local Player
        const px = this.state.player.x * this.TILE; 
        const py = this.state.player.y * this.TILE; 
        
        // Player Character Sprite (Green Box with direction)
        ctx.translate(px + this.TILE/2, py + this.TILE/2); 
        ctx.rotate(this.state.player.rot); 
        
        // Body
        ctx.fillStyle = "#39ff14"; 
        ctx.shadowBlur = 5; ctx.shadowColor = "#39ff14";
        ctx.fillRect(-6, -6, 12, 12);
        
        // Eyes/Direction
        ctx.fillStyle = "#003300";
        ctx.fillRect(-2, -8, 4, 4); // "Head" / Pointer
        
        ctx.shadowBlur = 0;
        ctx.restore(); 
        
        ctx.restore(); 
    },

    drawTile: function(ctx, x, y, type) { 
        const ts = this.TILE; 
        const px = x * ts; 
        const py = y * ts; 
        
        // Find coords in tileset
        let coords = this.tileAtlas[type] || this.tileAtlas['default'];
        
        // Special case for random decoration overrides
        if(type === '.' && (x+y)%7 === 0) coords = this.tileAtlas[',']; // Sprinkle some dry grass
        
        // Draw from spritesheet
        // ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        ctx.drawImage(
            this.sprites, 
            coords[0] * this.SPRITE_SIZE, coords[1] * this.SPRITE_SIZE, 
            this.SPRITE_SIZE, this.SPRITE_SIZE, 
            px, py, 
            ts, ts
        );
    }
});
