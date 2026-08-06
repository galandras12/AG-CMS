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
| `post:beforeSave`      | Bejegyzés mentése előtt (módosíthatja)       | 3        | tervezett |
| `post:afterSave`       | Bejegyzés mentése után                       | 3        | tervezett |
| `post:beforeDelete`    | Bejegyzés törlése előtt                      | 3        | tervezett |
| `media:afterUpload`    | Médiafájl feltöltése után                    | 3        | tervezett |
| `admin:menu:register`  | Admin oldalsáv menüpontok összeállításakor   | 3        | tervezett |
| `build:beforeGenerate` | Statikus generálás indulása előtt            | 4        | tervezett |
| `build:afterGenerate`  | Statikus generálás befejezése után           | 4        | tervezett |

Az "aktív" hook-ok már be vannak kötve a core kódba. A "tervezett" hook-ok a
jelzett fázisban kerülnek be - ha egy plugin ezekre hookol most, egyszerűen
soha nem fog aktiválódni, amíg a core az adott fázisban meg nem hívja őket.

Lásd a `plugins/sample-hello-logger/` mappát egy működő, minimális példáért.
