// Early Initialization Script
// This script defines stub functions for inline onclick handlers
// to prevent "function not defined" errors during page load.
// The real implementations will replace these stubs when their respective scripts load.

console.log('📦 Early init: Defining function stubs...');

// Stub for switchTab - will be replaced by app.js
window.switchTab = window.switchTab || function(tab) {
    console.log('⏳ switchTab stub called for:', tab, '(waiting for app.js to load)');
};

// Stub for toggleSection - will be replaced by app.js  
window.toggleSection = window.toggleSection || function(header) {
    console.log('⏳ toggleSection stub called (waiting for app.js to load)');
};

// Stub for authenticateWithToken - will be replaced by auth-manager.js
window.authenticateWithToken = window.authenticateWithToken || function() {
    console.log('⏳ authenticateWithToken stub called (waiting for auth-manager.js to load)');
};

// Stub for signOut - will be replaced by auth-manager.js
window.signOut = window.signOut || function() {
    console.log('⏳ signOut stub called (waiting for auth-manager.js to load)');
};

console.log('✓ Early init: Function stubs defined');
