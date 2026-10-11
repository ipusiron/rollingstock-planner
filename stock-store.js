/* One-key atomic writes. Legacy keys are read, never removed or overwritten. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./stock-core.js'));
  else root.StockStore = factory(root.StockCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const KEY = 'rsp_state_v2';
  const LEGACY = ['rsp_items', 'rsp_family', 'rsp_alert_months'];
  function create(getStorage) {
    let snapshot, session = false, loaded = false;
    function read() {
      const storage = getStorage();
      return [storage.getItem(KEY), ...LEGACY.map(key => storage.getItem(key))];
    }
    function load() {
      try {
        snapshot = read();
      } catch (_) {
        return { data: Core.initial(), problem: 'unavailable' };
      }
      try {
        let candidate;
        if (snapshot[0] !== null) candidate = JSON.parse(snapshot[0]);
        else candidate = { items: snapshot[1] === null ? [] : JSON.parse(snapshot[1]),
          family: snapshot[2] === null ? Core.defaults() : JSON.parse(snapshot[2]),
          alertMonths: snapshot[3] === null ? 2 : Number(snapshot[3]) };
        const data = Core.validateState(candidate);
        loaded = true;
        return { data, problem: null, legacy: snapshot[0] === null && snapshot.slice(1).some(v => v !== null) };
      } catch (_) {
        return { data: Core.initial(), problem: 'corrupt' };
      }
    }
    function save(candidate, replacing = false) {
      const data = Core.validateState(candidate);
      if (session) return data;
      if (!snapshot || (!loaded && !replacing)) throw new Error('unavailable');
      const current = read();
      if (JSON.stringify(current) !== JSON.stringify(snapshot)) throw new Error('conflict');
      const raw = JSON.stringify({ meta: { app: 'rollingstock-planner', ver: 2 }, ...data });
      getStorage().setItem(KEY, raw); // setItem either succeeds or leaves the old value intact.
      snapshot = [raw, ...current.slice(1)];
      loaded = true;
      return data;
    }
    return { load, save, useSession() { session = true; }, isSession: () => session,
      recovery: () => snapshot ? { state: snapshot[0], items: snapshot[1], family: snapshot[2], alertMonths: snapshot[3] } : null };
  }
  return { KEY, LEGACY, create };
});
