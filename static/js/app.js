// Tab Switching with Enhanced Auth Check
window.switchTab = function(tab) {
    // Check if tab requires authentication
    if (AuthManager.requiresAuth(tab) && !AuthManager.isAuthenticated) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabContent = document.getElementById(`${tab}Tab`);
        if (tabContent) tabContent.classList.add('active');
        
        const container = document.getElementById(`${tab}Container`) || 
                         document.querySelector(`#${tab}Tab .content`);
        if (container) {
            container.innerHTML = UIComponents.renderAuthRequired(tab);
        }
        
        setTimeout(() => {
            const authInput = document.getElementById('authTokenInput');
            if (authInput) {
                authInput.focus();
                authInput.placeholder = `Enter token to access ${tab}...`;
            }
        }, 100);
        
        return;
    }
    
    State.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'marketplace') {
        document.getElementById('marketplaceTab').classList.add('active');
        Marketplace.applyFilters();
    } else if (tab === 'analysis') {
        document.getElementById('analysisTab').classList.add('active');
        if (State.itemAnalysisData && State.itemAnalysisData.length === 0) {
            Analysis.calculateItemAnalysis();
        }
        Analysis.applyFilters();
    } else if (tab === 'overview') {
        document.getElementById('overviewTab').classList.add('active');
        if (typeof Overview !== 'undefined' && Overview.render) {
            Overview.render();
        }
    } else if (tab === 'inventory') {
        document.getElementById('inventoryTab').classList.add('active');
        // If inventory isn't loaded yet, load it on-demand (cookie token lives server-side).
        if ((!State.inventoryItems || State.inventoryItems.length === 0) && Inventory && Inventory.loadInventory) {
            Inventory.loadInventory().then(() => Inventory.applyFilters()).catch(() => {});
        } else if (State.inventoryItems && State.inventoryItems.length > 0) {
            Inventory.applyFilters();
        }
    } else if (tab === 'characters') {
        document.getElementById('charactersTab').classList.add('active');
        // If characters aren't loaded yet, load them on-demand.
        if ((!State.characters || State.characters.length === 0) && Characters && Characters.loadCharacters) {
            Characters.loadCharacters().then(() => Characters.applyFilters()).catch(() => {});
        } else if (State.characters && State.characters.length > 0) {
            Characters.applyFilters();
        }
    } else if (tab === 'cosmetics') {
        document.getElementById('cosmeticsTab').classList.add('active');
        if (typeof Cosmetics !== 'undefined' && Cosmetics.render) {
            Cosmetics.render();
        }
    } else if (tab === 'mylistings') {
        document.getElementById('mylistingsTab').classList.add('active');
        // If my listings aren't loaded yet, load them on-demand.
        if ((!State.myListings || State.myListings.length === 0) && MyListings && MyListings.loadMyListings) {
            MyListings.loadMyListings().then(() => MyListings.applyFilters()).catch(() => {});
        } else if (State.myListings && State.myListings.length > 0) {
            MyListings.applyFilters();
        }
    } else if (tab === 'leaderboard') {
        document.getElementById('leaderboardTab').classList.add('active');
        if (State.topPlayers && State.topPlayers.length > 0) {
            Leaderboard.renderLeaderboard();
        }
    } else if (tab === 'friends') {
        document.getElementById('friendsTab').classList.add('active');
        if (State.friends && State.friends.length > 0) {
            Friends.applyFilters();
        }
    }
}

// Collapsible Section Toggle
window.toggleSection = function(header) {
    const content = header.nextElementSibling;
    const isCollapsed = content.classList.contains('collapsed');
    
    if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
    } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== Page loaded, starting initialization ===');
    
    try {
        console.log('Step 0: Initializing authentication...');
        await AuthManager.init();
        
        console.log('Step 1: Loading game items...');
        await API.loadGameItems();
        
        console.log('Step 2: Populating filters...');
        Filters.populateFilters();
        
        console.log('Step 3: Setting up listeners...');
        Filters.setupListeners();
        
        console.log('Step 4: Loading all listings...');
        UIStatus.setGlobalStatus('Loading...');
        const listingsResult = await API.loadAllListings();
        UIStatus.setTotalListings(listingsResult.total_listings);
        UIStatus.setGlobalStatus('Live');
        
        console.log('Step 5: Calculating unique items...');
        Utils.calculateUniqueItems();
        
        console.log('Step 6: Calculating analysis data for comparisons...');
        Analysis.calculateItemAnalysis();
        
        console.log('Step 7: Applying initial filters...');
        Marketplace.applyFilters();
        
        // Step 8: Auto-load public data (always)
        console.log('Step 8a: Loading public data...');
        
        if (!State.shaders || State.shaders.length === 0) {
            console.log('  → Loading shop data...');
            await Shop.loadShopData();
        }
        
        if (!State.topPlayers || State.topPlayers.length === 0) {
            console.log('  → Loading leaderboard...');
            await Leaderboard.loadLeaderboard();
        }
        
        // Step 8b: Auto-load authenticated data if logged in
        if (AuthManager.isAuthenticated && AuthManager.userData) {
            console.log('Step 8b: User is authenticated, auto-loading user data...');
            
            // The auth manager already loaded user data, but let's ensure all tabs have data
            
            // Load inventory if not already loaded
            if (!State.inventoryItems || State.inventoryItems.length === 0) {
                console.log('  → Loading inventory...');
                try {
                    const invResponse = await fetch('/api/inventory', {
                        credentials: 'include',
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ page: 1 })
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
                                            credentials: 'include',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ page: p })
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
            }
            
            // Load characters if not already loaded
            if (!State.characters || State.characters.length === 0) {
                console.log('  → Loading characters...');
                await Characters.loadCharacters();
            }
            
            // Load my listings if not already loaded
            if (!State.myListings || State.myListings.length === 0) {
                console.log('  → Loading my listings...');
                await MyListings.loadMyListings();
            }
            
            // Load friends if not already loaded
            if (!State.friends || State.friends.length === 0) {
                console.log('  → Loading friends...');
                await Friends.loadFriends();
            }
            
            // Load player chests (part of shop data)
            console.log('  → Loading player chests...');
            await Shop.loadPlayerChests();
            
            console.log('✓ All authenticated data loaded');
        } else if (AuthManager.isAuthenticated && !AuthManager.userData) {
            // This is the bug fix: token exists but user data wasn't loaded
            console.log('Step 8b: Token exists but user data missing, attempting to load...');
            const loaded = await AuthManager.loadUserData();
            
            if (loaded) {
                console.log('  ✓ User data loaded successfully, loading all authenticated data...');
                
                // Now load everything since we have user data
                await Promise.all([
                    (async () => {
                        const invResponse = await fetch('/api/inventory', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ page: 1 })
                        });
                        if (invResponse.ok) {
                            const invData = await invResponse.json();
                            if (invData.player_items) {
                                State.inventoryItems = invData.player_items;
                                const totalPages = invData.total_pages || 1;
                                if (totalPages > 1) {
                                    const remaining = [];
                                    for (let p = 2; p <= totalPages; p++) {
                                        remaining.push(
                                            fetch('/api/inventory', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ page: p })
                                            }).then(r => r.json())
                                        );
                                    }
                                    const results = await Promise.all(remaining);
                                    results.forEach(data => {
                                        if (data.player_items) State.inventoryItems.push(...data.player_items);
                                    });
                                }
                            }
                        }
                    })(),
                    Characters.loadCharacters(),
                    MyListings.loadMyListings(),
                    Friends.loadFriends(),
                    Shop.loadPlayerChests()
                ]);
                
                console.log('✓ All data loaded after token recovery');
            } else {
                console.warn('  ⚠ Could not load user data with saved token');
            }
        }
        
        console.log('=== Initialization complete ===');
    } catch(e) {
        console.error('❌ Initialization error:', e);
        document.getElementById('statusText').textContent = 'Error';
    }
});