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
        if (x === 3 && y === 3) return 'city';
        if (x === 4 && y === 4) return 'vault';
        if (x <= 2 && y <= 2) return 'forest';
        if (x >= 5 && y >= 5) return 'desert';
        if (x >= 6 && y <= 1) return 'swamp';
        if (x <= 1 && y >= 6) return 'mountain';
        return 'wasteland';
    },

    createSector: function(width, height, biomeType, poiList) {
        let map = Array(height).fill().map(() => Array(width).fill('.'));
        let conf = { ground: '.', water: 0, mountain: 0, features: [] };
        
        if (typeof window.GameData !== 'undefined' && window.GameData.biomes && window.GameData.biomes[biomeType]) {
            conf = window.GameData.biomes[biomeType];
        }

        // Füllen mit Basis-Terrain
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                const r = this.rand();
                map[y][x] = conf.ground; // Standard
                
                // Wasser / Berge
                if(r < conf.water) map[y][x] = 'W'; // Wasser überall gleich 'W'
                else if(r < conf.water + conf.mountain) map[y][x] = 'M'; // Berg 'M'
                else {
                    // Features (Bäume, Steine)
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

        // POIs setzen
        if(poiList) {
            poiList.forEach(poi => {
                if(poi.x >= 0 && poi.x < width && poi.y >= 0 && poi.y < height) {
                    map[poi.y][poi.x] = poi.type;
                    // Freiraum um POI
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

        // Straßen
        if(poiList && poiList.length > 1) {
            for(let i=0; i<poiList.length-1; i++) {
                this.buildRoad(map, poiList[i], poiList[i+1], conf.ground);
            }
        }

        return map;
    },

    generateCityLayout: function(w, h) { let m=Array(h).fill().map(()=>Array(w).fill('=')); for(let y=0;y<h;y++){m[y][0]='|';m[y][w-1]='|';} for(let x=0;x<w;x++){m[0][x]='|';m[h-1][x]='|';} m[h-1][Math.floor(w/2)]='E'; return m; },
    generateDungeonLayout: function(w, h) { let m=Array(h).fill().map(()=>Array(w).fill('#')); const cx=Math.floor(w/2), cy=Math.floor(h/2); for(let y=cy-2;y<=cy+2;y++) for(let x=cx-2;x<=cx+2;x++) m[y][x]='.'; m[cy][cx]='X'; return {map:m, startX:cx, startY:cy}; },
    buildDungeonCorridor: function(m,x1,y1,x2,y2){let x=x1,y=y1;while(x!==x2){m[y][x]='B';x+=(x<x2)?1:-1;}while(y!==y2){m[y][x]='B';y+=(y<y2)?1:-1;}},
    buildRoad: function(m,s,e,g) { /* simplified */ }
};
