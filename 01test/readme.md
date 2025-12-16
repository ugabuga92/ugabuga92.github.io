# ☢️ PIP-BOY 3000 Mk-V Web-RPG

**Version:** 0.0.12a (Beta)  
**Status:** Online Multiplayer Survival

Ein atmosphärisches, browserbasiertes Retro-RPG im Fallout-Stil. Überlebe im Ödland, sammle Ausrüstung, kämpfe gegen Mutanten und triff andere Spieler in Echtzeit – alles verpackt in einem nostalgischen grünen Terminal-Interface mit CRT-Simulation.

---

## ⭐ Key Features

### 💀 Hardcore Survival (Permadeath)
* **High Stakes:** Das Leben im Ödland ist hart. Wenn deine HP auf 0 fallen, ist dein Charakter **unwiderruflich tot**.
* **Datenbank-Löschung:** Dein Spielstand wird beim Tod sofort vom Server gelöscht. Ein neuer Login erfordert einen neuen Charakter.
* **AFK-Schutz:** Wer länger als 5 Minuten inaktiv ist, wird automatisch ausgeloggt (und gespeichert), um den Hungertod vor dem Bildschirm zu vermeiden.

### 🎒 Inventar & Wirtschaft
* **Rucksack-System:** Gegenstände landen nun in deinem Inventar. Du musst taktisch entscheiden, wann du Stimpacks benutzt oder welche Waffe du ausrüstest.
* **Loot & Handel:** Finde Schrott, Munition und legendäre Ausrüstung.
* **Städte & Händler:** Besuche Orte wie "Rusty Springs", um deine Kronkorken (Caps) gegen bessere Ausrüstung oder Heilung einzutauschen.

### 📡 Echtzeit-Multiplayer
* **Shared World:** Du bist nicht allein. Sieh die Position anderer Spieler in Echtzeit auf deiner Karte (blauer Punkt).
* **Global Scan:** Ein Klick auf die Online-Anzeige öffnet eine Liste aller aktiven Signale im Netzwerk.
* **Cloud Save:** Dein Fortschritt (Position, Stats, Inventar) wird via Firebase in der Cloud gespeichert und ist geräteübergreifend abrufbar (via Survivor-ID).

### 🖥️ UI & Retro-Design
* **Authentischer Look:** Scanlines, Phosphor-Nachleuchten, Wölbungseffekte und die klassische VT323-Schriftart.
* **Responsive:** Funktioniert auf Desktop und Mobile.
    * **Desktop:** Tastatursteuerung (WASD/Pfeile).
    * **Mobile:** Touch-optimiertes D-Pad und smartes Hamburger-Menü.
* **Notification System:** Das Menü blinkt rot, wenn Skill-Punkte verfügbar sind oder neue Quests warten.

### 🌍 Prozedurale Welt
* **Unendliche Erkundung:** Die Welt ist in 8x8 Sektoren unterteilt. Jeder Sektor wird beim Betreten prozedural generiert.
* **Biome:**
    * ☠️ **Ödland:** Standard-Zone, moderates Risiko.
    * 🌵 **Wüste:** Hohe Sichtweite, gefährliche Skorpione.
    * 🌿 **Dschungel:** Überwucherte Ruinen, unübersichtlich.
    * 🏙️ **Ruinenstadt:** Hoher Loot, tödliche Gegner.
* **Smarter Spawn:** Das System verhindert, dass du in Wänden oder Hindernissen spawnst.

---

## 🎮 Steuerung

| Aktion | Desktop (Tastatur) | Mobile (Touch) |
| :--- | :--- | :--- |
| **Bewegen** | W, A, S, D / Pfeiltasten | D-Pad Overlay |
| **Interaktion** | Automatisch bei Kontakt | Automatisch bei Kontakt |
| **Menü** | Maus-Klick auf Header | Hamburger-Button (☰) |
| **Kampf** | Buttons im UI | Buttons im UI |

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Tailwind CSS (Styling), Vanilla JS (Logik).
* **Rendering:** HTML5 Canvas API (Pixel-Perfect Map Rendering).
* **Backend:** Google Firebase Realtime Database (Sync & Savegames).
* **Assets:** Rein prozedurale Grafiken (SVG & Canvas paths), keine externen Bilddateien.

---

> *"War... war never changes. But the browser does."*
