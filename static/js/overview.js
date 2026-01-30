// Overview Tab - Unified Account Dashboard
const Overview = {
    async render() {
        console.log('🎯 Overview: Starting render...');
        
        // If authenticated and key data not loaded yet, load it once
        if (AuthManager && AuthManager.isAuthenticated) {
            console.log('  ✓ User is authenticated');
            
            // Show loading state first
            const charContainer = document.getElementById('overviewActiveCharacter');
            const equipContainer = document.getElementById('overviewEquipmentBreakdown');
            const invContainer = document.getElementById('overviewInventorySummary');
            const listingsContainer = document.getElementById('overviewRecentListings');
            
            const loadingHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⏳</div>
                    <div>Loading...</div>
                </div>
            `;
            
            if (charContainer) charContainer.innerHTML = loadingHTML;
            if (equipContainer) equipContainer.innerHTML = loadingHTML;
            if (invContainer) invContainer.innerHTML = loadingHTML;
            if (listingsContainer) listingsContainer.innerHTML = loadingHTML;
            
            // Load all data sequentially
            let needsReload = false;
            
            // Load user data if needed (this loads characters too)
            if (!State.userData || !State.characters || State.characters.length === 0) {
                if (AuthManager.loadUserData) {
                    try {
                        console.log('  → Loading user data for overview...');
                        await AuthManager.loadUserData();
                        needsReload = true;
                    } catch (e) {
                        console.warn('  ⚠ Could not load user data:', e);
                    }
                }
            }
            
            // Load characters separately if still missing
            if ((!State.characters || State.characters.length === 0) && Characters && Characters.loadCharacters) {
                try {
                    console.log('  → Loading characters for overview...');
                    await Characters.loadCharacters();
                    needsReload = true;
                } catch (e) {
                    console.warn('  ⚠ Could not load characters:', e);
                }
            }
            
            console.log('  📊 Characters loaded:', State.characters?.length || 0);
            
            // Load inventory if needed
            if ((!State.inventoryItems || State.inventoryItems.length === 0) && Inventory && Inventory.loadInventoryAuth) {
                try {
                    console.log('  → Loading inventory for overview...');
                    await Inventory.loadInventoryAuth();
                    needsReload = true;
                } catch (e) {
                    console.warn('  ⚠ Could not load inventory:', e);
                }
            }
            
            console.log('  📦 Inventory loaded:', State.inventoryItems?.length || 0);
            
            // Load listings if needed
            if ((!State.myListings || State.myListings.length === 0) && MyListings && MyListings.loadMyListings) {
                try {
                    console.log('  → Loading listings for overview...');
                    await MyListings.loadMyListings();
                    needsReload = true;
                } catch (e) {
                    console.warn('  ⚠ Could not load listings:', e);
                }
            }
            
            console.log('  💰 Listings loaded:', State.myListings?.length || 0);
        }
        
        console.log('  🎨 Rendering all sections...');
        
        // Update quick stats
        this.updateQuickStats();
        
        // Render active character
        this.renderActiveCharacter();
        
        // Render equipment breakdown for all characters
        this.renderEquipmentBreakdown();
        
        // Render inventory summary
        this.renderInventorySummary();
        
        // Render recent listings
        this.renderRecentListings();
        
        console.log('✅ Overview: Render complete!');
    },
    
    updateQuickStats() {
        // Character count
        const charCount = State.characters?.length || 0;
        const charEl = document.getElementById('overviewCharacterCount');
        if (charEl) {
            charEl.textContent = charCount;
            const card = charEl.closest('.overview-stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => switchTab('characters');
                card.title = 'Click to view characters';
            }
        }
        
        // Inventory count - show unique equipped items vs total
        const invCount = State.inventoryItems?.length || 0;
        const equippedCount = Object.keys(State.equippedItemMap || {}).length || 0;
        const invEl = document.getElementById('overviewInventoryCount');
        if (invEl) {
            invEl.textContent = invCount;
            const card = invEl.closest('.overview-stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => switchTab('inventory');
                card.title = `Click to view inventory (${equippedCount} equipped)`;
            }
        }
        
        // Active listings count
        const listingsCount = State.myListings?.length || 0;
        const listEl = document.getElementById('overviewListingsCount');
        if (listEl) {
            listEl.textContent = listingsCount;
            const card = listEl.closest('.overview-stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => switchTab('mylistings');
                card.title = 'Click to view listings';
            }
        }
        
        // Cosmetics count (owned shaders + owned backs)
        let cosmeticsCount = 0;
        let shadersInUse = 0;
        let backsInUse = 0;
        if (State.userData) {
            const ownedShaders = State.userData.cosmetics?.shaders || [];
            const ownedBacks = State.userData.cosmetics?.back_items || State.userData.cosmetics?.backs || [];
            cosmeticsCount = ownedShaders.length + ownedBacks.length;
            
            // Count how many are actually equipped on characters
            if (State.characters) {
                const usedShaders = new Set();
                const usedBacks = new Set();
                State.characters.forEach(char => {
                    if (char.character_skin && char.character_skin !== '') {
                        usedShaders.add(char.character_skin);
                    }
                    if (char.back_equip && char.back_equip !== '-1') {
                        usedBacks.add(char.back_equip);
                    }
                });
                shadersInUse = usedShaders.size;
                backsInUse = usedBacks.size;
            }
        }
        const cosmEl = document.getElementById('overviewCosmeticsCount');
        if (cosmEl) {
            cosmEl.textContent = cosmeticsCount;
            const card = cosmEl.closest('.overview-stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => switchTab('cosmetics');
                card.title = `Click to view cosmetics (${shadersInUse} shaders, ${backsInUse} backs in use)`;
            }
        }
        
        // Friends count
        const friendsCount = State.friends?.length || 0;
        const friendEl = document.getElementById('overviewFriendsCount');
        if (friendEl) {
            friendEl.textContent = friendsCount;
            const card = friendEl.closest('.overview-stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => switchTab('friends');
                card.title = 'Click to view friends';
            }
        }
    },
    
    renderActiveCharacter() {
        const container = document.getElementById('overviewActiveCharacter');
        if (!container) return;
        
        console.log('  → Rendering active character...');
        console.log('    State.userData:', State.userData ? 'exists' : 'missing');
        console.log('    State.characters:', State.characters ? `${State.characters.length} characters` : 'missing');
        
        if (!State.userData || !State.characters || State.characters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎮</div>
                    <div>No active character data</div>
                </div>
            `;
            return;
        }
        
        // Find active character (based on active_slot from userData)
        const activeSlot = Utils.getActiveSlot(State.userData);
        console.log('    Active slot from userData:', activeSlot);
        console.log('    Available character slots:', State.characters.map(c => c.slot));
        
        // Match slot as string since API may return as string or number
        const activeChar = State.characters.find(c => String(c.slot) === String(activeSlot)) || State.characters[0];
        
        if (!activeChar) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎮</div>
                    <div>No active character found</div>
                </div>
            `;
            return;
        }
        
        console.log('    Found active character:', activeChar.class, 'at slot', activeChar.slot);
        
        const classEmoji = this.getClassEmoji(activeChar.class);
        const level = parseInt(activeChar.level) || 0;
        const experience = parseInt(activeChar.experience) || 0;
        const gameTime = parseInt(activeChar.game_time) || 0;
        const gameTimeFormatted = Utils.formatGameTime(gameTime);
        
        // Get equipped items count and calculate average power with stat types
        let equippedCount = 0;
        const equippedItems = [];
        
        // Dynamically get all equipment slots
        const equipSlotKeys = Object.keys(activeChar).filter(key => key.endsWith('_equip'));
        
        equipSlotKeys.forEach(key => {
            if (activeChar[key] && activeChar[key] !== '-1') {
                equippedCount++;
                const item = State.inventoryItems?.find(i => String(i.id) === String(activeChar[key]));
                if (item) equippedItems.push(item);
            }
        });
        
        // Calculate TOTAL power per stat type (not average)
        const statPowers = {};
        equippedItems.forEach(item => {
            const powerType = Utils.getPowerType(item);
            const power = parseFloat(item.power) * 100;
            if (!statPowers[powerType]) {
                statPowers[powerType] = { total: 0, count: 0 };
            }
            statPowers[powerType].total += power;
            statPowers[powerType].count++;
        });
        
        // Create power breakdown by stat - showing TOTAL
        let powerBreakdownHTML = '';
        Object.keys(statPowers).sort().forEach(statType => {
            const total = statPowers[statType].total;
            const count = statPowers[statType].count;
            const color = Utils.getStatColor(statType);
            powerBreakdownHTML += `
                <div class="overview-char-stat">
                    <div class="overview-char-stat-label" style="color: ${color}">${statType} (${count})</div>
                    <div class="overview-char-stat-value" style="color: ${color}">${total.toFixed(1)}%</div>
                </div>
            `;
        });
        
        if (!powerBreakdownHTML) {
            powerBreakdownHTML = `
                <div class="overview-char-stat">
                    <div class="overview-char-stat-label">No Equipment</div>
                    <div class="overview-char-stat-value">-</div>
                </div>
            `;
        }
        
        // Get equipped gear with details
        const getItemForEquipment = (equipId) => {
            if (equipId == null) return null;
            const eid = String(equipId);
            if (!eid || eid === '-1' || eid === '0') return null;
            
            let item = State.inventoryItems?.find(i => String(i.id) === eid);
            if (item) return item;
            
            if (State.userData && State.userData.player_items) {
                item = State.userData.player_items.find(i => i.id === equipId);
            }
            
            return item;
        };
        
        // Get equipped items dynamically
        const equippedItemsMap = {};
        equipSlotKeys.forEach(slotKey => {
            const item = getItemForEquipment(activeChar[slotKey]);
            if (item) {
                equippedItemsMap[slotKey] = item;
            }
        });
        
        // Helper to get display info for equipment slots
        const getSlotDisplayInfo = (slotKey) => {
            const slotName = slotKey.replace('_equip', '');
            const slotMeta = DesignSystem.getSlotMeta(slotName);
            
            const fallbackIcons = {
                'offhand': '🗡️',
                'off_hand': '🗡️',
                'ring': '💍',
                'neck': '📿',
                'back': '🎒'
            };
            
            const fallbackLabels = {
                'offhand': 'Off Hand',
                'off_hand': 'Off Hand',
                'ring': 'Ring',
                'neck': 'Neck',
                'back': 'Back'
            };
            
            return {
                icon: slotMeta?.icon || fallbackIcons[slotName] || '🎯',
                label: slotMeta?.label || fallbackLabels[slotName] || slotName.charAt(0).toUpperCase() + slotName.slice(1)
            };
        };
        
        const renderEquipSlot = (item, slotKey) => {
            const displayInfo = getSlotDisplayInfo(slotKey);
            
            if (!item) {
                return `<div class="overview-equip-slot empty">
                    <span style="opacity: 0.5;">${displayInfo.icon} ${displayInfo.label}</span>
                    <span style="opacity: 0.3;">—</span>
                </div>`;
            }
            
            const power = (parseFloat(item.power) * 100).toFixed(1);
            const itemName = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown';
            const powerType = Utils.getPowerType(item);
            const statColor = Utils.getStatColor(powerType);
            
            return `<div class="overview-equip-slot filled">
                <span>${displayInfo.icon} ${Utils.escapeHtml(itemName)}</span>
                <span style="color: ${statColor}; font-weight: 600;">${powerType} ${power}%</span>
            </div>`;
        };
        
        // Generate equipment list HTML dynamically
        const equipmentListHTML = equipSlotKeys.map(slotKey => 
            renderEquipSlot(equippedItemsMap[slotKey], slotKey)
        ).join('');
        
        // Get skills using centralized function
        const skills = [activeChar.skill1, activeChar.skill2, activeChar.skill3, activeChar.skill4, activeChar.skill5]
            .filter(s => s && s !== '-1')
            .map(s => Utils.getSkillName(s, activeChar.class))
            .filter(s => s);
        
        // Calculate TOTAL stats by type (not average)
        const statTotals = {};
        equippedItems.forEach(item => {
            const powerType = Utils.getPowerType(item);
            const power = parseFloat(item.power) * 100;
            if (!statTotals[powerType]) {
                statTotals[powerType] = { total: 0, count: 0 };
            }
            statTotals[powerType].total += power;
            statTotals[powerType].count++;
        });
        
        // Build HTML for total stats
        let totalStatsHTML = '';
        Object.keys(statTotals).sort().forEach(statType => {
            const data = statTotals[statType];
            const color = Utils.getStatColor(statType);
            totalStatsHTML += `
                <div class="overview-char-stat">
                    <div class="overview-char-stat-label" style="color: ${color}">${statType}</div>
                    <div class="overview-char-stat-value" style="color: ${color}">${data.total.toFixed(1)}%</div>
                    <div style="font-size: 0.7rem; color: var(--text-dimmer); margin-top: 0.25rem;">${data.count} item${data.count !== 1 ? 's' : ''}</div>
                </div>
            `;
        });
        
        if (!totalStatsHTML) {
            totalStatsHTML = `
                <div class="overview-char-stat">
                    <div class="overview-char-stat-label">No Equipment</div>
                    <div class="overview-char-stat-value">-</div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div class="overview-active-character" onclick="switchTab('characters')" style="cursor: pointer;">
                <div class="overview-char-header">
                    <div class="overview-char-icon">${classEmoji}</div>
                    <div class="overview-char-info">
                        <div class="overview-char-class">${activeChar.class}</div>
                        <div class="overview-char-level">Level ${level}</div>
                    </div>
                    <span style="font-size: 0.8rem; color: var(--text-dim);">Click to view →</span>
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem; font-weight: 600;">📊 Character Stats</div>
                    <div class="overview-char-stats">
                        <div class="overview-char-stat">
                            <div class="overview-char-stat-label">Experience</div>
                            <div class="overview-char-stat-value">${Utils.formatNumber(experience)}</div>
                        </div>
                        <div class="overview-char-stat">
                            <div class="overview-char-stat-label">Playtime</div>
                            <div class="overview-char-stat-value">${gameTimeFormatted}</div>
                        </div>
                        ${activeChar.target_type ? `
                        <div class="overview-char-stat">
                            <div class="overview-char-stat-label">Target Type</div>
                            <div class="overview-char-stat-value">${Utils.escapeHtml(activeChar.target_type)}</div>
                        </div>
                        ` : ''}
                        ${activeChar.character_skin ? `
                        <div class="overview-char-stat">
                            <div class="overview-char-stat-label">Skin</div>
                            <div class="overview-char-stat-value">${Utils.escapeHtml(activeChar.character_skin)}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem; font-weight: 600;">⚔️ Equipped Gear</div>
                    <div class="overview-equipment-list">
                        ${equipmentListHTML}
                    </div>
                </div>
                
                ${skills.length > 0 ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem; font-weight: 600;">✨ Equipped Skills</div>
                    <div class="overview-skills-list">
                        ${skills.map(s => `<div class="overview-skill-badge">${Utils.escapeHtml(s)}</div>`).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${equippedItems.length > 0 ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                        <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem; font-weight: 600;">📊 Total Power by Stat</div>
                        <div class="overview-char-stats">
                            ${totalStatsHTML}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    renderRecentListings() {
        const container = document.getElementById('overviewRecentListings');
        if (!container) return;
        
        console.log('  → Rendering recent listings...');
        console.log('    State.myListings:', State.myListings ? `${State.myListings.length} listings` : 'missing');
        
        let listingsSource = State.myListings;
        if ((!listingsSource || listingsSource.length === 0) && State.allListings && AuthManager && AuthManager.userData) {
            // Fallback: derive my listings from marketplace listings if my listings not loaded yet
            const u = (AuthManager.userData.username || '').toLowerCase();
            listingsSource = State.allListings.filter(l => (l.username || '').toLowerCase() === u);
        }
        if (!listingsSource || listingsSource.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📤</div>
                    <div>No active listings</div>
                </div>
            `;
            return;
        }
        
        // Show top 3 most recent listings
        const recentListings = [...listingsSource]
            .sort((a, b) => new Date(b.time_created || b.created_at || b.createdAt || 0) - new Date(a.time_created || a.created_at || a.createdAt || 0))
            .slice(0, 3);
        
        const listingsHTML = recentListings.map(listing => {
            const item = this.getItemDetails(listing);
            const power = item.power; // Already converted to 0-100 scale
            const tier = Utils.getTierFromPercentile(power, listingsSource.length);
            const timeLeft = this.getTimeLeft(listing.time_expires || listing.expiry || listing.expires_at);
            const priceText = Utils.formatPriceBreakdown(Utils.getTotalGoldValue(listing));
            
            // Get stat type and color
            const powerType = Utils.getPowerType(listing);
            const statColor = Utils.getStatColor(powerType);
            
            return `
                <div class="overview-listing-card" style="border-left: 3px solid ${tier.color}; cursor: pointer;" onclick="switchTab('mylistings')">
                    <div class="overview-listing-info">
                        <div class="overview-listing-name">${item.name}</div>
                        <div class="overview-listing-details">
                            <span class="overview-listing-slot">${item.slot}</span>
                            <span class="overview-listing-power" style="color: ${statColor}">${powerType} ${power}%</span>
                        </div>
                    </div>
                    <div class="overview-listing-price">
                        <div class="overview-listing-price-value">${priceText}</div>
                        <div class="overview-listing-expiry">${timeLeft}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="overview-listings-list">
                ${listingsHTML}
            </div>
            <div style="margin-top: 1rem; text-align: center; color: var(--text-dim); font-size: 0.85rem;">
                ${listingsSource.length} active listing${listingsSource.length !== 1 ? 's' : ''} • Click any card to view all →
            </div>
        `;
    },
    
    getItemDetails(listing) {
        // Get item from game items
        const gameItem = State.gameItems.find(i => i.id == listing.base_item_id);
        return {
            name: gameItem?.item_name || `Item ${listing.base_item_id}`,
            slot: gameItem?.slot || listing.slot || 'unknown',
            power: Math.round((parseFloat(listing.power) || 0) * 100) // Convert to 0-100 scale
        };
    },
    
    getTimeLeft(expiry) {
        if (!expiry) return 'Unknown';
        
        const now = new Date();
        const expiryDate = new Date(expiry);
        const diff = expiryDate - now;
        
        if (diff < 0) return 'Expired';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d left`;
        if (hours > 0) return `${hours}h left`;
        
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}m left`;
    },
    
    renderEquipmentBreakdown() {
        const container = document.getElementById('overviewEquipmentBreakdown');
        if (!container) return;
        
        if (!State.characters || State.characters.length === 0 || !State.inventoryItems) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚔️</div>
                    <div>No equipment data available</div>
                </div>
            `;
            return;
        }
        
        const activeSlot = Utils.getActiveSlot(State.userData);
        
        // Build comprehensive equipment breakdown by character
        const characterBreakdowns = State.characters.map(char => {
            const isActive = (activeSlot != null) ? (String(char.slot) === String(activeSlot)) : false;
            
            // Get all equipment slots
            const equipSlotKeys = Object.keys(char).filter(key => key.endsWith('_equip'));
            
            let equippedCount = 0;
            let totalSlots = equipSlotKeys.length;
            const equippedItems = [];
            const equipmentBySlot = {};
            
            equipSlotKeys.forEach(key => {
                const slotName = key.replace('_equip', '');
                const itemId = char[key];
                
                if (itemId && itemId !== '-1') {
                    equippedCount++;
                    const item = State.inventoryItems.find(i => String(i.id) === String(itemId));
                    if (item) {
                        equippedItems.push(item);
                        equipmentBySlot[slotName] = item;
                    }
                }
            });
            
            // Calculate TOTAL power
            const totalPower = equippedItems.length > 0 
                ? equippedItems.reduce((sum, i) => sum + (parseFloat(i.power) * 100), 0).toFixed(1)
                : '0.0';
            
            // Calculate power by stat type
            const statPowers = {};
            equippedItems.forEach(item => {
                const powerType = Utils.getPowerType(item);
                const power = parseFloat(item.power) * 100;
                if (!statPowers[powerType]) {
                    statPowers[powerType] = { total: 0, count: 0, items: [] };
                }
                statPowers[powerType].total += power;
                statPowers[powerType].count++;
                statPowers[powerType].items.push(item);
            });
            
            return {
                char,
                isActive,
                equippedCount,
                totalSlots,
                totalPower,
                statPowers,
                equipmentBySlot
            };
        });
        
        // Sort by active first, then by level
        characterBreakdowns.sort((a, b) => {
            if (a.isActive !== b.isActive) return b.isActive ? 1 : -1;
            return parseInt(b.char.level) - parseInt(a.char.level);
        });
        
        const html = characterBreakdowns.map(breakdown => {
            const { char, isActive, equippedCount, totalSlots, totalPower, statPowers } = breakdown;
            
            // Build stat breakdown - showing TOTAL not average
            const statBreakdownHTML = Object.keys(statPowers).sort().map(statType => {
                const total = statPowers[statType].total.toFixed(1);
                const count = statPowers[statType].count;
                const color = Utils.getStatColor(statType);
                return `
                    <div class="equip-stat-row">
                        <span class="equip-stat-label" style="color: ${color}">${Utils.escapeHtml(statType)} (${count})</span>
                        <span class="equip-stat-value" style="color: ${color}">${total}%</span>
                    </div>
                `;
            }).join('') || '<div class="equip-stat-row"><span style="opacity: 0.5">No equipment</span></div>';
            
            return `
                <div class="equipment-breakdown-card${isActive ? ' is-active' : ''}">
                    <div class="equip-breakdown-header">
                        <div class="equip-breakdown-title">
                            <span class="equip-breakdown-class">${Utils.escapeHtml(char.class)}</span>
                            <span class="equip-breakdown-level">Lv ${char.level}</span>
                            ${isActive ? '<span class="equip-breakdown-active">★ Active</span>' : ''}
                        </div>
                        <div class="equip-breakdown-summary">
                            <span class="equip-summary-item">
                                <span class="equip-summary-label">Equipped:</span>
                                <span class="equip-summary-value">${equippedCount}/${totalSlots}</span>
                            </span>
                        </div>
                    </div>
                    <div class="equip-breakdown-stats">
                        ${statBreakdownHTML}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="equipment-breakdown-header">
                <h3>Equipment by Character</h3>
                <p class="equipment-breakdown-description">Power breakdown for ${characterBreakdowns.length} character${characterBreakdowns.length !== 1 ? 's' : ''}</p>
            </div>
            <div class="equipment-breakdown-grid">
                ${html}
            </div>
        `;
    },
    
    renderInventorySummary() {
        const container = document.getElementById('overviewInventorySummary');
        if (!container) return;
        
        if (!State.inventoryItems || State.inventoryItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div>No inventory data available</div>
                </div>
            `;
            return;
        }
        
        // Count items by status
        let availableCount = 0;
        let equippedCount = 0;
        let listedCount = 0;
        
        State.inventoryItems.forEach(item => {
            const status = Utils.getItemStatus(item);
            if (status === 'available') availableCount++;
            else if (status === 'equipped') equippedCount++;
            else if (status === 'listed') listedCount++;
        });
        
        // Count items by slot
        const slotCounts = {};
        State.inventoryItems.forEach(item => {
            slotCounts[item.slot] = (slotCounts[item.slot] || 0) + 1;
        });
        
        // Sort slots by count
        const sortedSlots = Object.entries(slotCounts).sort((a, b) => b[1] - a[1]);
        
        const slotBreakdownHTML = sortedSlots.slice(0, 8).map(([slot, count]) => {
            const slotMeta = DesignSystem.getSlotMeta(slot);
            const icon = CONFIG.slotIcons[slot] || '⚫';
            return `
                <div class="inv-summary-slot">
                    <span class="inv-summary-slot-icon">${icon}</span>
                    <span class="inv-summary-slot-label">${slotMeta.label}</span>
                    <span class="inv-summary-slot-count">${count}</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="inv-summary-header">
                <h3>Inventory Summary</h3>
                <p class="inv-summary-description">Total: ${State.inventoryItems.length} items</p>
            </div>
            <div class="inv-summary-status">
                <div class="inv-status-card available">
                    <div class="inv-status-icon">📦</div>
                    <div class="inv-status-info">
                        <div class="inv-status-label">Available</div>
                        <div class="inv-status-value">${availableCount}</div>
                    </div>
                </div>
                <div class="inv-status-card equipped">
                    <div class="inv-status-icon">⚔️</div>
                    <div class="inv-status-info">
                        <div class="inv-status-label">Equipped</div>
                        <div class="inv-status-value">${equippedCount}</div>
                    </div>
                </div>
                <div class="inv-status-card listed">
                    <div class="inv-status-icon">💰</div>
                    <div class="inv-status-info">
                        <div class="inv-status-label">Listed</div>
                        <div class="inv-status-value">${listedCount}</div>
                    </div>
                </div>
            </div>
            <div class="inv-summary-slots">
                <h4>Items by Slot</h4>
                <div class="inv-summary-slot-grid">
                    ${slotBreakdownHTML}
                </div>
            </div>
        `;
    },
    
    getClassEmoji(className) {
        // Generate emoji dynamically based on class name
        // This allows any class to have a visual representation
        const firstChar = (className || '').charAt(0).toLowerCase();
        
        // Common emoji mapping, but falls back to a generic icon
        const commonMappings = {
            'b': '🪓',  // barbarian
            't': '🛡️',  // tank
            'r': '🗡️',  // rogue
            'h': '✨',  // healer
            'm': '🔮',  // mage
            's': '👻',  // summoner
            'a': '🏹',  // archer/ranger
            'w': '⚔️',  // warrior
            'p': '🗡️',  // paladin
            'n': '🌙',  // necromancer
            'd': '🐉',  // druid
        };
        
        return commonMappings[firstChar] || '⚔️'; // Default to sword if not found
    }
};
