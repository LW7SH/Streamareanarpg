// Unified Authentication Manager
// Handles authentication state and token management for all tabs that require authentication
const AuthManager = {
    // Tabs that require authentication
    PROTECTED_TABS: ['overview', 'inventory', 'characters', 'cosmetics', 'mylistings', 'friends'],
    
    isAuthenticated: false,
    userData: null,
    
    // Initialize auth manager
    async init() {
        console.log('🔐 Initializing authentication...');
        
        // Check if we have a saved token
        const hasToken = await TokenManager.hasToken();
        
        if (hasToken) {
            console.log('✓ Saved token found, attempting to load user data...');
            
            // CRITICAL FIX: Actually try to load user data with the saved token
            const loaded = await this.loadUserData();
            
            if (loaded) {
                this.isAuthenticated = true;
                console.log('✓ Authentication restored from saved token');
            } else {
                console.warn('⚠ Token exists but user data could not be loaded');
                this.isAuthenticated = false;
                // Token might be invalid, clear it
                await TokenManager.deleteToken();
            }
            
            this.updateAuthUI();
        } else {
            console.log('ℹ No saved token');
            this.isAuthenticated = false;
            this.updateAuthUI();
        }
    },
    
    // Update UI based on authentication state
    updateAuthUI() {
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        
        if (this.isAuthenticated && this.userData) {
            // Show user profile, hide auth input
            if (authSection) authSection.style.display = 'none';
            if (userSection) userSection.style.display = 'flex';
            
            // Update user info in header
            this.displayUserInfo();
            
            // Update tab indicators
            this.updateTabIndicators();
        } else {
            // Show auth input, hide user profile
            if (authSection) authSection.style.display = 'flex';
            if (userSection) userSection.style.display = 'none';
            
            // Update tab indicators to show locked state
            this.updateTabIndicators();
        }
    },
    
    // Display user information in header
    displayUserInfo() {
        if (!this.userData) return;
        
        const elements = {
            username: document.getElementById('headerUsername'),
            gold: document.getElementById('headerGold'),
            platinum: document.getElementById('headerPlatinum'),
            gems: document.getElementById('headerGems')
        };
        
        if (elements.username) elements.username.textContent = this.userData.username || 'Player';
        if (elements.gold) elements.gold.textContent = Utils.formatNumber(parseInt(this.userData.gold) || 0);
        if (elements.platinum) elements.platinum.textContent = Utils.formatNumber(parseInt(this.userData.platinum) || 0);
        if (elements.gems) elements.gems.textContent = Utils.formatNumber(parseInt(this.userData.gems) || 0);
    },
    
    // Update tab button indicators
    updateTabIndicators() {
        this.PROTECTED_TABS.forEach(tabName => {
            const tabBtn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
            if (!tabBtn) return;
            
            // Remove existing indicator
            const existingIndicator = tabBtn.querySelector('.auth-indicator');
            if (existingIndicator) existingIndicator.remove();
            
            if (!this.isAuthenticated) {
                // Add lock indicator
                const indicator = document.createElement('span');
                indicator.className = 'auth-indicator locked';
                indicator.textContent = '🔒';
                indicator.title = 'Authentication required';
                tabBtn.appendChild(indicator);
            } else {
                // Add checkmark indicator
                const indicator = document.createElement('span');
                indicator.className = 'auth-indicator unlocked';
                indicator.textContent = '✓';
                indicator.title = 'Authenticated';
                tabBtn.appendChild(indicator);
            }
        });
    },
    
    // Load user data from API
    async loadUserData() {
        try {
            console.log('  → Attempting to load user data...');

            // Use udata endpoint (single source of truth for user + characters + cosmetics)
            const response = await fetch('/api/udata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'  // Include cookies
            });
            
            if (!response.ok) {
                console.warn('  ✗ Failed to load user data (HTTP', response.status, ')');
                return false;
            }
            
            const data = await response.json();

            if (data.user) {
                this.userData = data.user;
                State.userData = Utils.normalizeUserData(data.user);

                // Keep state in sync for tabs that depend on udata
                if (Array.isArray(data.characters)) {
                    State.characters = data.characters;
                    Utils.buildEquippedItemMap(State.characters);
                }
                if (Array.isArray(data.player_items)) {
                    State.inventoryItems = data.player_items;
                    console.log('  📦 Loaded', data.player_items.length, 'items from udata (may be partial inventory)');
                }

                console.log('  ✓ User data loaded:', this.userData.username);
                this.updateAuthUI();
                return true;
            }

            console.warn('  ✗ Response did not contain user data');
            return false;
        } catch (e) {
            console.error('  ✗ Error loading user data:', e);
            return false;
        }
    },
    
    // Authenticate with token
    async authenticate(token) {
        if (!token || !token.trim()) {
            throw new Error('Token is required');
        }
        
        try {
            console.log('🔐 Starting authentication...');
            
            // Save token
            const saved = await TokenManager.saveToken(token);
            if (!saved) {
                throw new Error('Failed to save token');
            }
            console.log('  ✓ Token saved');
            
            // Load user data
            const loaded = await this.loadUserData();
            if (!loaded) {
                throw new Error('Failed to load user data - token may be invalid');
            }
            console.log('  ✓ User data loaded');
            
            this.isAuthenticated = true;
            this.updateAuthUI();
            
            console.log('✓ Authentication successful');
            
            // Auto-load all authenticated data
            console.log('🔄 Auto-loading authenticated data...');
            
            // Load inventory
            try {
                console.log('  → Loading inventory...');
                const invResponse = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page: 1 }),
                    credentials: 'include'
                });
                if (invResponse.ok) {
                    const invData = await invResponse.json();
                    if (invData.player_items) {
                        State.inventoryItems = invData.player_items;
                        
                        // Load all pages
                        const totalPages = invData.total_pages || 1;
                        if (totalPages > 1) {
                            const remaining = [];
                            for (let p = 2; p <= totalPages; p++) {
                                remaining.push(
                                    fetch('/api/inventory', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ page: p }),
                                        credentials: 'include'
                                    }).then(r => r.json())
                                );
                            }
                            
                            const results = await Promise.all(remaining);
                            results.forEach(data => {
                                if (data.player_items) State.inventoryItems.push(...data.player_items);
                            });
                        }
                        
                        console.log('  ✓ Inventory loaded:', State.inventoryItems.length, 'items');
                    }
                }
            } catch (e) {
                console.warn('  ⚠ Could not load inventory:', e.message);
            }
            
            // Load characters
            try {
                console.log('  → Loading characters...');
                if (typeof Characters !== 'undefined' && Characters.loadCharacters) {
                    await Characters.loadCharacters();
                    console.log('  ✓ Characters loaded:', State.characters?.length || 0);
                }
            } catch (e) {
                console.warn('  ⚠ Could not load characters:', e.message);
            }
            
            // Load my listings
            try {
                console.log('  → Loading my listings...');
                if (typeof MyListings !== 'undefined' && MyListings.loadMyListings) {
                    await MyListings.loadMyListings();
                    console.log('  ✓ My listings loaded:', State.myListings?.length || 0);
                }
            } catch (e) {
                console.warn('  ⚠ Could not load my listings:', e.message);
            }
            
            // Load friends
            try {
                console.log('  → Loading friends...');
                if (typeof Friends !== 'undefined' && Friends.loadFriends) {
                    await Friends.loadFriends();
                    console.log('  ✓ Friends loaded:', State.friends?.length || 0);
                }
            } catch (e) {
                console.warn('  ⚠ Could not load friends:', e.message);
            }
            
            // Load shop data
            try {
                console.log('  → Loading shop data...');
                if (typeof Shop !== 'undefined' && Shop.loadPlayerChests) {
                    await Shop.loadPlayerChests();
                    console.log('  ✓ Shop data loaded');
                }
            } catch (e) {
                console.warn('  ⚠ Could not load shop:', e.message);
            }
            
            console.log('✓ All data loaded successfully');
            
            return true;
        } catch (e) {
            console.error('✗ Authentication failed:', e);
            // Clear potentially invalid token
            await TokenManager.deleteToken();
            this.isAuthenticated = false;
            this.userData = null;
            this.updateAuthUI();
            throw e;
        }
    },
    
    // Sign out
    async signOut() {
        await TokenManager.deleteToken();
        this.isAuthenticated = false;
        this.userData = null;
        State.userData = null;
        
        // Clear all authenticated data
        State.inventoryItems = [];
        State.characters = [];
        State.myListings = [];
        State.friends = [];
        State.playerChests = [];
        
        this.updateAuthUI();
        
        console.log('✓ Signed out');
    },
    
    // Check if tab requires authentication
    requiresAuth(tabName) {
        return this.PROTECTED_TABS.includes(tabName);
    },
    
    // Show auth prompt if not authenticated
    showAuthPrompt(tabName) {
        if (!this.requiresAuth(tabName) || this.isAuthenticated) {
            return false;
        }
        
        // Switch back to marketplace
        switchTab('marketplace');
        
        // Show message
        const authInput = document.getElementById('authTokenInput');
        if (authInput) {
            authInput.focus();
            authInput.placeholder = `Enter token to access ${tabName}...`;
        }
        
        return true;
    }
};

// Global functions for HTML
window.authenticateWithToken = async function authenticateWithToken() {
    const tokenInput = document.getElementById('authTokenInput');
    const statusDiv = document.getElementById('authStatus');
    const token = tokenInput?.value.trim();
    
    if (!token) {
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="status-error">⚠️ Please enter a token</div>';
        }
        return;
    }
    
    try {
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="status-loading">⏳ Authenticating...</div>';
        }
        
        await AuthManager.authenticate(token);
        
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="status-success">✓ Authenticated successfully!</div>';
            setTimeout(() => statusDiv.innerHTML = '', 3000);
        }
        
        // Clear input
        if (tokenInput) tokenInput.value = '';
        
        // Switch to overview tab
        setTimeout(() => switchTab('overview'), 500);
    } catch (e) {
        console.error('Authentication error:', e);
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status-error">✗ Error: ${e.message}</div>`;
        }
    }
}

window.signOut = async function signOut() {
    const confirmed = confirm('Are you sure you want to sign out? This will clear all your loaded data.');
    if (confirmed) {
        await AuthManager.signOut();
        
        // Switch to marketplace tab
        switchTab('marketplace');
    }
}
