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
            console.log('✓ Saved token found, prefetching all user data...');
            
            try {
                // Prefetch all user data at once
                await this.prefetchAllUserData();
                this.isAuthenticated = true;
                console.log('✓ Authentication restored from saved token');
            } catch (e) {
                console.warn('⚠ Token exists but user data could not be loaded:', e.message);
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
    
    // Prefetch all user data in one API call
    async prefetchAllUserData() {
        try {
            const response = await fetch('/api/prefetch-user-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Prefetch request failed');
            }
            
            const result = await response.json();
            
            if (result.status !== 'success') {
                throw new Error('Prefetch failed');
            }
            
            const data = result.data;
            
            // Store user data (overview, characters)
            if (data.udata) {
                // Extract user object from udata (udata contains: {user: {...}, characters: [...], ...})
                if (data.udata.user) {
                    this.userData = data.udata.user;
                    State.userData = Utils.normalizeUserData(data.udata.user);
                    console.log('  ✓ User data loaded');
                }
                
                if (data.udata.characters) {
                    State.characters = data.udata.characters;
                    Utils.buildEquippedItemMap(State.characters);
                    console.log('  ✓ Characters loaded:', State.characters.length);
                }
                
                if (data.udata.player_items) {
                    // Store from udata if available
                    State.inventoryItems = data.udata.player_items;
                    console.log('  ✓ Inventory from udata:', State.inventoryItems.length, 'items');
                }
            }
            
            // Store inventory
            if (data.inventory && data.inventory.player_items) {
                State.inventoryItems = data.inventory.player_items;
                console.log('  ✓ Inventory loaded:', State.inventoryItems.length, 'items');
            }
            
            // Store my listings
            if (data.my_listings && data.my_listings.listings) {
                State.myListings = data.my_listings.listings;
                console.log('  ✓ My listings loaded:', State.myListings.length);
            }
            
            // Store friends
            if (data.friends && data.friends.friends) {
                State.friends = data.friends.friends;
                console.log('  ✓ Friends loaded:', State.friends.length);
            }
            
            // Store player chests
            if (data.player_chests && data.player_chests.chests) {
                State.playerChests = data.player_chests.chests;
                console.log('  ✓ Player chests loaded:', State.playerChests.length);
            }
            
            // Store skills for all classes
            if (data.skills) {
                State.allSkills = data.skills;
                const classCount = Object.keys(data.skills).length;
                console.log('  ✓ Skills loaded for', classCount, 'classes');
            }
            
            if (result.warnings && result.warnings.length > 0) {
                console.warn('  ⚠ Some data failed to load:', result.warnings);
            }
            
            console.log('✓ All user data prefetched successfully');
            
            // Debug: Log what we have in State
            console.log('  📊 State after prefetch:');
            console.log('    - userData:', State.userData ? '✓' : '✗');
            console.log('    - characters:', State.characters?.length || 0);
            console.log('    - inventoryItems:', State.inventoryItems?.length || 0);
            console.log('    - myListings:', State.myListings?.length || 0);
            console.log('    - friends:', State.friends?.length || 0);
            
            // CRITICAL: Update UI after data is loaded
            this.displayUserInfo(); // Update header with money/gems
            
            // Always render overview since user will be switched there after login
            if (typeof Overview !== 'undefined' && Overview.render) {
                console.log('  → Pre-rendering overview tab with prefetched data');
                await Overview.render();
            }
            
            // Also render current tab if it's different from overview
            const currentTab = State.currentTab;
            if (currentTab && currentTab !== 'overview') {
                if (currentTab === 'inventory' && typeof Inventory !== 'undefined' && Inventory.render) {
                    console.log('  → Refreshing inventory tab with prefetched data');
                    await Inventory.render();
                }
                else if (currentTab === 'characters' && typeof Characters !== 'undefined' && Characters.render) {
                    console.log('  → Refreshing characters tab with prefetched data');
                    await Characters.render();
                }
                else if (currentTab === 'mylistings' && typeof MyListings !== 'undefined' && MyListings.render) {
                    console.log('  → Refreshing my listings tab with prefetched data');
                    await MyListings.render();
                }
                else if (currentTab === 'friends' && typeof Friends !== 'undefined' && Friends.render) {
                    console.log('  → Refreshing friends tab with prefetched data');
                    await Friends.render();
                }
            }
            
            return true;
        } catch (e) {
            console.error('  ✗ Error prefetching data:', e);
            throw new Error('Failed to load user data - token may be invalid');
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
            
            // Prefetch ALL user data at once (instead of loading one by one)
            console.log('🔄 Prefetching all user data...');
            await this.prefetchAllUserData();
            
            this.isAuthenticated = true;
            this.updateAuthUI();
            
            console.log('✓ Authentication successful - all data loaded');
            
            return true;
            
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
