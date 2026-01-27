// Utility Functions
const Utils = {
    getItemClass(baseItemId, slot) {
        const gameItem = State.gameItems.find(gi => gi.id === baseItemId && gi.slot === slot);
        if (!gameItem) return ['Unknown'];
        
        // Check all possible fields that might contain class info
        const possibleFields = [
            gameItem.class,
            gameItem.item_class,
            gameItem.Class,
            gameItem.classes,
            gameItem.wearable,
            gameItem.wearable_by,
            gameItem.usable_by,
            gameItem.restricted_to
        ];
        
        for (const field of possibleFields) {
            if (field) {
                // If it's already an array
                if (Array.isArray(field)) {
                    return field.length > 0 ? field : ['Unknown'];
                } 
                // If it's a string
                else if (typeof field === 'string') {
                    // Try to parse as JSON array first
                    try {
                        const parsed = JSON.parse(field);
                        if (Array.isArray(parsed)) {
                            return parsed.length > 0 ? parsed : ['Unknown'];
                        } else if (parsed && typeof parsed === 'string') {
                            return [parsed];
                        }
                    } catch {
                        // Not JSON, clean up brackets and quotes, split by comma
                        const classes = field.replace(/[\[\]"']/g, '').split(',')
                            .map(cls => cls.trim())
                            .filter(cls => cls);
                        if (classes.length > 0) return classes;
                    }
                }
            }
        }
        
        return ['Unknown'];
    },
    
    getItemName(id, slot) {
        if (!State.gameItems) return null;
        return State.gameItems.find(i => i.id === id && i.slot === slot)?.item_name;
    },
    
    getPowerType(item) {
        let attr = null;
        try { 
            attr = JSON.parse(item.extra || '{}').extra; 
        } catch(e) {}
        
        const map = {
            'weapon': 'Damage',
            'head': 'HP',
            'hands': 'Attack Speed',
            'body': 'HP',
            'feet': 'Movement Speed',
            'neck': attr || 'Placeholder',
            'ring': attr || 'Stat',
            'off_hand': attr || 'Stat'
        };
        return map[item.slot] || 'Power';
    },
    
    getItemStatTypes(item, onlyActual = false) {
        const stats = new Set();
        
        // Add innate stat for slots that have fixed innate stats
        if (CONFIG.innateStats[item.slot]) {
            stats.add(CONFIG.innateStats[item.slot]);
        }
        
        // Add extra property from listing
        let hasListingExtra = false;
        try {
            const extra = JSON.parse(item.extra || '{}').extra;
            if (extra && extra.trim()) {
                const normalized = extra === 'A_Speed' ? 'Attack Speed' : extra;
                stats.add(normalized);
                hasListingExtra = true;
            }
        } catch(e) {}
        
        // Add extra properties from game items (all possible extras)
        if (!onlyActual || !hasListingExtra) {
            if (State.gameItems) {
                const gameItem = State.gameItems.find(gi => gi.id === item.base_item_id && gi.slot === item.slot);
                if (gameItem?.extra) {
                    gameItem.extra.split(',').forEach(e => {
                        const trimmed = e.trim();
                        if (trimmed) {
                            const normalized = trimmed === 'A_Speed' ? 'Attack Speed' : trimmed;
                            stats.add(normalized);
                        }
                    });
                }
            }
        }
        
        return Array.from(stats).filter(s => s && s.trim());
    },
    
    getRange(item) {
        try { 
            return JSON.parse(item.extra || '{}').range; 
        } catch(e) { 
            return null; 
        }
    },
    
    getTwoHanded(item) {
        // First check if Two_handed is in the listing's extra JSON (like range)
        try { 
            const extra = JSON.parse(item.extra || '{}');
            if (extra.Two_handed || extra.two_handed) {
                return extra.Two_handed || extra.two_handed;
            }
        } catch(e) {}
        
        // If not found, check if the game item has Two_handed in its extra field (like stats)
        if (State.gameItems) {
            const gameItem = State.gameItems.find(gi => gi.id === item.base_item_id && gi.slot === item.slot);
            if (gameItem?.extra) {
                const extraProps = gameItem.extra.split(',').map(e => e.trim());
                if (extraProps.includes('Two_handed') || extraProps.includes('two_handed')) {
                    // If the game item has Two_handed as a property, the item has it
                    // Return a default value to indicate it has the property
                    return 'Yes';
                }
            }
        }
        
        return null;
    },
    
    getTotalGoldValue(item) {
        const plat = parseInt(item.platinum_cost) || 0;
        const gold = parseInt(item.gold_cost) || 0;
        return (plat * CONFIG.PLATINUM_TO_GOLD) + gold;
    },
    
    formatPrice(item) {
        const plat = parseInt(item.platinum_cost) || 0;
        const gold = parseInt(item.gold_cost) || 0;
        const gems = parseInt(item.gem_cost) || 0;
        const totalGold = this.getTotalGoldValue(item);
        
        let html = '';
        if (plat) {
            const goldEquiv = plat * CONFIG.PLATINUM_TO_GOLD;
            html += `<div class="price-item" data-tooltip="${goldEquiv.toLocaleString()} Gold equivalent"><span class="price-icon">${CONFIG.currencyIcons.platinum}</span><span class="price-value">${plat.toLocaleString()}</span> Platinum</div>`;
        }
        if (gold) html += `<div class="price-item"><span class="price-icon">${CONFIG.currencyIcons.gold}</span><span class="price-value">${gold.toLocaleString()}</span> Gold</div>`;
        if (gems) html += `<div class="price-item"><span class="price-icon">${CONFIG.currencyIcons.gems}</span><span class="price-value">${gems.toLocaleString()}</span> Gems</div>`;
        
        if ((plat && (gold || gems)) || (gold && gems)) {
            html += `<div class="price-item" style="border-top: 1px solid var(--border); margin-top: 0.5rem; padding-top: 0.5rem; font-size: 0.75rem; color: var(--text-dim);"><span>Total: ${totalGold.toLocaleString()} 🟡</span></div>`;
        }
        
        return html || '<div class="price-item">Free</div>';
    },
    
    getStatColor(type) {
        const lower = type.toLowerCase();
        if (lower.includes('damage')) return CONFIG.statColors['damage'];
        if (lower.includes('hp')) return CONFIG.statColors['hp'];
        if (lower.includes('attack speed')) return CONFIG.statColors['attack speed'];
        if (lower.includes('movement speed')) return CONFIG.statColors['movement speed'];
        return CONFIG.statColors['default'];
    },
    
    getStatClass(statTypes) {
        const lower = statTypes.toLowerCase();
        if (lower.includes('damage')) return 'stat-damage';
        if (lower.includes('hp')) return 'stat-hp';
        if (lower.includes('attack speed')) return 'stat-attack-speed';
        if (lower.includes('movement speed')) return 'stat-movement-speed';
        return 'stat-generic';
    },
    
    formatTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        const min = Math.floor(diff / 60000);
        const hr = Math.floor(diff / 3600000);
        const day = Math.floor(diff / 86400000);
        if (min < 60) return `${min}m ago`;
        if (hr < 24) return `${hr}h ago`;
        return `${day}d ago`;
    },
    
    formatSlot(slot) {
        return slot.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    },
    
    formatGold(amount) {
        if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
        return amount.toLocaleString();
    },
    
    formatPriceBreakdown(totalGold, hasGems = false) {
        const platinum = Math.floor(totalGold / CONFIG.PLATINUM_TO_GOLD);
        const remainingGold = totalGold % CONFIG.PLATINUM_TO_GOLD;
        
        let parts = [];
        if (platinum > 0) {
            parts.push(`${platinum.toLocaleString()} ⚪`);
        }
        if (remainingGold > 0 || platinum === 0) {
            parts.push(`${remainingGold.toLocaleString()} 🟡`);
        }
        
        return parts.join(' + ');
    },
    
    getTierFromPercentile(percentile, sampleSize = 100) {
        // Be more generous with tiers when sample size is small
        // With fewer items, don't use extreme tiers (S/F) unless truly warranted
        
        if (sampleSize <= 2) {
            // With 2 or fewer items, only use B/C tiers (no extremes)
            if (percentile >= 50) return { tier: 'B', color: '#3b82f6', label: 'B Tier - Good' };
            return { tier: 'C', color: '#f59e0b', label: 'C Tier - Average' };
        }
        
        if (sampleSize <= 5) {
            // With 3-5 items, use A/B/C/D (no S or F)
            if (percentile >= 80) return { tier: 'A', color: '#22c55e', label: 'A Tier - Excellent' };
            if (percentile >= 60) return { tier: 'B', color: '#3b82f6', label: 'B Tier - Good' };
            if (percentile >= 40) return { tier: 'C', color: '#f59e0b', label: 'C Tier - Average' };
            return { tier: 'D', color: '#ef4444', label: 'D Tier - Below Average' };
        }
        
        if (sampleSize <= 10) {
            // With 6-10 items, slightly more generous thresholds
            if (percentile >= 85) return { tier: 'S', color: '#ffd700', label: 'S Tier - Elite' };
            if (percentile >= 70) return { tier: 'A', color: '#22c55e', label: 'A Tier - Excellent' };
            if (percentile >= 45) return { tier: 'B', color: '#3b82f6', label: 'B Tier - Good' };
            if (percentile >= 30) return { tier: 'C', color: '#f59e0b', label: 'C Tier - Average' };
            if (percentile >= 15) return { tier: 'D', color: '#ef4444', label: 'D Tier - Below Average' };
            return { tier: 'F', color: '#991b1b', label: 'F Tier - Poor' };
        }
        
        // Standard tier system for larger sample sizes (11+)
        if (percentile >= 90) return { tier: 'S', color: '#ffd700', label: 'S Tier - Elite' };
        if (percentile >= 75) return { tier: 'A', color: '#22c55e', label: 'A Tier - Excellent' };
        if (percentile >= 50) return { tier: 'B', color: '#3b82f6', label: 'B Tier - Good' };
        if (percentile >= 25) return { tier: 'C', color: '#f59e0b', label: 'C Tier - Average' };
        if (percentile >= 10) return { tier: 'D', color: '#ef4444', label: 'D Tier - Below Average' };
        return { tier: 'F', color: '#991b1b', label: 'F Tier - Poor' };
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    calculateUniqueItems() {
        const unique = new Set();
        State.allListings.forEach(item => {
            const key = `${item.base_item_id}_${item.slot}`;
            unique.add(key);
        });
        document.getElementById('uniqueItems').textContent = unique.size;
    },
    
    getAnalysisForItem(baseItemId, slot, stats, isTwoHanded) {
        // Find matching analysis data
        const statsKey = stats.sort().join('+') || 'No Stats';
        const key = `${baseItemId}_${slot}_${statsKey}_${isTwoHanded}`;
        
        return State.itemAnalysisData.find(item => {
            const itemStatsKey = item.stats.sort().join('+') || 'No Stats';
            const itemKey = `${item.base_item_id}_${item.slot}_${itemStatsKey}_${item.isTwoHanded}`;
            return itemKey === key;
        });
    },
    
    getSlotAnalysis(slot, powerType) {
        // Get all listings for this slot
        const slotListings = State.allListings.filter(listing => {
            if (listing.slot !== slot) return false;
            const listingPowerType = this.getPowerType(listing);
            return listingPowerType === powerType;
        });
        
        if (slotListings.length === 0) return null;
        
        console.log(`[Slot Analysis] ${slot} (${powerType}): Found ${slotListings.length} items`);
        
        // Calculate min/max/avg power and price
        let minPower = Infinity;
        let maxPower = -Infinity;
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        let totalPower = 0;
        let totalPrice = 0;
        
        slotListings.forEach(listing => {
            const power = parseFloat(listing.power) * 100;
            const price = this.getTotalGoldValue(listing);
            
            if (power < minPower) minPower = power;
            if (power > maxPower) {
                maxPower = power;
                if (power > 105) {
                    console.log(`[Warning] Unusually high power: ${power}% for item`, listing);
                }
            }
            if (price < minPrice) minPrice = price;
            if (price > maxPrice) maxPrice = price;
            
            totalPower += power;
            totalPrice += price;
        });
        
        console.log(`[Slot Analysis] Power range: ${minPower.toFixed(1)}% - ${maxPower.toFixed(1)}%`);
        
        const avgPower = totalPower / slotListings.length;
        const avgPrice = totalPrice / slotListings.length;
        
        return {
            minPower,
            maxPower,
            minPrice,
            maxPrice,
            avgPower,
            avgPrice,
            avgCostPerPower: avgPrice / avgPower,
            count: slotListings.length
        };
    }
};
