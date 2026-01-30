// Friends Tab Functions
const Friends = {
    async loadFriends() {
        try {
            // Token is in HttpOnly cookie, backend will read it
            const response = await fetch('/api/friends', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'  // Important: Include cookies
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load friends');
            }
            
            const data = await response.json();
            
            State.friends = data.friends || [];
            State.pendingFriendsIn = data.pending_in || [];
            State.pendingFriendsOut = data.pending_out || [];
            
            console.log('✓ Friends loaded:', State.friends.length);
            return true;
        } catch (e) {
            console.error('✗ Error loading friends:', e);
            return false;
        }
    },
    
    getOnlineStatus(lastUpdated) {
        if (!lastUpdated) return { status: 'Unknown', color: 'var(--text-dim)' };
        
        const now = Date.now() / 1000;
        const diff = now - parseInt(lastUpdated);
        
        if (diff < 300) return { status: 'Online', color: 'var(--success)' };
        if (diff < 3600) return { status: 'Away', color: 'var(--warning)' };
        if (diff < 86400) return { status: 'Today', color: 'var(--accent)' };
        
        const days = Math.floor(diff / 86400);
        return { status: `${days}d ago`, color: 'var(--text-dim)' };
    },
    
    applyFilters() {
        const classFilter = document.getElementById('friendsFilterClass')?.value || '';
        const minLevel = parseInt(document.getElementById('friendsFilterMinLevel')?.value) || 0;
        const sortBy = document.getElementById('friendsSortBy')?.value || 'level';
        
        let filtered = State.friends.filter(friend => {
            if (classFilter && friend.class.toLowerCase() !== classFilter.toLowerCase()) return false;
            const level = parseInt(friend.level) || 0;
            if (level < minLevel) return false;
            return true;
        });
        
        // Sort
        filtered.sort((a, b) => {
            switch(sortBy) {
                case 'level':
                    return parseInt(b.level) - parseInt(a.level);
                case 'name':
                    return a.username.localeCompare(b.username);
                case 'recent':
                    return parseInt(b.last_updated) - parseInt(a.last_updated);
                default:
                    return 0;
            }
        });
        
        DOMHelpers.updateCounts('friendsTotalCount', 'friendsFilteredCount', State.friends.length, filtered.length);
        
        this.renderFriends(filtered);
    },
    
    renderFriends(friends) {
        const container = document.getElementById('friendsContainer');
        
        if (!friends || friends.length === 0) {
            container.innerHTML = UIComponents.renderEmptyState('👥', 'No friends found. Add friends in-game!');
            return;
        }
        
        const friendsHtml = friends.map((friend, idx) => {
            const level = parseInt(friend.level) || 0;
            const status = this.getOnlineStatus(friend.last_updated);
            
            return `
                <div class="friend-card" style="animation-delay: ${idx * 0.05}s">
                    <div class="friend-header">
                        <div class="friend-name">${Utils.escapeHtml(friend.username)}</div>
                        <div class="friend-status" style="color: ${status.color}">
                            <div class="status-dot" style="background: ${status.color}"></div>
                            ${Utils.escapeHtml(status.status)}
                        </div>
                    </div>
                    
                    <div class="friend-stats">
                        <div class="friend-stat">
                            <span class="stat-label">Class</span>
                            <span class="stat-value">${Utils.escapeHtml(friend.class)}</span>
                        </div>
                        <div class="friend-stat">
                            <span class="stat-label">Level</span>
                            <span class="stat-value">${level}</span>
                        </div>
                    </div>
                    
                    ${friend.last_played_on ? `
                    <div class="friend-detail">
                        <span style="opacity: 0.7;">Last seen:</span> ${Utils.escapeHtml(friend.last_played_on)}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Render pending requests if any
        let pendingHtml = '';
        if (State.pendingFriendsIn.length > 0 || State.pendingFriendsOut.length > 0) {
            pendingHtml = `
                <div class="pending-section">
                    ${State.pendingFriendsIn.length > 0 ? `
                    <div class="pending-group">
                        <h3 class="pending-title">📥 Incoming Requests (${State.pendingFriendsIn.length})</h3>
                        <div class="pending-list">
                            ${State.pendingFriendsIn.map(req => `
                                <div class="pending-item">${Utils.escapeHtml(req.username || req)}</div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${State.pendingFriendsOut.length > 0 ? `
                    <div class="pending-group">
                        <h3 class="pending-title">📤 Outgoing Requests (${State.pendingFriendsOut.length})</h3>
                        <div class="pending-list">
                            ${State.pendingFriendsOut.map(req => `
                                <div class="pending-item">${Utils.escapeHtml(req.username || req)}</div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        
        container.innerHTML = pendingHtml + '<div class="friends-grid">' + friendsHtml + '</div>';
    }
};

function applyFriendsFilters() {
    Friends.applyFilters();
}

function clearFriendsFilters() {
    document.getElementById('friendsFilterClass').value = '';
    document.getElementById('friendsFilterMinLevel').value = '';
    document.getElementById('friendsSortBy').value = 'level';
    Friends.applyFilters();
}

async function loadFriendsData() {
    const statusDiv = document.getElementById('friendsLoadStatus');
    
    try {
        if (statusDiv) {
            statusDiv.innerHTML = '<div style="color: var(--accent); font-size: 0.9rem;">⏳ Loading friends...</div>';
        }
        
        const success = await Friends.loadFriends();
        
        if (success) {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--success); font-size: 0.9rem;">✓ Friends loaded!</div>';
            }
            Friends.applyFilters();
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--danger); font-size: 0.9rem;">⚠️ Failed to load friends</div>';
            }
        }
    } catch (e) {
        console.error('Error loading friends:', e);
        if (statusDiv) {
            statusDiv.innerHTML = `<div style="color: var(--danger); font-size: 0.9rem;">✗ Error: ${e.message}</div>`;
        }
    }
}
