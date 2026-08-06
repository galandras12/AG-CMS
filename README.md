# AG-CMS

**AndrasGal-CMS** - egyedi fejlesztésű, saját Node.js CMS rendszer. Nincs
PHP, nincs SQL adatbázis: a tartalom és a felhasználói adatok AES-256-GCM-mel
titkosított JSON fájlokban élnek a lemezen. A publikus oldal statikusan
generált HTML - bármilyen webszerver kiszolgálhatja, akkor is, ha a Node
backend éppen nem fut. Az admin felület és API viszont csak akkor
érhető el, ha a Node szerver aktív.

**Jelenlegi verzió: 0.1.0 (Alma)**

## Architektúra dióhéjban

- **Node.js + Express** backend (`backend/`) - authentikáció, admin API,
  fájl-alapú titkosított tárolás, statikus generátor.
- **Admin frontend** (`frontend/admin/`) - statikus HTML/CSS/vanilla JS,
  ami a `config/connection.json`-ból olvassa ki a backend URL-jét induláskor,
  nincs hardcode-olt cím.
- **Publikus oldal** (`public/`) - a build script által generált statikus
  HTML, önmagában is kiszolgálható nginx/Apache alól.
- **Témák** (`themes/`) - előre elkészített frontend sablonok, amikből a
  generátor dolgozik, admin felületen válthatók.
- **Tartalom** (`content/`) - titkosított adatfájlok (`content/data/*.enc`)
  és feltöltött médiafájlok (`content/media/`).
- **Nyelvek** (`langs/`) - admin UI fordítások, alapból `en` és `hu`,
  bővíthető bárki által.
- **Pluginok** (`plugins/`) - esemény-alapú hook rendszerre épülő
  bővítmények, lásd `plugins/README.md`.

## Projektstruktúra

```
AG-CMS/
├── backend/            # Express szerver, API, core logika
│   ├── config/         # env + connection.json + version.json betoltese
│   ├── core/            # crypto, encrypted store, hook rendszer, plugin loader, logger
│   ├── middleware/      # auth, rate limit, szerepkor-ellenorzes (2. fazis)
│   ├── models/          # adatelerest wrapperek (3. fazis)
│   ├── routes/          # API vegpontok
│   ├── services/        # statikus generator (4. fazis)
│   ├── tests/           # node:test tesztek
│   ├── app.js
│   └── server.js
├── frontend/admin/      # admin UI statikus fajljai (2-3. fazis)
├── public/              # generalt statikus oldal kimenete
├── themes/              # frontend sablonok (4. fazis)
├── content/
│   ├── data/            # titkositott .enc adatfajlok (nincs verziokezelve)
│   └── media/           # feltoltott mediafajlok (nincs verziokezelve)
├── langs/               # en.json, hu.json + README a bovitesrol
├── plugins/             # hook-alapu bovitmenyek + README a plugin API-rol
├── config/
│   ├── connection.json  # a backend URL-je, ezt olvassa a frontend
│   └── version.json     # verzio szam + nev
└── .env.example
```

## Telepítés és indítás

```bash
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # -> ENCRYPTION_KEY
```

Illeszd be a generált kulcsot a `.env` fájl `ENCRYPTION_KEY` sorába, majd:

```bash
npm start          # production-szeru inditas
npm run dev        # automatikus ujrainditas fajlvaltozasra (node --watch)
npm test           # backend/tests futtatasa (node:test)
```

Indítás után: `GET http://localhost:4000/api/health` egy státusz JSON-t ad
vissza (verzió, futásidő, stb.) - ez igazolja, hogy a backend fut és a
konfiguráció betöltődött.

## Fejlesztési fázisok

A projekt lépésről lépésre épül fel:

1. ✅ **Alapváz + titkosított tárolás** - Express skeleton, AES-256-GCM
   encrypted JSON store engine, hook/plugin rendszer, config loader,
   `langs/` scaffold, automatizált tesztek.
2. ⏳ **Authentikáció** - bcrypt jelszavak, JWT + HttpOnly cookie, admin/
   szerkesztő szerepkörök, brute force védelem (rate limiting), admin
   login UI.
3. ⏳ **Admin CRUD** - bejegyzések (draft/ütemezett/publikált), média,
   felhasználók, Személyre szabás (site név/leírás/favicon/logó/banner,
   widgetek, sitemap/robots.txt), testreszabható (drag-and-drop) dashboard.
4. ⏳ **Statikus generálás + témaváltás** - 3 beépített téma, build script,
   automatikus generálás mentéskor + "Build most" gomb.

## Changelog

### 0.1.0 (Alma) - 2026-08-06

Első fázis: projekt alapváz.

- Express szerver alapváz (`backend/app.js`, `backend/server.js`) helmet,
  cors és cookie-parser middleware-ekkel, `/api/health` végponttal.
- Fájl-alapú, **AES-256-GCM** titkosítású JSON adattároló motor
  (`backend/core/store.js`, `backend/core/crypto.js`) - minden kollekció
  külön `.enc` fájlban, sorosított (nem ütköző) írásokkal, hiányzó fájl
  esetén automatikus alapérték-létrehozással.
- Esemény-alapú **hook/plugin rendszer** (`backend/core/hooks.js`,
  `backend/core/pluginLoader.js`) - a `plugins/` mappában elhelyezett
  bővítmények beavatkozhatnak a CMS életciklusába. Tartalmaz egy működő
  minta pluginot (`plugins/sample-hello-logger`).
- Konfiguráció-betöltő (`backend/config/index.js`) - `.env`,
  `config/connection.json` és `config/version.json` beolvasása, kötelező
  `ENCRYPTION_KEY` ellenőrzéssel induláskor.
- Nyelvi fájl-scaffold (`langs/en.json`, `langs/hu.json`) bővíthető
  struktúrában, dokumentált bővítési folyamattal (`langs/README.md`).
- Automatizált tesztek (`backend/tests/`) a titkosított tárolóra
  (round-trip, plaintext-mentesség, konkurens írások) és a hook
  rendszerre.
- Teljes tervezett projektstruktúra létrehozva (`frontend/admin/`,
  `public/`, `themes/`, `content/media/`) a következő fázisokhoz.
