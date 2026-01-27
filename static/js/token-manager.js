// Token Manager - Handles secure token storage in cookies with localStorage fallback
const TokenManager = {
    COOKIE_NAME: 'rpg_user_token',
    STORAGE_KEY: 'rpg_user_token',
    COOKIE_DAYS: 30, // Token expires after 30 days
    
    saveToken(token) {
        if (!token || !token.trim()) {
            console.error('Cannot save empty token');
            return false;
        }
        
        let cookieSaved = false;
        let localStorageSaved = false;
        
        // Try to save to cookie
        try {
            const expires = new Date();
            expires.setTime(expires.getTime() + (this.COOKIE_DAYS * 24 * 60 * 60 * 1000));
            
            const cookieString = `${this.COOKIE_NAME}=${encodeURIComponent(token)};expires=${expires.toUTCString()};path=/`;
            document.cookie = cookieString;
            
            console.log('✓ Token save to cookie attempted');
            
            // Verify cookie was saved
            const retrieved = this._getTokenFromCookie();
            if (retrieved) {
                console.log('✓ Token verified in cookie');
                cookieSaved = true;
            }
        } catch (e) {
            console.warn('Cookie save failed:', e);
        }
        
        // Try to save to localStorage as fallback
        try {
            const data = {
                token: token,
                expires: new Date().getTime() + (this.COOKIE_DAYS * 24 * 60 * 60 * 1000)
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            console.log('✓ Token saved to localStorage as fallback');
            localStorageSaved = true;
        } catch (e) {
            console.warn('localStorage save failed:', e);
        }
        
        if (cookieSaved || localStorageSaved) {
            console.log(`✓ Token saved successfully (cookie: ${cookieSaved}, localStorage: ${localStorageSaved})`);
            return true;
        } else {
            console.error('✗ Token save completely failed - both cookie and localStorage failed');
            console.error('Please check if cookies and localStorage are enabled in your browser');
            return false;
        }
    },
    
    _getTokenFromCookie() {
        try {
            const name = this.COOKIE_NAME + "=";
            const decodedCookie = decodeURIComponent(document.cookie);
            const cookieArray = decodedCookie.split(';');
            
            for (let i = 0; i < cookieArray.length; i++) {
                let cookie = cookieArray[i].trim();
                if (cookie.indexOf(name) === 0) {
                    return cookie.substring(name.length, cookie.length);
                }
            }
        } catch (e) {
            console.warn('Error reading cookie:', e);
        }
        return null;
    },
    
    _getTokenFromLocalStorage() {
        try {
            const dataStr = localStorage.getItem(this.STORAGE_KEY);
            if (!dataStr) return null;
            
            const data = JSON.parse(dataStr);
            
            // Check if expired
            if (data.expires && new Date().getTime() > data.expires) {
                console.log('localStorage token expired, removing...');
                localStorage.removeItem(this.STORAGE_KEY);
                return null;
            }
            
            return data.token;
        } catch (e) {
            console.warn('Error reading localStorage:', e);
            return null;
        }
    },
    
    getToken() {
        // Try cookie first
        const cookieToken = this._getTokenFromCookie();
        if (cookieToken) {
            console.log('✓ Token found in cookie');
            return cookieToken;
        }
        
        // Fallback to localStorage
        const storageToken = this._getTokenFromLocalStorage();
        if (storageToken) {
            console.log('✓ Token found in localStorage');
            return storageToken;
        }
        
        console.log('✗ Token not found in cookie or localStorage');
        return null;
    },
    
    deleteToken() {
        // Delete from cookie
        try {
            document.cookie = `${this.COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
            console.log('✓ Token deleted from cookie');
        } catch (e) {
            console.warn('Error deleting cookie:', e);
        }
        
        // Delete from localStorage
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('✓ Token deleted from localStorage');
        } catch (e) {
            console.warn('Error deleting from localStorage:', e);
        }
    },
    
    hasToken() {
        return this.getToken() !== null;
    }
};
