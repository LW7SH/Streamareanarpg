// DOM Helpers - Common DOM manipulation utilities
const DOMHelpers = {
    // Toggle collapsible section
    toggleSection(header) {
        const content = header.nextElementSibling;
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            content.classList.remove('collapsed');
            header.classList.remove('collapsed');
        } else {
            content.classList.add('collapsed');
            header.classList.add('collapsed');
        }
    },
    
    // Clear marketplace filters
    clearMarketplaceFilters() {
        const textInputs = [
            'filterUsername', 'filterMinPower', 'filterMaxPower', 
            'filterMinRange', 'filterMaxRange', 'filterMaxPlatinum', 
            'filterMaxGold', 'filterMaxGems'
        ];
        
        const selectInputs = [
            'filterItemName', 'filterSlot', 'filterItemClass', 
            'filterExtraProperty', 'filterTwoHanded', 'marketplaceSortBy'
        ];
        
        textInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        selectInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    },
    
    // Clear inventory filters
    clearInventoryFilters() {
        const textInputs = [
            'invFilterMinPower', 'invFilterMaxPower', 
            'invFilterMinRange', 'invFilterMaxRange'
        ];
        
        const selectInputs = [
            'invFilterItemName', 'invFilterSlot', 'invFilterItemClass', 
            'invFilterExtraProperty', 'invFilterTwoHanded', 'inventorySortBy'
        ];
        
        textInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        selectInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    },
    
    // Clear analysis filters
    clearAnalysisFilters() {
        const inputs = [
            'analysisFilterName', 'analysisFilterSlot', 'analysisFilterClass', 
            'analysisFilterStat', 'analysisFilterTwoHanded', 'analysisSortBy'
        ];
        
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = id === 'analysisSortBy' ? 'name' : '';
        });
    },
    
    // Set view mode (grid/list)
    setView(view, eventTarget) {
        State.currentView = view;
        
        // Update ALL view buttons across all tabs
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to all buttons with matching view
        document.querySelectorAll('.view-btn').forEach(btn => {
            const btnText = btn.textContent.toLowerCase();
            if ((view === 'grid' && btnText === 'grid') || (view === 'list' && btnText === 'list')) {
                btn.classList.add('active');
            }
        });
        
        // Re-render current tab content with new view
        if (State.currentTab === 'marketplace') {
            Marketplace.applyFilters();
        } else if (State.currentTab === 'inventory') {
            Inventory.applyFilters();
        }
    },
    
    // Update count displays
    updateCounts(totalId, filteredId, totalCount, filteredCount) {
        const totalEl = document.getElementById(totalId);
        const filteredEl = document.getElementById(filteredId);
        
        if (totalEl) totalEl.textContent = totalCount;
        if (filteredEl) filteredEl.textContent = filteredCount;
    },
    
    // Show/hide token sections
    showTokenInput() {
        const inputSection = document.querySelector('.token-input-section');
        const profileSection = document.querySelector('.user-profile-header-section');
        
        if (inputSection) inputSection.style.display = 'block';
        if (profileSection) profileSection.style.display = 'none';
    },
    
    hideTokenInput() {
        const inputSection = document.querySelector('.token-input-section');
        const profileSection = document.querySelector('.user-profile-header-section');
        
        if (inputSection) inputSection.style.display = 'none';
        if (profileSection) profileSection.style.display = 'block';
    },
    
    // Filter to specific item (used in marketplace and analysis)
    filterToItem(itemName, tab = 'marketplace') {
        // Switch to correct tab if needed
        if (State.currentTab !== tab) {
            switchTab(tab);
        }
        
        // Clear all filters
        if (tab === 'marketplace') {
            this.clearMarketplaceFilters();
            // Set item name filter
            const itemNameEl = document.getElementById('filterItemName');
            if (itemNameEl) itemNameEl.value = itemName;
            // Apply filters
            Marketplace.applyFilters();
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Global functions for backwards compatibility with HTML
function toggleSection(header) {
    DOMHelpers.toggleSection(header);
}

function clearFilters() {
    DOMHelpers.clearMarketplaceFilters();
    Marketplace.applyFilters();
}

function clearInventoryFilters() {
    DOMHelpers.clearInventoryFilters();
    Inventory.applyFilters();
}

function clearAnalysisFilters() {
    DOMHelpers.clearAnalysisFilters();
    Analysis.applyFilters();
}

function setView(view, event) {
    DOMHelpers.setView(view, event.target);
}

function filterToItem(itemName) {
    DOMHelpers.filterToItem(itemName, 'marketplace');
}

function navigateToMarketplace(itemName, slot, itemClass, statsString) {
    // Switch to marketplace tab first
    if (State.currentTab !== 'marketplace') {
        State.currentTab = 'marketplace';
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-btn')[0].classList.add('active'); // First tab is marketplace
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById('marketplaceTab').classList.add('active');
    }
    
    // Clear all filters
    DOMHelpers.clearMarketplaceFilters();
    
    // Set item name filter
    const itemNameEl = document.getElementById('filterItemName');
    if (itemNameEl) itemNameEl.value = itemName;
    
    // Set sort to default (newest first)
    const sortEl = document.getElementById('marketplaceSortBy');
    if (sortEl) sortEl.value = 'time_newest';
    
    // Apply filters
    Marketplace.applyFilters();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
