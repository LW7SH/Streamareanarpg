// Compatibility facade (kept for existing code paths)
// UI is handled elsewhere; data fetching is in ApiClient; State mutations are via Store/DataService.
const API = {
  async loadGameItems() {
    return await DataService.loadGameItems();
  },

  async loadAllListings() {
    return await DataService.loadAllListings();
  },

  async getInventory(token, page = 1) {
    return await DataService.getInventory(token, page);
  }
};
