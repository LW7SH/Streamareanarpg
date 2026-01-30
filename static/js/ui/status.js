// UI layer: tiny helpers for status text and counters (no fetch, no State mutations)
window.UIStatus = {
  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  setGlobalStatus(text) {
    this.setText('statusText', text);
  },

  setInventoryStatus(text) {
    this.setText('inventoryStatusText', text);
  },

  setTotalListings(value) {
    const el = document.getElementById('totalListings');
    if (el) el.textContent = value;
  }
};
