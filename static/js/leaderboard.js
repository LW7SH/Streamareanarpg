// Leaderboard Tab Functions
const Leaderboard = {
    async loadLeaderboard() {
        try {
            const response = await fetch('/api/top-players');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load leaderboard');
            }
            
            const data = await response.json();
            
            if (data.top_10) {
                State.topPlayers = data.top_10;
                State.topPlayersEquipment = data.equipped_items || [];
                console.log('✓ Leaderboard loaded:', State.topPlayers.length, 'players');
                return true;
            }
            
            throw new Error('No leaderboard data found');
        } catch (e) {
            console.error('✗ Error loading leaderboard:', e);
            return false;
        }
    },
    
    getEquippedItem(itemId) {
        if (!itemId || itemId === '-1') return null;
        return State.topPlayersEquipment.find(i => i.id === itemId);
    },
    
    calculateMetaStats() {
        const weaponCounts = {};
        const classCounts = {};
        const skinCounts = {};
        const backCounts = {};
        
        State.topPlayers.forEach(player => {
            // Count classes
            const cls = player.class.toLowerCase();
            classCounts[cls] = (classCounts[cls] || 0) + 1;
            
            // Count skins
            if (player.character_skin) {
                skinCounts[player.character_skin] = (skinCounts[player.character_skin] || 0) + 1;
            }
            
            // Count back items
            if (player.back_item) {
                backCounts[player.back_item] = (backCounts[player.back_item] || 0) + 1;
            }
            
            // Count weapons
            const weapon = this.getEquippedItem(player.weapon_equip);
            if (weapon) {
                const weaponName = Utils.getItemName(weapon.base_item_id, weapon.slot) || 'Unknown';
                weaponCounts[weaponName] = (weaponCounts[weaponName] || 0) + 1;
            }
        });
        
        return { weaponCounts, classCounts, skinCounts, backCounts };
    },
    
    applyFilters() {
        const classFilter = document.getElementById('leaderboardFilterClass')?.value || '';
        const usernameFilter = (document.getElementById('leaderboardFilterUsername')?.value || '').toLowerCase().trim();
        const minLevel = parseInt(document.getElementById('leaderboardFilterMinLevel')?.value) || 0;
        const maxLevel = parseInt(document.getElementById('leaderboardFilterMaxLevel')?.value) || 999;
        const sortBy = document.getElementById('leaderboardSortBy')?.value || 'rank';
        
        let filtered = State.topPlayers.filter(player => {
            if (classFilter && player.class.toLowerCase() !== classFilter.toLowerCase()) return false;
            if (usernameFilter && !player.username.toLowerCase().includes(usernameFilter)) return false;
            const level = parseInt(player.level) || 0;
            if (level < minLevel || level > maxLevel) return false;
            return true;
        });
        
        // Sort
        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'rank':
                    return (a.rank || 0) - (b.rank || 0);
                case 'level':
                    return parseInt(b.level) - parseInt(a.level);
                case 'experience':
                    return parseInt(b.experience) - parseInt(a.experience);
                case 'playtime':
                    return parseInt(b.game_time) - parseInt(a.game_time);
                default:
                    return 0;
            }
        });
        
        DOMHelpers.updateCounts('leaderboardTotalCount', 'leaderboardFilteredCount', State.topPlayers.length, filtered.length);
        
        this.renderLeaderboard(filtered);
    },
    
    renderLeaderboard(playersData) {
        const container = document.getElementById('leaderboardContainer');
        
        const players = playersData || State.topPlayers;
        
        if (!players || players.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('🏆', 'Leaderboard data not loaded');
            return;
        }
        
        const metaStats = this.calculateMetaStats();
        
        // Render meta analysis section
        const metaHtml = `
            <div class="meta-analysis-section">
                <h3 class="meta-title">📊 Meta Analysis</h3>
                <div class="meta-grid">
                    <div class="meta-card">
                        <div class="meta-card-title">Most Popular Classes</div>
                        <div class="meta-list">
                            ${Object.entries(metaStats.classCounts)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cls, count]) => `
                                    <div class="meta-item">
                                        <span class="meta-item-name">${Utils.escapeHtml(cls)}</span>
                                        <span class="meta-item-count">${count} player${count !== 1 ? 's' : ''}</span>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                    
                    <div class="meta-card">
                        <div class="meta-card-title">Top Weapons</div>
                        <div class="meta-list">
                            ${Object.entries(metaStats.weaponCounts)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([weapon, count]) => `
                                    <div class="meta-item">
                                        <span class="meta-item-name">${Utils.escapeHtml(weapon)}</span>
                                        <span class="meta-item-count">${count}x</span>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                    
                    <div class="meta-card">
                        <div class="meta-card-title">Popular Skins</div>
                        <div class="meta-list">
                            ${Object.entries(metaStats.skinCounts)
                                .sort((a, b) => b[1] - a[1])
                                .map(([skin, count]) => `
                                    <div class="meta-item">
                                        <span class="meta-item-name">${Utils.escapeHtml(skin)}</span>
                                        <span class="meta-item-count">${count}x</span>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                    
                    ${Object.keys(metaStats.backCounts).length > 0 ? `
                    <div class="meta-card">
                        <div class="meta-card-title">Popular Back Items</div>
                        <div class="meta-list">
                            ${Object.entries(metaStats.backCounts)
                                .sort((a, b) => b[1] - a[1])
                                .map(([back, count]) => `
                                    <div class="meta-item">
                                        <span class="meta-item-name">${Utils.escapeHtml(back)}</span>
                                        <span class="meta-item-count">${count}x</span>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Render top players with hover effect
        const playersHtml = players.map((player, idx) => {
            const level = parseInt(player.level) || 0;
            const exp = parseInt(player.experience) || 0;
            const gameTime = parseInt(player.game_time) || 0;
            const hours = Math.floor(gameTime / 3600);
            
            const weapon = this.getEquippedItem(player.weapon_equip);
            const head = this.getEquippedItem(player.head_equip);
            const body = this.getEquippedItem(player.body_equip);
            const hands = this.getEquippedItem(player.hands_equip);
            const feet = this.getEquippedItem(player.feet_equip);
            const offhand = this.getEquippedItem(player.offhand_equip);
            const ring = this.getEquippedItem(player.ring_equip);
            
            const equippedItems = [weapon, head, body, hands, feet, offhand, ring].filter(i => i);
            const avgPower = equippedItems.length > 0 
                ? (equippedItems.reduce((sum, i) => sum + (parseFloat(i.power) * 100), 0) / equippedItems.length).toFixed(1)
                : '0.0';
            
            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#e879f9', '#a78bfa'];
            const rankColor = rankColors[Math.min(idx, rankColors.length - 1)];
            
            const renderEquipment = (item, icon) => {
                if (!item) return `<span style="opacity: 0.3;">${icon} —</span>`;
                const power = (parseFloat(item.power) * 100).toFixed(1);
                const itemName = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown';
                const powerType = Utils.getPowerType(item);
                const statColor = Utils.getStatColor(powerType);
                return `<div class="leaderboard-equip-item">
                    <span>${icon} ${Utils.escapeHtml(itemName)}</span>
                    <span style="color: ${statColor}; font-weight: 600;">${powerType} ${power}%</span>
                </div>`;
            };
            
            // Build hover tooltip with equipment AND cosmetics
            const hoverTooltip = `
                <div class="leaderboard-hover-tooltip">
                    <div style="font-weight: 700; margin-bottom: 0.5rem; color: var(--primary); font-size: 0.75rem; text-align: center;">⚔️ EQUIPMENT & COSMETICS</div>
                    
                    ${player.character_skin || player.back_item ? `
                    <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">
                        ${player.character_skin ? `
                        <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.7rem;">
                            <span style="color: var(--text-dim);">🎨 Skin:</span>
                            <span style="font-weight: 600;">${Utils.escapeHtml(player.character_skin)}</span>
                        </div>
                        ` : ''}
                        ${player.back_item ? `
                        <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.7rem;">
                            <span style="color: var(--text-dim);">🎒 Back:</span>
                            <span style="font-weight: 600;">${Utils.escapeHtml(player.back_item)}</span>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="leaderboard-tooltip-equipment">
                        ${renderEquipment(weapon, DesignSystem.getSlotMeta('weapon').icon)}
                        ${renderEquipment(head, DesignSystem.getSlotMeta('head').icon)}
                        ${renderEquipment(body, DesignSystem.getSlotMeta('body').icon)}
                        ${renderEquipment(hands, DesignSystem.getSlotMeta('hands').icon)}
                        ${renderEquipment(feet, DesignSystem.getSlotMeta('feet').icon)}
                        ${renderEquipment(offhand, '🗡️')}
                        ${renderEquipment(ring, '💍')}
                    </div>
                </div>
            `;
            
            return `
                <div class="leaderboard-card" style="animation-delay: ${idx * 0.05}s">
                    ${hoverTooltip}
                    <div class="leaderboard-rank" style="background: ${rankColor}">
                        #${player.rank || (idx + 1)}
                    </div>
                    
                    <div class="leaderboard-header">
                        <div class="leaderboard-player-name">${Utils.escapeHtml(player.username)}</div>
                        <div class="leaderboard-class-badge ${Utils.escapeHtml(player.class.toLowerCase())}">
                            ${Utils.escapeHtml(player.class)}
                        </div>
                    </div>
                    
                    <div class="leaderboard-stats">
                        <div class="leaderboard-stat">
                            <span class="stat-label">Level</span>
                            <span class="stat-value">${level}</span>
                        </div>
                        <div class="leaderboard-stat">
                            <span class="stat-label">Experience</span>
                            <span class="stat-value">${Utils.formatNumber(exp)}</span>
                        </div>
                        <div class="leaderboard-stat">
                            <span class="stat-label">Avg Power</span>
                            <span class="stat-value" style="color: var(--accent)">${avgPower}%</span>
                        </div>
                        <div class="leaderboard-stat">
                            <span class="stat-label">Playtime</span>
                            <span class="stat-value">${hours}h</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = metaHtml + '<div class="leaderboard-grid">' + playersHtml + '</div>';
    }
};

async function loadLeaderboardData() {
    const statusDiv = document.getElementById('leaderboardLoadStatus');
    
    try {
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--accent); font-size: 0.9rem;">⏳ Loading leaderboard...</div>';
        }
        
        const success = await Leaderboard.loadLeaderboard();
        
        if (success) {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--success); font-size: 0.9rem;">✓ Leaderboard loaded!</div>';
            }
            Leaderboard.applyFilters();
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--danger); font-size: 0.9rem;">⚠️ Failed to load leaderboard</div>';
            }
        }
    } catch (e) {
        console.error('Error loading leaderboard:', e);
        if (statusDiv) {
            statusDiv.innerHTML = `<div style="color: var(--danger); font-size: 0.9rem;">✗ Error: ${e.message}</div>`;
        }
    }
}

function applyLeaderboardFilters() {
    Leaderboard.applyFilters();
}

function clearLeaderboardFilters() {
    document.getElementById('leaderboardFilterClass').value = '';
    document.getElementById('leaderboardFilterUsername').value = '';
    document.getElementById('leaderboardFilterMinLevel').value = '';
    document.getElementById('leaderboardFilterMaxLevel').value = '';
    document.getElementById('leaderboardSortBy').value = 'rank';
    Leaderboard.applyFilters();
}
