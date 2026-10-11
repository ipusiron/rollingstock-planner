/* Pure candidate operations; the UI persists before accepting their results. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./stock-core.js'));
  else root.StockActions = factory(root.StockCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  function prepare(state, index, amount) {
    const data = Core.validateState(state);
    if (!Number.isInteger(index) || index < 0 || index >= data.items.length) throw new Error('item');
    const item = data.items[index];
    const value = Core.number(amount, 1000000, item.volumeMl !== undefined);
    if (value === 0) throw new Error('amount');
    return { data, item, value };
  }
  function consume(state, index, amount) {
    const { data, item, value } = prepare(state, index, amount);
    if (value > item.quantity) throw new Error('overdraw');
    item.quantity = Number((item.quantity - value).toPrecision(15));
    return Core.validateState(data);
  }
  function replenish(state, index, amount, expiry, expiryType = 'unspecified') {
    const { data, item, value } = prepare(state, index, amount);
    if (typeof expiry !== 'string' || (expiry && Core.dateNumber(expiry) === null)) throw new Error('date');
    if (!Core.EXPIRY_TYPES.includes(expiryType)) throw new Error('expiryType');
    if (expiry && item.expiry === expiry && (item.expiryType ?? 'unspecified') === expiryType) {
      item.quantity = Number((item.quantity + value).toPrecision(15));
    } else {
      // Unknown dates do not prove two purchases have the same expiry.
      data.items.push({ ...item, quantity: value, expiry, expiryType, createdAt: Date.now() });
    }
    return Core.validateState(data);
  }
  function undo(current, entry) {
    if (!entry || JSON.stringify(Core.validateState(current)) !== entry.after) throw new Error('stale');
    return Core.validateState(entry.before);
  }
  function shopping(state, bottleMl, day = Core.today()) {
    const data = Core.validateState(state);
    const coverage = Core.coverage(data.items, data.family, day);
    const size = Core.number(bottleMl, 1000000, true);
    if (!size) throw new Error('package');
    // Compare in mL to avoid under-counting a fractional bottle requirement.
    const bottles = coverage.water.shortage === null ? null : Math.ceil(coverage.water.shortage * 1000 / size);
    return { ...coverage, bottleMl: size, bottles };
  }
  return { consume, replenish, undo, shopping };
});
