/* Pure calculations and validation. Shared by the browser and node:test. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StockCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CATEGORIES = ['food', 'water', 'medicine', 'pet-food', 'daily', 'tool', 'other'];
  const MAX_ITEMS = 5000;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const defaults = () => ({ adults: 1, children: 0, seniors: 0, dogs: 0, cats: 0,
    days: 7, waterPerPerson: 3, adultKcal: 2000, childKcal: 1400, seniorKcal: 1800,
    dogWater: null, catWater: null });
  const initial = () => ({ items: [], family: defaults(), alertMonths: 2 });
  function fail(code) { throw new Error(code); }
  function number(value, max, integer = false) {
    if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') fail('number');
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) fail('number');
    return n;
  }
  function text(value, max, required = false) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('text');
    return value.trim();
  }
  function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  // UTC is used only as a calendar-day index; today's date uses local components.
  function dateNumber(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (y < 1) return null;
    const date = new Date(0);
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(0, 0, 0, 0);
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date.getTime() / 86400000;
  }
  function today(now = new Date()) {
    return [String(now.getFullYear()).padStart(4, '0'), String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')].join('-');
  }
  function addMonths(value, months) {
    if (dateNumber(value) === null || !Number.isInteger(months) || months < 0 || months > 12) fail('date');
    const [year, month, day] = value.split('-').map(Number);
    const end = new Date(0);
    end.setUTCFullYear(year, month - 1 + months + 1, 0);
    return `${String(end.getUTCFullYear()).padStart(4, '0')}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, end.getUTCDate())).padStart(2, '0')}`;
  }
  function validateItem(item) {
    if (!object(item)) fail('item');
    if (!CATEGORIES.includes(item.category)) fail('category');
    const expiry = text(item.expiry ?? '', 10);
    if (expiry && dateNumber(expiry) === null) fail('date');
    const out = {
      name: text(item.name, 200, true), category: item.category,
      quantity: number(item.quantity, 1000000), unit: text(item.unit ?? '', 50), expiry,
      kcal: item.kcal === null || item.kcal === undefined || item.kcal === '' ? null : number(item.kcal, 1000000),
      createdAt: item.createdAt === undefined ? Date.now() : number(item.createdAt, Number.MAX_SAFE_INTEGER, true)
    };
    // Packaged water is explicit. Never infer bottle size from a name or total.
    if (item.volumeMl !== undefined) {
      if (item.category !== 'water' || out.unit !== 'bottle') fail('package');
      out.volumeMl = number(item.volumeMl, 1000000, true);
      if (out.volumeMl === 0 || !Number.isInteger(out.quantity)) fail('package');
    }
    return out;
  }
  function validateFamily(data) {
    if (!object(data)) fail('family');
    const out = defaults();
    for (const key of ['adults', 'children', 'seniors', 'dogs', 'cats']) out[key] = number(data[key], 100, true);
    out.days = number(data.days, 180, true);
    if (![3, 7, 14, 30, 180].includes(out.days)) fail('days');
    for (const key of ['waterPerPerson', 'adultKcal', 'childKcal', 'seniorKcal', 'dogWater', 'catWater']) {
      if (data[key] !== undefined) {
        out[key] = data[key] === null || data[key] === '' ? null : number(data[key], key.endsWith('Kcal') ? 10000 : 100);
      }
      if (!['dogWater', 'catWater'].includes(key) && out[key] === null) fail('number');
    }
    return out;
  }
  function validateState(data) {
    if (!object(data) || !Array.isArray(data.items) || data.items.length > MAX_ITEMS) fail('items');
    if (data.meta !== undefined && (!object(data.meta) || data.meta.app !== 'rollingstock-planner' || ![1, 2, 3].includes(data.meta.ver))) fail('version');
    if (![1, 2, 3, 6].includes(data.alertMonths)) fail('months');
    return { items: data.items.map(validateItem), family: validateFamily(data.family), alertMonths: data.alertMonths };
  }
  function expiryStatus(item, day = today(), months = 2) {
    if (!item.expiry) return 'unknown';
    const n = dateNumber(item.expiry), base = dateNumber(day);
    if (n === null || base === null) return 'invalid';
    if (n < base) return 'expired';
    if (n === base) return 'today';
    return n <= dateNumber(addMonths(day, months)) ? 'near' : 'later';
  }
  function waterVolume(item) {
    if (item.category !== 'water') return null;
    if (item.volumeMl !== undefined) return item.quantity * item.volumeMl / 1000;
    const unit = item.unit.trim().toLowerCase();
    if (['l', 'ℓ'].includes(unit)) return item.quantity;
    if (unit === 'ml') return item.quantity / 1000;
    return null;
  }
  function totals(items, day = today()) {
    const out = { waterL: 0, kcal: 0, plannedWaterL: 0, plannedKcal: 0,
      unknownWater: 0, unknownKcal: 0, expired: 0, undated: 0, zero: 0 };
    for (const item of items) {
      if (item.quantity === 0) { out.zero++; continue; }
      const status = expiryStatus(item, day);
      const usable = ['today', 'near', 'later'].includes(status);
      if (status === 'expired') out.expired++;
      if (status === 'unknown' || status === 'invalid') out.undated++;
      const water = waterVolume(item);
      if (item.category === 'water') {
        if (water === null) out.unknownWater++;
        else { out.waterL += water; if (usable) out.plannedWaterL += water; }
      }
      if (item.category === 'food') {
        if (item.kcal === null) out.unknownKcal++;
        else { const kcal = item.quantity * item.kcal; out.kcal += kcal; if (usable) out.plannedKcal += kcal; }
      }
    }
    return out;
  }
  function needs(family) {
    const people = family.adults + family.children + family.seniors;
    const petUnknown = (family.dogs > 0 && family.dogWater === null) || (family.cats > 0 && family.catWater === null);
    const knownWater = (people * family.waterPerPerson + family.dogs * (family.dogWater ?? 0) + family.cats * (family.catWater ?? 0)) * family.days;
    return { needWater: petUnknown ? null : knownWater, knownWater, petUnknown,
      needKcal: (family.adults * family.adultKcal + family.children * family.childKcal + family.seniors * family.seniorKcal) * family.days };
  }
  function metric(stock, target) {
    if (target === null || target === 0) return { ratio: null, shortage: null, met: null };
    return { ratio: stock / target * 100, shortage: Math.max(0, target - stock), met: stock >= target };
  }
  function coverage(items, family, day = today()) {
    const t = totals(items, day), n = needs(family);
    return { totals: t, needs: n, water: metric(t.plannedWaterL, n.needWater), food: metric(t.plannedKcal, n.needKcal) };
  }
  function alerts(items, day = today(), months = 2) {
    const out = { expired: [], near: [], rolling: [] };
    for (const item of items) {
      if (!item.quantity) continue;
      const status = expiryStatus(item, day, months);
      if (status === 'expired') out.expired.push(item);
      if (status === 'near' || status === 'today') out.near.push(item);
      const diff = dateNumber(item.expiry) === null ? -1 : dateNumber(item.expiry) - dateNumber(day);
      if (['food', 'water', 'pet-food'].includes(item.category) && diff >= 0 && diff <= 14) out.rolling.push(item);
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.expiry.localeCompare(b.expiry));
    return out;
  }
  return { CATEGORIES, MAX_ITEMS, MAX_FILE_BYTES, defaults, initial, number, dateNumber, today, addMonths,
    validateItem, validateFamily, validateState, expiryStatus, waterVolume, totals, needs, metric, coverage, alerts };
});
