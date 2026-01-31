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
            const range = JSON.parse(item.extra || '{}').range;
            // Validate range is a safe value (number or null)
            if (range === null || range === undefined) return null;
            const numRange = Number(range);
            return isNaN(numRange) ? null : numRange;
        } catch(e) { 
            return null; 
        }
    },
    
    getTwoHanded(item) {
        // First check if Two_handed is in the listing's extra JSON (like range)
        try { 
            const extra = JSON.parse(item.extra || '{}');
            if (extra.Two_handed || extra.two_handed) {
                const value = extra.Two_handed || extra.two_handed;
                // Sanitize the value - only allow safe strings
                return this.sanitizeValue(value);
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
    
    // NEW: Sanitize values from JSON to prevent XSS
    sanitizeValue(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        // For strings, only allow alphanumeric, spaces, and common safe characters
        const str = String(value);
        const safe = str.replace(/[^a-zA-Z0-9\s\-_.,%]/g, '');
        return safe || null;
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
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },
    
    // NEW: Escape for use in JavaScript string context (inside onclick, etc.)
    escapeJs(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
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
        
        // Reduced logging to keep console clean
        // console.log(`[Slot Analysis] ${slot} (${powerType}): Found ${slotListings.length} items`);
        
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
            if (power > maxPower) maxPower = power;
            if (price < minPrice) minPrice = price;
            if (price > maxPrice) maxPrice = price;
            
            totalPower += power;
            totalPrice += price;
        });
        
        // console.log(`[Slot Analysis] Power range: ${minPower.toFixed(1)}% - ${maxPower.toFixed(1)}%`);
        
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

    },
    
    formatNumber(num) {
        // Format number with commas (e.g., 1234567 -> 1,234,567)
        if (typeof num !== 'number') {
            num = parseInt(num) || 0;
        }
        return num.toLocaleString('en-US');
    }


,// ----------------------------
// User data normalization
// ----------------------------
normalizeUserData(user) {
    if (!user || typeof user !== 'object') return user;
    const normalized = { ...user };

    // cosmetics can be an object or a JSON string in some backends
    let cosmeticsRaw = normalized.cosmetics;
    let cosmeticsObj = null;
    try {
        if (typeof cosmeticsRaw === 'string') cosmeticsObj = JSON.parse(cosmeticsRaw);
        else if (cosmeticsRaw && typeof cosmeticsRaw === 'object') cosmeticsObj = cosmeticsRaw;
    } catch (e) {
        cosmeticsObj = null;
    }
    cosmeticsObj = cosmeticsObj || {};

    // Standardize keys:
    // shaders: array of shader names
    const shaders = Array.isArray(cosmeticsObj.shaders) ? cosmeticsObj.shaders : [];
    // back items can be stored as back_items or backs
    const backItems = Array.isArray(cosmeticsObj.back_items) ? cosmeticsObj.back_items :
                      (Array.isArray(cosmeticsObj.backs) ? cosmeticsObj.backs : []);

    normalized.cosmetics = {
        ...cosmeticsObj,
        shaders,
        back_items: backItems,
    };

    // active slot can be stored as active_slot (string) or activeSlot
    normalized.active_slot = (normalized.active_slot ?? normalized.activeSlot ?? normalized.active_character_slot ?? normalized.active_character ?? "0");
    return normalized;
},

getActiveSlot(userData) {
    const u = userData || {};

    // IMPORTANT: do not default to "0".
    // If user data isn't loaded yet, returning "0" makes the UI incorrectly assume
    // slot 0 is the active slot and then it looks like "no active character".
    const raw = (u.active_slot ?? u.activeSlot ?? u.active_character_slot ?? u.active_character ?? null);
    if (raw == null) return null;

    // Normalize numeric-ish values ("4" -> 4) but keep as string if not numeric.
    const asNum = Number(raw);
    return Number.isFinite(asNum) && String(raw).trim() !== '' ? String(asNum) : String(raw);
},

// ----------------------------
// Inventory status helpers
// ----------------------------
buildEquippedItemMap(characters) {
    const map = {};
    
    console.log('🔍 Building equipped item map from characters:', characters?.length || 0);

    if (!characters || characters.length === 0) {
        console.warn('⚠️ No characters provided to buildEquippedItemMap');
        State.equippedItemMap = map;
        return map;
    }

    // Dynamically discover equipment slot fields from ALL characters (not just first)
    // This ensures we catch all equipment slots even if first character has empty slots
    const allEquipmentSlots = new Set();
    characters.forEach(char => {
        Object.keys(char || {})
            .filter(key => key.endsWith('_equip'))
            .filter(key => key !== 'back_equip') // Back is cosmetic, not equipment
            .forEach(key => allEquipmentSlots.add(key));
    });
    
    const equipmentSlots = Array.from(allEquipmentSlots);
    
    console.log('📋 Discovered equipment slots from ALL characters:', equipmentSlots);
    console.log('📋 Total unique slot types:', equipmentSlots.length);

    (characters || []).forEach((c, idx) => {
        console.log(`\n--- Character ${idx + 1}/${characters.length}: ${c.class} (slot ${c.slot}) ---`);
        
        // Show ALL fields that contain 'equip' for debugging
        const allEquipFields = Object.keys(c).filter(k => k.includes('equip'));
        console.log(`All *equip fields in character:`, allEquipFields);
        
        // Check each discovered equipment slot
        let equippedCountThisChar = 0;
        equipmentSlots.forEach((slotKey) => {
            const rawValue = c[slotKey];
            const v = String(c[slotKey] ?? '');
            if (v && v !== '-1' && v !== '0' && v !== '') {
                map[v] = true;
                equippedCountThisChar++;
                console.log(`  ✓ ${slotKey}: Item ID ${v} (type: ${typeof rawValue}, raw: ${rawValue})`);
            } else {
                console.log(`  ✗ ${slotKey}: empty (value: "${v}", raw: ${rawValue})`);
            }
        });
        console.log(`Character ${idx + 1} total equipped: ${equippedCountThisChar} items`);
    });
    
    console.log('\n📋 Equipped item map built:', Object.keys(map).length, 'items');
    console.log('📋 All Item IDs in map:', Object.keys(map).join(', '));
    
    // DIAGNOSTIC: Compare with inventory items if available
    if (State.inventoryItems && State.inventoryItems.length > 0) {
        const invIds = State.inventoryItems.slice(0, 10).map(item => ({
            id: item.id,
            idType: typeof item.id,
            idString: String(item.id),
            slot: item.slot
        }));
        console.log('📋 Sample inventory item IDs:', invIds);
        
        // Check if any inventory items match the equipped map
        const matchCount = State.inventoryItems.filter(item => {
            const itemId = String(item?.id ?? '');
            return itemId in map;
        }).length;
        console.log(`📋 Matched ${matchCount}/${Object.keys(map).length} equipped items in inventory`);
        
        // Show which equipped IDs are NOT in inventory
        const missingIds = Object.keys(map).filter(equippedId => {
            return !State.inventoryItems.some(item => String(item.id) === equippedId);
        });
        if (missingIds.length > 0) {
            console.warn(`⚠️ ${missingIds.length} equipped item IDs not found in inventory:`, missingIds);
        }
    }
    
    State.equippedItemMap = map;
    return map;
},

buildListedItemMap(myListings) {
    const map = {};

    (myListings || []).forEach((l) => {
        // different backends may use different keys
        // In StreamArena RPG, listings often reuse the player_item id as `id`.
        const id = l.player_item_id ?? l.item_id ?? l.inventory_item_id ?? l.playerItemId ?? l.id ?? null;
        if (id != null) map[String(id)] = true;
    });
    State.listedItemMap = map;
    return map;
},

getItemStatus(item) {
    const itemId = String(item?.id ?? '');
    const isEquipped = !!(State.equippedItemMap && State.equippedItemMap[itemId]);
    const isListed = !!(State.listedItemMap && State.listedItemMap[itemId]);
    
    // If item is both listed AND equipped, return 'equipped' for equipped filter
    // and 'listed' for listed filter - this way it shows in both views
    // For now, prioritize equipped state since equipped items can still be listed
    if (isEquipped && isListed) return 'equipped-listed';  // New composite state
    if (isListed) return 'listed';
    if (isEquipped) return 'equipped';
    return 'available';
},

getItemEquippedBy(item) {
    const itemId = String(item?.id ?? '');
    
    if (!State.characters || !State.equippedItemMap || !State.equippedItemMap[itemId]) {
        return null;
    }
    
    // Find which character has this item equipped and in which slot
    for (const char of State.characters) {
        const equipmentSlots = Object.keys(char).filter(key => key.endsWith('_equip'));
        
        for (const slotKey of equipmentSlots) {
            if (String(char[slotKey]) === itemId) {
                const slotName = slotKey.replace('_equip', '');
                return {
                    character: char,
                    slotKey: slotKey,
                    slotName: slotName,
                    slotLabel: Utils.formatSlot(slotName)
                };
            }
        }
    }
    
    return null;
},

formatGameTime(seconds) {
    // Convert seconds to hours and minutes
    const gameTime = parseInt(seconds) || 0;
    const hours = Math.floor(gameTime / 3600);
    const minutes = Math.floor((gameTime % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
},

getSkillName(skillId, preferredClass = null) {
    if (!skillId || skillId === '-1' || skillId === -1) return null;
    
    // First try the preferred class if provided
    if (preferredClass && State.allSkills && State.allSkills[preferredClass]) {
        const skill = State.allSkills[preferredClass].find(s => String(s.id) === String(skillId));
        if (skill) {
            return skill.name || skill.skill_name || skill.display_name || `Skill ${skillId}`;
        }
    }
    
    // Fallback: search all loaded classes
    if (State.allSkills) {
        for (const className in State.allSkills) {
            const skill = State.allSkills[className].find(s => String(s.id) === String(skillId));
            if (skill) {
                return skill.name || skill.skill_name || skill.display_name || `Skill ${skillId}`;
            }
        }
    }
    
    // If still not found, return null (will show as number)
    return null;
}

};
