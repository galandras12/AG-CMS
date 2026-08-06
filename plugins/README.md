# AG-CMS Plugin rendszer

Az AG-CMS egy esemény-alapú (hook) rendszert használ, amivel a `plugins/`
mappába helyezett bővítmények beavatkozhatnak a CMS életciklusába, anélkül
hogy a core kódot módosítani kellene.

## Egy plugin felépítése

```
plugins/
  sajat-pluginom/
    plugin.json    # manifest
    index.js       # register(hooks, context) export
```

**`plugin.json`**

```json
{
  "name": "sajat-pluginom",
  "version": "1.0.0",
  "author": "Neved",
  "description": "Rovid leiras arrol, mit csinal a plugin.",
  "main": "index.js",
  "enabled": true
}
```

**`index.js`**

```js
function register(hooks, context) {
  hooks.on('post:afterSave', (post) => {
    context.logger.info(`Bejegyzes mentve: ${post.title}`);
    return post;
  });
}

module.exports = { register };
```

A `register(hooks, context)` függvény induláskor egyszer fut le minden
engedélyezett pluginra. A `context` tartalmazza: `logger`, `config`,
`manifest`, `pluginDir`.

## Elérhető hook-ok

| Hook név              | Mikor fut                                   | Fázis    | Státusz |
|------------------------|----------------------------------------------|----------|---------|
| `server:ready`         | A HTTP szerver elindult és figyel            | 1        | aktív |
| `auth:afterLogin`      | Sikeres bejelentkezés után                   | 2        | aktív |
| `post:beforeSave`      | Bejegyzés mentése előtt (módosíthatja)       | 3        | aktív |
| `post:afterSave`       | Bejegyzés mentése után                       | 3        | aktív |
| `post:beforeDelete`    | Bejegyzés törlése előtt                      | 3        | aktív |
| `media:afterUpload`    | Médiafájl feltöltése után                    | 3        | aktív |
| `admin:menu:register`  | Induláskor, az admin oldalsáv menü összeállításakor (payload: `{ registerItem(item) }`) | 3 | aktív |
| `settings:afterUpdate` | Beállítások (Személyre szabás, témaváltás) mentése után | 4 | aktív |
| `widgets:afterChange`  | Widget létrehozás/módosítás/törlés/átrendezés után | 4 | aktív |
| `build:beforeGenerate` | Statikus generálás indulása előtt            | 4        | aktív |
| `build:afterGenerate`  | Statikus generálás befejezése után (payload: `{ generatedAt, postCount, theme }`) | 4 | aktív |

Az "aktív" hook-ok már be vannak kötve a core kódba. A "tervezett" hook-ok a
jelzett fázisban kerülnek be - ha egy plugin ezekre hookol most, egyszerűen
soha nem fog aktiválódni, amíg a core az adott fázisban meg nem hívja őket.

### `admin:menu:register` - saját menüpont hozzáadása

```js
function register(hooks) {
  hooks.on('admin:menu:register', ({ registerItem }) => {
    registerItem({ id: 'sajat-menupont', label: 'nav.sajat', icon: '⭐', order: 500, url: 'https://example.com' });
  });
}
module.exports = { register };
```

Az `id` és `label` mező kötelező. A `label` egy `langs/*.json` kulcs (pl.
`nav.sajat`), amit az admin frontend fordít - ha a kulcs nincs a nyelvi
fájlban, a kulcs önmaga jelenik meg. Az `url` mezővel a menüpont egy külső
linkre mutat (új lapon nyílik); nélküle az admin frontendnek saját logikával
kell kezelnie az adott `id`-t (jövőbeli bővítési pont).

Lásd a `plugins/sample-hello-logger/` (post/media hookok) és a
`plugins/sample-menu-item/` (admin:menu:register) mappákat működő
példákért.

### Automatikus statikus generálás

A `server/core/autoBuild.js` a `post:afterSave`, `post:afterDelete`,
`settings:afterUpdate` és `widgets:afterChange` hook-okra épülve automatikusan
újragenerálja a statikus oldalt (`public/`) minden releváns mentés után - ez
nem plugin, hanem a core viselkedése, de ugyanazt a hook rendszert használja.
Egy build hiba (pl. hibás sablon) csak logolásra kerül, nem buktatja el a
mentést, mivel az adat már sikeresen elmentődött a titkosított tárolóba.
