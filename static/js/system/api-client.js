// System layer: raw API calls only (no UI, no State mutations)
window.ApiClient = {
  async getItems() {
    const response = await fetch('/api/items');
    if (!response.ok) {
      throw new Error(`Failed to load items (${response.status})`);
    }
    return await response.json();
  },

  async getListingsPage(page = 1) {
    const response = await fetch(`/api/listings?page=${encodeURIComponent(page)}`);
    if (!response.ok) {
      throw new Error(`Failed to load listings (${response.status})`);
    }
    return await response.json();
  },

  async getInventory(token, page = 1) {
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, page })
    });

    if (!response.ok) {
      let message = 'Failed to load inventory';
      try {
        const errorData = await response.json();
        message = errorData.message || message;
      } catch (_) {}
      throw new Error(message);
    }

    return await response.json();
  }
};
