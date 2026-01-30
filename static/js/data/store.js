// Data layer: centralized State mutations (no UI)
window.Store = {
  get(key) {
    return State[key];
  },

  set(key, value) {
    State[key] = value;
    return value;
  },

  update(patch) {
    Object.keys(patch || {}).forEach((k) => { State[k] = patch[k]; });
    return patch;
  },

  resetArray(key) {
    State[key] = [];
    return State[key];
  },

  pushMany(key, items) {
    if (!Array.isArray(State[key])) State[key] = [];
    if (Array.isArray(items) && items.length) State[key].push(...items);
    return State[key];
  }
};
