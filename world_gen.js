const WorldGen = {
    biomes: {
        'wasteland': { water: 0.05, mountain: 0.1, trees: 0.05, ground: '.' },
        'jungle': { water: 0.15, mountain: 0.2, trees: 0.4, ground: ',' },
        'desert': { water: 0.02, mountain: 0.15, trees: 0.02, ground: '_' },
        'city': { water: 0.0, mountain: 0.0, trees: 0.0, ground: '=' }
    },
    
    _seed: 12345,

    setSeed: function(val) {
        this._seed = val % 2147483647;
        if (this._seed <= 0) this._seed += 2147483646;
    },

    rand: function() {
        this._seed = (this._seed * 16807) % 2147483647;
        return (this._seed - 1) / 2147483646;
    },

    createSector: function(width, height, biomeType, poiList) {
        let map = Array(height).fill().map(() => Array(width).fill('.'));
        const conf = this.biomes[biomeType] || this.biomes['wasteland'];

        // 1. BASIS TERRAIN (Füllt ALLES aus, auch die Ränder)
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                const r = this.rand();
                if(r < conf.water) map[y][x] = 'W';
                else if(r < conf.water + conf.mountain) map[y][x] = 'M';
                else if(r < conf.water + conf.mountain + conf.trees) map[y][x] = 't';
                else map[y][x] = conf.ground;
            }
        }

        // 2. POIs PLATZIEREN
        if(poiList) {
            poiList.forEach(poi => {
                if(poi.x >= 0 && poi.x < width && poi.y >= 0 && poi.y < height) {
                    map[poi.y][poi.x] = poi.type;
                    
                    // Schutzzone um POI damit man nicht in Wand spawnt
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

        // 3. WEGE (Optional: Verbindet POIs wenn vorhanden)
        // Da wir keine festen Tore mehr haben, bauen wir Wege zufällig oder zu POIs
        if(poiList && poiList.length > 1) {
            for(let i=0; i<poiList.length-1; i++) {
                this.buildRoad(map, poiList[i], poiList[i+1], conf.ground);
            }
        }

        return map;
    },

    buildRoad: function(map, start, end, groundChar) {
        let x = start.x;
        let y = start.y;
        
        while(x !== end.x || y !== end.y) {
            if(this.rand() < 0.2) {
                const dir = this.rand() < 0.5 ? 0 : 1; 
                if(dir === 0 && x !== end.x) x += (end.x > x ? 1 : -1);
                else if(y !== end.y) y += (end.y > y ? 1 : -1);
            } else {
                if(Math.abs(end.x - x) > Math.abs(end.y - y)) {
                    x += (end.x > x ? 1 : -1);
                } else {
                    y += (end.y > y ? 1 : -1);
                }
            }

            if(x < 0 || x >= map[0].length || y < 0 || y >= map.length) continue;

            const current = map[y][x];
            
            if (['V', 'C', 'S', 'H'].includes(current)) continue; 

            if (current === 'W') {
                map[y][x] = '='; // Brücke
            } else if (current === 'M') {
                map[y][x] = 'U'; // Tunnel
            } else {
                map[y][x] = '='; // Weg
            }
        }
    }
};
