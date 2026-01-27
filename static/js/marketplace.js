// Marketplace Tab Functions
const Marketplace = {
    applyFilters() {
        if (State.currentTab !== 'marketplace') return;
        
        const username = document.getElementById('filterUsername').value.toLowerCase();
        const itemName = document.getElementById('filterItemName').value;
        const slot = document.getElementById('filterSlot').value;
        const itemClass = document.getElementById('filterItemClass').value;
        const extraProp = document.getElementById('filterExtraProperty').value;
        const minPower = parseFloat(document.getElementById('filterMinPower').value) || 0;
        const maxPower = parseFloat(document.getElementById('filterMaxPower').value) || 999;
        const minRange = parseFloat(document.getElementById('filterMinRange').value);
        const maxRange = parseFloat(document.getElementById('filterMaxRange').value);
        const maxPlat = parseFloat(document.getElementById('filterMaxPlatinum').value);
        const maxGold = parseFloat(document.getElementById('filterMaxGold').value);
        const maxGems = parseFloat(document.getElementById('filterMaxGems').value);
        
        let filtered = State.allListings.filter(item => {
            if (username && !item.username.toLowerCase().includes(username)) return false;
            
            if (itemName) {
                const name = Utils.getItemName(item.base_item_id, item.slot);
                if (name !== itemName) return false;
            }
            
            if (slot && item.slot !== slot) return false;
            
            if (itemClass) {
                const gameItemClasses = Utils.getItemClass(item.base_item_id, item.slot); // Now returns array
                if (!gameItemClasses.includes(itemClass)) return false;
            }
            
            if (extraProp) {
                const itemStats = Utils.getItemStatTypes(item, true);
                if (!itemStats.includes(extraProp)) return false;
            }
            
            const power = parseFloat(item.power) * 100;
            if (power < minPower || power > maxPower) return false;
            
            const range = Utils.getRange(item);
            if (!isNaN(minRange) && (!range || range < minRange)) return false;
            if (!isNaN(maxRange) && (!range || range > maxRange)) return false;
            
            const plat = parseInt(item.platinum_cost) || 0;
            const gold = parseInt(item.gold_cost) || 0;
            const gems = parseInt(item.gem_cost) || 0;
            
            if (!isNaN(maxPlat) && plat > maxPlat) return false;
            if (!isNaN(maxGold)) {
                const totalGold = plat * CONFIG.PLATINUM_TO_GOLD + gold;
                if (totalGold > maxGold) return false;
            }
            if (!isNaN(maxGems) && gems > maxGems) return false;
            
            return true;
        });
        
        document.getElementById('totalCount').textContent = State.allListings.length;
        document.getElementById('filteredCount').textContent = filtered.length;
        
        // Apply sorting
        const sortBy = document.getElementById('marketplaceSortBy').value;
        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'time_newest':
                    return new Date(b.time_created) - new Date(a.time_created);
                case 'time_oldest':
                    return new Date(a.time_created) - new Date(b.time_created);
                case 'power_high':
                    return parseFloat(b.power) - parseFloat(a.power);
                case 'power_low':
                    return parseFloat(a.power) - parseFloat(b.power);
                case 'price_low':
                    return Utils.getTotalGoldValue(a) - Utils.getTotalGoldValue(b);
                case 'price_high':
                    return Utils.getTotalGoldValue(b) - Utils.getTotalGoldValue(a);
                default:
                    return 0;
            }
        });
        
        this.renderItems(filtered);
    },
    
    renderItems(items) {
        const container = document.getElementById('itemsContainer');
        
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div>No items match your filters</div>
                </div>
            `;
            return;
        }
        
        if (State.currentView === 'grid') {
            container.className = 'items-grid';
            container.innerHTML = items.map((item, idx) => {
                const name = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown Item';
                const power = (parseFloat(item.power) * 100).toFixed(1);
                const type = Utils.getPowerType(item);
                const range = Utils.getRange(item);
                const statColor = Utils.getStatColor(type);
                const totalGold = Utils.getTotalGoldValue(item);
                
                // Get analysis data for comparison
                const stats = Utils.getItemStatTypes(item, true);
                const analysisData = Utils.getAnalysisForItem(item.base_item_id, item.slot, stats);
                
                // Get slot-wide analysis (all items in same slot with same power type)
                const slotAnalysisData = Utils.getSlotAnalysis(item.slot, type);
                
                let comparisonHTML = '';
                if (analysisData && slotAnalysisData) {
                    const powerFloat = parseFloat(item.power) * 100;
                    
                    // Same item comparison
                    const itemPowerPercent = ((powerFloat - analysisData.minPower) / (analysisData.maxPower - analysisData.minPower) * 100);
                    const itemPricePercent = ((totalGold - analysisData.minPrice) / (analysisData.maxPrice - analysisData.minPrice) * 100);
                    
                    // Slot-wide comparison
                    const slotPowerPercent = ((powerFloat - slotAnalysisData.minPower) / (slotAnalysisData.maxPower - slotAnalysisData.minPower) * 100);
                    const slotPricePercent = ((totalGold - slotAnalysisData.minPrice) / (slotAnalysisData.maxPrice - slotAnalysisData.minPrice) * 100);
                    
                    const itemPowerClass = powerFloat >= analysisData.maxPower * 0.9 ? 'comparison-good' : 
                                          powerFloat <= analysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
                    const itemPriceClass = totalGold <= analysisData.minPrice * 1.1 ? 'comparison-good' : 
                                          totalGold >= analysisData.maxPrice * 0.9 ? 'comparison-bad' : 'comparison-neutral';
                    
                    const slotPowerClass = powerFloat >= slotAnalysisData.maxPower * 0.9 ? 'comparison-good' : 
                                          powerFloat <= slotAnalysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
                    const slotPriceClass = totalGold <= slotAnalysisData.minPrice * 1.1 ? 'comparison-good' : 
                                          totalGold >= slotAnalysisData.maxPrice * 0.9 ? 'comparison-bad' : 'comparison-neutral';
                    
                    // Calculate cost per power point
                    const itemCostPerPower = totalGold / powerFloat;
                    const avgItemCostPerPower = analysisData.avgCostPerPower || (analysisData.avgPrice / analysisData.avgPower);
                    const avgSlotCostPerPower = slotAnalysisData.avgCostPerPower || (slotAnalysisData.avgPrice / slotAnalysisData.avgPower);
                    
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
                                <div class="comparison-row">
                                    <span class="comparison-label">Price</span>
                                    <div style="flex: 1; margin-left: 0.75rem;">
                                        <div class="comparison-bar">
                                            <div class="comparison-bar-fill ${itemPriceClass}" style="width: ${itemPricePercent}%"></div>
                                            <div class="comparison-marker" style="left: ${itemPricePercent}%"></div>
                                        </div>
                                        <div style="font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                                            ${Utils.formatGold(analysisData.minPrice)} ← ${Utils.formatGold(totalGold)} → ${Utils.formatGold(analysisData.maxPrice)}
                                        </div>
                                    </div>
                                </div>
                                <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem; display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-dim);">Avg Cost/Power:</span>
                                    <span style="font-family: 'Space Mono', monospace; font-weight: 600; color: ${itemCostPerPower < avgItemCostPerPower * 0.9 ? 'var(--success)' : itemCostPerPower > avgItemCostPerPower * 1.1 ? 'var(--danger)' : 'var(--text)'};">
                                        ${Utils.formatGold(itemCostPerPower)}/% (Avg: ${Utils.formatGold(avgItemCostPerPower)}/%)
                                    </span>
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
                                <div class="comparison-row">
                                    <span class="comparison-label">Price</span>
                                    <div style="flex: 1; margin-left: 0.75rem;">
                                        <div class="comparison-bar">
                                            <div class="comparison-bar-fill ${slotPriceClass}" style="width: ${slotPricePercent}%"></div>
                                            <div class="comparison-marker" style="left: ${slotPricePercent}%"></div>
                                        </div>
                                        <div style="font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                                            ${Utils.formatGold(slotAnalysisData.minPrice)} ← ${Utils.formatGold(totalGold)} → ${Utils.formatGold(slotAnalysisData.maxPrice)}
                                        </div>
                                    </div>
                                </div>
                                <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem; display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-dim);">Avg Cost/Power:</span>
                                    <span style="font-family: 'Space Mono', monospace; font-weight: 600; color: ${itemCostPerPower < avgSlotCostPerPower * 0.9 ? 'var(--success)' : itemCostPerPower > avgSlotCostPerPower * 1.1 ? 'var(--danger)' : 'var(--text)'};">
                                        ${Utils.formatGold(itemCostPerPower)}/% (Avg: ${Utils.formatGold(avgSlotCostPerPower)}/%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                return `
                    <div class="item-card" style="animation-delay: ${idx * 0.05}s" onclick="filterToItem('${Utils.escapeHtml(name)}', '${item.slot}', '${Utils.getItemClass(item.base_item_id, item.slot)[0]}')">
                        <div class="card-header">
                            <div>
                                <div class="item-id">#${item.id}</div>
                                <div class="item-name">${Utils.escapeHtml(name)}</div>
                                <div class="item-seller">by ${Utils.escapeHtml(item.username)}</div>
                            </div>
                            <div class="slot-badge ${item.slot}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.formatSlot(item.slot)}</div>
                        </div>
                        <div class="card-stats">
                            <div class="stat-row">
                                <div class="stat-type" style="color: ${statColor}">${type}</div>
                                <div class="stat-value-display" style="color: ${statColor}">${power}%</div>
                            </div>
                            ${range ? `<div class="stat-row"><div class="stat-type">Range</div><div class="stat-value-display">${range}</div></div>` : ''}
                        </div>
                        <div class="item-price">
                            ${Utils.formatPrice(item)}
                        </div>
                        <div class="card-footer">
                            <div class="item-time" data-tooltip="${new Date(item.time_created).toLocaleString()}">${Utils.formatTime(item.time_created)}</div>
                        </div>
                        ${comparisonHTML}
                    </div>
                `;
            }).join('');
        } else {
            container.className = 'items-list';
            container.innerHTML = items.map((item, idx) => {
                const name = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown Item';
                const power = (parseFloat(item.power) * 100).toFixed(1);
                const type = Utils.getPowerType(item);
                const range = Utils.getRange(item);
                const statColor = Utils.getStatColor(type);
                const totalGold = Utils.getTotalGoldValue(item);
                
                // Get analysis data for comparison
                const stats = Utils.getItemStatTypes(item, true);
                const analysisData = Utils.getAnalysisForItem(item.base_item_id, item.slot, stats);
                
                // Get slot-wide analysis
                const slotAnalysisData = Utils.getSlotAnalysis(item.slot, type);
                
                let comparisonHTML = '';
                if (analysisData && slotAnalysisData) {
                    const powerFloat = parseFloat(item.power) * 100;
                    
                    // Same item comparison
                    const itemPowerPercent = ((powerFloat - analysisData.minPower) / (analysisData.maxPower - analysisData.minPower) * 100);
                    const itemPricePercent = ((totalGold - analysisData.minPrice) / (analysisData.maxPrice - analysisData.minPrice) * 100);
                    
                    // Slot-wide comparison
                    const slotPowerPercent = ((powerFloat - slotAnalysisData.minPower) / (slotAnalysisData.maxPower - slotAnalysisData.minPower) * 100);
                    const slotPricePercent = ((totalGold - slotAnalysisData.minPrice) / (slotAnalysisData.maxPrice - slotAnalysisData.minPrice) * 100);
                    
                    const itemPowerClass = powerFloat >= analysisData.maxPower * 0.9 ? 'comparison-good' : 
                                          powerFloat <= analysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
                    const itemPriceClass = totalGold <= analysisData.minPrice * 1.1 ? 'comparison-good' : 
                                          totalGold >= analysisData.maxPrice * 0.9 ? 'comparison-bad' : 'comparison-neutral';
                    
                    const slotPowerClass = powerFloat >= slotAnalysisData.maxPower * 0.9 ? 'comparison-good' : 
                                          powerFloat <= slotAnalysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
                    const slotPriceClass = totalGold <= slotAnalysisData.minPrice * 1.1 ? 'comparison-good' : 
                                          totalGold >= slotAnalysisData.maxPrice * 0.9 ? 'comparison-bad' : 'comparison-neutral';
                    
                    // Calculate cost per power point
                    const itemCostPerPower = totalGold / powerFloat;
                    const avgItemCostPerPower = analysisData.avgCostPerPower || (analysisData.avgPrice / analysisData.avgPower);
                    const avgSlotCostPerPower = slotAnalysisData.avgCostPerPower || (slotAnalysisData.avgPrice / slotAnalysisData.avgPower);
                    
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
                                <div class="comparison-row">
                                    <span class="comparison-label">Price</span>
                                    <div style="flex: 1; margin-left: 0.75rem;">
                                        <div class="comparison-bar">
                                            <div class="comparison-bar-fill ${itemPriceClass}" style="width: ${itemPricePercent}%"></div>
                                            <div class="comparison-marker" style="left: ${itemPricePercent}%"></div>
                                        </div>
                                        <div style="font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                                            ${Utils.formatGold(analysisData.minPrice)} ← ${Utils.formatGold(totalGold)} → ${Utils.formatGold(analysisData.maxPrice)}
                                        </div>
                                    </div>
                                </div>
                                <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem; display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-dim);">Avg Cost/Power:</span>
                                    <span style="font-family: 'Space Mono', monospace; font-weight: 600; color: ${itemCostPerPower < avgItemCostPerPower * 0.9 ? 'var(--success)' : itemCostPerPower > avgItemCostPerPower * 1.1 ? 'var(--danger)' : 'var(--text)'};">
                                        ${Utils.formatGold(itemCostPerPower)}/% (Avg: ${Utils.formatGold(avgItemCostPerPower)}/%)
                                    </span>
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
                                <div class="comparison-row">
                                    <span class="comparison-label">Price</span>
                                    <div style="flex: 1; margin-left: 0.75rem;">
                                        <div class="comparison-bar">
                                            <div class="comparison-bar-fill ${slotPriceClass}" style="width: ${slotPricePercent}%"></div>
                                            <div class="comparison-marker" style="left: ${slotPricePercent}%"></div>
                                        </div>
                                        <div style="font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                                            ${Utils.formatGold(slotAnalysisData.minPrice)} ← ${Utils.formatGold(totalGold)} → ${Utils.formatGold(slotAnalysisData.maxPrice)}
                                        </div>
                                    </div>
                                </div>
                                <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem; display: flex; justify-content: space-between;">
                                    <span style="color: var(--text-dim);">Avg Cost/Power:</span>
                                    <span style="font-family: 'Space Mono', monospace; font-weight: 600; color: ${itemCostPerPower < avgSlotCostPerPower * 0.9 ? 'var(--success)' : itemCostPerPower > avgSlotCostPerPower * 1.1 ? 'var(--danger)' : 'var(--text)'};">
                                        ${Utils.formatGold(itemCostPerPower)}/% (Avg: ${Utils.formatGold(avgSlotCostPerPower)}/%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                return `
                    <div class="item-row" style="animation-delay: ${idx * 0.02}s" onclick="filterToItem('${Utils.escapeHtml(name)}', '${item.slot}', '${Utils.getItemClass(item.base_item_id, item.slot)[0]}')">
                        <div class="item-id">#${item.id}</div>
                        <div>
                            <div class="item-name">${Utils.escapeHtml(name)}</div>
                            <div class="item-seller">by ${Utils.escapeHtml(item.username)}</div>
                        </div>
                        <div class="slot-badge ${item.slot}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.formatSlot(item.slot)}</div>
                        <div style="text-align: center;">
                            <div class="stat-type" style="color: ${statColor}">${type}</div>
                            ${range ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin: 0.25rem 0;">⟷ ${range}</div>` : ''}
                            <div style="font-family: 'Space Mono', monospace; font-weight: 700; color: ${statColor};">${power}%</div>
                        </div>
                        <div>${Utils.formatPrice(item)}</div>
                        <div class="item-time">${Utils.formatTime(item.time_created)}</div>
                        ${comparisonHTML}
                    </div>
                `;
            }).join('');
        }
    }
};

// Global functions (called from HTML)
function applyFilters() {
    Marketplace.applyFilters();
}

function setView(view, event) {
    State.currentView = view;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    Marketplace.applyFilters();
}

function filterToItem(itemName, slot, itemClass) {
    // Clear all filters first
    document.getElementById('filterUsername').value = '';
    document.getElementById('filterMinPower').value = '';
    document.getElementById('filterMaxPower').value = '';
    document.getElementById('filterMinRange').value = '';
    document.getElementById('filterMaxRange').value = '';
    document.getElementById('filterMaxPlatinum').value = '';
    document.getElementById('filterMaxGold').value = '';
    document.getElementById('filterMaxGems').value = '';
    document.getElementById('filterExtraProperty').value = '';
    
    // Set filters for the clicked item
    document.getElementById('filterItemName').value = itemName;
    document.getElementById('filterSlot').value = slot;
    document.getElementById('filterItemClass').value = itemClass;
    
    // Apply filters
    Marketplace.applyFilters();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
