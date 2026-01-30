// Enhanced UI Components - Unified rendering for all tabs
const UIComponents = {
    renderStatusPills(model) {
        // Maryam request: no extra "equipped/listed" badges inside inventory cards.
        // We rely on standardized borders (is-equipped / is-listed classes) instead.
        return '';
    },

    // ===== ITEM CARDS & ROWS =====
    
    // Render comparison section for marketplace items
    renderComparison(item, analysisData, slotAnalysisData) {
        const power = parseFloat(item.power) * 100;
        const totalGold = Utils.getTotalGoldValue(item);
        const type = Utils.getPowerType(item);
        
        const model = new ItemModel(item);
        const slotMeta = model.slotMeta;
        if (!analysisData || !slotAnalysisData) return '';
        
        // Item-specific comparison
        const itemPowerPercent = ((power - analysisData.minPower) / (analysisData.maxPower - analysisData.minPower) * 100) || 0;
        const itemPricePercent = ((totalGold - analysisData.minPrice) / (analysisData.maxPrice - analysisData.minPrice) * 100) || 0;
        
        const itemPowerClass = power >= analysisData.maxPower * 0.9 ? 'comparison-good' : 
                              power <= analysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
        const itemPriceClass = totalGold <= analysisData.minPrice * 1.1 ? 'comparison-good' : 
                              totalGold >= analysisData.maxPrice * 0.9 ? 'comparison-bad' : 'comparison-neutral';
        
        const itemCostPerPower = totalGold / power;
        const avgItemCostPerPower = analysisData.avgCostPerPower;
        const itemTier = Utils.getTierFromPercentile(itemPowerPercent, analysisData.count);
        
        // Slot-wide comparison
        const slotPowerPercent = ((power - slotAnalysisData.minPower) / (slotAnalysisData.maxPower - slotAnalysisData.minPower) * 100) || 0;
        const slotPricePercent = ((totalGold - slotAnalysisData.minPrice) / (slotAnalysisData.maxPrice - slotAnalysisData.minPrice) * 100) || 0;
        
        const slotPowerClass = power >= slotAnalysisData.maxPower * 0.9 ? 'comparison-good' : 
                              power <= slotAnalysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
        const slotPriceClass = totalGold <= slotAnalysisData.minPrice * 1.1 ? 'comparison-good' : 
                              totalGold >= slotAnalysisData.maxPrice * 0.9 ? 'comparison-bad' : 'comparison-neutral';
        
        const avgSlotCostPerPower = slotAnalysisData.avgCostPerPower;
        const slotTier = Utils.getTierFromPercentile(slotPowerPercent, slotAnalysisData.count);
        
        return `
            <div class="comparison-tooltip">
                <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--primary); font-size: 0.75rem; text-align: center;">📊 MARKET COMPARISON</div>
                
                <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Same Item (${analysisData.count} listings)</div>
                        ${this.renderTierBadge(itemTier)}
                    </div>
                    ${this.renderComparisonBar('Power', power, analysisData.minPower, analysisData.maxPower, itemPowerPercent, itemPowerClass)}
                    ${this.renderComparisonBar('Price', totalGold, analysisData.minPrice, analysisData.maxPrice, itemPricePercent, itemPriceClass, true)}
                    ${this.renderCostPerPower(itemCostPerPower, avgItemCostPerPower)}
                </div>
                
                <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">All ${Utils.escapeHtml(slotMeta.label)} (${Utils.escapeHtml(type)})</div>
                        ${this.renderTierBadge(slotTier)}
                    </div>
                    ${this.renderComparisonBar('Power', power, slotAnalysisData.minPower, slotAnalysisData.maxPower, slotPowerPercent, slotPowerClass)}
                    ${this.renderComparisonBar('Price', totalGold, slotAnalysisData.minPrice, slotAnalysisData.maxPrice, slotPricePercent, slotPriceClass, true)}
                    ${this.renderCostPerPower(itemCostPerPower, avgSlotCostPerPower)}
                </div>
            </div>
        `;
    },
    
    // Render inventory comparison (no price data)
    renderInventoryComparison(item, analysisData, slotAnalysisData) {
        const power = parseFloat(item.power) * 100;
        const type = Utils.getPowerType(item);
        
        const model = new ItemModel(item);
        const slotMeta = model.slotMeta;
        if (!analysisData || !slotAnalysisData) return '';
        
        // Item-specific comparison
        const itemPowerPercent = ((power - analysisData.minPower) / (analysisData.maxPower - analysisData.minPower) * 100) || 0;
        const itemPowerClass = power >= analysisData.maxPower * 0.9 ? 'comparison-good' : 
                              power <= analysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
        const itemTier = Utils.getTierFromPercentile(itemPowerPercent, analysisData.count);
        
        // Slot-wide comparison
        const slotPowerPercent = ((power - slotAnalysisData.minPower) / (slotAnalysisData.maxPower - slotAnalysisData.minPower) * 100) || 0;
        const slotPowerClass = power >= slotAnalysisData.maxPower * 0.9 ? 'comparison-good' : 
                              power <= slotAnalysisData.minPower * 1.1 ? 'comparison-bad' : 'comparison-neutral';
        const slotTier = Utils.getTierFromPercentile(slotPowerPercent, slotAnalysisData.count);
        
        return `
            <div class="comparison-tooltip">
                <div style="font-weight: 700; margin-bottom: 0.75rem; color: var(--primary); font-size: 0.75rem; text-align: center;">📊 MARKET COMPARISON</div>
                
                <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Same Item (${analysisData.count} listings)</div>
                        ${this.renderTierBadge(itemTier)}
                    </div>
                    ${this.renderComparisonBar('Power', power, analysisData.minPower, analysisData.maxPower, itemPowerPercent, itemPowerClass)}
                    <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                            <span style="color: var(--text-dim);">Price Range:</span>
                            <span style="font-family: 'Space Mono', monospace; font-weight: 600;">
                                ${Utils.formatGold(analysisData.minPrice)} - ${Utils.formatGold(analysisData.maxPrice)}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-dim);">Est. Value:</span>
                            <span style="font-family: 'Space Mono', monospace; font-weight: 600; color: var(--success);">
                                ~${Utils.formatGold(analysisData.avgPrice)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">All ${Utils.escapeHtml(slotMeta.label)} (${Utils.escapeHtml(type)})</div>
                        ${this.renderTierBadge(slotTier)}
                    </div>
                    ${this.renderComparisonBar('Power', power, slotAnalysisData.minPower, slotAnalysisData.maxPower, slotPowerPercent, slotPowerClass)}
                </div>
            </div>
        `;
    },
    
    renderComparisonBar(label, value, min, max, percent, colorClass, isPrice = false) {
        const formattedValue = isPrice ? Utils.formatGold(value) : `${value.toFixed(1)}%`;
        const formattedMin = isPrice ? Utils.formatGold(min) : `${min.toFixed(1)}%`;
        const formattedMax = isPrice ? Utils.formatGold(max) : `${max.toFixed(1)}%`;
        
        return `
            <div style="margin-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
                    <span style="color: var(--text-dim);">${label}</span>
                    <span class="${colorClass}" style="font-family: 'Space Mono', monospace; font-weight: 600;">${formattedValue}</span>
                </div>
                <div style="background: var(--bg); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div class="${colorClass}" style="height: 100%; width: ${Math.min(100, Math.max(0, percent))}%; transition: width 0.3s;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                    <span>${formattedMin}</span>
                    <span>${formattedMax}</span>
                </div>
            </div>
        `;
    },
    
    renderTierBadge(tier) {
        return `<div style="background: ${tier.color}; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.7rem; font-family: 'Space Mono', monospace;">${Utils.escapeHtml(tier.tier)}</div>`;
    },
    
    renderCostPerPower(itemCostPerPower, avgCostPerPower) {
        const color = itemCostPerPower < avgCostPerPower * 0.9 ? 'var(--success)' : 
                      itemCostPerPower > avgCostPerPower * 1.1 ? 'var(--danger)' : 'var(--text)';
        
        return `
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.75rem; display: flex; justify-content: space-between;">
                <span style="color: var(--text-dim);">Avg Cost/Power:</span>
                <span style="font-family: 'Space Mono', monospace; font-weight: 600; color: ${color};">
                    ${Utils.formatGold(itemCostPerPower)}/% (Avg: ${Utils.formatGold(avgCostPerPower)}/%)
                </span>
            </div>
        `;
    },
    
    renderEmptyState(icon, message) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${Utils.escapeHtml(icon)}</div>
                <div>${Utils.escapeHtml(message)}</div>
            </div>
        `;
    },
    
    renderAuthRequired(tabName) {
        return `
            <div class="auth-required-state">
                <div class="auth-required-icon">🔐</div>
                <div class="auth-required-title">Authentication Required</div>
                <div class="auth-required-message">
                    This ${tabName} tab requires authentication to view your personal data.
                </div>
                <button class="btn-primary" onclick="document.getElementById('authTokenInput').focus()">
                    Enter Token
                </button>
            </div>
        `;
    },
    
    renderItemCard(item, idx, showSeller = false) {
                const model = (item instanceof ItemModel) ? item : new ItemModel(item);
        const name = model.name;
        const power = model.powerPercent.toFixed(1);
        const type = model.powerType;
        const range = model.range;
        const twoHandedValue = model.twoHanded;
        const statColor = model.statColor;
        const totalGold = model.totalGold;

        const slotMeta = model.slotMeta;
        const typeIcon = DesignSystem.getTypeIcon(type);

        const statusClasses = `${model.isEquipped ? ' is-equipped' : ''}${model.isListed ? ' is-listed' : ''}`;

        // Get analysis data (consistent across tabs)
        const stats = model.statTypes;
        const isTwoHanded = model.isTwoHanded;
        const analysisData = model.analysisData;
        const slotAnalysisData = model.slotAnalysisData;

const comparisonHTML = showSeller ? 
            this.renderComparison(item, analysisData, slotAnalysisData) : 
            this.renderInventoryComparison(item, analysisData, slotAnalysisData);
        
        const clickHandler = showSeller ? `onclick="filterToItem('${Utils.escapeJs(name)}')"` : '';
        
        return `
            <div class="item-card${statusClasses}" style="animation-delay: ${idx * 0.05}s" ${clickHandler}>
                <div class="card-header">
                    <div>
                        <div class="item-id">#${Utils.escapeHtml(item.id)}</div>
                        <div class="item-name">${Utils.escapeHtml(name)}</div>${this.renderStatusPills(model)}
                        ${this.renderStatusPills(model)}
                        ${showSeller ? `<div class="item-seller">by ${Utils.escapeHtml(item.username)}</div>` : ''}
                    </div>
                    <div class="slot-badge ${Utils.escapeHtml(slotMeta.badgeClass)}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.escapeHtml(slotMeta.label)}</div>
                </div>
                <div class="card-stats">
                    <div class="stat-row">
                        <div class="stat-type" style="color: ${statColor}"><span class="stat-icon">${Utils.escapeHtml(typeIcon)}</span>${Utils.escapeHtml(type)}</div>
                        <div class="stat-value-display" style="color: ${statColor}">${power}%</div>
                    </div>
                    ${range !== null ? `<div class="stat-row"><div class="stat-type">Range</div><div class="stat-value-display">${Utils.escapeHtml(String(range))}</div></div>` : ''}
                    ${twoHandedValue ? `<div class="stat-row"><div class="stat-type">Two Handed</div><div class="stat-value-display">${Utils.escapeHtml(String(twoHandedValue))}</div></div>` : ''}
                </div>
                ${showSeller ? `
                    <div class="item-price">
                        ${Utils.formatPrice(item)}
                    </div>
                    <div class="card-footer">
                        <div class="item-time" data-tooltip="${Utils.escapeHtml(new Date(item.time_created).toLocaleString())}">${Utils.escapeHtml(Utils.formatTime(item.time_created))}</div>
                    </div>
                ` : ''}
                ${comparisonHTML}
            </div>
        `;
    },
    
    renderItemRow(item, idx, showSeller = false, onClickHandler = null) {
                const model = (item instanceof ItemModel) ? item : new ItemModel(item);
        const name = model.name;
        const power = model.powerPercent.toFixed(1);
        const type = model.powerType;
        const statColor = model.statColor;
        const totalGold = model.totalGold;
        const slotMeta = model.slotMeta;
        const typeIcon = DesignSystem.getTypeIcon(type);

        const statusClasses = `${model.isEquipped ? ' is-equipped' : ''}${model.isListed ? ' is-listed' : ''}`;

        // Click handler
        const clickHandler = onClickHandler ? `onclick="${onClickHandler}('${Utils.escapeJs(name)}')"` : '';

return `
            <div class="item-row${statusClasses}" style="animation-delay: ${idx * 0.02}s" ${clickAttr}>
                <div class="item-id">#${Utils.escapeHtml(item.id)}</div>
                <div>
                    <div class="item-name">${Utils.escapeHtml(name)}</div>
                    ${showSeller ? `<div class="item-seller">by ${Utils.escapeHtml(item.username)}</div>` : ''}
                </div>
                <div class="slot-badge ${Utils.escapeHtml(slotMeta.badgeClass)}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.escapeHtml(slotMeta.label)}</div>
                <div style="text-align: center;">
                    <div class="stat-type" style="color: ${statColor}"><span class="stat-icon">${Utils.escapeHtml(typeIcon)}</span>${Utils.escapeHtml(type)}</div>
                    ${range !== null ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin: 0.25rem 0;">⟷ Range: ${Utils.escapeHtml(String(range))}</div>` : ''}
                    ${twoHandedValue ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin: 0.25rem 0;">✋ Two Handed: ${Utils.escapeHtml(String(twoHandedValue))}</div>` : ''}
                    <div style="font-family: 'Space Mono', monospace; font-weight: 700; color: ${statColor};">${power}%</div>
                </div>
                ${showSeller ? `<div>${Utils.formatPrice(item)}</div>` : ''}
                ${showSeller ? `<div class="item-time">${Utils.escapeHtml(Utils.formatTime(item.time_created))}</div>` : ''}
                ${comparisonHTML}
            </div>
        `;
    },
    
    // ===== UNIFIED DATA CARDS =====
    
    // Render a unified card for characters, friends, shop items, etc.
    renderDataCard(config) {
        const {
            title,
            subtitle,
            badge,
            stats = [],
            details = [],
            sections = [],
            actions = [],
            icon = '',
            index = 0,
            clickHandler = ''
        } = config;
        
        const clickAttr = clickHandler ? `onclick="${clickHandler}"` : '';
        
        return `
            <div class="data-card" style="animation-delay: ${index * 0.05}s" ${clickAttr}>
                ${icon ? `<div class="data-card-icon">${Utils.escapeHtml(icon)}</div>` : ''}
                
                <div class="data-card-header">
                    <div>
                        ${title ? `<div class="data-card-title">${Utils.escapeHtml(title)}</div>` : ''}
                        ${subtitle ? `<div class="data-card-subtitle">${Utils.escapeHtml(subtitle)}</div>` : ''}
                    </div>
                    ${badge ? `<div class="data-card-badge">${badge}</div>` : ''}
                </div>
                
                ${stats.length > 0 ? `
                    <div class="data-card-stats">
                        ${stats.map(stat => `
                            <div class="data-card-stat">
                                <div class="data-card-stat-label">${Utils.escapeHtml(stat.label)}</div>
                                <div class="data-card-stat-value" style="${stat.color ? `color: ${stat.color}` : ''}">${Utils.escapeHtml(stat.value)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${details.length > 0 ? `
                    <div class="data-card-details">
                        ${details.map(detail => `
                            <div class="data-card-detail">
                                <span class="data-card-detail-label">${Utils.escapeHtml(detail.label)}:</span>
                                <span class="data-card-detail-value">${Utils.escapeHtml(detail.value)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${sections.map(section => `
                    <div class="data-card-section">
                        ${section.title ? `<div class="data-card-section-title">${Utils.escapeHtml(section.title)}</div>` : ''}
                        <div class="data-card-section-content">${section.content}</div>
                    </div>
                `).join('')}
                
                ${actions.length > 0 ? `
                    <div class="data-card-actions">
                        ${actions.map(action => `
                            <button class="${action.className || 'btn-secondary'}" onclick="${action.handler}">
                                ${Utils.escapeHtml(action.label)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
};
