// Token Manager - Handles secure token storage via server-side HttpOnly cookies
// 
// SECURITY:
// - Tokens are stored in HttpOnly cookies set by the server (prevents JavaScript access/XSS)
// - Cookies use Secure flag (HTTPS only) to prevent man-in-the-middle attacks
// - Cookies use SameSite=Strict to prevent CSRF attacks
// - Server endpoints: /api/token/save, /api/token/get, /api/token/delete
const TokenManager = {
    COOKIE_NAME: 'rpg_user_token',
    COOKIE_DAYS: 30,
    
    async saveToken(token) {
        if (!token || !token.trim()) {
            console.error('Cannot save empty token');
            return false;
        }
        
        try {
            const response = await fetch('/api/token/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: token })
            });
            
            const data = await response.json();
            
            if (response.ok && data.status === 'success') {
                console.log('✓ Token saved to secure HttpOnly cookie');
                return true;
            } else {
                console.error('✗ Token save failed:', data.message);
                return false;
            }
        } catch (e) {
            console.error('Token save failed:', e);
            return false;
        }
    },
    
    async hasToken() {
        try {
            const response = await fetch('/api/token/get');
            const data = await response.json();
            return data.has_token === true;
        } catch (e) {
            console.warn('Error checking token:', e);
            return false;
        }
    },
    
    async deleteToken() {
        try {
            const response = await fetch('/api/token/delete', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (response.ok && data.status === 'success') {
                console.log('✓ Token deleted from cookie');
                return true;
            } else {
                console.error('✗ Token delete failed:', data.message);
                return false;
            }
        } catch (e) {
            console.warn('Error deleting token:', e);
            return false;
        }
    }
};
