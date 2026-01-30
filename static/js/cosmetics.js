// Cosmetics Tab - Dedicated Cosmetics Management
const Cosmetics = {
    render() {
        console.log('Rendering cosmetics...');
        
        this.renderEquipped(); // Now at top
        this.renderShaders();
        this.renderBackItems();
        this.updateCounts();
    },
    
    updateCounts() {
        if (!State.userData || !State.shaders || !State.backs) {
            return;
        }
        
        const ownedShaders = (State.userData.cosmetics?.shaders || []).map(s => String(s));
        const ownedBacks = State.userData.cosmetics?.back_items || State.userData.cosmetics?.backs || [];
        
        document.getElementById('ownedShadersCount').textContent = ownedShaders.length;
        document.getElementById('totalShadersCount').textContent = State.shaders.length;
        document.getElementById('ownedBacksCount').textContent = ownedBacks.length;
        document.getElementById('totalBacksCount').textContent = State.backs.length;
    },
    
    renderShaders() {
        const container = document.getElementById('cosmeticsShaders');
        if (!container) return;
        
        if (!State.shaders || State.shaders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <div>No shaders available</div>
                </div>
            `;
            return;
        }
        
        const showOwnedOnly = document.getElementById('shadersShowOwnedOnly')?.checked || false;
        // udata stores owned shaders by `name_string` (e.g., "PinkMist")
        const ownedShaderKeys = (State.userData?.cosmetics?.shaders || []).map(s => String(s));
        
        let shaders = State.shaders;
        if (showOwnedOnly) {
            shaders = shaders.filter(shader => ownedShaderKeys.includes(String(shader.name_string)));
        }
        
        if (shaders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <div>No owned shaders</div>
                </div>
            `;
            return;
        }
        
        const html = shaders.map(shader => {
            const isOwned = ownedShaderKeys.includes(String(shader.name_string));
            const costGold = parseInt(shader.gold_cost) || 0;
            const costGems = parseInt(shader.gem_cost) || 0;
            
            return `
                <div class="cosmetic-card ${isOwned ? 'owned' : 'not-owned'}">
                    <div class="cosmetic-header">
                        <div class="cosmetic-name">${shader.display_name}</div>
                        ${isOwned ? '<div class="cosmetic-owned-badge">✓ Owned</div>' : ''}
                    </div>
                    <div class="cosmetic-preview">
                        <div class="cosmetic-shader-preview" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <div class="cosmetic-shader-icon">🎨</div>
                        </div>
                    </div>
                    <div class="cosmetic-footer">
                        ${!isOwned ? `
                            <div class="cosmetic-price">${Utils.formatPrice({ platinum_cost: 0, gold_cost: costGold, gem_cost: costGems })}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    renderBackItems() {
        const container = document.getElementById('cosmeticsBackItems');
        if (!container) return;
        
        if (!State.backs || State.backs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎒</div>
                    <div>No back items available</div>
                </div>
            `;
            return;
        }
        
        const showOwnedOnly = document.getElementById('backsShowOwnedOnly')?.checked || false;
        const ownedBackIds = (State.userData?.cosmetics?.back_items || State.userData?.cosmetics?.backs || []).map(id => String(id));
        
        let backs = State.backs;
        if (showOwnedOnly) {
            backs = backs.filter(back => 
                ownedBackIds.includes(back.id.toString())
            );
        }
        
        if (backs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎒</div>
                    <div>No owned back items</div>
                </div>
            `;
            return;
        }
        
        const html = backs.map(back => {
            const isOwned = ownedBackIds.includes(String(back.id));
            const costGold = parseInt(back.gold_cost) || 0;
            const costGems = parseInt(back.gem_cost) || 0;
            
            return `
                <div class="cosmetic-card ${isOwned ? 'owned' : 'not-owned'}">
                    <div class="cosmetic-header">
                        <div class="cosmetic-name">${back.display_name}</div>
                        ${isOwned ? '<div class="cosmetic-owned-badge">✓ Owned</div>' : ''}
                    </div>
                    <div class="cosmetic-preview">
                        <div class="cosmetic-back-preview">
                            <div class="cosmetic-back-icon">🎒</div>
                        </div>
                    </div>
                    <div class="cosmetic-footer">
                        ${!isOwned ? `
                            <div class="cosmetic-price">${Utils.formatPrice({ platinum_cost: 0, gold_cost: costGold, gem_cost: costGems })}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    renderEquipped() {
        const container = document.getElementById('cosmeticsEquipped');
        if (!container) return;
        
        if (!State.characters || State.characters.length === 0 || !State.userData) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <div>No character data available</div>
                </div>
            `;
            return;
        }
        
        // Get active slot
        const activeSlot = State.userData.active_slot;
        
        // Sort characters by slot
        const sortedChars = [...State.characters].sort((a, b) => parseInt(a.slot) - parseInt(b.slot));
        
        // Build HTML for all characters showing their cosmetics
        const charCosmetics = sortedChars.map(char => {
            const isActive = (activeSlot != null) ? (String(char.slot) === String(activeSlot)) : false;
            const equippedShader = char.character_skin || '';
            const equippedBack = char.back_equip || '-1';
            
            // Find shader details
            let shaderName = 'Default';
            if (equippedShader && equippedShader !== '') {
                const shader = State.shaders?.find(s => String(s.name_string) === String(equippedShader));
                shaderName = shader?.display_name || equippedShader;
            }
            
            // Find back item details
            let backName = 'None';
            if (equippedBack && equippedBack !== '-1') {
                const back = State.backs?.find(b => String(b.id) === String(equippedBack));
                backName = back?.display_name || `Back Item ${equippedBack}`;
            }
            
            return `
                <div class="character-cosmetic-card${isActive ? ' is-active' : ''}">
                    <div class="character-cosmetic-header">
                        <span class="character-cosmetic-class">${Utils.escapeHtml(char.class)}</span>
                        <span class="character-cosmetic-level">Lv ${char.level}</span>
                        ${isActive ? '<span class="character-cosmetic-active">★ Active</span>' : ''}
                    </div>
                    <div class="character-cosmetic-items">
                        <div class="cosmetic-item-row">
                            <span class="cosmetic-item-icon">🎨</span>
                            <span class="cosmetic-item-label">Shader:</span>
                            <span class="cosmetic-item-value">${Utils.escapeHtml(shaderName)}</span>
                        </div>
                        <div class="cosmetic-item-row">
                            <span class="cosmetic-item-icon">🎒</span>
                            <span class="cosmetic-item-label">Back:</span>
                            <span class="cosmetic-item-value">${Utils.escapeHtml(backName)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="cosmetics-equipped-header">
                <h3>Equipped Cosmetics by Character</h3>
                <p class="cosmetics-equipped-description">Showing cosmetics equipped on all ${sortedChars.length} character${sortedChars.length !== 1 ? 's' : ''}</p>
            </div>
            <div class="cosmetics-equipped-grid">
                ${charCosmetics}
            </div>
        `;
    },
    
    renderChests() {
        const container = document.getElementById('cosmeticsChests');
        if (!container) return;
        
        if (!State.playerChests || State.playerChests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div>No chests owned</div>
                </div>
            `;
            return;
        }
        
        // Count chests by type
        const chestCounts = {};
        State.playerChests.forEach(chest => {
            const type = chest.item_type || 'Unknown';
            chestCounts[type] = (chestCounts[type] || 0) + 1;
        });
        
        const html = Object.entries(chestCounts).map(([type, count]) => {
            return `
                <div class="cosmetic-chest-card">
                    <div class="cosmetic-chest-icon">📦</div>
                    <div class="cosmetic-chest-info">
                        <div class="cosmetic-chest-type">${type}</div>
                        <div class="cosmetic-chest-count">×${count}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    applyFilters() {
        this.renderShaders();
        this.renderBackItems();
    }
};
