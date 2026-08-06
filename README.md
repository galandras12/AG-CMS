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
  HTML, önmagában is kiszolgálható nginx/Apache alól (igazoltan tesztelve
  Node nélkül, sima `http.server`-ről is).
- **Témák** (`themes/`) - 3 előre elkészített frontend sablon (HTML+CSS),
  amikből a generátor dolgozik, admin felületen válthatók.
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
│   ├── core/            # crypto, encrypted store, hook/plugin rendszer, admin menu, jwt, logger
│   ├── middleware/      # auth (JWT+cookie), rate limit, szerepkor-ellenorzes
│   ├── models/          # users, posts, media, settings, widgets, dashboardLayout
│   ├── routes/          # API vegpontok (health, auth, users, posts, media, settings, widgets, dashboard, admin menu, build, themes)
│   ├── services/        # generator.js, templateEngine.js, widgetRenderer.js
│   ├── tests/           # node:test tesztek
│   ├── app.js
│   └── server.js
├── frontend/admin/      # teljes admin SPA: login, dashboard, bejegyzesek, media, temak, szemelyre szabas, felhasznalok
├── public/              # generalt statikus oldal kimenete (nincs verziokezelve)
├── themes/              # 3 kesz tema: modern-trendy-black, modern-minimal-darkgray, solid-light
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
3. ✅ **Admin CRUD** - bejegyzések (draft/ütemezett/publikált), média,
   felhasználók, Személyre szabás (site név/leírás/favicon/logó/banner,
   widgetek, sitemap/robots.txt), testreszabható (drag-and-drop) dashboard.
4. ✅ **Statikus generálás + témaváltás** - 3 beépített téma, build script,
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
- **Bejegyzések** (`server/models/posts.model.js`, `/api/posts`): cím,
  slug (automatikus + egyedi ütközéskezeléssel), kivonat, Markdown
  tartalom, piszkozat/ütemezett/publikált státusz (`publishAt` alapján
  automatikusan "publikálttá" váló ütemezett bejegyzésekkel). A
  `post:beforeSave`/`post:afterSave`/`post:beforeDelete` hook-ok aktívak.
- **Médiatár** (`server/models/media.model.js`, `/api/media`): kép
  feltöltés (`multer`, típus- és méretkorlátozással, max 10 MB), a
  fájlok a `content/media/` alatt (nem titkosítva, mivel közvetlenül
  kiszolgálandó binárisok), metaadatuk (alt szöveg, feltöltő, dátum)
  titkosítva. A `media:afterUpload` hook aktív.
- **Személyre szabás** (`server/models/settings.model.js`, `/api/settings`):
  site név/leírás, favicon/logó/banner (médiatárból kiválasztva),
  sitemap.xml és robots.txt be/kikapcsolása + `robots.txt` tartalom
  szerkesztése. Az olvasás publikus, a szerkesztés admin-only.
- **Widgetek** (`server/models/widgets.model.js`, `/api/widgets`):
  szöveg/legutóbbi bejegyzések/közösségi linkek típusú widgetek,
  oldalsáv/lábjegyzet régiónkban, sorrend állítható.
- **Admin irányítópult** (`server/models/dashboardLayout.model.js`,
  `/api/dashboard`): az első blokk (AG-CMS név, verzió, frissítés
  dátuma, rövid changelog a `config/changelog.json`-ból) mindig fix és
  megváltozhatatlan; a további blokkok (legutóbbi bejegyzések, gyors
  műveletek, felhasználó- és médiaösszesítő) **valódi HTML5
  drag-and-drop**-pal átrendezhetők és elrejthetők/visszahozhatók,
  felhasználónként elmentve.
- **Admin menü bővíthetőség**: az `admin:menu:register` hook induláskor
  fut, plugin-ek saját menüpontot adhatnak az oldalsávhoz (lásd
  `plugins/sample-menu-item`) - a menü szerepkör szerint szűrve
  (`GET /api/admin/menu`).
- **Teljes admin SPA** (`frontend/admin/`): hash-alapú router, oldalsáv
  navigáció (a menüt a backend-ből tölti), Irányítópult/Bejegyzések/
  Média/Személyre szabás/Felhasználók oldalak, mind HU/EN fordítással
  és sötétszürke/fehér témával. Szerkesztő szerepkörnél a Személyre
  szabás mezői írásvédettek (csak admin szerkesztheti), a Felhasználók
  menüpont nem is jelenik meg.
- Az admin/szerkesztő szerepkör-korlátozásokat, a bejegyzés/média/
  widget/dashboard API-kat és a plugin-alapú menübővítést új
  automatizált tesztek fedik (`content.test.js`, összesen 26 teszt,
  mind zöld), és valós böngészőben (Playwright/Chromium) is
  végigteszteltem: bejelentkezés, oldalváltás mind az öt admin
  oldalon, bejegyzés létrehozása, drag-and-drop sorrend mentése és
  betöltés utáni megmaradása, valamint a szerkesztői szerepkör
  korlátozásainak megjelenése a felületen.
- **Statikus generátor** (`server/services/generator.js`): a publikált
  bejegyzésekből, a kiválasztott témából és a widgetekből legenerálja a
  teljes `public/` mappát - `index.html` (lista) és `<slug>.html` minden
  publikált bejegyzéshez, a Markdown tartalom valódi HTML-re konvertálva
  (`marked`). A `content/media/` fájlok és a téma `assets/` mappája
  bemásolódnak `public/media/` és `public/assets/` alá, így a kimenet
  önmagában (Node nélkül) is teljesen működik - **igazoltan tesztelve**:
  a Node szerver leállítása után egy sima `python -m http.server`-ről is
  hibátlanul betöltődött az oldal, a CSS, a képek és a `robots.txt`/
  `sitemap.xml` is.
- **Minimál, függőség nélküli sablon motor** (`server/services/templateEngine.js`):
  `{{key}}`/`{{{rawKey}}}` interpoláció, `{{#each}}`/`{{#if}}` blokkok -
  ezekből épülnek fel a téma HTML sablonjai.
- **3 kész téma** a `themes/` mappában, mindegyik `theme.json`
  metaadattal (szerző, verzió, frissítés dátuma, leírás, előnézeti kép)
  és saját CSS-sel/elrendezéssel:
  - **Modern Trendi (Fekete)** - lila-kék gradienses hero, kártyarács.
  - **Modern Minimalista (Sötétszürke)** - letisztult lista-nézet, sok
    hézag, finom elválasztók.
  - **Szolid Letisztult (Fehér/Világosszürke)** - klasszikus, középre
    zárt blog elrendezés.
- **Témaváltás** az admin "Témák" felületén (`/api/themes`) - kártyás
  galéria előnézeti képpel, szerzővel, verzióval, frissítés dátumával;
  aktiválás admin-only, azonnal újragenerálja a publikus oldalt.
- **Automatikus generálás mentéskor** (`server/core/autoBuild.js`): a
  `post:afterSave`/`post:afterDelete`/`settings:afterUpdate`/
  `widgets:afterChange` hookokra épül - minden bejegyzés-, beállítás- és
  widget-változás után újragenerálja a statikus oldalt. Egy build hiba
  csak logolásra kerül, nem buktatja el a mentés API hívást. A
  `build:beforeGenerate`/`build:afterGenerate` hookok is aktívak.
- Kézi **"Build most" gomb** az admin irányítópult Gyors műveletek
  blokkjában (`POST /api/build`).
- Új **Személyre szabás** mező: publikus weboldal URL-je (`siteUrl`) - a
  `sitemap.xml` érvényes, abszolút linkjeihez szükséges.
- Új automatizált tesztek (`generator.test.js`): csak a publikált
  bejegyzések kerülnek ki, a Markdown helyesen HTML-re konvertálódik, a
  `robots.txt`/`sitemap.xml` csak bekapcsolva íródik ki, egy "Index"
  című bejegyzés sosem írja felül a listázó `index.html`-t (fenntartott
  slug), a widgetek megjelennek a generált oldalakon, és a témaváltás
  valóban más sablont és CSS-t eredményez. Összesen 31 teszt, mind zöld.
- **Favicon/Logó/Banner választó javítva**: a korábbi egyszerű
  legördülő lista helyett egy kártyás választó - az utolsó 5 feltöltött
  kép elnevezéssel (amit feltöltéskor lehet megadni), közvetlen
  **Feltöltés** gombbal a választó alatt, és soronkénti **Törlés**
  lehetőséggel. A kiválasztott/frissen feltöltött kép mentés előtt is
  megmarad egy esetleges lista-frissítés (feltöltés/törlés) után is.
  Szerkesztő szerepkörnél a lista csak olvasható (nincs feltöltés/
  kiválasztás/törlés gomb). Az API oldalon a `POST /api/media` mostantól
  egy lépésben elfogadja az elnevezést (`altText`) is a fájllal együtt.
