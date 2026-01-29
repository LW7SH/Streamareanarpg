// Helper function to load inventory using saved HttpOnly cookie token
async function loadInventoryWithSavedToken() {
    try {
        // The token is in HttpOnly cookie, so server will use it automatically
        // We just need to make the API call without passing token in body
        const firstPage = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page: 1 })
        }).then(r => r.json());
        
        if (!firstPage.player_items) {
            throw new Error('No inventory items found');
        }
        
        // Store user data
        if (firstPage.user) {
            State.userData = firstPage.user;
            Inventory.displayUserProfile(firstPage.user);
        }
        
        State.inventoryItems = firstPage.player_items;
        const totalPages = firstPage.total_pages || 1;
        
        // Load remaining pages
        const remaining = [];
        for (let p = 2; p <= totalPages; p++) {
            remaining.push(
                fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page: p })
                }).then(r => r.json())
            );
        }
        
        if (remaining.length > 0) {
            const results = await Promise.all(remaining);
            results.forEach(data => {
                if (data.player_items) State.inventoryItems.push(...data.player_items);
            });
        }
        
        document.getElementById('totalInventoryItems').textContent = State.inventoryItems.length;
        
        // Update unique count
        const uniqueInv = new Set();
        State.inventoryItems.forEach(item => {
            const key = `${item.base_item_id}_${item.slot}`;
            uniqueInv.add(key);
        });
        document.getElementById('uniqueInventoryItems').textContent = uniqueInv.size;
        
        console.log('✓ Inventory loaded from saved token:', State.inventoryItems.length, 'items');
        
        DOMHelpers.hideTokenInput();
        Inventory.applyFilters();
    } catch (e) {
        console.error('Error loading inventory with saved token:', e);
        // Show token input if auto-load fails
        document.querySelector('.token-input-section').style.display = 'block';
        document.querySelector('.user-profile-header-section').style.display = 'none';
        Inventory.hideUserProfile();
    }
}

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
        
        // Check if we have a saved token (async)
        TokenManager.hasToken().then(hasToken => {
            console.log('Inventory tab opened. Saved token found:', hasToken);
            console.log('Current inventory items count:', State.inventoryItems ? State.inventoryItems.length : 0);
            
            if (hasToken && (!State.inventoryItems || State.inventoryItems.length === 0)) {
                // Auto-load inventory with saved token
                console.log('Auto-loading inventory with saved token...');
                // Note: We can't get the actual token value due to HttpOnly, so we call API directly
                loadInventoryWithSavedToken();
            } else if (hasToken && State.inventoryItems && State.inventoryItems.length > 0) {
                // Just show loaded inventory
                console.log('Inventory already loaded, showing items...');
                document.querySelector('.token-input-section').style.display = 'none';
                document.querySelector('.token-loaded-section').style.display = 'flex';
                Inventory.applyFilters();
            } else if (!hasToken) {
                // No saved token, show input section
                console.log('No saved token found, showing input section');
                document.querySelector('.token-input-section').style.display = 'block';
                document.querySelector('.token-loaded-section').style.display = 'none';
            }
        });
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
