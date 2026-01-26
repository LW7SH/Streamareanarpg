// Analysis Tab Functions
const Analysis = {
    calculateItemAnalysis() {
        const itemMap = new Map();
        
        State.allListings.forEach(listing => {
            const name = Utils.getItemName(listing.base_item_id, listing.slot) || 'Unknown Item';
            const power = parseFloat(listing.power) * 100;
            const totalGold = Utils.getTotalGoldValue(listing);
            const itemClass = Utils.getItemClass(listing.base_item_id, listing.slot);
            
            // Get the actual stats this specific listing has
            const stats = Utils.getItemStatTypes(listing, true); // onlyActual=true
            const statsKey = stats.sort().join('+') || 'No Stats';
            
            // Create unique key: base_item_id + slot + stat combination
            const key = `${listing.base_item_id}_${listing.slot}_${statsKey}`;
            
            if (!itemMap.has(key)) {
                itemMap.set(key, {
                    name: name,
                    slot: listing.slot,
                    class: itemClass,
                    base_item_id: listing.base_item_id,
                    stats: stats,
                    statsDisplay: stats.length > 0 ? stats.join(' + ') : 'No Stats',
                    listings: [],
                    powerValues: [],
                    prices: [],
                    minPower: power,
                    maxPower: power,
                    minPrice: totalGold,
                    maxPrice: totalGold,
                    minPowerListing: listing,
                    maxPowerListing: listing,
                    minPriceListing: listing,
                    maxPriceListing: listing,
                    count: 0
                });
            }
            
            const data = itemMap.get(key);
            data.listings.push(listing);
            data.powerValues.push(power);
            data.prices.push(totalGold);
            data.count++;
            
            if (power < data.minPower) {
                data.minPower = power;
                data.minPowerListing = listing;
            }
            if (power > data.maxPower) {
                data.maxPower = power;
                data.maxPowerListing = listing;
            }
            if (totalGold < data.minPrice) {
                data.minPrice = totalGold;
                data.minPriceListing = listing;
            }
            if (totalGold > data.maxPrice) {
                data.maxPrice = totalGold;
                data.maxPriceListing = listing;
            }
        });
        
        // Calculate averages for each item group
        itemMap.forEach(data => {
            data.avgPower = data.powerValues.reduce((a, b) => a + b, 0) / data.powerValues.length;
            data.avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
            data.avgCostPerPower = data.avgPrice / data.avgPower;
        });
        
        State.itemAnalysisData = Array.from(itemMap.values());
        console.log('✓ Item analysis calculated:', State.itemAnalysisData.length, 'unique item+stat combinations');
    },
    
    applyFilters() {
        const nameFilter = document.getElementById('analysisFilterName').value.toLowerCase();
        const slotFilter = document.getElementById('analysisFilterSlot').value;
        const classFilter = document.getElementById('analysisFilterClass').value;
        const statFilter = document.getElementById('analysisFilterStat').value;
        const sortBy = document.getElementById('analysisSortBy').value;
        
        let filtered = State.itemAnalysisData.filter(item => {
            if (nameFilter && !item.name.toLowerCase().includes(nameFilter)) return false;
            if (slotFilter && item.slot !== slotFilter) return false;
            if (classFilter && item.class !== classFilter) return false;
            if (statFilter && !item.stats.includes(statFilter)) return false;
            return true;
        });
        
        // Sort
        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'listings': return b.count - a.count;
                case 'maxPower': return b.maxPower - a.maxPower;
                case 'minPrice': return a.minPrice - b.minPrice;
                case 'maxPrice': return b.maxPrice - a.maxPrice;
                default: return 0;
            }
        });
        
        document.getElementById('analysisTotalCount').textContent = State.itemAnalysisData.length;
        document.getElementById('analysisFilteredCount').textContent = filtered.length;
        
        this.renderAnalysis(filtered);
    },
    
    renderAnalysis(items) {
        const container = document.getElementById('analysisContainer');
        
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div>No items match your filters</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = items.map((item, idx) => {
            const statTypes = item.statsDisplay;
            const avgPower = (item.powerValues.reduce((a,b) => a+b, 0) / item.powerValues.length).toFixed(1);
            const minPowerForPrice = (parseFloat(item.minPriceListing.power) * 100).toFixed(1);
            const maxPowerForPrice = (parseFloat(item.maxPriceListing.power) * 100).toFixed(1);
            
            // Calculate tier based on max power for this item
            const powerRange = item.maxPower - item.minPower;
            const powerPercentile = powerRange > 0 ? ((item.maxPower - item.minPower) / powerRange * 100) : 100;
            const tier = Utils.getTierFromPercentile(powerPercentile >= 90 ? 100 : item.maxPower, item.count); // Use count for generosity
            
            return `
                <div class="analysis-card clickable" style="animation-delay: ${idx * 0.05}s" onclick="navigateToMarketplace('${Utils.escapeHtml(item.name)}', '${item.slot}', '${item.class}', '${item.stats.join(',')}')">
                    <div class="analysis-header">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.5rem;">
                                <div class="analysis-name">${Utils.escapeHtml(item.name)}</div>
                                <div style="background: ${tier.color}; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.7rem; font-family: 'Space Mono', monospace; white-space: nowrap;">${tier.tier}</div>
                            </div>
                            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center; flex-wrap: wrap;">
                                <div class="slot-badge ${item.slot}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.formatSlot(item.slot)}</div>
                                <span class="listing-count">${item.count} listing${item.count !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analysis-stats">
                        <div class="stat-group">
                            <div class="stat-group-title">📈 Stats & Class</div>
                            <div class="stat-detail">
                                <span class="stat-label">Stat Type(s)</span>
                                <span class="stat-value-number ${Utils.getStatClass(statTypes)}" style="font-size: 0.85rem;">${statTypes}</span>
                            </div>
                            <div class="stat-detail">
                                <span class="stat-label">Class</span>
                                <span class="stat-value-number" style="font-size: 0.85rem;">${item.class}</span>
                            </div>
                        </div>
                        
                        <div class="stat-group">
                            <div class="stat-group-title">🎯 Power Range</div>
                            <div class="stat-detail">
                                <span class="stat-label">Minimum</span>
                                <span class="stat-value-number">${item.minPower.toFixed(1)}%</span>
                            </div>
                            <div class="stat-detail">
                                <span class="stat-label">Average</span>
                                <span class="stat-value-number">${avgPower}%</span>
                            </div>
                            <div class="stat-detail">
                                <span class="stat-label">Maximum</span>
                                <span class="stat-value-number">${item.maxPower.toFixed(1)}%</span>
                            </div>
                        </div>
                        
                        <div class="stat-group">
                            <div class="stat-group-title">💰 Price Range</div>
                            <div class="stat-detail">
                                <span class="stat-label">Cheapest (${minPowerForPrice}% power)</span>
                                <span class="stat-value-number" style="color: var(--success); font-size: 0.85rem;">${Utils.formatPriceBreakdown(item.minPrice)}</span>
                            </div>
                            <div class="stat-detail">
                                <span class="stat-label">Most Expensive (${maxPowerForPrice}% power)</span>
                                <span class="stat-value-number" style="color: var(--danger); font-size: 0.85rem;">${Utils.formatPriceBreakdown(item.maxPrice)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="analysis-card-footer">
                        <span style="color: var(--primary); font-size: 0.75rem; font-weight: 600;">🔍 Click to view in marketplace</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// Global functions (called from HTML)
function applyAnalysisFilters() {
    Analysis.applyFilters();
}

function navigateToMarketplace(itemName, slot, itemClass, statsString) {
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
    document.getElementById('marketplaceSortBy').value = 'time_newest';
    
    // Switch to marketplace tab
    switchTab('marketplace');
    
    // Set filters based on the clicked analysis item
    // Set item name filter directly
    document.getElementById('filterItemName').value = itemName;
    
    // Set slot filter
    document.getElementById('filterSlot').value = slot;
    
    // Set class filter
    document.getElementById('filterItemClass').value = itemClass;
    
    // Set stat filter if there's only one stat
    const stats = statsString.split(',').filter(s => s && s !== 'No Stats');
    if (stats.length === 1) {
        document.getElementById('filterExtraProperty').value = stats[0];
    }
    
    // Apply filters
    applyFilters();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
