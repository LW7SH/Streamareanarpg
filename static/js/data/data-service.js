// Data layer: orchestrates ApiClient + Store (no UI)
window.DataService = {
  async loadGameItems() {
    const data = await ApiClient.getItems();
    Store.set('gameItems', data.items || []);
    console.log('✓ Game items loaded:', Store.get('gameItems').length);
    return Store.get('gameItems');
  },

  async loadAllListings() {
    Store.resetArray('allListings');

    // Load first page
    const firstPage = await ApiClient.getListingsPage(1);
    if (!firstPage.listings) throw new Error('No listings found');

    Store.set('allListings', firstPage.listings || []);
    const totalPages = firstPage.total_pages || 1;

    // Load remaining pages in parallel
    const remaining = [];
    for (let p = 2; p <= totalPages; p++) {
      remaining.push(ApiClient.getListingsPage(p));
    }

    if (remaining.length > 0) {
      const results = await Promise.all(remaining);
      results.forEach((data) => {
        if (data && data.listings) Store.pushMany('allListings', data.listings);
      });
    }

    return {
      total_listings: firstPage.total_listings || Store.get('allListings').length,
      total_pages: totalPages,
      listings: Store.get('allListings')
    };
  },

  async getInventory(token, page = 1) {
    return await ApiClient.getInventory(token, page);
  }
};
