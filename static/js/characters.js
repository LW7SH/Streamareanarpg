// Characters Tab Functions
const Characters = {
    async loadAllSkills() {
        // Get unique classes from loaded characters dynamically
        const uniqueClasses = [...new Set((State.characters || []).map(char => char.class))];
        
        if (uniqueClasses.length === 0) {
            console.log('⚠️ No characters found, cannot load skills');
            return;
        }
        
        console.log('🎯 Loading skills for classes:', uniqueClasses);
        
        for (const className of uniqueClasses) {
            try {
                const response = await fetch('/api/skills', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ class: className })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.skills) {
                        State.allSkills[className] = data.skills;
                        console.log(`  ✓ Loaded ${data.skills.length} skills for ${className}`);
                    }
                }
            } catch (e) {
                console.error(`Failed to load skills for ${className}:`, e);
            }
        }
        
        console.log('✓ Skills loaded for all classes');
    },
    
    async loadCharacters() {
        try {
            // Token is in HttpOnly cookie, backend will read it
            const response = await fetch('/api/udata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'  // Important: Include cookies
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load characters');
            }
            
            const data = await response.json();
            
            if (data.characters) {
                State.characters = data.characters;
                
                // Now load skills AFTER characters are loaded (skills need character data for dynamic class discovery)
                if (Object.keys(State.allSkills).length === 0) {
                    await this.loadAllSkills();
                }
                
                // Build equipped item lookup map for inventory highlighting
                Utils.buildEquippedItemMap(State.characters);
                State.userData = Utils.normalizeUserData(data.user || State.userData);
                
                // Also store player_items if available
                if (data.player_items) {
                    State.inventoryItems = data.player_items;
                }
                
                console.log('✓ Characters loaded:', State.characters.length);
                return true;
            }
            
            throw new Error('No characters found');
        } catch (e) {
            console.error('✗ Error loading characters:', e);
            return false;
        }
    },
    
    getItemForEquipment(equipId) {
        if (equipId == null) return null;
        const eid = String(equipId);
        if (!eid || eid === '-1' || eid === '0') return null;
        
        // Try inventory first
        let item = State.inventoryItems.find(i => String(i.id) === eid);
        if (item) return item;
        
        // Try player_items from udata if available
        if (State.userData && State.userData.player_items) {
            item = State.userData.player_items.find(i => i.id === equipId);
        }
        
        return item;
    },
    
    getSkillName(skillId, characterClass) {
        if (!skillId || skillId === '-1') return null;
        
        // First try to find in the specific character's class
        if (characterClass && State.allSkills[characterClass]) {
            const skill = State.allSkills[characterClass].find(s => String(s.id) === String(skillId));
            if (skill) {
                return skill.name || skill.skill_name || skill.display_name || `Skill ${skillId}`;
            }
        }
        
        // Fallback: search all classes
        for (const className in State.allSkills) {
            const skill = State.allSkills[className].find(s => String(s.id) === String(skillId));
            if (skill) {
                return skill.name || skill.skill_name || skill.display_name || `Skill ${skillId}`;
            }
        }
        
        return `Skill ${skillId}`;
    },
    
    applyFilters() {
        const classFilter = document.getElementById('charFilterClass')?.value || '';
        const minLevel = parseInt(document.getElementById('charFilterMinLevel')?.value) || 0;
        const maxLevel = parseInt(document.getElementById('charFilterMaxLevel')?.value) || 999;
        const sortBy = document.getElementById('charSortBy')?.value || 'level';
        
        let filtered = State.characters.filter(char => {
            if (classFilter && char.class.toLowerCase() !== classFilter.toLowerCase()) return false;
            const level = parseInt(char.level) || 0;
            if (level < minLevel || level > maxLevel) return false;
            return true;
        });
        
        // Sort
        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'level':
                    return parseInt(b.level) - parseInt(a.level);
                case 'experience':
                    return parseInt(b.experience) - parseInt(a.experience);
                case 'playtime':
                    return parseInt(b.game_time) - parseInt(a.game_time);
                case 'slot':
                    return parseInt(a.slot) - parseInt(b.slot);
                default:
                    return 0;
            }
        });
        
        DOMHelpers.updateCounts('charTotalCount', 'charFilteredCount', State.characters.length, filtered.length);
        
        this.renderCharacters(filtered);
    },
    
    renderCharacters(characters) {
        const container = document.getElementById('charactersContainer');
        
        if (!characters || characters.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('🎮', 'No characters found. Load your data using your token.');
            return;
        }
        
        
        const activeSlot = Utils.getActiveSlot(State.userData);
container.innerHTML = characters.map((char, idx) => {
            const level = parseInt(char.level) || 0;
            const exp = parseInt(char.experience) || 0;
            const gameTime = parseInt(char.game_time) || 0;
            const hours = Math.floor(gameTime / 3600);
            const minutes = Math.floor((gameTime % 3600) / 60);
            const isActive = (activeSlot != null) ? (String(char.slot) === String(activeSlot)) : false;
            
            // Dynamically get ALL equipped items by finding all *_equip fields
            const equipSlots = Object.keys(char).filter(key => key.endsWith('_equip'));
            const equippedItemsMap = {};
            const equippedItems = [];
            
            equipSlots.forEach(slotKey => {
                const item = this.getItemForEquipment(char[slotKey]);
                if (item) {
                    equippedItemsMap[slotKey] = item;
                    equippedItems.push(item);
                }
            });
            
            // Calculate average power
            const avgPower = equippedItems.length > 0 
                ? (equippedItems.reduce((sum, i) => sum + (parseFloat(i.power) * 100), 0) / equippedItems.length).toFixed(1)
                : '0.0';
            
            // Get skills - use centralized Utils function
            const skills = [char.skill1, char.skill2, char.skill3, char.skill4, char.skill5]
                .filter(s => s && s !== '-1')
                .map(s => Utils.getSkillName(s, char.class))
                .filter(s => s);  // Remove nulls
            
            // Helper to get display info for equipment slots
            const getSlotDisplayInfo = (slotKey) => {
                const slotName = slotKey.replace('_equip', '');
                const slotMeta = DesignSystem.getSlotMeta(slotName);
                
                // Fallback icons and labels for slots not in design system
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
                    return `<div class="equip-slot empty" title="${displayInfo.label}">
                        <div class="equip-icon">${displayInfo.icon}</div>
                        <div class="equip-name">Empty</div>
                    </div>`;
                }
                
                const power = (parseFloat(item.power) * 100).toFixed(1);
                const itemName = Utils.getItemName(item.base_item_id, item.slot) || 'Unknown';
                const powerType = Utils.getPowerType(item);
                const statColor = Utils.getStatColor(powerType);
                
                return `<div class="equip-slot filled" title="${Utils.escapeHtml(itemName)} - ${powerType} ${power}%">
                    <div class="equip-icon">${displayInfo.icon}</div>
                    <div class="equip-details">
                        <div class="equip-name">${Utils.escapeHtml(itemName)}</div>
                        <div class="equip-power" style="color: ${statColor}">${powerType} ${power}%</div>
                    </div>
                </div>`;
            };
            
            // Generate equipment grid HTML dynamically
            const equipmentGridHTML = equipSlots.map(slotKey => 
                renderEquipSlot(equippedItemsMap[slotKey], slotKey)
            ).join('');
            
            return `
                <div class="character-card${isActive ? " is-active" : ""}" style="animation-delay: ${idx * 0.05}s">
                    <div class="character-header">
                        <div class="character-class-badge ${Utils.escapeHtml(char.class.toLowerCase())}">
                            ${Utils.escapeHtml(char.class)}
                        </div>
                        <div class="character-slot">Slot ${parseInt(char.slot) + 1}</div>
                        ${isActive ? '<span class="character-active-badge">Active</span>' : ''}
                    </div>
                    
                    <div class="character-stats-row">
                        <div class="character-stat-big">
                            <div class="stat-label">Level</div>
                            <div class="stat-value">${level}</div>
                        </div>
                        <div class="character-stat-big">
                            <div class="stat-label">Avg Power</div>
                            <div class="stat-value" style="color: var(--accent)">${avgPower}%</div>
                        </div>
                        <div class="character-stat-big">
                            <div class="stat-label">Playtime</div>
                            <div class="stat-value">${hours}h ${minutes}m</div>
                        </div>
                    </div>
                    
                    <div class="character-stat-small">
                        <span class="stat-label">Experience:</span>
                        <span class="stat-value">${Utils.formatNumber(exp)}</span>
                    </div>
                    <div class="character-stat-small">
                        <span class="stat-label">Target Type:</span>
                        <span class="stat-value">${Utils.escapeHtml(char.target_type)}</span>
                    </div>
                    ${char.character_skin ? `
                    <div class="character-stat-small">
                        <span class="stat-label">Skin:</span>
                        <span class="stat-value">${Utils.escapeHtml(char.character_skin)}</span>
                    </div>
                    ` : ''}
                    ${char.last_played_on ? `
                    <div class="character-stat-small">
                        <span class="stat-label">Last Played:</span>
                        <span class="stat-value">${Utils.escapeHtml(char.last_played_on)}</span>
                    </div>
                    ` : ''}
                    
                    <div class="character-section-title">⚔️ Equipment</div>
                    <div class="equipment-grid">
                        ${equipmentGridHTML}
                    </div>
                    
                    ${skills.length > 0 ? `
                    <div class="character-section-title">✨ Skills</div>
                    <div class="skills-list">
                        ${skills.map(s => `<div class="skill-badge">${Utils.escapeHtml(s)}</div>`).join('')}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
};

function applyCharacterFilters() {
    Characters.applyFilters();
}

function clearCharacterFilters() {
    document.getElementById('charFilterClass').value = '';
    document.getElementById('charFilterMinLevel').value = '';
    document.getElementById('charFilterMaxLevel').value = '';
    document.getElementById('charSortBy').value = 'level';
    Characters.applyFilters();
}

async function loadCharactersData() {
    const statusDiv = document.getElementById('charactersLoadStatus');
    
    try {
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--accent); font-size: 0.9rem;">⏳ Loading characters...</div>';
        }
        
        const success = await Characters.loadCharacters();
        
        if (success) {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--success); font-size: 0.9rem;">✓ Characters loaded!</div>';
            }
            Characters.applyFilters();
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--danger); font-size: 0.9rem;">⚠️ Failed to load characters</div>';
            }
        }
    } catch (e) {
        console.error('Error loading characters:', e);
        if (statusDiv) {
            statusDiv.innerHTML = `<div style="color: var(--danger); font-size: 0.9rem;">✗ Error: ${e.message}</div>`;
        }
    }
}
