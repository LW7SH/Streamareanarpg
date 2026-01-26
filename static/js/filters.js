// Filter Management
const Filters = {
    populateFilters() {
        console.log('🔍 Sample game item structure:', State.gameItems[0]);
        console.log('🔍 All fields in game item:', Object.keys(State.gameItems[0] || {}));
        
        // Item names
        const uniqueNames = [...new Set(State.gameItems.map(i => i.item_name))].sort();
        const nameSelect = document.getElementById('filterItemName');
        uniqueNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            nameSelect.appendChild(opt);
        });
        
        // Classes - Extract from game items
        const classesSet = new Set();
        
        State.gameItems.forEach(gi => {
            // Check all possible fields
            const possibleFields = [
                gi.class,
                gi.item_class, 
                gi.Class,
                gi.classes,
                gi.wearable,
                gi.wearable_by,
                gi.usable_by,
                gi.restricted_to
            ];
            
            possibleFields.forEach(field => {
                if (field) {
                    // If it's already an array
                    if (Array.isArray(field)) {
                        field.forEach(cls => {
                            if (cls && typeof cls === 'string' && cls.trim()) {
                                classesSet.add(cls.trim());
                            }
                        });
                    } 
                    // If it's a string that might be JSON
                    else if (typeof field === 'string') {
                        // Try to parse as JSON array first
                        try {
                            const parsed = JSON.parse(field);
                            if (Array.isArray(parsed)) {
                                parsed.forEach(cls => {
                                    if (cls && typeof cls === 'string' && cls.trim()) {
                                        classesSet.add(cls.trim());
                                    }
                                });
                            } else if (parsed && typeof parsed === 'string' && parsed.trim()) {
                                classesSet.add(parsed.trim());
                            }
                        } catch {
                            // Not JSON, try comma-separated
                            field.split(',').forEach(cls => {
                                const clean = cls.trim().replace(/[\[\]"']/g, ''); // Remove brackets and quotes
                                if (clean) {
                                    classesSet.add(clean);
                                }
                            });
                        }
                    }
                }
            });
        });
        
        const uniqueClasses = Array.from(classesSet).sort();
        const classSelect = document.getElementById('filterItemClass');
        const analysisClassSelect = document.getElementById('analysisFilterClass');
        
        uniqueClasses.forEach(cls => {
            const opt1 = document.createElement('option');
            opt1.value = cls;
            opt1.textContent = cls;
            classSelect.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = cls;
            opt2.textContent = cls;
            analysisClassSelect.appendChild(opt2);
        });
        
        console.log('✓ Found classes:', uniqueClasses.length, uniqueClasses);
        if (uniqueClasses.length === 0) {
            console.error('❌ NO CLASSES FOUND - Check the field names above!');
        }
        
        // Extra properties (stat types)
        const extraProps = new Set();
        State.gameItems.forEach(gi => {
            if (gi.extra) {
                gi.extra.split(',').forEach(e => {
                    const trimmed = e.trim();
                    if (trimmed) {
                        extraProps.add(trimmed === 'A_Speed' ? 'Attack Speed' : trimmed);
                    }
                });
            }
        });
        
        // Add innate stat types
        Object.values(CONFIG.innateStats).forEach(s => extraProps.add(s));
        
        const sortedProps = Array.from(extraProps).sort();
        const propSelect = document.getElementById('filterExtraProperty');
        const analysisPropSelect = document.getElementById('analysisFilterStat');
        
        sortedProps.forEach(prop => {
            const opt1 = document.createElement('option');
            opt1.value = prop;
            opt1.textContent = prop;
            propSelect.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = prop;
            opt2.textContent = prop;
            analysisPropSelect.appendChild(opt2);
        });
        
        console.log('✓ Filters populated successfully');
    },
    
    setupListeners() {
        // Marketplace filters
        ['filterUsername', 'filterItemName', 'filterSlot', 'filterItemClass', 'filterExtraProperty',
         'filterMinPower', 'filterMaxPower', 'filterMinRange', 'filterMaxRange',
         'filterMaxPlatinum', 'filterMaxGold', 'filterMaxGems'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => {
                if (State.currentTab === 'marketplace') {
                    Marketplace.applyFilters();
                }
            });
        });
        
        // Analysis filters
        ['analysisFilterName', 'analysisFilterSlot', 'analysisFilterClass', 
         'analysisFilterStat', 'analysisSortBy'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => {
                if (State.currentTab === 'analysis') {
                    Analysis.applyFilters();
                }
            });
        });
        
        // Marketplace sort
        const marketplaceSort = document.getElementById('marketplaceSortBy');
        if (marketplaceSort) {
            marketplaceSort.addEventListener('change', () => {
                if (State.currentTab === 'marketplace') {
                    Marketplace.applyFilters();
                }
            });
        }
        
        console.log('✓ Listeners ready');
    }
};

// Global filter functions (called from HTML)
function clearFilters() {
    ['filterUsername', 'filterMinPower', 'filterMaxPower', 'filterMinRange', 'filterMaxRange',
     'filterMaxPlatinum', 'filterMaxGold', 'filterMaxGems'].forEach(id => {
        document.getElementById(id).value = '';
    });
    ['filterItemName', 'filterSlot', 'filterItemClass', 'filterExtraProperty', 'marketplaceSortBy'].forEach(id => {
        document.getElementById(id).value = '';
    });
    Marketplace.applyFilters();
}

function clearAnalysisFilters() {
    document.getElementById('analysisFilterName').value = '';
    document.getElementById('analysisFilterSlot').value = '';
    document.getElementById('analysisFilterClass').value = '';
    document.getElementById('analysisFilterStat').value = '';
    document.getElementById('analysisSortBy').value = 'name';
    Analysis.applyFilters();
}
