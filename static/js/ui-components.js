// UI Components - Reusable rendering functions
const UIComponents = {
    // Render comparison section for an item
    renderComparison(item, analysisData, slotAnalysisData) {
        const power = parseFloat(item.power) * 100;
        const totalGold = Utils.getTotalGoldValue(item);
        const type = Utils.getPowerType(item);
        
        if (!analysisData || !slotAnalysisData) return '';
        
        // Item-specific comparison
        const itemPowerPercent = ((power - analysisData.minPower) / (analysisData.maxPower - analysisData.minPower) * 100) || 0;
        const itemPricePercent = ((totalGold - analysisData.minPrice) / (analysisData.maxPrice - analysisData.minPrice) * 100) || 0;
        
        // Use the actual comparison classes from original
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
                        <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">All ${Utils.escapeHtml(Utils.formatSlot(item.slot))} (${Utils.escapeHtml(type)})</div>
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
                        <div style="font-weight: 600; font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">All ${Utils.escapeHtml(Utils.formatSlot(item.slot))} (${Utils.escapeHtml(type)})</div>
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
            <div class="comparison-row">
                <span class="comparison-label">${Utils.escapeHtml(label)}</span>
                <div style="flex: 1; margin-left: 0.75rem;">
                    <div class="comparison-bar">
                        <div class="comparison-fill ${colorClass}" style="width: ${Math.min(100, Math.max(0, percent))}%"></div>
                    </div>
                    <div style="font-size: 0.65rem; color: var(--text-dimmer); margin-top: 0.25rem;">
                        ${formattedMin} ← ${formattedValue} → ${formattedMax}
                    </div>
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
    
    renderItemCard(item, idx, showSeller = false) {
        const name = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown Item';
        const power = (parseFloat(item.power) * 100).toFixed(1);
        const type = Utils.getPowerType(item);
        const range = Utils.getRange(item);
        const twoHandedValue = Utils.getTwoHanded(item);
        const statColor = Utils.getStatColor(type);
        const totalGold = Utils.getTotalGoldValue(item);
        
        // Get analysis data
        const stats = Utils.getItemStatTypes(item, true);
        const isTwoHanded = !!twoHandedValue;
        const analysisData = Utils.getAnalysisForItem(item.base_item_id, item.slot, stats, isTwoHanded);
        const slotAnalysisData = Utils.getSlotAnalysis(item.slot, type);
        
        const comparisonHTML = showSeller ? 
            this.renderComparison(item, analysisData, slotAnalysisData) : 
            this.renderInventoryComparison(item, analysisData, slotAnalysisData);
        
        // Escape for JavaScript context (inside onclick attribute)
        const clickHandler = showSeller ? `onclick="filterToItem('${Utils.escapeJs(name)}')"` : '';
        
        return `
            <div class="item-card" style="animation-delay: ${idx * 0.05}s" ${clickHandler}>
                <div class="card-header">
                    <div>
                        <div class="item-id">#${Utils.escapeHtml(item.id)}</div>
                        <div class="item-name">${Utils.escapeHtml(name)}</div>
                        ${showSeller ? `<div class="item-seller">by ${Utils.escapeHtml(item.username)}</div>` : ''}
                    </div>
                    <div class="slot-badge ${Utils.escapeHtml(item.slot)}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.escapeHtml(Utils.formatSlot(item.slot))}</div>
                </div>
                <div class="card-stats">
                    <div class="stat-row">
                        <div class="stat-type" style="color: ${statColor}">${Utils.escapeHtml(type)}</div>
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
        const name = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown Item';
        const power = (parseFloat(item.power) * 100).toFixed(1);
        const type = Utils.getPowerType(item);
        const range = Utils.getRange(item);
        const twoHandedValue = Utils.getTwoHanded(item);
        const statColor = Utils.getStatColor(type);
        const totalGold = Utils.getTotalGoldValue(item);
        
        // Get analysis data
        const stats = Utils.getItemStatTypes(item, true);
        const isTwoHanded = !!twoHandedValue;
        const analysisData = Utils.getAnalysisForItem(item.base_item_id, item.slot, stats, isTwoHanded);
        const slotAnalysisData = Utils.getSlotAnalysis(item.slot, type);
        
        const comparisonHTML = showSeller ? 
            this.renderComparison(item, analysisData, slotAnalysisData) : 
            this.renderInventoryComparison(item, analysisData, slotAnalysisData);
        
        // Escape for JavaScript context
        const clickAttr = onClickHandler ? `onclick="${onClickHandler}('${Utils.escapeJs(name)}')"` : '';
        
        return `
            <div class="item-row" style="animation-delay: ${idx * 0.02}s" ${clickAttr}>
                <div class="item-id">#${Utils.escapeHtml(item.id)}</div>
                <div>
                    <div class="item-name">${Utils.escapeHtml(name)}</div>
                    ${showSeller ? `<div class="item-seller">by ${Utils.escapeHtml(item.username)}</div>` : ''}
                </div>
                <div class="slot-badge ${Utils.escapeHtml(item.slot)}">${CONFIG.slotIcons[item.slot] || ''} ${Utils.escapeHtml(Utils.formatSlot(item.slot))}</div>
                <div style="text-align: center;">
                    <div class="stat-type" style="color: ${statColor}">${Utils.escapeHtml(type)}</div>
                    ${range !== null ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin: 0.25rem 0;">⟷ Range: ${Utils.escapeHtml(String(range))}</div>` : ''}
                    ${twoHandedValue ? `<div style="font-size: 0.7rem; color: var(--text-dim); margin: 0.25rem 0;">✋ Two Handed: ${Utils.escapeHtml(String(twoHandedValue))}</div>` : ''}
                    <div style="font-family: 'Space Mono', monospace; font-weight: 700; color: ${statColor};">${power}%</div>
                </div>
                ${showSeller ? `<div>${Utils.formatPrice(item)}</div>` : ''}
                ${showSeller ? `<div class="item-time">${Utils.escapeHtml(Utils.formatTime(item.time_created))}</div>` : ''}
                ${comparisonHTML}
            </div>
        `;
    }
};
