// [TIMESTAMP] 2026-01-20 22:00:00 - data_items.js - Added Rusty Weapons & Mods

if(typeof window.GameData === 'undefined') window.GameData = {};
if(typeof window.GameData.items === 'undefined') window.GameData.items = {}; 

Object.assign(window.GameData.items, {
    // --- BLUEPRINTS ---
    bp_ammo: { name: "Bauplan: Munition", type: "blueprint", recipeId: "craft_ammo", cost: 50, desc: "Lerne Munition herzustellen." },
    bp_stimpack: { name: "Bauplan: Stimpack", type: "blueprint", recipeId: "craft_stimpack", cost: 100, desc: "Medizinische Grundlagen." },
    
    // --- RUCKSÄCKE (MODULAR SYSTEM) ---
    backpack_frame: { name: "Rucksack-Gestell", type: "back", slot: "back", cost: 20, bonus: { slots: 2 }, desc: "Ein nackter Aluminiumrahmen. Besser als nichts. (+2 Slots)" },
    backpack_leather: { name: "Leder-Rucksack", type: "back", slot: "back", cost: 100, bonus: { slots: 6 }, desc: "Solide Taschen am Gestell. (+6 Slots)" },
    backpack_metal: { name: "Verstärkter Rucksack", type: "back", slot: "back", cost: 250, bonus: { slots: 10, AGI: -1 }, desc: "Mit Metallplatten verstärkt. Schwer. (+10 Slots, -1 AGI)" },
    backpack_military: { name: "Taktischer Rucksack", type: "back", slot: "back", cost: 600, bonus: { slots: 14, END: 1 }, desc: "Militärstandard. Ergonomisch & Robust. (+14 Slots, +1 END)" },
    backpack_cargo: { name: "Brahmin-Kiepe", type: "back", slot: "back", cost: 550, bonus: { slots: 22, AGI: -2 }, desc: "Ein gigantischer Aufbau. Du bist ein Packesel. (+22 Slots, -2 AGI)" },

    // --- CAMP & TOOLS ---
    camp_kit: { name: "Zelt-Bausatz", type: "tool", cost: 150, desc: "Errichtet ein Lager im Ödland.", weight: 5 },
    lockpick: { name: "Haarklammer", type: "tool", cost: 5, desc: "Zum Knacken von Schlössern." },
    cleaning_kit: { name: "Putzzeug", type: "tool", cost: 50, weight: 1, desc: "Zum Restaurieren alter Waffen." },

    // --- MONSTER DROPS & FOOD ---
    meat_roach: { name: "Kakerlakenfleisch", type: "component", cost: 5, desc: "Ekelhaft, aber essbar." },
    meat_fly: { name: "Fliegenfleisch", type: "component", cost: 5, desc: "Schleimig." },
    meat_mole: { name: "Rattenfleisch", type: "component", cost: 8, desc: "Zäh." },
    meat_dog: { name: "Hundefleisch", type: "component", cost: 10, desc: "Etwas zäh, aber nahrhaft." }, 
    meat_scorp: { name: "Skorpiondrüse", type: "component", cost: 20, desc: "Delikatesse." },
    meat_yao: { name: "Yao Guai Rippchen", type: "component", cost: 35, desc: "Sehr nahrhaft." },
    hide_yao: { name: "Yao Guai Leder", type: "component", cost: 40, desc: "Robustes Fell." },
    meat_lurk: { name: "Mirelurk-Fleisch", type: "component", cost: 15, desc: "Weiches Schalentier-Fleisch." },
    
    // Cooked
    cooked_roach: { name: "Gegrillte Kakerlake", type: "consumable", effect: "heal_rad", val: 15, rad: 2, cost: 10, desc: "+15 HP, +2 RAD" },
    cooked_mole: { name: "Ratten-Steak", type: "consumable", effect: "heal_rad", val: 25, rad: 3, cost: 20, desc: "+25 HP, +3 RAD" },
    cooked_fly: { name: "Gegrillte Fliege", type: "consumable", effect: "heal_rad", val: 15, rad: 2, cost: 10, desc: "+15 HP, +2 RAD" },
    cooked_scorp: { name: "Skorpion-Überraschung", type: "consumable", effect: "heal_rad", val: 45, rad: 5, cost: 40, desc: "+45 HP, +5 RAD" },
    cooked_lurk: { name: "Mirelurk-Happen", type: "consumable", effect: "heal_rad", val: 35, rad: 4, cost: 30, desc: "+35 HP, +4 RAD" },

    stealth_boy: { name: "Stealth Boy", type: "consumable", effect: "buff", bonus: { AGI: 10 }, duration: 60, cost: 200, desc: "Macht kurzzeitig unsichtbar." },

    // --- CONSUMABLES (CHEMIS & MEDS) ---
    stimpack: { name: "Stimpack", type: "consumable", effect: "heal", val: 40, cost: 50, desc: "Sofortige Heilung (+40 HP)." },
    super_stimpack: { name: "Super-Stimpack", type: "consumable", effect: "heal", val: 100, cost: 120, desc: "Starke Heilung (+100 HP)." },
    radaway: { name: "RadAway", type: "consumable", effect: "rad", val: -50, cost: 40, desc: "Entfernt Strahlung." },
    radx: { name: "Rad-X", type: "consumable", effect: "buff", bonus: { RAD_RESIST: 20 }, cost: 40, desc: "Erhöht Strahlungsresistenz." },
    nuka_cola: { name: "Nuka Cola", type: "consumable", effect: "heal", val: 10, cost: 10, desc: "Koffeinhaltig. +10 HP, +5 RAD" },
    nuka_quantum: { name: "Nuka Quantum", type: "consumable", effect: "heal", val: 100, cost: 100, desc: "Leuchtet blau. +100 HP, +20 RAD, +AP" },
    jet: { name: "Jet", type: "consumable", effect: "buff", bonus: { AP: 20 }, cost: 30, desc: "Zeitlupeneffekt. (Macht süchtig)" },
    buffout: { name: "Buffout", type: "consumable", effect: "buff", bonus: { STR: 2, END: 2 }, cost: 40, desc: "Mehr Muckis." },

    // --- CRAFTING MATS ---
    weapon_oil: { name: "Waffenöl", type: "junk", cost: 15, weight: 0.5, desc: "Wichtig für die Waffenpflege." },
    junk_metal: { name: "Schrottmetall", type: "junk", cost: 2, desc: "Rostiges Metall." },
    screws: { name: "Schrauben", type: "component", cost: 5, desc: "Wichtig für Waffenmods." },
    duct_tape: { name: "Klebeband", type: "component", cost: 8, desc: "Hält die Welt zusammen." },
    gears: { name: "Zahnräder", type: "component", cost: 10, desc: "Mechanische Teile." },
    circuit: { name: "Schaltkreis", type: "component", cost: 25, desc: "Elektronik." },
    cloth: { name: "Stoff", type: "component", cost: 2, desc: "Textilien." },
    leather: { name: "Leder", type: "component", cost: 5, desc: "Gegerbte Haut." },
    adhesive: { name: "Kleber", type: "component", cost: 15, desc: "Wunderkleber." },
    oil: { name: "Öl", type: "component", cost: 8, desc: "Schmiermittel." },
    springs: { name: "Federn", type: "component", cost: 10, desc: "Spannung!" },
    plastic: { name: "Plastik", type: "component", cost: 1, weight: 0.05, stackable: true },
    nuclear_mat: { name: "Nukleares Material", type: "rare", cost: 50, desc: "Strahlend." },
    legendary_part: { name: "Legendäres Modul", type: "rare", cost: 500, desc: "Unbekannte Technologie." },

    // ===================================
    // === ROSTIGE WAFFEN (SHOP ONLY) ===
    // ===================================
    rusty_pistol: { name: "Rostige 10mm Pistole", type: "weapon", slot: "weapon", baseDmg: 4, cost: 40, weight: 4, ammo: "10mm", ammoCost: 1, desc: "Alt und unzuverlässig. Kann beim Schmied restauriert werden." },
    rusty_rifle: { name: "Rostiges Jagdgewehr", type: "weapon", slot: "weapon", baseDmg: 8, cost: 70, weight: 8, ammo: "308", ammoCost: 1, desc: "Der Lauf ist völlig verdreckt. Restaurierung nötig." },
    rusty_shotgun: { name: "Rostige Flinte", type: "weapon", slot: "weapon", baseDmg: 20, cost: 80, weight: 6, ammo: "shell", ammoCost: 1, desc: "Rost blockiert den Mechanismus. Restaurierung nötig." },

    // ========================
    // === NAHKAMPF (Melee) ===
    // ========================
    fists: { name: "Fäuste", type: "weapon", slot: "weapon", baseDmg: 2, cost: 0, desc: "Immer dabei.", usesAmmo: false },
    knuckles: { name: "Schlagring", type: "weapon", slot: "weapon", baseDmg: 4, cost: 25, desc: "Eisen für die Fäuste.", usesAmmo: false },
    switchblade: { name: "Springmesser", type: "weapon", slot: "weapon", baseDmg: 5, cost: 15, desc: "Schnell.", usesAmmo: false },
    machete: { 
        name: "Machete", type: "weapon", slot: "weapon", baseDmg: 12, cost: 80, weight: 2, desc: "Hackt gut.", usesAmmo: false,
        modSlots: ["blade"]
    },
    super_sledge: { 
        name: "Superhammer", type: "weapon", slot: "weapon", baseDmg: 45, cost: 700, weight: 18, desc: "Raketengetrieben.", usesAmmo: false,
        modSlots: ["head"]
    },
    baseball_bat: { name: "Baseballschläger", type: "weapon", slot: "weapon", baseDmg: 10, cost: 60, desc: "Aus Holz.", usesAmmo: false },
    sledgehammer: { name: "Vorschlaghammer", type: "weapon", slot: "weapon", baseDmg: 25, cost: 180, desc: "Sehr langsam, sehr schwer.", usesAmmo: false },

    // ==============================
    // === FERNKAMPF (Guns) ===
    // ==============================
    ammo: { name: "Munition", type: "ammo", cost: 2, desc: "Patronen.", weight: 0.05 },

    pistol_10mm: { 
        name: "10mm Pistole", type: "weapon", slot: "weapon", baseDmg: 12, cost: 120, weight: 3.5, desc: "Verlässlich.", usesAmmo: true,
        modSlots: ["receiver", "grip"] 
    },
    hunting_rifle: { 
        name: "Jagdgewehr", type: "weapon", slot: "weapon", baseDmg: 20, cost: 200, weight: 7, desc: "Präzise.", usesAmmo: true,
        modSlots: ["receiver", "barrel", "stock"]
    },
    combat_shotgun: { 
        name: "Kampfflinte", type: "weapon", slot: "weapon", baseDmg: 38, cost: 600, weight: 5.5, desc: "Magazin-geladen.", usesAmmo: true,
        modSlots: ["receiver", "barrel"]
    },
    
    pipe_pistol: { name: "Rohrpistole", type: "weapon", slot: "weapon", baseDmg: 5, cost: 15, desc: "Selbstgebaut.", usesAmmo: true },
    shotgun: { name: "Doppelflinte", type: "weapon", slot: "weapon", baseDmg: 30, cost: 350, desc: "Zwei Läufe.", usesAmmo: true },
    minigun: { name: "Minigun", type: "weapon", slot: "weapon", baseDmg: 15, cost: 1500, desc: "Extremes Schnellfeuer.", usesAmmo: true },
    laser_pistol: { name: "Laserpistole", type: "weapon", slot: "weapon", baseDmg: 22, cost: 400, desc: "Vorsicht, heiß.", usesAmmo: true },
    alien_blaster: { name: "Alien Blaster", type: "weapon", slot: "weapon", baseDmg: 80, cost: 3000, desc: "Extraterrestrisch.", usesAmmo: false },

    // ====================
    // === WAFFEN MODS ===
    // ====================
    "mod_10mm_rec_hard": {
        name: "Gehärteter Verschluss (10mm)", type: "mod", cost: 80, weight: 0.5,
        target: "pistol_10mm", slot: "receiver", 
        stats: { dmg: 3, val: 20 }, 
        desc: "Erhöht den Schaden."
    },
    "mod_10mm_grip_comf": {
        name: "Komfort-Griff (10mm)", type: "mod", cost: 50, weight: 0.2,
        target: "pistol_10mm", slot: "grip",
        stats: { val: 10 }, 
        desc: "Liegt besser in der Hand."
    },
    "mod_rifle_bar_long": {
        name: "Langer Lauf (Jagdgewehr)", type: "mod", cost: 120, weight: 1.5,
        target: "hunting_rifle", slot: "barrel",
        stats: { dmg: 5, val: 40 },
        desc: "Deutlich mehr Durchschlagskraft."
    },
    "mod_shotgun_rec_auto": {
        name: "Automatik-Verschluss (Flinte)", type: "mod", cost: 200, weight: 1.0,
        target: "combat_shotgun", slot: "receiver",
        stats: { dmg: -5, ammoCost: 1, val: 50 }, 
        desc: "Erhöht Feuerrate, senkt Einzelschaden."
    },
    "mod_machete_blade_serrated": {
        name: "Gezahnte Klinge", type: "mod", cost: 60, weight: 0.2,
        target: "machete", slot: "blade",
        stats: { dmg: 4, val: 15 },
        desc: "Reißt Wunden."
    },

    // ======================================
    // === RÜSTUNGEN (Nach Sets sortiert) ===
    // ======================================
    raider_armor: { name: "Raider-Rüstung", type: "body", slot: "body", cost: 80, bonus: {END: 1, STR: 1}, desc: "Stachelig." },
    raider_helm: { name: "Sackgassen-Helm", type: "head", slot: "head", cost: 40, bonus: {PER: -1, END: 1}, desc: "Furchteinflößend." },
    raider_arm_l: { name: "Raider-Armschiene (L)", type: "arms", slot: "arms", cost: 30, bonus: {STR: 1}, desc: "Aus Reifen." },
    raider_leg_r: { name: "Raider-Beinschutz", type: "legs", slot: "legs", cost: 35, bonus: {END: 1}, desc: "Rostiges Blech." },

    leather_armor: { name: "Lederrüstung", type: "body", slot: "body", cost: 150, bonus: {END: 2, AGI: 2}, desc: "Leicht und leise." },
    leather_helm: { name: "Lederkappe", type: "head", slot: "head", cost: 60, bonus: {PER: 1}, desc: "Fliegerbrille inklusive." },
    bracers_leather: { name: "Lederarmschienen", type: "arms", slot: "arms", cost: 80, bonus: {STR: 1}, desc: "Klassisch." },
    pants_leather: { name: "Lederhose", type: "legs", slot: "legs", cost: 100, bonus: {AGI: 1}, desc: "Eng anliegend." },
    boots_leather: { name: "Lederstiefel", type: "feet", slot: "feet", cost: 70, bonus: {AGI: 1}, desc: "Guter Halt." },

    metal_armor: { name: "Metallrüstung", type: "body", slot: "body", cost: 300, bonus: {END: 5, AGI: -2}, desc: "Hält Kugeln ab." },
    helmet_metal: { name: "Metallhelm", type: "head", slot: "head", cost: 150, bonus: {END: 2, PER: -1}, desc: "Eingeschränkte Sicht." },
    metal_arms: { name: "Metallarme", type: "arms", slot: "arms", cost: 120, bonus: {STR: 1, END: 1}, desc: "Schwer." },
    greaves_metal: { name: "Metallbeinschienen", type: "legs", slot: "legs", cost: 140, bonus: {END: 2, AGI: -1}, desc: "Klappert laut." },

    combat_armor: { name: "Kampfrüstung", type: "body", slot: "body", cost: 600, bonus: {END: 6, STR: 1}, desc: "Polymer-Verbund." },
    helmet_combat: { name: "Kampfhelm", type: "head", slot: "head", cost: 300, bonus: {END: 2, PER: 1}, desc: "Taktisch." },
    combat_arms: { name: "Kampfarmschienen", type: "arms", slot: "arms", cost: 250, bonus: {STR: 2}, desc: "Verstärkt." },
    combat_legs: { name: "Kampfbeinschützer", type: "legs", slot: "legs", cost: 280, bonus: {END: 2, AGI: 1}, desc: "Beweglich." },
    boots_combat: { name: "Kampfstiefel", type: "feet", slot: "feet", cost: 150, bonus: {AGI: 1, END: 1}, desc: "Militärstandard." },

    synth_armor: { name: "Synth-Rüstung", type: "body", slot: "body", cost: 800, bonus: {END: 5, INT: 2}, desc: "Institut-Technologie." },
    synth_helmet: { name: "Synth-Feldhelm", type: "head", slot: "head", cost: 400, bonus: {PER: 2, INT: 1}, desc: "Volle Abdeckung." },

    power_armor: { name: "Power Rüstung T-45", type: "body", slot: "body", cost: 2500, bonus: {END: 12, STR: 4, RAD: 100, AGI: -3}, desc: "Ein Panzer zum Anziehen." },
    hazmat_suit: { name: "Strahlenschutzanzug", type: "body", slot: "body", cost: 400, bonus: {RAD: 1000, END: -2}, desc: "Perfekt für das Leuchtende Meer." },
    
    cap_baseball: { name: "Baseballkappe", type: "head", slot: "head", cost: 20, bonus: {PER: 1}, desc: "Schützt vor Sonne." },
    helmet_mining: { name: "Minenhelm", type: "head", slot: "head", cost: 50, bonus: {END: 1}, desc: "Mit Lampe." },
    gas_mask: { name: "Gasmaske", type: "head", slot: "head", cost: 120, bonus: {RAD: 20}, desc: "Filtert die Luft." },
    
    jeans: { name: "Jeans", type: "legs", slot: "legs", cost: 30, bonus: {AGI: 1}, desc: "Bequemer Denim." },
    boots_worn: { name: "Alte Stiefel", type: "feet", slot: "feet", cost: 20, bonus: {}, desc: "Besser als barfuß." }
});

if(typeof Game !== 'undefined') Game.items = window.GameData.items;
