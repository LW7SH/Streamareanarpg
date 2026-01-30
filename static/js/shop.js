// Shop Tab Functions
const Shop = {
    async loadShopData() {
        try {
            // Shop endpoints are public (use admin token on backend)
            const [shadersRes, backsRes, chestsRes] = await Promise.all([
                fetch('/api/shaders'),
                fetch('/api/backs'),
                fetch('/api/chests')
            ]);
            
            const shadersData = await shadersRes.json();
            const backsData = await backsRes.json();
            const chestsData = await chestsRes.json();
            
            State.shaders = shadersData.shaders || [];
            State.backs = backsData.back_items || [];
            State.chests = chestsData.chests || [];
            
            console.log('✓ Shop data loaded:', State.shaders.length, 'shaders,', State.backs.length, 'backs,', State.chests.length, 'chests');
            return true;
        } catch (e) {
            console.error('✗ Error loading shop data:', e);
            return false;
        }
    },
    
    async loadPlayerChests() {
        try {
            // Token is in HttpOnly cookie, backend will read it
            const response = await fetch('/api/player-chests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'  // Important: Include cookies
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load chests');
            }
            
            const data = await response.json();
            State.playerChests = data.chests || [];
            
            console.log('✓ Player chests loaded:', State.playerChests.length);
            return true;
        } catch (e) {
            console.error('✗ Error loading player chests:', e);
            return false;
        }
    },
    
    canAfford(item) {
        if (!State.userData) return { canAfford: false, reason: 'No user data' };
        
        const userGold = parseInt(State.userData.gold) || 0;
        const userPlatinum = parseInt(State.userData.platinum) || 0;
        const userGems = parseInt(State.userData.gems) || 0;
        
        const needPlatinum = parseInt(item.platinum_cost) || 0;
        const needGold = parseInt(item.gold_cost) || 0;
        const needGems = parseInt(item.gem_cost) || 0;
        
        // Check if can afford with any currency
        const canAffordPlatinum = needPlatinum > 0 && userPlatinum >= needPlatinum;
        const canAffordGold = needGold > 0 && userGold >= needGold;
        const canAffordGems = needGems > 0 && userGems >= needGems;
        
        if (canAffordPlatinum || canAffordGold || canAffordGems) {
            return { canAfford: true, reason: 'Affordable' };
        }
        
        return { canAfford: false, reason: 'Cannot afford' };
    },
    
    renderShaders() {
        const container = document.getElementById('shadersContainer');
        
        if (!State.shaders || State.shaders.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('🎨', 'No shaders available');
            return;
        }
        
        const sorted = [...State.shaders].sort((a, b) => {
            const aTotal = (parseInt(a.platinum_cost) || 0) * CONFIG.PLATINUM_TO_GOLD + (parseInt(a.gold_cost) || 0);
            const bTotal = (parseInt(b.platinum_cost) || 0) * CONFIG.PLATINUM_TO_GOLD + (parseInt(b.gold_cost) || 0);
            return aTotal - bTotal;
        });
        
        container.innerHTML = sorted.map((shader, idx) => {
            const affordability = this.canAfford(shader);
            
            return `
                <div class="shop-item ${affordability.canAfford ? 'affordable' : 'not-affordable'}" style="animation-delay: ${idx * 0.05}s">
                    <div class="shop-item-header">
                        <div class="shop-item-name">${Utils.escapeHtml(shader.display_name)}</div>
                        ${affordability.canAfford ? '<div class="affordability-badge affordable">✓ Affordable</div>' : '<div class="affordability-badge">✗ Too Expensive</div>'}
                    </div>
                    
                    <div class="shop-item-id">ID: ${Utils.escapeHtml(shader.name_string)}</div>
                    
                    <div class="shop-item-prices">
                        ${parseInt(shader.platinum_cost) > 0 ? `<div class="shop-price">⚪ ${Utils.formatNumber(parseInt(shader.platinum_cost))} Platinum</div>` : ''}
                        ${parseInt(shader.gold_cost) > 0 ? `<div class="shop-price">🟡 ${Utils.formatNumber(parseInt(shader.gold_cost))} Gold</div>` : ''}
                        ${parseInt(shader.gem_cost) > 0 ? `<div class="shop-price">💎 ${Utils.formatNumber(parseInt(shader.gem_cost))} Gems</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    renderBacks() {
        const container = document.getElementById('backsContainer');
        
        if (!State.backs || State.backs.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('🎒', 'No back items available');
            return;
        }
        
        const sorted = [...State.backs].sort((a, b) => {
            const aTotal = (parseInt(a.platinum_cost) || 0) * CONFIG.PLATINUM_TO_GOLD + (parseInt(a.gold_cost) || 0);
            const bTotal = (parseInt(b.platinum_cost) || 0) * CONFIG.PLATINUM_TO_GOLD + (parseInt(b.gold_cost) || 0);
            return aTotal - bTotal;
        });
        
        container.innerHTML = sorted.map((back, idx) => {
            const affordability = this.canAfford(back);
            
            return `
                <div class="shop-item ${affordability.canAfford ? 'affordable' : 'not-affordable'}" style="animation-delay: ${idx * 0.05}s">
                    <div class="shop-item-header">
                        <div class="shop-item-name">${Utils.escapeHtml(back.display_name)}</div>
                        ${affordability.canAfford ? '<div class="affordability-badge affordable">✓ Affordable</div>' : '<div class="affordability-badge">✗ Too Expensive</div>'}
                    </div>
                    
                    <div class="shop-item-prices">
                        ${parseInt(back.platinum_cost) > 0 ? `<div class="shop-price">⚪ ${Utils.formatNumber(parseInt(back.platinum_cost))} Platinum</div>` : ''}
                        ${parseInt(back.gold_cost) > 0 ? `<div class="shop-price">🟡 ${Utils.formatNumber(parseInt(back.gold_cost))} Gold</div>` : ''}
                        ${parseInt(back.gem_cost) > 0 ? `<div class="shop-price">💎 ${Utils.formatNumber(parseInt(back.gem_cost))} Gems</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    renderChests() {
        const container = document.getElementById('chestsContainer');
        
        if (!State.chests || State.chests.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('📦', 'No chests available');
            return;
        }
        
        const sorted = [...State.chests].sort((a, b) => {
            const aTotal = (parseInt(a.platinum_cost) || 0) * CONFIG.PLATINUM_TO_GOLD + (parseInt(a.gold_cost) || 0);
            const bTotal = (parseInt(b.platinum_cost) || 0) * CONFIG.PLATINUM_TO_GOLD + (parseInt(b.gold_cost) || 0);
            return aTotal - bTotal;
        });
        
        container.innerHTML = sorted.map((chest, idx) => {
            const affordability = this.canAfford(chest);
            
            return `
                <div class="shop-item ${affordability.canAfford ? 'affordable' : 'not-affordable'}" style="animation-delay: ${idx * 0.05}s">
                    <div class="shop-item-header">
                        <div class="shop-item-name">${Utils.escapeHtml(chest.display_name)}</div>
                        ${affordability.canAfford ? '<div class="affordability-badge affordable">✓ Affordable</div>' : '<div class="affordability-badge">✗ Too Expensive</div>'}
                    </div>
                    
                    <div class="shop-item-detail">
                        Drops ${chest.drop_min}-${chest.drop_max} items
                    </div>
                    
                    <div class="shop-item-prices">
                        ${parseInt(chest.platinum_cost) > 0 ? `<div class="shop-price">⚪ ${Utils.formatNumber(parseInt(chest.platinum_cost))} Platinum</div>` : ''}
                        ${parseInt(chest.gold_cost) > 0 ? `<div class="shop-price">🟡 ${Utils.formatNumber(parseInt(chest.gold_cost))} Gold</div>` : ''}
                        ${parseInt(chest.gem_cost) > 0 ? `<div class="shop-price">💎 ${Utils.formatNumber(parseInt(chest.gem_cost))} Gems</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    renderAll() {
        this.renderShaders();
        this.renderBacks();
        this.renderChests();
        
        // Update owned chests count
        if (State.playerChests) {
            document.getElementById('ownedChestsCount').textContent = State.playerChests.length;
        }
    }
};

async function loadShopData() {
    const statusDiv = document.getElementById('shopLoadStatus');
    
    try {
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--accent); font-size: 0.9rem;">⏳ Loading shop...</div>';
        }
        
        const success = await Shop.loadShopData();
        
        if (success) {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--success); font-size: 0.9rem;">✓ Shop loaded!</div>';
            }
            
            // Try to load player chests if authenticated
            await Shop.loadPlayerChests();
            
            Shop.renderAll();
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--danger); font-size: 0.9rem;">⚠️ Failed to load shop</div>';
            }
        }
    } catch (e) {
        console.error('Error loading shop:', e);
        if (statusDiv) {
            statusDiv.innerHTML = `<div style="color: var(--danger); font-size: 0.9rem;">✗ Error: ${e.message}</div>`;
        }
    }
}
