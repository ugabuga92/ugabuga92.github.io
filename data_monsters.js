// [v3.1] - 2026-01-03 01:20am (Balancing Update)
// - Balance: Dropraten allgemein gesenkt.
window.GameData = window.GameData || {};

// --- MONSTER ---
window.GameData.monsters = { 
    radRoach: { name: "Rad-Kakerlake", hp: 15, dmg: 3, xp: [10, 15], loot: 1, minLvl: 1, drops: [{id:'meat_roach', c:0.3}] }, // c 0.6 -> 0.3
    bloatfly: { name: "Blähfliege", hp: 10, dmg: 5, xp: [12, 18], loot: 2, minLvl: 1, drops: [{id:'meat_fly', c:0.4}] }, // Removed nuclear_mat
    moleRat: { name: "Maulwurfsratte", hp: 25, dmg: 6, xp: [15, 25], loot: 3, minLvl: 1, drops: [{id:'meat_mole', c:0.3}] }, 
    wildDog: { name: "Wilder Hund", hp: 40, dmg: 9, loot: 0, xp: [30, 50], minLvl: 2, drops: [{id:'meat_mole', c:0.2}] }, 
    mutantRose: { name: "Mutanten-Pflanze", hp: 45, dmg: 15, loot: 5, xp: [45, 60], minLvl: 1, drops: [{id:'adhesive', c:0.3}] }, 
    radScorpion: { name: "Radskorpion", hp: 90, dmg: 18, loot: 15, xp: [80, 100], minLvl: 3, drops: [{id:'meat_scorp', c:0.4}, {id:'nuclear_mat', c:0.05}] },
    raider: { name: "Raider", hp: 60, dmg: 12, loot: 20, xp: [50, 70], minLvl: 2, drops: [{id:'stimpack', c:0.1}, {id:'scrap_metal', c:0.2}] }, 
    ghoul: { name: "Wilder Ghul", hp: 50, dmg: 10, loot: 5, xp: [40, 60], minLvl: 2, drops: [{id:'nuclear_mat', c:0.05}] }, 
    mirelurk: { name: "Mirelurk", hp: 110, dmg: 20, loot: 10, xp: [90, 120], minLvl: 4, drops: [{id:'meat_lurk', c:0.5}, {id:'adhesive', c:0.2}] },
    protectron: { name: "Protectron", hp: 130, dmg: 15, loot: 30, xp: [100, 140], minLvl: 4, drops: [{id:'scrap_metal', c:0.6}, {id:'circuit', c:0.3}] },
    yaoGuai: { name: "Yao Guai", hp: 180, dmg: 35, loot: 0, xp: [180, 250], minLvl: 6, drops: [{id:'hide_yao', c:0.6}, {id:'springs', c:0.2}] },
    sentryBot: { name: "Wachbot MK-II", hp: 250, dmg: 45, loot: 80, xp: [300, 400], minLvl: 8, drops: [{id:'scrap_metal', c:0.8}, {id:'gears', c:0.5}, {id:'nuclear_mat', c:0.3}] },
    deathclaw: { name: "Todesklaue", hp: 400, dmg: 70, loot: 100, xp: [600, 800], minLvl: 10, drops: [{id:'hide_yao', c:0.8}, {id:'gears', c:0.4}] } 
};

console.log("GameData Monsters loaded.");
