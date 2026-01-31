// Inventory Tab Functions
const Inventory = {
    async loadInventory(token) {
        // If no token is provided, try cookie-based auth flow
        if (!token) {
            return this.loadInventoryAuth();
        }
        if (!token || !token.trim()) {
            throw new Error('Token is required');
        }
        
        UIStatus.setInventoryStatus('Loading...');
        Store.resetArray('inventoryItems');
        
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
                Store.set('userData', firstPage.user);
                this.displayUserProfile(firstPage.user);
            }
            
            Store.set('inventoryItems', firstPage.player_items || []);
            const totalPages = firstPage.total_pages || 1;
            
            UIStatus.setText('totalInventoryItems', (firstPage.player_items || []).length);
            
            // Load remaining pages
            const remaining = [];
            for (let p = 2; p <= totalPages; p++) {
                remaining.push(API.getInventory(token, p));
            }
            
            if (remaining.length > 0) {
                const results = await Promise.all(remaining);
                results.forEach(data => {
                    if (data.player_items) Store.pushMany('inventoryItems', data.player_items);
                });
            }
            
            // Load characters data to build equipped item map
            if (!State.characters || State.characters.length === 0) {
                console.log('Loading characters for equipped item tracking...');
                await Characters.loadCharacters();
            } else {
                // Rebuild equipped map with existing characters
                Utils.buildEquippedItemMap(State.characters);
            }
            
            UIStatus.setInventoryStatus('Loaded');
            console.log('✓ Inventory loaded:', Store.get('inventoryItems').length, 'items');
            
            // Update unique count
            const uniqueInv = new Set();
            Store.get('inventoryItems').forEach(item => {
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
        // Use State.inventoryItems directly (Store is just a wrapper around State)
        const inventoryItems = State.inventoryItems || [];
        
        console.log('🔍 INVENTORY applyFilters called');
        console.log('  Total items in State.inventoryItems:', inventoryItems.length);
        
        // Show breakdown by slot
        const bySlot = {};
        inventoryItems.forEach(item => {
            bySlot[item.slot] = (bySlot[item.slot] || 0) + 1;
        });
        console.log('  Items by slot:', bySlot);
        
        // CRITICAL: Rebuild equipped item map if we have characters but no map
        if (State.characters && State.characters.length > 0) {
            if (!State.equippedItemMap || Object.keys(State.equippedItemMap).length === 0) {
                console.log('⚠️ Rebuilding equipped item map in inventory filter');
                Utils.buildEquippedItemMap(State.characters);
            }
        }
        
        // Get filters from DOM
        const filterConfig = FilterEngine.getInventoryFilters();
        console.log('  Filter config:', filterConfig);
        
        // Apply filters
        let filtered = FilterEngine.applyItemFilters(inventoryItems, filterConfig);
        console.log('  After filtering:', filtered.length, 'items');
        
        // Show filtered breakdown by slot
        const filteredBySlot = {};
        filtered.forEach(item => {
            filteredBySlot[item.slot] = (filteredBySlot[item.slot] || 0) + 1;
        });
        console.log('  Filtered items by slot:', filteredBySlot);
        
        // Apply sorting
        const sortBy = document.getElementById('invSortBy')?.value || document.getElementById('inventorySortBy')?.value || 'time_newest';
        filtered = FilterEngine.sortItems(filtered, sortBy);
        
        // Update counts
        const totalEl = document.getElementById('totalInventoryItems');
        if (totalEl) totalEl.textContent = inventoryItems.length;

        const filteredEl = document.getElementById('filteredInventoryItems');
        if (filteredEl) filteredEl.textContent = filtered.length;

        // Unique count (by item name + slot + power type)
        const uniqueSet = new Set(filtered.map(it => `${Utils.getItemName(it.base_item_id, it.slot)}|${it.slot}|${Utils.getPowerType(it)}`));
        const uniqueEl = document.getElementById('uniqueInventoryItems');
        if (uniqueEl) uniqueEl.textContent = uniqueSet.size;

        // FIXED: Count equipped items from the equippedItemMap (total in inventory, not just filtered view)
        // This matches how Overview page calculates it
        const totalEquippedCount = Object.keys(State.equippedItemMap || {}).length;
        const equippedEl = document.getElementById('inventoryEquippedCount');
        if (equippedEl) equippedEl.textContent = totalEquippedCount;

        // Listed count within inventory (total in inventory, not just filtered view)
        const totalListedCount = inventoryItems.filter(item => {
            const itemId = String(item?.id ?? '');
            return !!(State.listedItemMap && State.listedItemMap[itemId]);
        }).length;
        const listedEl = document.getElementById('inventoryListedCount');
        if (listedEl) listedEl.textContent = totalListedCount;

        // Render items
        console.log('  Rendering', filtered.length, 'items...');
        this.renderInventory(filtered);
    },
    
    renderInventory(items) {
        UIListRenderer.render('inventoryContainer', items, {
            emptyIcon: '📦',
            emptyText: 'No items in your inventory match the current filters',
            card: (item, idx) => UIComponents.renderItemCard(item, idx, false),
            row:  (item, idx) => UIComponents.renderItemRow(item, idx, false, null)
        });
        
        // Also render chests when rendering inventory
        this.renderChests();
    },
    
    renderChests() {
        const container = document.getElementById('inventoryChests');
        const countEl = document.getElementById('inventoryChestsCount');
        
        if (!container) return;
        
        if (!State.playerChests || State.playerChests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div>No chests owned</div>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }
        
        if (countEl) countEl.textContent = State.playerChests.length;
        
        // Count chests by type
        const chestCounts = {};
        State.playerChests.forEach(chest => {
            const chestId = chest.loot_chest_type_id || chest.chest_id || 'unknown';
            chestCounts[chestId] = (chestCounts[chestId] || 0) + 1;
        });
        
        // Get chest details
        const chestTypes = State.chestTypes || [];
        
        const html = Object.entries(chestCounts).map(([chestId, count]) => {
            const chestType = chestTypes.find(c => String(c.id) === String(chestId));
            const chestName = chestType?.name || `Chest ${chestId}`;
            const rarity = chestType?.rarity || 'common';
            
            return `
                <div class="chest-card" data-rarity="${rarity}">
                    <div class="chest-icon">📦</div>
                    <div class="chest-name">${Utils.escapeHtml(chestName)}</div>
                    <div class="chest-count">×${count}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    async loadInventoryAuth() {
        UIStatus.setInventoryStatus('Loading...');
        Store.resetArray('inventoryItems');
        State.inventoryItems = [];
        try {
            const fetchPage = async (page) => {
                const r = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ page })
                });
                if (!r.ok) throw new Error('Failed to load inventory (HTTP ' + r.status + ')');
                return r.json();
            };
            const first = await fetchPage(1);
            const items = Array.isArray(first.player_items) ? first.player_items.slice() : [];
            const totalPages = parseInt(first.total_pages || 1);
            if (totalPages > 1) {
                const rest = await Promise.all(Array.from({length: totalPages-1}, (_,i)=>fetchPage(i+2)));
                rest.forEach(d => { if (Array.isArray(d.player_items)) items.push(...d.player_items); });
            }
            State.inventoryItems = items;
            Store.set('inventoryItems', items);
            if (first.user) {
                State.userData = Utils.normalizeUserData(first.user);
                Store.set('userData', first.user);
                this.displayUserProfile(first.user);
            }
            
            // Load characters data to build equipped item map
            if (!State.characters || State.characters.length === 0) {
                console.log('Loading characters for equipped item tracking...');
                await Characters.loadCharacters();
            } else {
                // Rebuild equipped map with existing characters
                Utils.buildEquippedItemMap(State.characters);
            }
            
            if (Array.isArray(State.myListings) && State.myListings.length) {
                Utils.buildListedItemMap(State.myListings);
            }
            UIStatus.setInventoryStatus('Live');
            console.log('✓ Inventory (auth) loaded:', items.length);
            return true;
        } catch (e) {
            console.error('✗ Inventory auth load failed:', e);
            UIStatus.setInventoryStatus('Error');
            return false;
        }
    },
    
    clearFilters() {
        // Clear all filter inputs
        const filterIds = [
            'invFilterItemName',
            'invFilterSlot', 
            'invFilterItemClass',
            'invFilterStatus',
            'invFilterExtraProperty',
            'invFilterTwoHanded',
            'invFilterMinPower',
            'invFilterMaxPower',
            'invFilterMinRange',
            'invFilterMaxRange'
        ];
        
        filterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'SELECT') {
                    element.selectedIndex = 0;
                } else if (element.tagName === 'INPUT') {
                    element.value = '';
                }
            }
        });
        
        // Reset sort to default
        const sortBy = document.getElementById('invSortBy');
        if (sortBy) sortBy.value = 'time_newest';
        
        // Reapply filters (which are now cleared)
        this.applyFilters();
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


