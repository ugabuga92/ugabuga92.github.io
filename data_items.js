// [v0.5.0]
if(typeof window.GameData === 'undefined') window.GameData = {};

window.GameData.items = {
    // --- WAFFEN (ROSTIG / START) ---
    fists: { name: "Fäuste", type: "weapon", slot: "weapon", baseDmg: 2, cost: 0, desc: "Deine bloßen Hände." },
    rusty_knife: { name: "Rostiges Messer", type: "weapon", slot: "weapon", baseDmg: 4, cost: 10, desc: "Alt, aber spitz." },
    rusty_pistol: { name: "Rostige Pistole", type: "weapon", slot: "weapon", baseDmg: 6, cost: 25, desc: "Klemmt manchmal." },
    rusty_rifle: { name: "Rostiges Gewehr", type: "weapon", slot: "weapon", baseDmg: 8, cost: 40, desc: "Ungenau, aber laut." },

    // --- WAFFEN (STANDARD) ---
    knife: { name: "Kampfmesser", type: "weapon", slot: "weapon", baseDmg: 8, cost: 50, desc: "Militärstandard." },
    baseball_bat: { name: "Baseballschläger", type: "weapon", slot: "weapon", baseDmg: 10, cost: 60, desc: "Homerun!" },
    pistol_10mm: { name: "10mm Pistole", type: "weapon", slot: "weapon", baseDmg: 12, cost: 120, desc: "Verlässlich." },
    hunting_rifle: { name: "Jagdgewehr", type: "weapon", slot: "weapon", baseDmg: 18, cost: 200, desc: "Hohe Reichweite." },
    shotgun: { name: "Schrotflinte", type: "weapon", slot: "weapon", baseDmg: 25, cost: 350, desc: "Für den Nahkampf." },
    laser_pistol: { name: "Laserpistole", type: "weapon", slot: "weapon", baseDmg: 22, cost: 400, desc: "Energiewaffe." },
    plasma_rifle: { name: "Plasmagewehr", type: "weapon", slot: "weapon", baseDmg: 35, cost: 800, desc: "Schmilzt Gesichter." },
    
    // --- RÜSTUNG ---
    vault_suit: { name: "Vault-Anzug", type: "body", slot: "body", cost: 0, bonus: {END: 1}, desc: "Blau und eng." },
    leather_armor: { name: "Lederrüstung", type: "body", slot: "body", cost: 150, bonus: {END: 2, AGI: 1}, desc: "Leichter Schutz." },
    metal_armor: { name: "Metallrüstung", type: "body", slot: "body", cost: 300, bonus: {END: 4, AGI: -1}, desc: "Schwer, aber stabil." },
    combat_armor: { name: "Kampfrüstung", type: "body", slot: "body", cost: 600, bonus: {END: 5, STR: 1}, desc: "Taktischer Schutz." },
    power_armor: { name: "Power Rüstung", type: "body", slot: "body", cost: 2500, bonus: {END: 10, STR: 4, RAD: 100}, desc: "Die ultimative Verteidigung." },

    // --- CONSUMABLES ---
    stimpack: { name: "Stimpack", type: "consumable", effect: "heal", val: 40, cost: 50, desc: "Heilt 40 HP." },
    radaway: { name: "RadAway", type: "consumable", effect: "rad", val: -50, cost: 40, desc: "Entfernt Strahlung." },
    nuka_cola: { name: "Nuka Cola", type: "consumable", effect: "heal", val: 10, cost: 10, desc: "Warm und abgestanden." },

    // --- JUNK / CRAFTING ---
    junk_metal: { name: "Schrottmetall", type: "junk", cost: 2, desc: "Rostiges Metall." },
    screws: { name: "Schrauben", type: "component", cost: 5, desc: "Wichtig für Reparaturen." },
    duct_tape: { name: "Klebeband", type: "component", cost: 8, desc: "Hält die Welt zusammen." },
    gears: { name: "Zahnräder", type: "component", cost: 10, desc: "Mechanische Teile." },
    circuit: { name: "Schaltkreis", type: "component", cost: 25, desc: "Elektronik." },
    legendary_part: { name: "Legendäres Modul", type: "rare", cost: 500, desc: "Unbekannte Technologie." }
};

// Falls data_items.js alleine geladen wird, binden wir es an Game
if(typeof Game !== 'undefined') Game.items = window.GameData.items;
