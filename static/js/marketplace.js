// Marketplace Tab Functions
const Marketplace = {
    applyFilters() {
        if (State.currentTab !== 'marketplace') return;
        
        // Get filters from DOM
        const filterConfig = FilterEngine.getMarketplaceFilters();
        
        // Apply filters
        let filtered = FilterEngine.applyItemFilters(State.allListings, filterConfig);
        
        // Apply sorting
        const sortBy = document.getElementById('marketplaceSortBy')?.value || 'time_newest';
        filtered = FilterEngine.sortItems(filtered, sortBy);
        
        // Update counts
        DOMHelpers.updateCounts('totalCount', 'filteredCount', State.allListings.length, filtered.length);
        
        // Render items
        this.renderItems(filtered);
    },
    
    renderItems(items) {
        UIListRenderer.render('listingsContainer', items, {
            emptyIcon: '🔍',
            emptyText: 'No items match your filters',
            card: (item, idx) => UIComponents.renderItemCard(item, idx, true),
            row:  (item, idx) => UIComponents.renderItemRow(item, idx, true, 'filterToItem')
        });
    }
        
};
// Global functions (called from HTML)
function applyFilters() {
    Marketplace.applyFilters();
}
