window.GameData = window.GameData || {};

// [v0.7.3] PERK SYSTEM (10 Perks)
window.GameData.perks = [
    // --- DEFENSIVE / SURVIVAL ---
    { 
        id: 'toughness', 
        name: 'Zähigkeit', 
        desc: '+10 Max HP pro Stufe.', 
        icon: '🛡️', 
        max: 5 
    },
    { 
        id: 'medic', 
        name: 'Sanitäter', 
        desc: '+20% Heilung durch Stimpacks pro Stufe.', 
        icon: '💉', 
        max: 5 
    },
    { 
        id: 'rad_resistant', 
        name: 'Rad-Resistenz', 
        desc: '-10% Strahlungsaufnahme pro Stufe.', 
        icon: '☢️', 
        max: 5 
    },
    
    // --- UTILITY / LOOT ---
    { 
        id: 'strong_back', 
        name: 'Starker Rücken', 
        desc: '+1 Inventar-Slot pro Stufe.', 
        icon: '🎒', 
        max: 5 
    },
    { 
        id: 'fortune_finder', 
        name: 'Schatzsucher', 
        desc: '+10% mehr Kronkorken finden pro Stufe.', 
        icon: '💰', 
        max: 5 
    },
    { 
        id: 'scrapper', 
        name: 'Wiederverwerter', 
        desc: 'Höhere Chance auf seltene Teile beim Zerlegen.', 
        icon: '⚙️', 
        max: 3 
    },
    { 
        id: 'swift_learner', 
        name: 'Heller Kopf', 
        desc: '+5% Erfahrungspunkte (XP) pro Stufe.', 
        icon: '🧠', 
        max: 5 
    },

    // --- COMBAT ---
    { 
        id: 'mysterious_stranger', 
        name: 'Mysteriöser Fremder', 
        desc: '+2% Krit-Chance im V.A.T.S. pro Stufe.', 
        icon: '🕵️', 
        max: 5 
    },
    { 
        id: 'gunslinger', 
        name: 'Revolverheld', 
        desc: '+10% Schaden mit Schusswaffen pro Stufe.', 
        icon: '🔫', 
        max: 5 
    },
    { 
        id: 'slugger', 
        name: 'Schläger', 
        desc: '+10% Schaden im Nahkampf pro Stufe.', 
        icon: '🏏', 
        max: 5 
    }
];

// --- QUESTS ---
window.GameData.questDefs = [
    { 
        id: "q_start", 
        title: "Überleben 101", 
        desc: "Das Ödland ist gefährlich. Töte kleine Biester um zu üben.", 
        type: "kill", 
        target: "radRoach", 
        amount: 3, 
        minLvl: 1, 
        reward: { xp: 50, caps: 25 } 
    },
    { 
        id: "q_explore", 
        title: "Zivilisation?", 
        desc: "Finde die Handelsstadt Rusty Springs bei den Koordinaten [3,3].", 
        type: "visit", 
        target: "3,3", 
        amount: 1, 
        minLvl: 1, 
        reward: { xp: 100, caps: 50, items: [{id:'stimpack', c:2}] } 
    },
    { 
        id: "q_hunter", 
        title: "Plagenbeseitigung", 
        desc: "Blähfliegen übertragen Krankheiten. Lösche sie aus.", 
        type: "kill", 
        target: "bloatfly", 
        amount: 5, 
        minLvl: 2, 
        reward: { xp: 150, caps: 60, items: [{id:'radaway', c:1}] } 
    },
    { 
        id: "q_collect", 
        title: "Schrottsammler", 
        desc: "Sammle Schrottmetall, um dein Lager auszubauen.", 
        type: "collect", 
        target: "junk_metal", 
        amount: 10, 
        minLvl: 3, 
        reward: { xp: 200, items: [{id:'bp_machete', c:1}] } 
    },
    { 
        id: "q_raider", 
        title: "Gesetzeshüter", 
        desc: "Raider bedrohen die Handelsrouten. Zeig ihnen das Gesetz.", 
        type: "kill", 
        target: "raider", 
        amount: 5, 
        minLvl: 4, 
        reward: { xp: 300, caps: 150, items: [{id:'combat_armor', c:1}] } 
    }
];

// --- ITEMS UPDATE (Mehr Loot) ---
window.GameData.items = Object.assign(window.GameData.items || {}, {
    junk_metal: { name: "Schrottmetall", type: "junk", cost: 5, icon: "⚙️", desc: "Wichtiges Baumaterial." },
    cloth: { name: "Stofffetzen", type: "component", cost: 3, icon: "🧶", desc: "Für Betten und Rüstungen." },
    screws: { name: "Lose Schrauben", type: "component", cost: 15, icon: "🔩", desc: "Wichtig für Waffen." },
    duct_tape: { name: "Klebeband", type: "component", cost: 20, icon: "🩹", desc: "Hält die Welt zusammen." },
    glue: { name: "Wunderkleber", type: "component", cost: 25, icon: "💧", desc: "Klebt alles." },
    gears: { name: "Zahnräder", type: "component", cost: 30, icon: "⚙️", desc: "Für Mechanik." },
    springs: { name: "Federn", type: "component", cost: 30, icon: "🌀", desc: "Für Abzüge und Dämpfer." },
    plastic: { name: "Plastik", type: "component", cost: 10, icon: "🧴", desc: "Leichtes Material." },
    tin_can: { name: "Blechdose", type: "junk", cost: 2, icon: "🥫", desc: "Bringt Stahl." },
    wrench: { name: "Schraubenschlüssel", type: "junk", cost: 15, icon: "🔧", desc: "Guter Schrott." },
    clipboard: { name: "Klemmbrett", type: "junk", cost: 10, icon: "📋", desc: "Enthält Federn." }
});

// --- MONSTER LOOT UPDATE ---
window.GameData.monsters = Object.assign(window.GameData.monsters || {}, {
    radRoach: { 
        name: "Rad-Kakerlake", hp: 15, dmg: 3, xp: [10,20], loot: 2, minLvl: 1,
        drops: [ {id:'junk_metal', c: 0.5}, {id:'rad_meat', c: 0.4} ]
    },
    moleRat: { 
        name: "Maulwurfsratte", hp: 25, dmg: 5, xp: [15,30], loot: 5, minLvl: 1,
        drops: [ {id:'rad_meat', c: 0.5}, {id:'leather', c: 0.3}, {id:'junk_metal', c: 0.2} ]
    },
    wildDog: { 
        name: "Wilder Hund", hp: 35, dmg: 8, xp: [25,40], loot: 0, minLvl: 2,
        drops: [ {id:'rad_meat', c: 0.6}, {id:'leather', c: 0.5} ]
    },
    raider: { 
        name: "Raider", hp: 60, dmg: 12, xp: [50,80], loot: 15, minLvl: 2,
        drops: [
            {id:'ammo', c: 0.6}, {id:'stimpack', c: 0.2}, {id:'knife', c: 0.2},
            {id:'pistol_rusty', c: 0.3}, {id:'junk_metal', c: 0.4}
        ]
    }
});

// --- FARBPALETTE ---
window.GameData.colors = { 
    '.':'#2d241b', '_':'#4a4036', ',':'#1a261a', ';':'#1e1e11', '=':'#333333', 
    '#':'#555', 
    'line_default': '#2a5a2a', 'line_wall': '#39ff14', 
    'V': '#39ff14', 'C': '#eab308', 'S': '#ff0000', 'G': '#00ffff', 'H': '#888888', 
    '^': '#111', 'v':'#111', '<':'#111', '>':'#111',
    'M': '#3e2723', 'W': '#0d47a1', '~': '#2f4f2f', 
    't': '#1b5e20', 'T': '#0a3d0a', 'x': '#8b4513', 'o': '#808080',
    '+': '#666666', '"': '#3cb371', 'Y': '#deb887', 'U': '#212121',
    'A': '#cc0000', 'K': '#00bfff',
    '$': '#ffd700', '&': '#ff8c00', 'P': '#ff3333', 'E': '#39ff14', 'F': '#00bfff', '|': '#777',
    'X': '#ff00ff', 
    'wasteland': '#5d5345', 'desert': '#eecfa1', 'jungle': '#1a3300', 'city': '#555555', 'swamp': '#1e1e11'
};

window.GameData.statLabels = { 'STR': 'STÄRKE', 'PER': 'WAHRNEHMUNG', 'END': 'AUSDAUER', 'INT': 'INTELLIGENZ', 'AGI': 'BEWEGLICHKEIT', 'LUC': 'GLÜCK' };

window.GameData.biomes = {
    'wasteland': { 
        ground: '.', water: 0.02, mountain: 0.03,
        features: [ { char: 'o', prob: 0.02, solid: true }, { char: 'x', prob: 0.03, solid: false }, { char: 't', prob: 0.01, solid: true } ]
    },
    'jungle': { 
        ground: ',', water: 0.08, mountain: 0.05,
        features: [ { char: 'T', prob: 0.08, solid: true }, { char: 't', prob: 0.15, solid: true }, { char: '"', prob: 0.15, solid: false } ]
    },
    'desert': { 
        ground: '_', water: 0.01, mountain: 0.10,
        features: [ { char: 'o', prob: 0.02, solid: true }, { char: 'Y', prob: 0.02, solid: true } ]
    },
    'city': { 
        ground: '=', water: 0.0, mountain: 0.0,
        features: [ { char: '#', prob: 0.10, solid: true }, { char: '+', prob: 0.08, solid: false }, { char: 'o', prob: 0.02, solid: true } ]
    },
    'swamp': { 
        ground: ';', water: 0.05, mountain: 0.0,
        features: [ { char: '~', prob: 0.10, solid: false }, { char: 'x', prob: 0.10, solid: false }, { char: 't', prob: 0.05, solid: true } ]
    }
};

window.GameData.hackWords = {
    easy: ["PASS", "CODE", "HACK", "DATA", "BIOS", "BOOT", "DISK", "FILE", "LOAD", "SAVE", "EXIT", "USER", "LOCK", "KEYS", "WIFI", "NODE"],
    medium: ["SERVER", "ACCESS", "SYSTEM", "ROUTER", "MEMORY", "CONFIG", "STATUS", "REBOOT", "UPDATE", "KERNEL", "SCRIPT", "SEARCH", "SIGNAL", "TARGET", "MATRIX", "BYPASS"],
    hard: ["FIREWALL", "PROTOCOL", "PASSWORD", "DATABASE", "SECURITY", "DOWNLOAD", "TERMINAL", "MAINFRAME", "OVERRIDE", "HARDWARE", "SOFTWARE", "ENCRYPTION", "NETWORK", "BACKDOOR"]
};

console.log("GameData Core loaded.");
