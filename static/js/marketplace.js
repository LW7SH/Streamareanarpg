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
        const container = document.getElementById('itemsContainer');
        
        if (!items || items.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('🔍', 'No items match your filters');
            return;
        }
        
        if (State.currentView === 'grid') {
            container.className = 'items-grid';
            container.innerHTML = items.map((item, idx) => 
                UIComponents.renderItemCard(item, idx, true)
            ).join('');
        } else {
            container.className = 'items-list';
            container.innerHTML = items.map((item, idx) => 
                UIComponents.renderItemRow(item, idx, true, 'filterToItem')
            ).join('');
        }
    }
};

// Global functions (called from HTML)
function applyFilters() {
    Marketplace.applyFilters();
}
