// [v0.4.12]
window.GameData = window.GameData || {};

// --- ITEMS ---
window.GameData.items = { 
    stimpack: { name: "Stimpack", type: "consumable", effect: "heal", val: 50, cost: 25 },
    meat_roach: { name: "Kakerlakenfleisch", type: "junk", cost: 2 },
    meat_mole: { name: "Rattenfleisch", type: "junk", cost: 4 },
    meat_fly: { name: "Blähfliegen-Düse", type: "junk", cost: 3 },
    meat_lurk: { name: "Softshell-Fleisch", type: "junk", cost: 15 },
    meat_scorp: { name: "Skorpion-Drüse", type: "junk", cost: 12 },
    hide_yao: { name: "Yao Guai Leder", type: "junk", cost: 25 },
    scrap_metal: { name: "Metallschrott", type: "component", cost: 1 },
    adhesive: { name: "Wunderkleber", type: "component", cost: 10 },
    screws: { name: "Schrauben", type: "component", cost: 5 },
    gears: { name: "Zahnräder", type: "component", cost: 8 },
    springs: { name: "Federn", type: "component", cost: 8 },
    circuitry: { name: "Schaltkreise", type: "component", cost: 20 },
    nuclear_mat: { name: "Nukleares Material", type: "component", cost: 35 },
    legendary_part: { name: "★ Legendäres Modul", type: "rare", cost: 100 },
    
    fists: { name: "Fäuste", slot: 'weapon', type: 'weapon', baseDmg: 2, bonus: {}, cost: 0, requiredLevel: 0, isRanged: false }, 
    vault_suit: { name: "Vault-Anzug", slot: 'body', type: 'body', bonus: { END: 1 }, cost: 0, requiredLevel: 0 }, 
    knife: { name: "Kampfmesser", slot: 'weapon', type: 'weapon', baseDmg: 8, bonus: { STR: 1 }, cost: 15, requiredLevel: 1, isRanged: false }, 
    bat: { name: "Baseballschläger", slot: 'weapon', type: 'weapon', baseDmg: 12, bonus: { STR: 2 }, cost: 25, requiredLevel: 2, isRanged: false },
    bat_spiked: { name: "Nagelschläger", slot: 'weapon', type: 'weapon', baseDmg: 18, bonus: { STR: 2 }, cost: 50, requiredLevel: 3, isRanged: false },
    pistol: { name: "10mm Pistole", slot: 'weapon', type: 'weapon', baseDmg: 14, bonus: { AGI: 1 }, cost: 50, requiredLevel: 1, isRanged: true }, 
    pistol_tac: { name: "Taktische 10mm", slot: 'weapon', type: 'weapon', baseDmg: 20, bonus: { AGI: 2, PER: 1 }, cost: 100, requiredLevel: 4, isRanged: true },
    leather_armor: { name: "Lederharnisch", slot: 'body', type: 'body', bonus: { END: 2 }, cost: 30, requiredLevel: 1 }, 
    leather_armor_h: { name: "Gehärtetes Leder", slot: 'body', type: 'body', bonus: { END: 4 }, cost: 80, requiredLevel: 3 },
    shotgun: { name: "Kampfschrotflinte", slot: 'weapon', type: 'weapon', baseDmg: 24, bonus: { STR: 1 }, cost: 120, requiredLevel: 3, isRanged: true }, 
    rifle_hunting: { name: "Jagdgewehr", slot: 'weapon', type: 'weapon', baseDmg: 35, bonus: { PER: 2 }, cost: 180, requiredLevel: 4, isRanged: true },
    laser_rifle: { name: "Laser-Gewehr", slot: 'weapon', type: 'weapon', baseDmg: 30, bonus: { PER: 2, INT: 1 }, cost: 300, requiredLevel: 5, isRanged: true }, 
    combat_armor: { name: "Kampf-Rüstung", slot: 'body', type: 'body', bonus: { END: 4 }, cost: 150, requiredLevel: 5 },
    metal_armor: { name: "Metall-Rüstung", slot: 'body', type: 'body', bonus: { END: 6, AGI: -1 }, cost: 250, requiredLevel: 7 },
    power_fist: { name: "Powerfaust", slot: 'weapon', type: 'weapon', baseDmg: 45, bonus: { STR: 3 }, cost: 400, requiredLevel: 8, isRanged: false },
    plasma_rifle: { name: "Plasma-Gewehr", slot: 'weapon', type: 'weapon', baseDmg: 55, bonus: { PER: 2, INT: 2 }, cost: 600, requiredLevel: 10, isRanged: true }
};

// --- REZEPTE ---
window.GameData.recipes = [
    { id: "stimpack", out: "stimpack", count: 1, req: { "meat_fly": 1, "adhesive": 1 }, lvl: 1 },
    { id: "ammo_pack", out: "AMMO", count: 15, req: { "scrap_metal": 2 }, lvl: 1 },
    { id: "bat_upgrade", out: "bat_spiked", count: 1, req: { "bat": 1, "scrap_metal": 5, "adhesive": 1 }, lvl: 2 },
    { id: "leather_upgrade", out: "leather_armor_h", count: 1, req: { "leather_armor": 1, "hide_yao": 2, "adhesive": 2 }, lvl: 3 },
    { id: "pistol_mod", out: "pistol_tac", count: 1, req: { "pistol": 1, "screws": 3, "gears": 2 }, lvl: 4 },
    { id: "laser_mod", out: "laser_rifle", count: 1, req: { "rifle_hunting": 1, "circuitry": 2, "nuclear_mat": 1 }, lvl: 6 }
];

console.log("GameData Items loaded.");
