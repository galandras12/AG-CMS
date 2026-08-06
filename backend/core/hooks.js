/**
 * Esemény-alapú hook/plugin rendszer. A backend/core modulok és a plugins/
 * mappában elhelyezett pluginok ugyanezt a regisztrátort használják, hogy
 * beavatkozhassanak a CMS életciklusába (mentés előtt/után, szerver indulás,
 * admin menü bővítés, stb.) anélkül, hogy a core kódot módosítani kellene.
 */
class HookRegistry {
  constructor() {
    this._handlers = new Map();
  }

  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`A "${event}" hook handlerének fuggvenynek kell lennie.`);
    }
    if (!this._handlers.has(event)) {
      this._handlers.set(event, []);
    }
    this._handlers.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  /**
   * Sorban lefuttatja a regisztralt handlereket. Ha egy handler visszaad
   * valamit, az lesz a kovetkezo handler bemenete (lehetove teszi pl. a
   * post:beforeSave hook-ban a tartalom modositasat mentes elott).
   */
  async trigger(event, payload) {
    const handlers = this._handlers.get(event) || [];
    let current = payload;
    for (const handler of handlers) {
      const result = await handler(current);
      if (result !== undefined) current = result;
    }
    return current;
  }

  list() {
    return [...this._handlers.keys()];
  }
}

const instance = new HookRegistry();
instance.HookRegistry = HookRegistry;

module.exports = instance;
