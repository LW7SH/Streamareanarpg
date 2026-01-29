// Inventory Tab Functions
const Inventory = {
    async loadInventory(token) {
        if (!token || !token.trim()) {
            throw new Error('Token is required');
        }
        
        document.getElementById('inventoryStatusText').textContent = 'Loading...';
        State.inventoryItems = [];
        
        try {
            // Load first page
            const firstPage = await API.getInventory(token, 1);
            console.log('API Response:', firstPage);
            
            if (!firstPage.player_items) {
                console.error('No player_items in response:', firstPage);
                throw new Error('No inventory items found');
            }
            
            // Store user data
            if (firstPage.user) {
                State.userData = firstPage.user;
                this.displayUserProfile(firstPage.user);
            }
            
            State.inventoryItems = firstPage.player_items;
            const totalPages = firstPage.total_pages || 1;
            
            document.getElementById('totalInventoryItems').textContent = firstPage.player_items.length;
            
            // Load remaining pages
            const remaining = [];
            for (let p = 2; p <= totalPages; p++) {
                remaining.push(API.getInventory(token, p));
            }
            
            if (remaining.length > 0) {
                const results = await Promise.all(remaining);
                results.forEach(data => {
                    if (data.player_items) State.inventoryItems.push(...data.player_items);
                });
            }
            
            document.getElementById('inventoryStatusText').textContent = 'Loaded';
            console.log('✓ Inventory loaded:', State.inventoryItems.length, 'items');
            
            // Update unique count
            const uniqueInv = new Set();
            State.inventoryItems.forEach(item => {
                const key = `${item.base_item_id}_${item.slot}`;
                uniqueInv.add(key);
            });
            document.getElementById('uniqueInventoryItems').textContent = uniqueInv.size;
            
            return true;
        } catch (e) {
            console.error('✗ Error loading inventory:', e);
            document.getElementById('inventoryStatusText').textContent = 'Error';
            throw e;
        }
    },
    
    displayUserProfile(user) {
        // Show the profile section
        const profileSection = document.querySelector('.user-profile-header-section');
        if (profileSection) {
            profileSection.style.display = 'block';
        }
        
        // Update profile values
        document.getElementById('userProfileName').textContent = user.username || '-';
        document.getElementById('userGold').textContent = Utils.formatNumber(parseInt(user.gold) || 0);
        document.getElementById('userPlatinum').textContent = Utils.formatNumber(parseInt(user.platinum) || 0);
        document.getElementById('userGems').textContent = Utils.formatNumber(parseInt(user.gems) || 0);
        document.getElementById('userInventorySlots').textContent = user.inventory_slots || '0';
    },
    
    hideUserProfile() {
        const profileSection = document.querySelector('.user-profile-header-section');
        if (profileSection) {
            profileSection.style.display = 'none';
        }
    },
    
    applyFilters() {
        // Get filters from DOM
        const filterConfig = FilterEngine.getInventoryFilters();
        
        // Apply filters
        let filtered = FilterEngine.applyItemFilters(State.inventoryItems, filterConfig);
        
        // Apply sorting
        const sortBy = document.getElementById('inventorySortBy')?.value || 'time_newest';
        filtered = FilterEngine.sortItems(filtered, sortBy);
        
        // Update counts
        DOMHelpers.updateCounts('invTotalCount', 'invFilteredCount', State.inventoryItems.length, filtered.length);
        
        // Render items
        this.renderInventory(filtered);
    },
    
    renderInventory(items) {
        const container = document.getElementById('inventoryContainer');
        
        if (!items || items.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('📦', 'No items in your inventory match the current filters');
            return;
        }
        
        if (State.currentView === 'grid') {
            container.className = 'items-grid';
            container.innerHTML = items.map((item, idx) => 
                UIComponents.renderItemCard(item, idx, false)
            ).join('');
        } else {
            container.className = 'items-list';
            container.innerHTML = items.map((item, idx) => 
                UIComponents.renderItemRow(item, idx, false, null)
            ).join('');
        }
    }
};

// Global functions (called from HTML)
function applyInventoryFilters() {
    Inventory.applyFilters();
}

async function loadInventoryWithToken() {
    const token = document.getElementById('inventoryToken')?.value.trim();
    const statusDiv = document.getElementById('inventoryLoadStatus');
    
    console.log('loadInventoryWithToken called with token:', token ? 'YES' : 'NO');
    
    if (!token) {
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--danger); font-size: 0.9rem;">⚠️ Please enter a token</div>';
        }
        return;
    }
    
    try {
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--accent); font-size: 0.9rem;">⏳ Loading inventory...</div>';
        }
        
        console.log('Saving token...');
        const saved = await TokenManager.saveToken(token);
        console.log('Token save result:', saved);
        
        if (!saved) {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--danger); font-size: 0.9rem;">⚠️ Failed to save token</div>';
            }
            return;
        }
        
        console.log('Loading inventory from API...');
        await Inventory.loadInventory(token);
        
        console.log('Applying filters to display items...');
        Inventory.applyFilters();
        
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--success); font-size: 0.9rem;">✓ Inventory loaded successfully!</div>';
        }
        
        console.log('Hiding token input section, showing loaded section...');
        DOMHelpers.hideTokenInput();
        
        console.log('✓ Inventory load complete!');
    } catch (e) {
        console.error('Error loading inventory:', e);
        if (statusDiv) {
            statusDiv.innerHTML = `<div style="color: var(--danger); font-size: 0.9rem;">✗ Error: ${e.message}</div>`;
        }
    }
}

function changeInventoryToken() {
    console.log('Changing token - showing input section');
    DOMHelpers.showTokenInput();
    
    const tokenInput = document.getElementById('inventoryToken');
    if (tokenInput) {
        tokenInput.value = '';
    }
    
    // Hide user profile when changing token
    Inventory.hideUserProfile();
    
    // Clear user data
    State.userData = null;
}
