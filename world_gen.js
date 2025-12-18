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

    createSector: function(width, height, biomeType, poiList) {
        let map = Array(height).fill().map(() => Array(width).fill('.'));
        if (typeof GameData === 'undefined' || !GameData.biomes[biomeType]) biomeType = 'wasteland'; 
        const conf = GameData.biomes[biomeType];

        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                const r = this.rand();
                map[y][x] = conf.ground;
                if(r < conf.water) map[y][x] = 'W';
                else if(r < conf.water + conf.mountain) map[y][x] = 'M';
                else {
                    const d = this.rand();
                    let currentProb = 0;
                    for(let feat of conf.features) {
                        currentProb += feat.prob;
                        if(d < currentProb) { map[y][x] = feat.char; break; }
                    }
                }
            }
        }

        if(poiList) {
            poiList.forEach(poi => {
                if(poi.x >= 0 && poi.x < width && poi.y >= 0 && poi.y < height) {
                    map[poi.y][poi.x] = poi.type;
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

        if(poiList && poiList.length > 1) {
            for(let i=0; i<poiList.length-1; i++) {
                this.buildRoad(map, poiList[i], poiList[i+1], conf.ground);
            }
        }

        return map;
    },

    // NEU: Handgemachtes Stadt-Layout
    generateCityLayout: function(width, height) {
        let map = Array(height).fill().map(() => Array(width).fill('=')); // Paved ground
        
        // Mauer drumherum (aber innen drin)
        for(let y=0; y<height; y++) { map[y][0] = '|'; map[y][width-1] = '|'; }
        for(let x=0; x<width; x++) { map[0][x] = '|'; map[height-1][x] = '|'; }
        
        // Ausgang unten mitte
        map[height-1][width/2] = 'E';
        map[height-1][width/2-1] = 'E';
        map[height-1][width/2+1] = 'E';

        // Brunnen in der Mitte
        const cx = Math.floor(width/2), cy = Math.floor(height/2);
        for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++) map[cy+dy][cx+dx] = 'F';

        // Gebäude 1: Shop (Links Oben)
        for(let y=5; y<12; y++) for(let x=5; x<15; x++) map[y][x] = '|';
        for(let y=6; y<11; y++) for(let x=6; x<14; x++) map[y][x] = '.';
        map[11][10] = '='; // Tür
        map[8][10] = '$'; // Händler

        // Gebäude 2: Klinik (Rechts Oben)
        for(let y=5; y<12; y++) for(let x=25; x<35; x++) map[y][x] = '|';
        for(let y=6; y<11; y++) for(let x=26; x<34; x++) map[y][x] = '.';
        map[11][30] = '='; // Tür
        map[8][30] = 'P'; // Doctor (Plus)

        // Gebäude 3: Werkstatt (Links Unten)
        for(let y=25; y<32; y++) for(let x=5; x<15; x++) map[y][x] = '|';
        for(let y=26; y<31; y++) for(let x=6; x<14; x++) map[y][x] = '.';
        map[25][10] = '='; // Tür
        map[28][10] = '&'; // Werkbank

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
                if(Math.abs(end.x - x) > Math.abs(end.y - y)) x += (end.x > x ? 1 : -1);
                else y += (end.y > y ? 1 : -1);
            }
            if(x < 0 || x >= map[0].length || y < 0 || y >= map.length) continue;
            const current = map[y][x];
            if (['V', 'C', 'S', 'H'].includes(current)) continue; 
            if (current === 'W' || current === '~') map[y][x] = '='; 
            else if (current === 'M') map[y][x] = 'U'; 
            else map[y][x] = '='; 
        }
    }
};
