// [v2.9] - Equipment Expansion (Head, Legs, Feet, Arms)
if(typeof window.GameData === 'undefined') window.GameData = {};
if(typeof window.GameData.items === 'undefined') window.GameData.items = {}; 

Object.assign(window.GameData.items, {
    // --- BLUEPRINTS ---
    bp_ammo: { name: "Bauplan: Munition", type: "blueprint", recipeId: "craft_ammo", cost: 50, desc: "Lerne Munition herzustellen." },
    bp_stimpack: { name: "Bauplan: Stimpack", type: "blueprint", recipeId: "craft_stimpack", cost: 100, desc: "Medizinische Grundlagen." },
    bp_rusty_pistol: { name: "Bauplan: Rostige Pistole", type: "blueprint", recipeId: "craft_rusty_pistol", cost: 80, desc: "Besser als nichts." },
    bp_leather_armor: { name: "Bauplan: Lederrüstung", type: "blueprint", recipeId: "craft_leather", cost: 120, desc: "Schutz für Ödland-Wanderer." },
    bp_metal_armor: { name: "Bauplan: Metallrüstung", type: "blueprint", recipeId: "craft_metal", cost: 250, desc: "Schweres Blech." },
    bp_machete: { name: "Bauplan: Machete", type: "blueprint", recipeId: "craft_machete", cost: 150, desc: "Scharfer Stahl." },
    
    // --- CAMP ITEMS ---
    camp_kit: { name: "Zelt-Bausatz", type: "tool", cost: 150, desc: "Errichtet ein Lager im Ödland.", weight: 5 },
    cloth: { name: "Stoff", type: "component", cost: 2, desc: "Material für Zelte und Kleidung." },

    // --- MONSTER DROPS ---
    meat_roach: { name: "Kakerlakenfleisch", type: "component", cost: 5, desc: "Ekelhaft, aber essbar." },
    meat_fly: { name: "Fliegenfleisch", type: "component", cost: 5, desc: "Schleimig." },
    meat_mole: { name: "Rattenfleisch", type: "component", cost: 8, desc: "Zäh." },
    meat_scorp: { name: "Skorpiondrüse", type: "component", cost: 20, desc: "Delikatesse." },
    meat_lurk: { name: "Mirelurk-Fleisch", type: "component", cost: 15, desc: "Weich und fischig." },
    hide_yao: { name: "Yao Guai Leder", type: "component", cost: 40, desc: "Robustes Fell." },
    
    scrap_metal: { name: "Altmetall", type: "junk", cost: 3, desc: "Verwertbare Teile." },
    adhesive: { name: "Kleber", type: "component", cost: 15, desc: "Hält ewig." },
    nuclear_mat: { name: "Nukleares Material", type: "rare", cost: 50, desc: "Strahlend und wertvoll." },
    springs: { name: "Federn", type: "component", cost: 10, desc: "Für mechanische Teile." },

    // --- COOKED FOOD ---
    cooked_roach: { name: "Gegrillte Kakerlake", type: "consumable", effect: "heal_rad", val: 15, rad: 2, cost: 10, desc: "Knusprig. +15 HP, +2 RAD" },
    cooked_fly: { name: "Fliegen-Spieß", type: "consumable", effect: "heal_rad", val: 15, rad: 2, cost: 10, desc: "Proteinreich. +15 HP, +2 RAD" },
    cooked_mole: { name: "Ratten-Steak", type: "consumable", effect: "heal_rad", val: 25, rad: 3, cost: 20, desc: "Macht satt. +25 HP, +3 RAD" },
    cooked_scorp: { name: "Skorpion-Filet", type: "consumable", effect: "heal_rad", val: 40, rad: 5, cost: 50, desc: "Schmeckt nach Hühnchen. +40 HP, +5 RAD" },
    cooked_lurk: { name: "Mirelurk-Kuchen", type: "consumable", effect: "heal_rad", val: 35, rad: 4, cost: 45, desc: "Fast wie Krabbe. +35 HP, +4 RAD" },

    // --- WAFFEN ---
    // [v3.2] Added usesAmmo: true to ranged weapons
    fists: { name: "Fäuste", type: "weapon", slot: "weapon", baseDmg: 2, cost: 0, desc: "Deine bloßen Hände." },
    rusty_knife: { name: "Rostiges Messer", type: "weapon", slot: "weapon", baseDmg: 4, cost: 10, desc: "Alt, aber spitz." },
    rusty_pistol: { name: "Rostige Pistole", type: "weapon", slot: "weapon", baseDmg: 6, cost: 25, desc: "Klemmt manchmal.", usesAmmo: true },
    rusty_rifle: { name: "Rostiges Gewehr", type: "weapon", slot: "weapon", baseDmg: 8, cost: 40, desc: "Ungenau, aber laut.", usesAmmo: true },
    machete: { name: "Machete", type: "weapon", slot: "weapon", baseDmg: 12, cost: 80, desc: "Rostige Klinge." },

    knife: { name: "Kampfmesser", type: "weapon", slot: "weapon", baseDmg: 8, cost: 50, desc: "Militärstandard." },
    baseball_bat: { name: "Baseballschläger", type: "weapon", slot: "weapon", baseDmg: 10, cost: 60, desc: "Homerun!" },
    pistol_10mm: { name: "10mm Pistole", type: "weapon", slot: "weapon", baseDmg: 12, cost: 120, desc: "Verlässlich.", usesAmmo: true },
    hunting_rifle: { name: "Jagdgewehr", type: "weapon", slot: "weapon", baseDmg: 18, cost: 200, desc: "Hohe Reichweite.", usesAmmo: true },
    shotgun: { name: "Schrotflinte", type: "weapon", slot: "weapon", baseDmg: 25, cost: 350, desc: "Für den Nahkampf.", usesAmmo: true },
    laser_pistol: { name: "Laserpistole", type: "weapon", slot: "weapon", baseDmg: 22, cost: 400, desc: "Energiewaffe.", usesAmmo: true },
    plasma_rifle: { name: "Plasmagewehr", type: "weapon", slot: "weapon", baseDmg: 35, cost: 800, desc: "Schmilzt Gesichter.", usesAmmo: true },
    
    // --- RÜSTUNG (BODY) ---
    vault_suit: { name: "Vault-Anzug", type: "body", slot: "body", cost: 0, bonus: {END: 1}, desc: "Blau und eng." },
    leather_armor: { name: "Lederrüstung", type: "body", slot: "body", cost: 150, bonus: {END: 2, AGI: 1}, desc: "Leichter Schutz." },
    metal_armor: { name: "Metallrüstung", type: "body", slot: "body", cost: 300, bonus: {END: 4, AGI: -1}, desc: "Schwer, aber stabil." },
    combat_armor: { name: "Kampfrüstung", type: "body", slot: "body", cost: 600, bonus: {END: 5, STR: 1}, desc: "Taktischer Schutz." },
    power_armor: { name: "Power Rüstung", type: "body", slot: "body", cost: 2500, bonus: {END: 10, STR: 4, RAD: 100}, desc: "Die ultimative Verteidigung." },

    // --- NEW: HEAD (KOPF) ---
    cap_baseball: { name: "Baseballkappe", type: "head", slot: "head", cost: 20, bonus: {PER: 1}, desc: "Schützt vor Sonne." },
    helmet_mining: { name: "Minenhelm", type: "head", slot: "head", cost: 50, bonus: {END: 1}, desc: "Mit Lampe." },
    gas_mask: { name: "Gasmaske", type: "head", slot: "head", cost: 120, bonus: {RAD: 10}, desc: "Filtert die Luft." },
    helmet_metal: { name: "Metallhelm", type: "head", slot: "head", cost: 200, bonus: {END: 2}, desc: "Kopfschutz." },

    // --- NEW: LEGS (BEINE) ---
    jeans: { name: "Jeans", type: "legs", slot: "legs", cost: 30, bonus: {AGI: 1}, desc: "Bequemer Denim." },
    pants_leather: { name: "Lederhose", type: "legs", slot: "legs", cost: 100, bonus: {END: 1, AGI: 1}, desc: "Robust." },
    greaves_metal: { name: "Beinschienen", type: "legs", slot: "legs", cost: 250, bonus: {END: 3, AGI: -1}, desc: "Klappert beim Gehen." },

    // --- NEW: FEET (FÜSSE) ---
    boots_worn: { name: "Alte Stiefel", type: "feet", slot: "feet", cost: 20, bonus: {}, desc: "Besser als barfuß." },
    boots_combat: { name: "Kampfstiefel", type: "feet", slot: "feet", cost: 150, bonus: {AGI: 1, END: 1}, desc: "Fester Tritt." },

    // --- NEW: ARMS (ARME) ---
    bracers_leather: { name: "Lederarmschienen", type: "arms", slot: "arms", cost: 80, bonus: {STR: 1}, desc: "Für den Nahkampf." },

    // --- CONSUMABLES & JUNK ---
    stimpack: { name: "Stimpack", type: "consumable", effect: "heal", val: 40, cost: 50, desc: "Heilt 40 HP." },
    radaway: { name: "RadAway", type: "consumable", effect: "rad", val: -50, cost: 40, desc: "Entfernt Strahlung." },
    nuka_cola: { name: "Nuka Cola", type: "consumable", effect: "heal", val: 10, cost: 10, desc: "Warm und abgestanden." },

    junk_metal: { name: "Schrottmetall", type: "junk", cost: 2, desc: "Rostiges Metall." },
    screws: { name: "Schrauben", type: "component", cost: 5, desc: "Wichtig für Reparaturen." },
    duct_tape: { name: "Klebeband", type: "component", cost: 8, desc: "Hält die Welt zusammen." },
    gears: { name: "Zahnräder", type: "component", cost: 10, desc: "Mechanische Teile." },
    circuit: { name: "Schaltkreis", type: "component", cost: 25, desc: "Elektronik." },
    leather: { name: "Lederstücke", type: "component", cost: 5, desc: "Von Tieren." },
    gunpowder: { name: "Schwarzpulver", type: "component", cost: 10, desc: "Explosiv." },
    legendary_part: { name: "Legendäres Modul", type: "rare", cost: 500, desc: "Unbekannte Technologie." }
});

if(typeof Game !== 'undefined') Game.items = window.GameData.items;
