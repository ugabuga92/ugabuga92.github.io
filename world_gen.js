// [v2.2.1] - 2026-01-05 02:30pm (World Gen Fix)
const WorldGen = {
    _seed: 12345,

    setSeed: function(val) {
        this._seed = val % 2147483647;
        if (this._seed <= 0) this._seed += 2147483646;
    },

    rand: function() {
        this._seed = (this._seed * 16807) % 2147483647;
        return (this._seed - 1) / 2147483646;
    },
    
    getSectorBiome: function(x, y) {
        if (x <= 2 && y <= 2) return 'jungle'; // Replaced forest with jungle (as per DataCore)
        if (x >= 7 && y >= 7) return 'desert';
        if (x >= 7 && y <= 2) return 'swamp';
        if (x <= 2 && y >= 7) return 'wasteland'; // Replaced mountain with wasteland variant
        
        return 'wasteland';
    },

    createSector: function(width, height, biomeType, poiList) {
        let map = Array(height).fill().map(() => Array(width).fill('.'));
        let conf = { ground: '.', water: 0, mountain: 0, features: [] };
        
        // Load Config from GameData
        if (window.GameData && window.GameData.biomes) {
            conf = window.GameData.biomes[biomeType] || window.GameData.biomes['wasteland'];
        }

        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                const r = this.rand();
                map[y][x] = conf.ground;
                
                if(r < conf.water) map[y][x] = 'W'; // Assuming 'W' is handled by renderer
                else if(r < conf.water + conf.mountain) map[y][x] = 'M';
                else {
                    const d = this.rand();
                    let currentProb = 0;
                    if(conf.features) {
                        for(let feat of conf.features) {
                            currentProb += feat.prob;
                            if(d < currentProb) { map[y][x] = feat.char; break; }
                        }
                    }
                }
            }
        }

        if(poiList) {
            poiList.forEach(poi => {
                if(poi.x >= 0 && poi.x < width && poi.y >= 0 && poi.y < height) {
                    map[poi.y][poi.x] = poi.type;
                    
                    // Clear Area around POI
                    for(let dy=-2; dy<=2; dy++) {
                        for(let dx=-2; dx<=2; dx++) {
                            const ny = poi.y+dy, nx = poi.x+dx;
                            if(ny>=0 && ny<height && nx>=0 && nx<width && map[ny][nx] !== poi.type) {
                                map[ny][nx] = conf.ground; 
                            }
                        }
                    }
                }
            });
        }

        // Road logic removed for simplicity / stability in this pass
        
        return map;
    },

    generateCityLayout: function(width, height) {
        let map = Array(height).fill().map(() => Array(width).fill('=')); 
        for(let y=0; y<height; y++) { map[y][0] = '|'; map[y][width-1] = '|'; }
        for(let x=0; x<width; x++) { map[0][x] = '|'; map[height-1][x] = '|'; }
        map[height-1][Math.floor(width/2)] = 'E'; // Exit
        return map;
    },
    
    generateDungeonLayout: function(width, height) {
        let map = Array(height).fill().map(() => Array(width).fill('#')); 
        
        // Simple Room Gen
        const rooms = [];
        const numRooms = 6;
        for(let i=0; i<numRooms; i++) {
            const w = Math.floor(this.rand() * 5) + 4;
            const h = Math.floor(this.rand() * 5) + 4;
            const x = Math.floor(this.rand() * (width - w - 2)) + 1;
            const y = Math.floor(this.rand() * (height - h - 2)) + 1;
            
            for(let ry=y; ry<y+h; ry++) { for(let rx=x; rx<x+w; rx++) { map[ry][rx] = 'B'; } } // B for Base/Floor
            
            rooms.push({cx: Math.floor(x+w/2), cy: Math.floor(y+h/2)});
            
            if(i > 0) {
                const prev = rooms[i-1];
                const curr = rooms[i];
                // Corridor
                let cx = prev.cx, cy = prev.cy;
                while(cx !== curr.cx) { map[cy][cx] = 'B'; cx += (cx < curr.cx) ? 1 : -1; }
                while(cy !== curr.cy) { map[cy][cx] = 'B'; cy += (cy < curr.cy) ? 1 : -1; }
            }
        }
        
        const start = rooms[0];
        const end = rooms[rooms.length-1];
        map[start.cy][start.cx] = 'E'; // Entry
        map[end.cy][end.cx] = 'X'; // Exit / Chest
        
        return { map, startX: start.cx, startY: start.cy };
    }
};
