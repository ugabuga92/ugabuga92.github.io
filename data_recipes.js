// [v0.7.0]
if(typeof window.GameData === 'undefined') window.GameData = {};

window.GameData.recipes = [
    { id: "craft_ammo", out: "AMMO", count: 10, req: { "junk_metal": 2, "gunpowder": 1 }, lvl: 1 },
    { id: "craft_stimpack", out: "stimpack", count: 1, req: { "antiseptic": 1, "plastic": 1 }, lvl: 2 }, // Placeholder logic for reqs
    // Simplified Reqs for now:
    { id: "craft_stimpack_simple", out: "stimpack", count: 1, req: { "junk_metal": 5, "duct_tape": 2 }, lvl: 1 },
    
    { id: "craft_rusty_pistol", out: "rusty_pistol", count: 1, req: { "junk_metal": 10, "screws": 5, "duct_tape": 2 }, lvl: 1 },
    { id: "craft_leather", out: "leather_armor", count: 1, req: { "leather": 10, "duct_tape": 5 }, lvl: 2 },
    { id: "craft_machete", out: "machete", count: 1, req: { "junk_metal": 8, "leather": 2 }, lvl: 1 },
    { id: "craft_metal", out: "metal_armor", count: 1, req: { "junk_metal": 20, "screws": 10 }, lvl: 4 }
];

if(typeof Game !== 'undefined') Game.recipes = window.GameData.recipes;
