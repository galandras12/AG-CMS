const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./crypto');
const config = require('../config');

/**
 * Fájl-alapú, AES-256-GCM-mel titkosított JSON tároló. Minden kollekció
 * (users, posts, media, settings, ...) egy külön .enc fájlban él a
 * content/data/ alatt. Íráskor egy promise-lánccal soroljuk a
 * módosításokat, hogy párhuzamos írások ne írják felül egymást.
 */
class EncryptedJSONStore {
  constructor(name, defaultData, baseDir = config.dataDir) {
    this.name = name;
    this.baseDir = baseDir;
    this.filePath = path.join(baseDir, `${name}.enc`);
    this.defaultData = defaultData;
    this._writeChain = Promise.resolve();
  }

  _ensureDir() {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  read() {
    this._ensureDir();
    if (!fs.existsSync(this.filePath)) {
      this.write(this.defaultData);
      return structuredClone(this.defaultData);
    }
    const raw = fs.readFileSync(this.filePath);
    const json = decrypt(raw, config.encryptionKey);
    return JSON.parse(json);
  }

  write(data) {
    this._ensureDir();
    const json = JSON.stringify(data, null, 2);
    const encrypted = encrypt(json, config.encryptionKey);
    fs.writeFileSync(this.filePath, encrypted);
    return data;
  }

  /**
   * Sorosított olvas-módosít-ír ciklus. A mutator visszaadhatja az uj
   * allapotot, vagy modosithatja helyben a kapott objektumot. Ha a mutator
   * hibat dob (pl. validacios hiba), a hiba csak az adott update() hivast
   * buktatja el - a sor a kovetkezo update() hivasokhoz tovabb mukodik.
   */
  update(mutator) {
    const run = this._writeChain.catch(() => {}).then(async () => {
      const current = this.read();
      const next = (await mutator(current)) ?? current;
      this.write(next);
      return next;
    });
    this._writeChain = run.catch(() => {});
    return run;
  }
}

const stores = new Map();

function getStore(name, defaultData) {
  if (!stores.has(name)) {
    stores.set(name, new EncryptedJSONStore(name, defaultData));
  }
  return stores.get(name);
}

module.exports = { EncryptedJSONStore, getStore };
