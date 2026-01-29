// Filter Engine - Unified filtering and sorting logic
const FilterEngine = {
    // Apply filters to items array
    applyItemFilters(items, filterConfig) {
        return items.filter(item => {
            // Username filter
            if (filterConfig.username && !item.username.toLowerCase().includes(filterConfig.username)) {
                return false;
            }
            
            // Item name filter
            if (filterConfig.itemName) {
                const name = Utils.getItemName(item.base_item_id, item.slot);
                if (name !== filterConfig.itemName) return false;
            }
            
            // Slot filter
            if (filterConfig.slot && item.slot !== filterConfig.slot) {
                return false;
            }
            
            // Class filter
            if (filterConfig.itemClass) {
                const classes = Utils.getItemClass(item.base_item_id, item.slot);
                if (!classes.includes(filterConfig.itemClass)) return false;
            }
            
            // Extra property (stat type) filter
            if (filterConfig.extraProp) {
                const stats = Utils.getItemStatTypes(item, true);
                if (!stats.includes(filterConfig.extraProp)) return false;
            }
            
            // Two handed filter
            if (filterConfig.twoHanded) {
                const isTwoHanded = !!Utils.getTwoHanded(item);
                if (filterConfig.twoHanded === 'yes' && !isTwoHanded) return false;
                if (filterConfig.twoHanded === 'no' && isTwoHanded) return false;
            }
            
            // Power range filter
            const power = parseFloat(item.power) * 100;
            if (power < filterConfig.minPower || power > filterConfig.maxPower) {
                return false;
            }
            
            // Range filter
            const range = Utils.getRange(item);
            if (!isNaN(filterConfig.minRange) && (!range || range < filterConfig.minRange)) {
                return false;
            }
            if (!isNaN(filterConfig.maxRange) && (!range || range > filterConfig.maxRange)) {
                return false;
            }
            
            // Price filters (if provided)
            if (filterConfig.maxPlatinum !== undefined) {
                const plat = parseInt(item.platinum_cost) || 0;
                if (!isNaN(filterConfig.maxPlatinum) && plat > filterConfig.maxPlatinum) {
                    return false;
                }
            }
            
            if (filterConfig.maxGold !== undefined) {
                const plat = parseInt(item.platinum_cost) || 0;
                const gold = parseInt(item.gold_cost) || 0;
                const totalGold = plat * CONFIG.PLATINUM_TO_GOLD + gold;
                if (!isNaN(filterConfig.maxGold) && totalGold > filterConfig.maxGold) {
                    return false;
                }
            }
            
            if (filterConfig.maxGems !== undefined) {
                const gems = parseInt(item.gem_cost) || 0;
                if (!isNaN(filterConfig.maxGems) && gems > filterConfig.maxGems) {
                    return false;
                }
            }
            
            return true;
        });
    },
    
    // Sort items array
    sortItems(items, sortBy) {
        return items.sort((a, b) => {
            switch(sortBy) {
                case 'time_newest':
                    if (a.time_created && b.time_created) {
                        return new Date(b.time_created) - new Date(a.time_created);
                    }
                    return parseInt(b.id) - parseInt(a.id);
                    
                case 'time_oldest':
                    if (a.time_created && b.time_created) {
                        return new Date(a.time_created) - new Date(b.time_created);
                    }
                    return parseInt(a.id) - parseInt(b.id);
                    
                case 'power_high':
                    return parseFloat(b.power) - parseFloat(a.power);
                    
                case 'power_low':
                    return parseFloat(a.power) - parseFloat(b.power);
                    
                case 'price_low':
                    return Utils.getTotalGoldValue(a) - Utils.getTotalGoldValue(b);
                    
                case 'price_high':
                    return Utils.getTotalGoldValue(b) - Utils.getTotalGoldValue(a);
                    
                case 'name':
                    const nameA = Utils.getItemName(a.base_item_id, a.slot) || '';
                    const nameB = Utils.getItemName(b.base_item_id, b.slot) || '';
                    return nameA.localeCompare(nameB);
                    
                default:
                    return 0;
            }
        });
    },
    
    // Extract filter values from DOM for marketplace
    getMarketplaceFilters() {
        return {
            username: document.getElementById('filterUsername')?.value.toLowerCase() || '',
            itemName: document.getElementById('filterItemName')?.value || '',
            slot: document.getElementById('filterSlot')?.value || '',
            itemClass: document.getElementById('filterItemClass')?.value || '',
            extraProp: document.getElementById('filterExtraProperty')?.value || '',
            twoHanded: document.getElementById('filterTwoHanded')?.value || '',
            minPower: parseFloat(document.getElementById('filterMinPower')?.value) || 0,
            maxPower: parseFloat(document.getElementById('filterMaxPower')?.value) || 999,
            minRange: parseFloat(document.getElementById('filterMinRange')?.value),
            maxRange: parseFloat(document.getElementById('filterMaxRange')?.value),
            maxPlatinum: parseFloat(document.getElementById('filterMaxPlatinum')?.value),
            maxGold: parseFloat(document.getElementById('filterMaxGold')?.value),
            maxGems: parseFloat(document.getElementById('filterMaxGems')?.value)
        };
    },
    
    // Extract filter values from DOM for inventory
    getInventoryFilters() {
        return {
            itemName: document.getElementById('invFilterItemName')?.value || '',
            slot: document.getElementById('invFilterSlot')?.value || '',
            itemClass: document.getElementById('invFilterItemClass')?.value || '',
            extraProp: document.getElementById('invFilterExtraProperty')?.value || '',
            twoHanded: document.getElementById('invFilterTwoHanded')?.value || '',
            minPower: parseFloat(document.getElementById('invFilterMinPower')?.value) || 0,
            maxPower: parseFloat(document.getElementById('invFilterMaxPower')?.value) || 999,
            minRange: parseFloat(document.getElementById('invFilterMinRange')?.value) || 0,
            maxRange: parseFloat(document.getElementById('invFilterMaxRange')?.value) || Infinity
        };
    },
    
    // Extract filter values from DOM for analysis
    getAnalysisFilters() {
        return {
            name: document.getElementById('analysisFilterName')?.value.toLowerCase() || '',
            slot: document.getElementById('analysisFilterSlot')?.value || '',
            itemClass: document.getElementById('analysisFilterClass')?.value || '',
            stat: document.getElementById('analysisFilterStat')?.value || '',
            twoHanded: document.getElementById('analysisFilterTwoHanded')?.value || ''
        };
    }
};
