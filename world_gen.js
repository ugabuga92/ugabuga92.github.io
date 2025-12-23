// [v0.4.0]

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
    
    // NEU: Biome für 10x10 Welt
    getSectorBiome: function(x, y) {
        // Logik für 0-9
        if (x <= 2 && y <= 2) return 'forest';      // NW: Oasis
        if (x >= 7 && y >= 7) return 'desert';      // SO: The Pitt
        if (x >= 7 && y <= 2) return 'swamp';       // NO: Sumpf
        if (x <= 2 && y >= 7) return 'mountain';    // SW: Gebirge
        
        return 'wasteland'; // Standard
    },

    createSector: function(width, height, biomeType, poiList) {
        let map = Array(height).fill().map(() => Array(width).fill('.'));
        let conf = { ground: '.', water: 0, mountain: 0, features: [] };
        
        // Lade Konfig aus GameData falls vorhanden, sonst Fallback
        if (typeof window.GameData !== 'undefined' && window.GameData.biomes) {
            if (!window.GameData.biomes[biomeType]) biomeType = 'wasteland';
            conf = window.GameData.biomes[biomeType];
        }

        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                const r = this.rand();
                map[y][x] = conf.ground;
                if(r < conf.water) map[y][x] = 'W';
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
                    // Freiraum um POI schaffen
                    for(let dy=-3; dy<=3; dy++) {
                        for(let dx=-3; dx<=3; dx++) {
                            const ny = poi.y+dy, nx = poi.x+dx;
                            if(ny>=0 && ny<height && nx>=0 && nx<width && map[ny][nx] !== poi.type) {
                                map[ny][nx] = conf.ground; 
                            }
                        }
                    }
                }
            });
        }

        if(poiList && poiList.length > 1) {
            for(let i=0; i<poiList.length-1; i++) {
                this.buildRoad(map, poiList[i], poiList[i+1], conf.ground);
            }
        }

        return map;
    },

    generateCityLayout: function(width, height) {
        let map = Array(height).fill().map(() => Array(width).fill('=')); 
        for(let y=0; y<height; y++) { map[y][0] = '|'; map[y][width-1] = '|'; }
        for(let x=0; x<width; x++) { map[0][x] = '|'; map[height-1][x] = '|'; }
        // City Gates
        map[height-1][width/2] = 'E'; map[height-1][width/2-1] = 'E'; map[height-1][width/2+1] = 'E';
        const cx = Math.floor(width/2), cy = Math.floor(height/2);
        // Central Plaza
        for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++) map[cy+dy][cx+dx] = 'F';
        // Buildings (Hardcoded blocks for now)
        for(let y=5; y<12; y++) for(let x=5; x<15; x++) map[y][x] = '|'; for(let y=6; y<11; y++) for(let x=6; x<14; x++) map[y][x] = '.'; map[11][10] = '='; map[8][10] = '$'; 
        for(let y=5; y<12; y++) for(let x=25; x<35; x++) map[y][x] = '|'; for(let y=6; y<11; y++) for(let x=26; x<34; x++) map[y][x] = '.'; map[11][30] = '='; map[8][30] = 'P'; 
        for(let y=25; y<32; y++) for(let x=5; x<15; x++) map[y][x] = '|'; for(let y=26; y<31; y++) for(let x=6; x<14; x++) map[y][x] = '.'; map[25][10] = '='; map[28][10] = '&'; 
        return map;
    },
    
    generateDungeonLayout: function(width, height) {
        let map = Array(height).fill().map(() => Array(width).fill('#')); 
        const rooms = [];
        const numRooms = 8;
        for(let i=0; i<numRooms; i++) {
            const w = Math.floor(this.rand() * 6) + 4;
            const h = Math.floor(this.rand() * 6) + 4;
            const x = Math.floor(this.rand() * (width - w - 2)) + 1;
            const y = Math.floor(this.rand() * (height - h - 2)) + 1;
            for(let ry=y; ry<y+h; ry++) { for(let rx=x; rx<x+w; rx++) { map[ry][rx] = 'B'; } }
            rooms.push({x, y, w, h, cx: Math.floor(x+w/2), cy: Math.floor(y+h/2)});
            if(i > 0) { const prev = rooms[i-1]; this.buildDungeonCorridor(map, prev.cx, prev.cy, rooms[i].cx, rooms[i].cy); }
        }
        const start = rooms[0];
        map[start.cy][start.cx] = 'E';
        const end = rooms[rooms.length-1];
        map[end.cy][end.cx] = 'X';
        for(let y=0; y<height; y++) { map[y][0] = '#'; map[y][width-1] = '#'; }
        for(let x=0; x<width; x++) { map[0][x] = '#'; map[height-1][x] = '#'; }
        return { map, startX: start.cx, startY: start.cy };
    },
    
    buildDungeonCorridor: function(map, x1, y1, x2, y2) {
        let x = x1, y = y1;
        while(x !== x2) { map[y][x] = 'B'; x += (x < x2) ? 1 : -1; }
        while(y !== y2) { map[y][x] = 'B'; y += (y < y2) ? 1 : -1; }
    },

    buildRoad: function(map, start, end, groundChar) {
        let x = start.x, y = start.y;
        while(x !== end.x || y !== end.y) {
            if(this.rand() < 0.2) { const dir = this.rand() < 0.5 ? 0 : 1; if(dir === 0 && x !== end.x) x += (end.x > x ? 1 : -1); else if(y !== end.y) y += (end.y > y ? 1 : -1); } 
            else { if(Math.abs(end.x - x) > Math.abs(end.y - y)) x += (end.x > x ? 1 : -1); else y += (end.y > y ? 1 : -1); }
            if(x < 0 || x >= map[0].length || y < 0 || y >= map.length) continue;
            
            const clearRadius = (cx, cy) => {
                map[cy][cx] = '='; 
                if (cx+1 < map[0].length && map[cy][cx+1] === 'M') map[cy][cx+1] = 'U';
                if (cx-1 >= 0 && map[cy][cx-1] === 'M') map[cy][cx-1] = 'U';
                if (cy+1 < map.length && map[cy+1][cx] === 'M') map[cy+1][cx] = 'U';
                if (cy-1 >= 0 && map[cy-1][cx] === 'M') map[cy-1][cx] = 'U';
                if (map[cy][cx] === 'W' || map[cy][cx] === '~') map[cy][cx] = '=';
            };
            clearRadius(x, y);
            if (x+1 < map[0].length) map[y][x+1] = '=';
        }
    }
};
