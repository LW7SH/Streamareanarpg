// API Functions
const API = {
    async loadGameItems() {
        const response = await fetch('/api/items');
        const data = await response.json();
        State.gameItems = data.items || [];
        console.log('✓ Game items loaded:', State.gameItems.length);
    },
    
    async loadAllListings() {
        document.getElementById('statusText').textContent = 'Loading...';
        State.allListings = [];
        
        try {
            // Load first page
            const firstPage = await fetch('/api/listings?page=1').then(r => r.json());
            if (!firstPage.listings) throw new Error('No listings found');
            
            State.allListings = firstPage.listings;
            const totalPages = firstPage.total_pages || 1;
            
            document.getElementById('totalListings').textContent = firstPage.total_listings || State.allListings.length;
            
            // Load remaining pages
            const remaining = [];
            for (let p = 2; p <= totalPages; p++) {
                remaining.push(fetch(`/api/listings?page=${p}`).then(r => r.json()));
            }
            
            if (remaining.length > 0) {
                const results = await Promise.all(remaining);
                results.forEach(data => {
                    if (data.listings) State.allListings.push(...data.listings);
                });
            }
            
            document.getElementById('statusText').textContent = 'Live';
            console.log('✓ All listings loaded:', State.allListings.length);
            
            return true;
        } catch (e) {
            console.error('❌ Error loading listings:', e);
            document.getElementById('statusText').textContent = 'Error';
            return false;
        }
    }
};
