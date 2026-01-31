// My Listings Tab Functions
const MyListings = {
    async loadMyListings() {
        try {
            // Load first page
            const response = await fetch('/api/my-listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ page: 1 }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load listings');
            }
            
            const data = await response.json();
            
            if (data.listings) {
                State.myListings = data.listings;
                
                // Load additional pages if needed
                const totalPages = data.total_pages || 1;
                if (totalPages > 1) {
                    const remaining = [];
                    for (let p = 2; p <= totalPages; p++) {
                        remaining.push(
                            fetch('/api/my-listings', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ page: p })
                            }).then(r => r.json())
                        );
                    }
                    
                    const results = await Promise.all(remaining);
                    results.forEach(pageData => {
                        if (pageData.listings) State.myListings.push(...pageData.listings);
                    });
                }
                
                // Build listed item lookup map for inventory highlighting
                Utils.buildListedItemMap(State.myListings);
                console.log('✓ My listings loaded:', State.myListings.length);
                return true;
            }
            
            throw new Error('No listings found');
        } catch (e) {
            console.error('✗ Error loading my listings:', e);
            return false;
        }
    },
    
    getTimeRemaining(expiresAt) {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires - now;
        
        if (diff <= 0) return { text: 'Expired', color: 'var(--danger)', urgent: true };
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 1) {
            return { text: `${days}d ${hours}h`, color: 'var(--success)', urgent: false };
        } else if (days === 1) {
            return { text: `${days}d ${hours}h`, color: 'var(--warning)', urgent: false };
        } else if (hours > 1) {
            return { text: `${hours}h ${minutes}m`, color: 'var(--warning)', urgent: true };
        } else {
            return { text: `${hours}h ${minutes}m`, color: 'var(--danger)', urgent: true };
        }
    },
    
    calculateTotalValue() {
        let totalGold = 0;
        let totalPlatinum = 0;
        let totalGems = 0;
        
        State.myListings.forEach(listing => {
            totalPlatinum += parseInt(listing.platinum_cost) || 0;
            totalGold += parseInt(listing.gold_cost) || 0;
            totalGems += parseInt(listing.gem_cost) || 0;
        });
        
        return { totalGold, totalPlatinum, totalGems };
    },
    
    applyFilters() {
        const slotFilter = document.getElementById('myListingsFilterSlot')?.value || '';
        const expiringFilter = document.getElementById('myListingsFilterExpiring')?.value || '';
        const minPrice = parseFloat(document.getElementById('myListingsFilterMinPrice')?.value) || 0;
        const sortBy = document.getElementById('myListingsSortBy')?.value || 'time_newest';
        
        let filtered = State.myListings.filter(listing => {
            if (slotFilter && listing.slot !== slotFilter) return false;
            
            // Expiring filter
            if (expiringFilter) {
                const remaining = this.getTimeRemaining(listing.time_expires);
                const now = new Date();
                const expires = new Date(listing.time_expires);
                const hoursRemaining = (expires - now) / (1000 * 60 * 60);
                
                if (expiringFilter === '1h' && hoursRemaining > 1) return false;
                if (expiringFilter === '24h' && hoursRemaining > 24) return false;
                if (expiringFilter === '3d' && hoursRemaining > 72) return false;
            }
            
            const totalGold = Utils.getTotalGoldValue(listing);
            if (totalGold < minPrice) return false;
            
            return true;
        });
        
        // Sort
        filtered = FilterEngine.sortItems(filtered, sortBy);
        
        DOMHelpers.updateCounts('myListingsTotalCount', 'myListingsFilteredCount', State.myListings.length, filtered.length);
        
        this.renderMyListings(filtered);
        this.updateSummary();
    },
    
    updateSummary() {
        const { totalGold, totalPlatinum, totalGems } = this.calculateTotalValue();
        const totalGoldValue = (totalPlatinum * CONFIG.PLATINUM_TO_GOLD) + totalGold;
        
        // Safely update elements if they exist
        const countEl = document.getElementById('myListingsCount');
        if (countEl) countEl.textContent = State.myListings.length;
        
        const valueEl = document.getElementById('myListingsTotalValue');
        if (valueEl) valueEl.textContent = Utils.formatPriceBreakdown(totalGoldValue);
        
        // Find expiring soon
        const expiringSoon = State.myListings.filter(l => {
            const remaining = this.getTimeRemaining(l.time_expires);
            return remaining.urgent;
        });
        
        const expiringEl = document.getElementById('myListingsExpiring');
        if (expiringEl) expiringEl.textContent = expiringSoon.length;
        
        // Average age
        const avgAgeEl = document.getElementById('myListingsAvgAge');
        if (avgAgeEl) {
            if (State.myListings.length > 0) {
                const now = new Date();
                const avgAge = State.myListings.reduce((sum, l) => {
                    const created = new Date(l.time_created);
                    return sum + (now - created);
                }, 0) / State.myListings.length;
                
                const days = Math.floor(avgAge / (1000 * 60 * 60 * 24));
                const hours = Math.floor((avgAge % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                avgAgeEl.textContent = `${days}d ${hours}h`;
            } else {
                avgAgeEl.textContent = 'N/A';
            }
        }
    },
    
    renderMyListings(listings) {
        const decorateCard = (html, item) => {
            const remaining = this.getTimeRemaining(item.time_expires);
            return html.replace('</div>', `
                    <div class="listing-expiration" style="
                        position: absolute;
                        top: 0.75rem;
                        right: 0.75rem;
                        background: ${remaining.color};
                        color: ${remaining.urgent ? '#fff' : '#000'};
                        padding: 0.25rem 0.5rem;
                        border-radius: 4px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        font-family: 'Space Mono', monospace;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">
                        ⏰ ${Utils.escapeHtml(remaining.text)}
                    </div>
                </div>`);
        };

        const decorateRow = (html, item) => {
            const remaining = this.getTimeRemaining(item.time_expires);
            return html.replace('</div>', `
                    <div class="item-row-cell" style="flex: 0.8; text-align: right;">
                        <span style="
                            background: ${remaining.color};
                            color: ${remaining.urgent ? '#fff' : '#000'};
                            padding: 0.25rem 0.5rem;
                            border-radius: 4px;
                            font-size: 0.7rem;
                            font-weight: 700;
                            font-family: 'Space Mono', monospace;
                        ">⏰ ${Utils.escapeHtml(remaining.text)}</span>
                    </div>
                </div>`);
        };

        UIListRenderer.render('myListingsContainer', listings, {
            emptyIcon: '📤',
            emptyText: 'You have no active marketplace listings',
            card: (item, idx) => UIComponents.renderItemCard(item, idx, false),
            row:  (item, idx) => UIComponents.renderItemRow(item, idx, false, null),
            decorateCard,
            decorateRow
        });
    }
        
};
