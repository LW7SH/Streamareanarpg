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
            console.log('Response keys:', Object.keys(firstPage));
            
            if (!firstPage.player_items) {
                console.error('No player_items in response:', firstPage);
                throw new Error('No inventory items found');
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
    
    applyFilters() {
        const itemNameFilter = document.getElementById('invFilterItemName').value;
        const slotFilter = document.getElementById('invFilterSlot').value;
        const classFilter = document.getElementById('invFilterItemClass').value;
        const extraPropFilter = document.getElementById('invFilterExtraProperty').value;
        const twoHandedFilter = document.getElementById('invFilterTwoHanded').value;
        const minPower = parseFloat(document.getElementById('invFilterMinPower').value) || 0;
        const maxPower = parseFloat(document.getElementById('invFilterMaxPower').value) || Infinity;
        const minRange = parseInt(document.getElementById('invFilterMinRange').value) || 0;
        const maxRange = parseInt(document.getElementById('invFilterMaxRange').value) || Infinity;
        const sortBy = document.getElementById('inventorySortBy').value;
        
        let filtered = State.inventoryItems.filter(item => {
            // Item name
            if (itemNameFilter) {
                const name = Utils.getItemName(item.base_item_id, item.slot);
                if (!name || name !== itemNameFilter) return false;
            }
            
            // Slot
            if (slotFilter && item.slot !== slotFilter) return false;
            
            // Class
            if (classFilter) {
                const classes = Utils.getItemClass(item.base_item_id, item.slot);
                if (!classes.includes(classFilter)) return false;
            }
            
            // Extra property (stat type)
            if (extraPropFilter) {
                const stats = Utils.getItemStatTypes(item);
                if (!stats.includes(extraPropFilter)) return false;
            }
            
            // Two Handed filter
            if (twoHandedFilter) {
                const isTwoHanded = !!Utils.getTwoHanded(item);
                if (twoHandedFilter === 'yes' && !isTwoHanded) return false;
                if (twoHandedFilter === 'no' && isTwoHanded) return false;
            }
            
            // Power
            const power = parseFloat(item.power) * 100;
            if (power < minPower || power > maxPower) return false;
            
            // Range
            const range = Utils.getRange(item);
            if (range !== null && (range < minRange || range > maxRange)) return false;
            
            return true;
        });
        
        // Sort
        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'time_newest':
                    return parseInt(b.id) - parseInt(a.id);
                case 'time_oldest':
                    return parseInt(a.id) - parseInt(b.id);
                case 'power_high':
                    return parseFloat(b.power) - parseFloat(a.power);
                case 'power_low':
                    return parseFloat(a.power) - parseFloat(b.power);
                case 'name':
                    const nameA = Utils.getItemName(a.base_item_id, a.slot) || '';
                    const nameB = Utils.getItemName(b.base_item_id, b.slot) || '';
                    return nameA.localeCompare(nameB);
                default:
                    return 0;
            }
        });
        
        document.getElementById('invTotalCount').textContent = State.inventoryItems.length;
        document.getElementById('invFilteredCount').textContent = filtered.length;
        
        this.renderInventory(filtered);
    },
    
    renderInventory(items) {
        const container = document.getElementById('inventoryContainer');
        
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div>No items in your inventory match the current filters</div>
                </div>
            `;
            return;
        }
        
        container.className = State.currentView === 'grid' ? 'items-grid' : 'items-list';
        
        container.innerHTML = items.map((item, idx) => {
            const name = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown Item';
            const power = (parseFloat(item.power) * 100).toFixed(1);
            const type = Utils.getPowerType(item);
            const range = Utils.getRange(item);
            const twoHandedValue = Utils.getTwoHanded(item);
            const statColor = Utils.getStatColor(type);
            
            // Get analysis data
            const stats = Utils.getItemStatTypes(item, true);
            const isTwoHanded = !!twoHandedValue;
            const analysisData = Utils.getAnalysisForItem(item.base_item_id, item.slot, stats, isTwoHanded);
            const slotAnalysisData = Utils.getSlotAnalysis(item.slot, type);
            
            let comparisonHTML = '';
            if (analysisData && slotAnalysisData) {
                const powerFloat = parseFloat(item.power) * 100;
                const itemPowerPercent = ((powerFloat - analysisData.minPower) / (analysisData.maxPower - analysisData.minPower) * 100);
                const slotPowerPercent = ((powerFloat - slotAnalysisData.minPower) / (slotAnalysisData.maxPower - slotAnalysisData.minPower) * 100);
                
                const itemPowerClass = powerFloat >= analysisData.maxPower * 0.9 ? 'comparison-good' : 
                                      powerFloat <= analysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
                const slotPowerClass = powerFloat >= slotAnalysisData.maxPower * 0.9 ? 'comparison-good' : 
                                      powerFloat <= slotAnalysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
                
                comparisonHTML = `
                    <div class="comparison-tooltip">
                        <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--primary); font-size: 0.75rem; text-align: center;">📊 MARKET COMPARISON</div>
                        
                        <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Same Item (${analysisData.count} listings)</div>
                                <div style="background: ${Utils.getTierFromPercentile(itemPowerPercent, analysisData.count).color}; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.7rem; font-family: 'Space Mono', monospace;">${Utils.getTierFromPercentile(itemPowerPercent, analysisData.count).tier}</div>
                            </div>
                            <div class="comparison-row">
                                <span class="comparison-label">Power</span>
                                <div style="flex: 1; margin-left: 0.75rem;">
                                    <div class="comparison-bar">
                                        <div class="comparison-bar-fill ${itemPowerClass}" style="width: ${itemPowerPercent}%"></div>
                                        <div class="comparison-marker" style="left: ${itemPowerPercent}%"></div>
                                    </div>
                                    <div style="font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                                        ${analysisData.minPower.toFixed(1)}% ← ${powerFloat.toFixed(1)}% → ${analysisData.maxPower.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                    <span style="color: var(--text-dim);">Price Range:</span>
                                    <span style="font-family: 'Space Mono', monospace; font-weight: 600;">
                                        ${Utils.formatGold(analysisData.minPrice)} - ${Utils.formatGold(analysisData.maxPrice)}
                                    </span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-dim);">Est. Value:</span>
                                    <span style="font-family: 'Space Mono', monospace; font-weight: 600; color: var(--success);">
                                        ~${Utils.formatGold(analysisData.avgPrice)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 6px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">All ${Utils.formatSlot(item.slot)} (${type})</div>
                                <div style="background: ${Utils.getTierFromPercentile(slotPowerPercent, slotAnalysisData.count).color}; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.7rem; font-family: 'Space Mono', monospace;">${Utils.getTierFromPercentile(slotPowerPercent, slotAnalysisData.count).tier}</div>
                            </div>
                            <div class="comparison-row">
                                <span class="comparison-label">Power</span>
                                <div style="flex: 1; margin-left: 0.75rem;">
                                    <div class="comparison-bar">
                                        <div class="comparison-bar-fill ${slotPowerClass}" style="width: ${slotPowerPercent}%"></div>
                                        <div class="comparison-marker" style="left: ${slotPowerPercent}%"></div>
                                    </div>
                                    <div style="font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                                        ${slotAnalysisData.minPower.toFixed(1)}% ← ${powerFloat.toFixed(1)}% → ${slotAnalysisData.maxPower.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="item-card" style="animation-delay: ${idx * 0.05}s">
                    <div class="card-header">
                        <div>
                            <div class="item-id">#${item.id}</div>
                            <div class="item-name">${Utils.escapeHtml(name)}</div>
                        </div>
                        <div class="slot-badge ${item.slot}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.formatSlot(item.slot)}</div>
                    </div>
                    <div class="card-stats">
                        <div class="stat-row">
                            <div class="stat-type" style="color: ${statColor}">${type}</div>
                            <div class="stat-value-display" style="color: ${statColor}">${power}%</div>
                        </div>
                        ${range ? `<div class="stat-row"><div class="stat-type">Range</div><div class="stat-value-display">${range}</div></div>` : ''}
                        ${twoHandedValue ? `<div class="stat-row"><div class="stat-type">Two Handed</div><div class="stat-value-display">${twoHandedValue}</div></div>` : ''}
                    </div>
                    ${comparisonHTML}
                </div>
            `;
        }).join('');
    }
};

// Global functions (called from HTML)
function applyInventoryFilters() {
    Inventory.applyFilters();
}

function clearInventoryFilters() {
    ['invFilterMinPower', 'invFilterMaxPower', 'invFilterMinRange', 'invFilterMaxRange'].forEach(id => {
        document.getElementById(id).value = '';
    });
    ['invFilterItemName', 'invFilterSlot', 'invFilterItemClass', 'invFilterExtraProperty', 'invFilterTwoHanded', 'inventorySortBy'].forEach(id => {
        document.getElementById(id).value = '';
    });
    Inventory.applyFilters();
}

async function loadInventoryWithToken() {
    const token = document.getElementById('inventoryToken').value.trim();
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
        // Save token to cookie/localStorage
        const saved = TokenManager.saveToken(token);
        console.log('Token save result:', saved);
        
        console.log('Loading inventory from API...');
        // Load inventory
        await Inventory.loadInventory(token);
        
        console.log('Applying filters to display items...');
        // Apply filters to display items
        Inventory.applyFilters();
        
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--success); font-size: 0.9rem;">✓ Inventory loaded successfully!</div>';
        }
        
        console.log('Hiding token input section, showing loaded section...');
        // Hide token input area after successful load
        const tokenInputSection = document.querySelector('.token-input-section');
        const tokenLoadedSection = document.querySelector('.token-loaded-section');
        
        if (tokenInputSection) {
            tokenInputSection.style.display = 'none';
        }
        if (tokenLoadedSection) {
            tokenLoadedSection.style.display = 'flex';
        }
        
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
    const tokenInputSection = document.querySelector('.token-input-section');
    const tokenLoadedSection = document.querySelector('.token-loaded-section');
    
    if (tokenInputSection) {
        tokenInputSection.style.display = 'block';
    }
    if (tokenLoadedSection) {
        tokenLoadedSection.style.display = 'none';
    }
    
    const tokenInput = document.getElementById('inventoryToken');
    if (tokenInput) {
        tokenInput.value = '';
    }
}
