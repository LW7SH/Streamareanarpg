// Filter Engine - Unified filtering and sorting logic
const FilterEngine = {
    // Apply filters to items array
    applyItemFilters(items, filterConfig) {
        // Log filter config when status filter is active
        if (filterConfig.status) {
            console.log('🔍 Filtering items by status:', filterConfig.status);
            console.log('  Total items to filter:', items.length);
            console.log('  Equipped item map size:', Object.keys(State.equippedItemMap || {}).length);
            
            if (filterConfig.status === 'equipped') {
                // Show the equipped map IDs
                const equippedIds = Object.keys(State.equippedItemMap || {});
                console.log('  Equipped IDs in map:', equippedIds.slice(0, 10).join(', '), equippedIds.length > 10 ? '...' : '');
                
                // Show sample inventory IDs
                const invIds = items.slice(0, 10).map(i => i.id);
                console.log('  Sample inventory IDs:', invIds.join(', '));
                
                // Check for type mismatch
                const firstEquippedId = equippedIds[0];
                const firstInvId = items[0]?.id;
                console.log('  Type check - Equipped ID type:', typeof firstEquippedId, 'value:', firstEquippedId);
                console.log('  Type check - Inventory ID type:', typeof firstInvId, 'value:', firstInvId);
            }
        }
        
        const filtered = items.filter(item => {
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
            
            // Range filter - ONLY apply if user has explicitly set range filters
            // Non-weapon items don't have range, so we shouldn't filter them out if no range filter is set
            if (filterConfig.minRange !== undefined && !isNaN(filterConfig.minRange)) {
                const range = Utils.getRange(item);
                if (!range || range < filterConfig.minRange) {
                    return false;
                }
            }
            if (filterConfig.maxRange !== undefined && !isNaN(filterConfig.maxRange)) {
                const range = Utils.getRange(item);
                if (!range || range > filterConfig.maxRange) {
                    return false;
                }
            }

            // Status filter (inventory): available / listed / equipped
            if (filterConfig.status) {
                const status = Utils.getItemStatus(item);
                const itemId = String(item?.id ?? '');
                
                // CRITICAL DEBUG: Check EVERY equipped item to see why it's failing
                if (filterConfig.status === 'equipped' && State.equippedItemMap && State.equippedItemMap[itemId]) {
                    // This item IS in the equipped map, so it SHOULD have status 'equipped'
                    // If it doesn't, something is wrong with getItemStatus
                    if (status !== 'equipped') {
                        console.error(`⚠️ PROBLEM: Item ${itemId} is IN equipped map but status is '${status}'`);
                        console.error(`  Checking listed map:`, itemId in (State.listedItemMap || {}));
                        console.error(`  Checking equipped map:`, itemId in (State.equippedItemMap || {}));
                    }
                }
                
                // Log first few items for general diagnostics
                if (filterConfig.status === 'equipped' && items.indexOf(item) < 5) {
                    console.log(`Checking item ${item.id} (${item.slot}, name: ${Utils.getItemName(item.base_item_id, item.slot)}):`, {
                        status,
                        itemIdString: itemId,
                        itemIdType: typeof item.id,
                        inMapDirectly: itemId in (State.equippedItemMap || {}),
                        mapHasId: !!(State.equippedItemMap && State.equippedItemMap[itemId]),
                        mapKeys: Object.keys(State.equippedItemMap || {}).slice(0, 5),
                        sampleMapKey: Object.keys(State.equippedItemMap || {})[0],
                        sampleMapKeyType: typeof Object.keys(State.equippedItemMap || {})[0]
                    });
                }
                
                if (filterConfig.status === 'available' && status !== 'available') return false;
                if (filterConfig.status === 'listed' && status !== 'listed' && status !== 'equipped-listed') return false;
                if (filterConfig.status === 'equipped' && status !== 'equipped' && status !== 'equipped-listed') return false;
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
        
        if (filterConfig.status) {
            console.log('  ✓ Filtered to', filtered.length, 'items with status:', filterConfig.status);
            if (filtered.length > 0 && filtered.length < 20) {
                console.log('  First few filtered items:', filtered.slice(0, 5).map(i => ({
                    id: i.id,
                    slot: i.slot,
                    name: Utils.getItemName(i.base_item_id, i.slot)
                })));
            }
            
            // CRITICAL DEBUG: Show why items are being excluded
            if (filterConfig.status === 'equipped' && filtered.length < Object.keys(State.equippedItemMap || {}).length) {
                console.log('  ⚠️ MISMATCH: Equipped map has', Object.keys(State.equippedItemMap).length, 'items but filter only found', filtered.length);
                console.log('  ⚠️ Checking all items to find the mismatch...');
                
                // Check a sample of items to see why they're not passing
                items.slice(0, 30).forEach(item => {
                    const status = Utils.getItemStatus(item);
                    const inMap = State.equippedItemMap && State.equippedItemMap[item.id];
                    if (inMap && status !== 'equipped') {
                        console.log('  ⚠️ Item', item.id, 'is in map but status is:', status, '| Item object:', item);
                    }
                });
            }
        }
        
        return filtered;
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
        const minRangeInput = document.getElementById('invFilterMinRange')?.value;
        const maxRangeInput = document.getElementById('invFilterMaxRange')?.value;
        
        return {
            itemName: document.getElementById('invFilterItemName')?.value || '',
            slot: document.getElementById('invFilterSlot')?.value || '',
            itemClass: document.getElementById('invFilterItemClass')?.value || '',
            extraProp: document.getElementById('invFilterExtraProperty')?.value || '',
            twoHanded: document.getElementById('invFilterTwoHanded')?.value || '',
            minPower: parseFloat(document.getElementById('invFilterMinPower')?.value) || 0,
            maxPower: parseFloat(document.getElementById('invFilterMaxPower')?.value) || Infinity,
            minRange: minRangeInput ? parseFloat(minRangeInput) : undefined,  // undefined if empty, not 0
            maxRange: maxRangeInput ? parseFloat(maxRangeInput) : undefined,  // undefined if empty, not Infinity
            status: document.getElementById('invFilterStatus')?.value || ''
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

