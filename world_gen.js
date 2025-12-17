const WorldGen = {
    // FALLOUT 3 INSPIRED BIOME DEFINITIONS
    biomes: {
        'wasteland': { 
            ground: '.', 
            features: [
                { char: 'o', prob: 0.04, solid: true },  // Felsen
                { char: 'x', prob: 0.03, solid: false }, // Toter Strauch
                { char: 't', prob: 0.01, solid: true }   // Einzelner toter Baum
            ],
            water: 0.02, mountain: 0.05 
        },
        'jungle': { // "Oasis" Style
            ground: ',', 
            features: [
                { char: 'T', prob: 0.10, solid: true },  // Großer Baum
                { char: 't', prob: 0.25, solid: true },  // Kleiner Baum
                { char: '"', prob: 0.15, solid: false }  // Hohes Gras
            ],
            water: 0.10, mountain: 0.1 
        },
        'desert': { // "The Pitt" / Ashlands Style
            ground: '_', 
            features: [
                { char: 'o', prob: 0.02, solid: true },  // Kleine Steine
                { char: 'Y', prob: 0.03, solid: true }   // Verdorrte Kakteen/Holz
            ],
            water: 0.01, mountain: 0.15 
        },
        'city': { // "D.C. Ruins" Style
            ground: '=', 
            features: [
                { char: '#', prob: 0.12, solid: true },  // Mauerreste
                { char: '+', prob: 0.08, solid: false }, // Schutt/Geröll
                { char: 'o', prob: 0.03, solid: true }   // Betonbrocken
            ],
            water: 0.0, mountain: 0.0 
        },
        'swamp': { // "Point Lookout" Style
            ground: ';', 
            features: [
                { char: '~', prob: 0.15, solid: false }, // Wasserlache (verstrahlt?)
                { char: 'x', prob: 0.10, solid: false }, // Schilf
                { char: 't', prob: 0.08, solid: true }   // Modrige Bäume
            ],
            water: 0.05, mountain: 0.0
        }
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
        
        // Zufälliges Biom wählen, falls nicht spezifiziert, oder "swamp" hinzufügen
        if (!this.biomes[biomeType]) {
            const types = Object.keys(this.biomes);
            // Nutze Seed für Biom-Wahl wenn möglich, hier vereinfacht basierend auf Input
            biomeType = 'wasteland'; 
        }
        
        const conf = this.biomes[biomeType];

        // 1. BASIS TERRAIN & FEATURES
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                const r = this.rand();
                
                // Basis
                map[y][x] = conf.ground;

                // Große Features (Wasser/Berge)
                if(r < conf.water) {
                    map[y][x] = 'W';
                } else if(r < conf.water + conf.mountain) {
                    map[y][x] = 'M';
                } else {
                    // Detail Features (Bäume, Steine, etc.)
                    // Wir würfeln nochmal für Details, damit sie nicht nur an Bergen kleben
                    const d = this.rand();
                    let currentProb = 0;
                    for(let feat of conf.features) {
                        currentProb += feat.prob;
                        if(d < currentProb) {
                            map[y][x] = feat.char;
                            break;
                        }
                    }
                }
            }
        }

        // 2. POIs PLATZIEREN & FREIRÄUMEN
        if(poiList) {
            poiList.forEach(poi => {
                if(poi.x >= 0 && poi.x < width && poi.y >= 0 && poi.y < height) {
                    map[poi.y][poi.x] = poi.type;
                    
                    // Schutzzone: Boden um POI säubern
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

        // 3. WEGE
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

            if (current === 'W' || current === '~') {
                map[y][x] = '='; // Brücke
            } else if (current === 'M') {
                map[y][x] = 'U'; // Tunnel
            } else {
                map[y][x] = '='; // Weg
            }
        }
    }
};
