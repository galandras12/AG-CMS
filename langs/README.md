# Nyelvi fájlok (langs/)

Ez a mappa tartalmazza az AG-CMS admin felületének (és később a publikus témák
fix szövegeinek) fordításait. A rendszer alapból angol (`en`) és magyar (`hu`)
nyelvet tartalmaz, de bárki bővíthető, szabadon hozzáadható újabb nyelvekkel.

## Új nyelv hozzáadása

1. Hozz létre egy új `<nyelvkód>.json` fájlt ebben a mappában (pl. `de.json`),
   az `en.json` szerkezetét pontosan követve (ugyanazok a csoportok és kulcsok).
2. Töltsd ki az összes kulcsot. Ha egy kulcs hiányzik egy nem-angol fájlból,
   a rendszer futásidőben az angol (`en`) értékre esik vissza.
3. Regisztráld a nyelvet az admin Beállítások felületén (a Phase 3-ban készül
   el), ami hozzáadja a `content/data/settings.enc` `availableLanguages`
   listájához.

## Fájlformátum

Csoportosított kulcs-érték JSON objektum:

```json
{
  "common": { "appName": "AG-CMS" },
  "auth": { "loginTitle": "Bejelentkezés" }
}
```

Új csoportot/kulcsot bármikor felvehetsz - a betöltő logika a hiányzó
kulcsokat csoportonként, kulcsonként kezeli, nem fájlszinten.
