# Mecha Alpaca: Last Pasture — Prototype

Dieses Repo enthält:
- **frontend/**: Statisches Browser-Prototype, lauffähig via GitHub Pages oder lokal per Doppelklick.
- **backend/**: Optionaler API-Server (Express + Prisma). Für GitHub Pages nicht erforderlich.

## Schnellstart Frontend (ohne Backend)
1. Öffne `frontend/index.html` direkt im Browser oder hoste den Ordner auf GitHub Pages.
2. Demo-Modus ist aktiv. Inventar, Crafting und Szene laufen lokal (LocalStorage).

## Backend lokal (optional)
1. `cd backend`
2. Node.js 20 installieren.
3. `cp .env.example .env` und `DATABASE_URL=file:./dev.db` setzen.
4. `npm i`
5. `npx prisma generate && npx prisma db push`
6. `node src/index.js` (oder `npm run dev` nach Installation der Dev-Tools)

Hinweis: Für produktives Hosting des Backends ist ein echter Server oder Render/Fly/Hetzner nötig.
