# AG-CMS

**AndrasGal-CMS** - egyedi fejlesztésű, saját Node.js CMS rendszer. Nincs
PHP, nincs SQL adatbázis: a tartalom és a felhasználói adatok AES-256-GCM-mel
titkosított JSON fájlokban élnek a lemezen. A publikus oldal statikusan
generált HTML - bármilyen webszerver kiszolgálhatja, akkor is, ha a Node
backend éppen nem fut. Az admin felület és API viszont csak akkor
érhető el, ha a Node szerver aktív.

**Jelenlegi verzió: 0.1.0 (Alma)**

## Architektúra dióhéjban

- **Node.js + Express** szerver (`server/`) - authentikáció, admin API,
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
├── server/             # Express szerver, API, core logika
│   ├── config/         # env + connection.json + version.json betoltese
│   ├── core/            # crypto, encrypted store, hook rendszer, plugin loader, jwt, logger
│   ├── middleware/      # auth (JWT+cookie), rate limit, szerepkor-ellenorzes
│   ├── models/          # users.model.js (tovabbi modellek: 3. fazis)
│   ├── routes/          # API vegpontok (health, auth, users, ...)
│   ├── services/        # statikus generator (4. fazis)
│   ├── tests/           # node:test tesztek
│   ├── app.js
│   └── server.js
├── frontend/admin/      # admin login + minimal dashboard (teljes UI: 3. fazis)
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
├── start.bat            # gyors inditas Windows alatt (lasd lentebb)
└── .env.example
```

## Telepítés és indítás

### Windows - gyors indítás (`start.bat`)

Kattints duplán a repó gyökerében lévő **`start.bat`** fájlra (vagy futtasd
parancssorból: `start.bat`). Ez automatikusan:

1. ellenőrzi, hogy a Node.js telepítve van-e,
2. ha nincs `.env` fájl, létrehozza a `.env.example` alapján, és leállítva
   megkér, hogy töltsd ki az `ENCRYPTION_KEY` értékét (a kulcsot maga
   generálja neked, csak be kell másolni),
3. ha az `ENCRYPTION_KEY` még üres a `.env`-ben, figyelmeztet és nem indul
   el, amíg nincs kitöltve,
4. ha hiányzik a `node_modules`, lefuttatja az `npm install`-t,
5. elindítja a szervert (`npm start`).

Konfiguráció módosításához (port, CORS, kulcsok) egyszerűen szerkeszd a
`.env` fájlt, majd indítsd újra a `start.bat`-ot. A backend elérési útját
(ha nem `localhost:4000`-en fut) a `config/connection.json`
`backendUrl` mezőjében állítsd be - ezt olvassa majd be az admin frontend.

### Manuális indítás (macOS/Linux/Windows)

```bash
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # -> ENCRYPTION_KEY
```

Illeszd be a generált kulcsot a `.env` fájl `ENCRYPTION_KEY` sorába, majd:

```bash
npm start          # production-szeru inditas
npm run dev        # automatikus ujrainditas fajlvaltozasra (node --watch)
npm test           # server/tests futtatasa (node:test)
```

Indítás után: `GET http://localhost:4000/api/health` egy státusz JSON-t ad
vissza (verzió, futásidő, stb.) - ez igazolja, hogy a szerver fut és a
konfiguráció betöltődött.

## Fejlesztési fázisok

A projekt lépésről lépésre épül fel:

1. ✅ **Alapváz + titkosított tárolás** - Express skeleton, AES-256-GCM
   encrypted JSON store engine, hook/plugin rendszer, config loader,
   `langs/` scaffold, automatizált tesztek.
2. ✅ **Authentikáció** - bcrypt (bcryptjs) jelszavak, JWT + HttpOnly
   cookie, admin/szerkesztő szerepkörök, brute force védelem (rate
   limiting), admin login UI + minimál irányítópult.
3. ⏳ **Admin CRUD** - bejegyzések (draft/ütemezett/publikált), média,
   felhasználók, Személyre szabás (site név/leírás/favicon/logó/banner,
   widgetek, sitemap/robots.txt), testreszabható (drag-and-drop) dashboard.
4. ⏳ **Statikus generálás + témaváltás** - 3 beépített téma, build script,
   automatikus generálás mentéskor + "Build most" gomb.

## Changelog

### 0.1.0 (Alma) - 2026-08-06

Első fázis: projekt alapváz.

- Express szerver alapváz (`server/app.js`, `server/server.js`) helmet,
  cors és cookie-parser middleware-ekkel, `/api/health` végponttal.
- Fájl-alapú, **AES-256-GCM** titkosítású JSON adattároló motor
  (`server/core/store.js`, `server/core/crypto.js`) - minden kollekció
  külön `.enc` fájlban, sorosított (nem ütköző) írásokkal, hiányzó fájl
  esetén automatikus alapérték-létrehozással.
- Esemény-alapú **hook/plugin rendszer** (`server/core/hooks.js`,
  `server/core/pluginLoader.js`) - a `plugins/` mappában elhelyezett
  bővítmények beavatkozhatnak a CMS életciklusába. Tartalmaz egy működő
  minta pluginot (`plugins/sample-hello-logger`).
- Konfiguráció-betöltő (`server/config/index.js`) - `.env`,
  `config/connection.json` és `config/version.json` beolvasása, kötelező
  `ENCRYPTION_KEY` ellenőrzéssel induláskor.
- Nyelvi fájl-scaffold (`langs/en.json`, `langs/hu.json`) bővíthető
  struktúrában, dokumentált bővítési folyamattal (`langs/README.md`).
- Automatizált tesztek (`server/tests/`) a titkosított tárolóra
  (round-trip, plaintext-mentesség, konkurens írások) és a hook
  rendszerre.
- Teljes tervezett projektstruktúra létrehozva (`frontend/admin/`,
  `public/`, `themes/`, `content/media/`) a következő fázisokhoz.
- A szerver kódja külön `server/` mappába rendezve (korábban `backend/`),
  és hozzá egy `start.bat` Windows indítószkript, ami ellenőrzi a Node.js
  meglétét, előkészíti a `.env`-et, telepíti a függőségeket, és elindítja
  a szervert.
- **Authentikáció**: felhasználók titkosított tárolása (`server/models/users.model.js`),
  jelszavak **bcrypt** hash-eléssel (`bcryptjs`, cost 12) - soha plain
  textben. A felhasználónév-egyediség ellenőrzése atomi a titkosított
  tárolóval (két egyidejű regisztráció nem hozhat létre azonos nevű fiókot).
- **JWT + HttpOnly, aláírt cookie** alapú session (`server/core/jwt.js`,
  `server/middleware/auth.middleware.js`) - `POST /api/auth/login`,
  `POST /api/auth/logout`, `GET /api/auth/me`.
- **Admin / szerkesztő szerepkörök** (`requireRole()` middleware) - a
  felhasználókezelő API (`GET/POST/PATCH/DELETE /api/users`) csak admin
  számára elérhető, véd az utolsó admin fiók törlése/leléptetése ellen.
- **Brute force védelem**: `express-rate-limit` a bejelentkezésen (10
  próbálkozás / 15 perc / IP).
- **Első admin fiók automatikus létrehozása** induláskor
  (`server/core/bootstrapAdmin.js`), ha még nincs felhasználó - `ADMIN_USERNAME`/
  `ADMIN_PASSWORD` env változóból, vagy véletlen generált jelszóval (egyszer
  kiírva a szerver indítási logjába).
- **Admin frontend alapja** (`frontend/admin/`) - statikus HTML/CSS/vanilla
  JS, ami induláskor beolvassa a `config/connection.json`-t (nincs
  hardcode-olt backend URL), health-checkkel jelzi ha nincs kapcsolat,
  bejelentkezés utáni minimál nézettel (a teljes irányítópult a 3.
  fázisban készül). Sötétszürke/fehér téma-váltó és HU/EN nyelv-váltó.
- A `server/core/store.js` írási sorában **javítva egy race condition**:
  egy elutasított (hibázó) `update()` hívás korábban véglegesen
  megszakította a store további írásait - most csak az adott hívás bukik
  el, a sor tovább működik.
- Új automatizált tesztek: `users.model.test.js`, `auth.test.js` (élő
  HTTP kérésekkel a bejelentkezésre, szerepkör-védelemre, felhasználó
  CRUD-ra), és egy regressziós teszt a store race condition javítására.
