// Configuration and Constants
const CONFIG = {
    PLATINUM_TO_GOLD: 1000000,
    
    slotIcons: {
        weapon: '⚔️',
        head: '👑',
        body: '🛡️',
        hands: '🧤',
        feet: '👟',
        neck: '📿',
        ring: '💍',
        off_hand: '🗡️'
    },
    
    currencyIcons: {
        platinum: '⚪',
        gold: '🟡',
        gems: '💎'
    },
    
    innateStats: {
        'weapon': 'Damage',
        'head': 'HP',
        'hands': 'Attack Speed',
        'body': 'HP',
        'feet': 'Movement Speed'
    },
    
    statColors: {
        'damage': '#ef4444',        // Red
        'attack speed': '#f59e0b',  // Orange/Amber
        'hp': '#10b981',            // Green
        'movement speed': '#06b6d4', // Cyan
        'default': '#8b5cf6'        // Purple
    }
};

// Global State
const State = {
    allListings: [],
    gameItems: [],
    currentView: 'grid',
    currentTab: 'marketplace',
    itemAnalysisData: []
};
