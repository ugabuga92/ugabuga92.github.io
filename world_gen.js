const WorldGen = {
    biomes: {
        'wasteland': { water: 0.05, mountain: 0.1, trees: 0.05, ground: '.' },
        'jungle': { water: 0.15, mountain: 0.2, trees: 0.4, ground: ',' },
        'desert': { water: 0.02, mountain: 0.15, trees: 0.02, ground: '_' },
        'city': { water: 0.0, mountain: 0.0, trees: 0.0, ground: '=' }
    },
    
    // Zufalls-Seed Speicher
    _seed: 12345,

    // Setzt den Startwert für den Zufall
    setSeed: function(val) {
        this._seed = val % 2147483647;
        if (this._seed <= 0) this._seed += 2147483646;
    },

    // Deterministischer Zufallsgenerator (LCG)
    rand: function() {
        this._seed = (this._seed * 16807) % 2147483647;
        return (this._seed - 1) / 2147483646;
    },

    createSector: function(width, height, biomeType, poiList) {
        let map = Array(height).fill().map(() => Array(width).fill('.'));
        const conf = this.biomes[biomeType] || this.biomes['wasteland'];

        // 1. BASIS TERRAIN (Mit Seeded Random)
        for(let y = 1; y < height - 1; y++) {
            for(let x = 1; x < width - 1; x++) {
                const roll = this.rand();
                if(roll < conf.water) map[y][x] = 'W'; 
                else if(roll < conf.water + conf.mountain) map[y][x] = 'M'; 
                else if(roll < conf.water + conf.mountain + conf.trees) map[y][x] = 't'; 
                else map[y][x] = conf.ground;
            }
        }

        // 2. POIs PLATZIEREN
        poiList.forEach(p => {
            for(let dy=-2; dy<=2; dy++) {
                for(let dx=-2; dx<=2; dx++) {
                    const ny = p.y + dy, nx = p.x + dx;
                    if(ny > 0 && ny < height-1 && nx > 0 && nx < width-1) {
                        map[ny][nx] = conf.ground;
                    }
                }
            }
            map[p.y][p.x] = p.type;
        });

        // 3. WEGNETZWERK
        const points = [...poiList];
        // Sackgassen auch seeded
        for(let i=0; i<3; i++) {
            points.push({
                x: Math.floor(this.rand()*(width-4))+2, 
                y: Math.floor(this.rand()*(height-4))+2, 
                type: 'nav'
            });
        }

        for(let i = 0; i < points.length - 1; i++) {
            this.buildRoad(map, points[i], points[i+1], conf.ground);
        }
        if(points.length > 1) {
            this.buildRoad(map, points[points.length-1], points[0], conf.ground);
        }

        return map;
    },

    buildRoad: function(map, start, end, groundChar) {
        let x = start.x;
        let y = start.y;
        
        while(x !== end.x || y !== end.y) {
            // Seeded Random Direction
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

            if(x <= 0 || x >= map[0].length - 1 || y <= 0 || y >= map.length - 1) continue;

            const current = map[y][x];
            
            if (['V', 'C', 'S', 'H', 'G'].includes(current)) continue; 

            if (current === 'W') {
                map[y][x] = '='; 
            } else if (current === 'M') {
                map[y][x] = 'U'; 
            } else {
                map[y][x] = '#'; 
            }
            
            if(this.rand() < 0.1) {
                for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++) {
                    const ny = y+dy, nx = x+dx;
                    if(map[ny] && map[ny][nx] && !['W','M','V','C','S','H','G','=','U'].includes(map[ny][nx])) {
                        map[ny][nx] = '#'; 
                    }
                }
            }
        }
    }
};
