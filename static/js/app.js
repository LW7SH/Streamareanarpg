// Tab Switching
function switchTab(tab) {
    State.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'marketplace') {
        document.getElementById('marketplaceTab').classList.add('active');
        Marketplace.applyFilters();
    } else if (tab === 'analysis') {
        document.getElementById('analysisTab').classList.add('active');
        // Calculate analysis data if not already done
        if (State.itemAnalysisData && State.itemAnalysisData.length === 0) {
            Analysis.calculateItemAnalysis();
        }
        Analysis.applyFilters();
    } else if (tab === 'inventory') {
        document.getElementById('inventoryTab').classList.add('active');
        
        // Check if we have a saved token
        const savedToken = TokenManager.getToken();
        console.log('Inventory tab opened. Saved token found:', !!savedToken);
        console.log('Current inventory items count:', State.inventoryItems ? State.inventoryItems.length : 0);
        
        if (savedToken && (!State.inventoryItems || State.inventoryItems.length === 0)) {
            // Auto-load inventory with saved token
            console.log('Auto-loading inventory with saved token...');
            document.getElementById('inventoryToken').value = savedToken;
            loadInventoryWithToken();
        } else if (savedToken && State.inventoryItems && State.inventoryItems.length > 0) {
            // Just show loaded inventory
            console.log('Inventory already loaded, showing items...');
            document.querySelector('.token-input-section').style.display = 'none';
            document.querySelector('.token-loaded-section').style.display = 'flex';
            Inventory.applyFilters();
        } else if (!savedToken) {
            // No saved token, show input section
            console.log('No saved token found, showing input section');
            document.querySelector('.token-input-section').style.display = 'block';
            document.querySelector('.token-loaded-section').style.display = 'none';
        }
    }
}

// Collapsible Section Toggle
function toggleSection(header) {
    const content = header.nextElementSibling;
    const isCollapsed = content.classList.contains('collapsed');
    
    if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
    } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== Page loaded, starting initialization ===');
    
    try {
        console.log('Step 1: Loading game items...');
        await API.loadGameItems();
        
        console.log('Step 2: Populating filters...');
        Filters.populateFilters();
        
        console.log('Step 3: Setting up listeners...');
        Filters.setupListeners();
        
        console.log('Step 4: Loading all listings...');
        await API.loadAllListings();
        
        console.log('Step 5: Calculating unique items...');
        Utils.calculateUniqueItems();
        
        console.log('Step 6: Calculating analysis data for comparisons...');
        Analysis.calculateItemAnalysis();
        
        console.log('Step 7: Applying initial filters...');
        Marketplace.applyFilters();
        
        console.log('=== Initialization complete ===');
    } catch(e) {
        console.error('❌ Initialization error:', e);
        document.getElementById('statusText').textContent = 'Error';
    }
});
