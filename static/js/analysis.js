// Analysis Tab Functions
const Analysis = {
    calculateItemAnalysis() {
        const itemMap = new Map();
        
        State.allListings.forEach(listing => {
            const name = Utils.getItemName(listing.base_item_id, listing.slot) || 'Unknown Item';
            const power = parseFloat(listing.power) * 100;
            const totalGold = Utils.getTotalGoldValue(listing);
            const itemClasses = Utils.getItemClass(listing.base_item_id, listing.slot); // Now returns array
            const classDisplay = itemClasses.join(', '); // For display
            const isTwoHanded = !!Utils.getTwoHanded(listing);
            
            // Get the actual stats this specific listing has
            const stats = Utils.getItemStatTypes(listing, true); // onlyActual=true
            const statsKey = stats.sort().join('+') || 'No Stats';
            
            // Create unique key: base_item_id + slot + stat combination + two_handed
            const key = `${listing.base_item_id}_${listing.slot}_${statsKey}_${isTwoHanded}`;
            
            if (!itemMap.has(key)) {
                itemMap.set(key, {
                    name: name,
                    slot: listing.slot,
                    class: classDisplay,
                    classes: itemClasses, // Store array for filtering
                    base_item_id: listing.base_item_id,
                    stats: stats,
                    statsDisplay: stats.length > 0 ? stats.join(' + ') : 'No Stats',
                    isTwoHanded: isTwoHanded,
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
        const filters = FilterEngine.getAnalysisFilters();
        const sortBy = document.getElementById('analysisSortBy')?.value || 'name';
        
        let filtered = State.itemAnalysisData.filter(item => {
            if (filters.name && !item.name.toLowerCase().includes(filters.name)) return false;
            if (filters.slot && item.slot !== filters.slot) return false;
            if (filters.itemClass && !item.classes.includes(filters.itemClass)) return false;
            if (filters.stat && !item.stats.includes(filters.stat)) return false;
            
            // Two Handed filter
            if (filters.twoHanded) {
                if (filters.twoHanded === 'yes' && !item.isTwoHanded) return false;
                if (filters.twoHanded === 'no' && item.isTwoHanded) return false;
            }
            
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
        
        DOMHelpers.updateCounts('analysisTotalCount', 'analysisFilteredCount', State.itemAnalysisData.length, filtered.length);
        
        this.renderAnalysis(filtered);
    },
    
    renderAnalysis(items) {
        const container = document.getElementById('analysisContainer');
        
        if (!items || items.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('📊', 'No items match your filters');
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
            const tier = Utils.getTierFromPercentile(powerPercentile >= 90 ? 100 : item.maxPower, item.count);
            
            // Escape all values properly for onclick handler (JavaScript context)
            const escapedName = Utils.escapeJs(item.name);
            const escapedSlot = Utils.escapeJs(item.slot);
            const escapedClass = Utils.escapeJs(item.class);
            const escapedStats = item.stats.map(s => Utils.escapeJs(s)).join(',');
            
            return `
                <div class="analysis-card-new clickable" style="animation-delay: ${idx * 0.05}s" onclick="navigateToMarketplace('${escapedName}', '${escapedSlot}', '${escapedClass}', '${escapedStats}')">
                    <div class="analysis-card-header">
                        <div class="analysis-card-title-row">
                            <h3 class="analysis-card-name">${Utils.escapeHtml(item.name)}</h3>
                            <div class="analysis-tier-badge" style="background: ${tier.color};">
                                ${Utils.escapeHtml(tier.tier)}
                            </div>
                        </div>
                        <div class="analysis-card-badges">
                            <span class="slot-badge-new ${Utils.escapeHtml(item.slot)}">
                                ${CONFIG.slotIcons[item.slot] || ''} ${Utils.escapeHtml(Utils.formatSlot(item.slot))}
                            </span>
                            ${item.isTwoHanded ? '<span class="two-handed-badge">✋ Two Handed</span>' : ''}
                            <span class="listings-badge">${item.count} listing${item.count !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    
                    <div class="analysis-card-body">
                        <div class="analysis-info-grid">
                            <div class="analysis-info-item">
                                <span class="info-label">Stats</span>
                                <span class="info-value ${Utils.getStatClass(statTypes)}">${Utils.escapeHtml(statTypes)}</span>
                            </div>
                            <div class="analysis-info-item">
                                <span class="info-label">Class</span>
                                <span class="info-value">${Utils.escapeHtml(item.class)}</span>
                            </div>
                        </div>
                        
                        <div class="analysis-stats-grid">
                            <div class="stat-card">
                                <div class="stat-card-label">Power Range</div>
                                <div class="stat-card-values">
                                    <div class="stat-row">
                                        <span class="stat-key">Min</span>
                                        <span class="stat-val">${item.minPower.toFixed(1)}%</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-key">Avg</span>
                                        <span class="stat-val">${avgPower}%</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-key">Max</span>
                                        <span class="stat-val">${item.maxPower.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-card-label">Price Range</div>
                                <div class="stat-card-values">
                                    <div class="stat-row">
                                        <span class="stat-key">Cheapest</span>
                                        <span class="stat-val price-low">${Utils.escapeHtml(Utils.formatPriceBreakdown(item.minPrice))}</span>
                                    </div>
                                    <div class="stat-row small-text">
                                        <span class="stat-key">${minPowerForPrice}% power</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-key">Most Expensive</span>
                                        <span class="stat-val price-high">${Utils.escapeHtml(Utils.formatPriceBreakdown(item.maxPrice))}</span>
                                    </div>
                                    <div class="stat-row small-text">
                                        <span class="stat-key">${maxPowerForPrice}% power</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analysis-card-footer">
                        <span class="view-marketplace-link">🔍 Click to view in marketplace</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

function applyAnalysisFilters() {
    Analysis.applyFilters();
}
