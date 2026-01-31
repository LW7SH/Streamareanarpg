import os
import requests
from flask import Flask, render_template, request, jsonify, make_response
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
except ModuleNotFoundError:
    # Optional dependency: allow running in minimal environments (and unit tests)
    class Limiter:  # type: ignore
        def __init__(self, *args, **kwargs):
            self.enabled = False
        def limit(self, *args, **kwargs):
            def decorator(fn):
                return fn
            return decorator
    def get_remote_address():  # type: ignore
        return '127.0.0.1'
import logging
from data_cache import get_cache
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

API_URL = "https://streamarenarpg.com/portal/portal_api.php"
TOKEN = os.environ.get("RPG_TOKEN")

app = Flask(__name__)

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Initialize and start data cache
cache = get_cache()
cache.start()
logger.info("Data cache initialized and started")

# Detect environment
IS_PRODUCTION = os.environ.get('FLASK_ENV') == 'production'

# Security headers
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    if IS_PRODUCTION:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:;"
        )
    
    return response


def get_listings(page=1, slot=None, class_=None):
    if not TOKEN:
        raise RuntimeError("RPG_TOKEN environment variable not set")

    payload = {
        "route": "get_listings",
        "token": TOKEN,
    }

    if slot:
        payload["slot"] = slot
    if class_:
        payload["class"] = class_

    try:
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        raise


def get_game_items():
    if not TOKEN:
        raise RuntimeError("RPG_TOKEN environment variable not set")

    payload = {
        "route": "get_game_items",
        "token": TOKEN,
    }

    try:
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        raise


def get_inventory(token, page=1):
    # Validate page parameter
    try:
        page = int(page)
        if page < 1:
            raise ValueError("Page must be positive")
    except (ValueError, TypeError):
        raise ValueError("Invalid page parameter")
    
    # Validate token format (basic check)
    if not token or not isinstance(token, str) or len(token) > 500:
        raise ValueError("Invalid token format")
    
    payload = {
        "route": "get_inv",
        "token": token,
        "page": page
    }

    try:
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        logger.error(f"Inventory API request failed: {str(e)}")
        raise


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/listings")
@limiter.limit("30 per minute")
def api_listings():
    page = request.args.get("page", "1")
    slot = request.args.get("slot", "").strip().lower()
    class_ = request.args.get("class", "").strip().lower()

    if slot in ("", "any"):
        slot = None
    if class_ in ("", "any"):
        class_ = None

    try:
        data = get_listings(page=page, slot=slot, class_=class_)
        return jsonify(data)
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Listings error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/items")
@limiter.limit("10 per minute")
def api_items():
    try:
        # Try to get from cache first
        data = cache.get('items')
        if data:
            logger.debug("Serving items from cache")
            return jsonify(data)
        
        # Fallback to direct API call if cache is empty
        logger.warning("Cache miss for items, fetching from API")
        data = get_game_items()
        return jsonify(data)
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Items error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/inventory", methods=["POST"])
@limiter.limit("10 per minute")
def api_inventory():
    try:
        req_data = request.get_json() or {}
        
        # Try to get token from cookie first, then from request body
        token = request.cookies.get('rpg_user_token')
        if not token and req_data:
            token = req_data.get('token')
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 400
        
        page = req_data.get('page', 1) if req_data else 1
        
        data = get_inventory(token, page)
        logger.info(f"Inventory loaded successfully for IP: {request.remote_addr}")
        return jsonify(data)
    except ValueError as e:
        logger.warning(f"Invalid inventory request: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Invalid request parameters"
        }), 400
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Inventory error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/token/save", methods=["POST"])
@limiter.limit("5 per minute")
def save_token():
    """Save user token to secure HttpOnly cookie"""
    try:
        req_data = request.get_json()
        
        if not req_data or 'token' not in req_data:
            return jsonify({
                "status": "error",
                "message": "Token is required"
            }), 400
        
        token = req_data.get('token')
        
        # Validate token
        if not token or not isinstance(token, str):
            return jsonify({
                "status": "error",
                "message": "Invalid token format"
            }), 400
        
        if not token.strip() or len(token) > 500:
            return jsonify({
                "status": "error",
                "message": "Token cannot be empty or too long"
            }), 400
        
        response = make_response(jsonify({
            "status": "success",
            "message": "Token saved successfully"
        }))
        
        # Set secure HttpOnly cookie (30 days expiration)
        response.set_cookie(
            'rpg_user_token',
            token,
            max_age=30*24*60*60,  # 30 days in seconds
            httponly=True,         # Prevents JavaScript access (XSS protection)
            secure=IS_PRODUCTION,  # Only HTTPS in production, allow HTTP in development
            samesite='Strict'      # CSRF protection
        )
        
        logger.info(f"Token saved for IP: {request.remote_addr}")
        return response
    except Exception as e:
        logger.error(f"Token save error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/token/get", methods=["GET"])
def get_token():
    """Check if user token exists (doesn't return the actual token due to HttpOnly)"""
    token = request.cookies.get('rpg_user_token')
    
    return jsonify({
        "status": "success",
        "has_token": token is not None
    })


@app.route("/api/token/delete", methods=["POST"])
@limiter.limit("5 per minute")
def delete_token():
    """Delete user token cookie"""
    response = make_response(jsonify({
        "status": "success",
        "message": "Token deleted successfully"
    }))
    
    # Delete cookie by setting max_age to 0
    response.set_cookie(
        'rpg_user_token',
        '',
        max_age=0,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite='Strict'
    )
    
    logger.info(f"Token deleted for IP: {request.remote_addr}")
    return response


@app.route("/api/prefetch-user-data", methods=["POST"])
@limiter.limit("10 per minute")
def prefetch_user_data():
    """
    Prefetch all user data for all tabs at once using parallel requests.
    This is called when a token is loaded (login or from cookies)
    to populate all tabs without waiting for user clicks.
    """
    try:
        token = request.cookies.get('rpg_user_token')
        if not token:
            req_data = request.get_json() or {}
            token = req_data.get('token')
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 400
        
        # Define all fetches
        def fetch_udata():
            try:
                payload = {"route": "get_udata", "token": token, "version": "1.0.0"}
                r = requests.post(API_URL, json=payload, timeout=15)
                r.raise_for_status()
                return ('udata', r.json(), None)
            except Exception as e:
                return ('udata', None, str(e))
        
        def fetch_inventory():
            try:
                payload = {"route": "get_inv", "token": token, "page": 1}
                r = requests.post(API_URL, json=payload, timeout=15)
                r.raise_for_status()
                return ('inventory', r.json(), None)
            except Exception as e:
                return ('inventory', None, str(e))
        
        def fetch_my_listings():
            try:
                payload = {"route": "my_listings", "token": token}
                r = requests.post(API_URL, json=payload, timeout=15)
                r.raise_for_status()
                return ('my_listings', r.json(), None)
            except Exception as e:
                return ('my_listings', None, str(e))
        
        def fetch_friends():
            try:
                payload = {"route": "get_friend_list", "token": token}
                r = requests.post(API_URL, json=payload, timeout=15)
                r.raise_for_status()
                return ('friends', r.json(), None)
            except Exception as e:
                return ('friends', None, str(e))
        
        def fetch_player_chests():
            try:
                payload = {"route": "get_player_chest", "token": token}
                r = requests.post(API_URL, json=payload, timeout=15)
                r.raise_for_status()
                return ('player_chests', r.json(), None)
            except Exception as e:
                return ('player_chests', None, str(e))
        
        # Execute all fetches in parallel
        results = {}
        errors = []
        
        # First, fetch udata to get character classes
        udata_result = None
        try:
            payload = {"route": "get_udata", "token": token, "version": "1.0.0"}
            r = requests.post(API_URL, json=payload, timeout=15)
            r.raise_for_status()
            udata_result = r.json()
            results['udata'] = udata_result
        except Exception as e:
            errors.append(f"udata: {str(e)}")
            results['udata'] = None
        
        # Extract classes from udata for skills fetching
        character_classes = set()
        if udata_result and udata_result.get('characters'):
            for char in udata_result['characters']:
                if char.get('class'):
                    character_classes.add(char['class'])
        
        # Define skill fetcher for a specific class
        def fetch_skills_for_class(class_name):
            try:
                payload = {"route": "get_skills", "token": token, "class": class_name}
                r = requests.post(API_URL, json=payload, timeout=15)
                r.raise_for_status()
                skill_data = r.json()
                if skill_data.get('skills'):
                    return (class_name, skill_data['skills'], None)
                return (class_name, None, "No skills in response")
            except Exception as e:
                return (class_name, None, str(e))
        
        # Now fetch everything else + skills in parallel
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(fetch_inventory),
                executor.submit(fetch_my_listings),
                executor.submit(fetch_friends),
                executor.submit(fetch_player_chests)
            ]
            
            # Add skill fetches for each class
            for class_name in character_classes:
                futures.append(executor.submit(fetch_skills_for_class, class_name))
            
            all_skills = {}
            for future in as_completed(futures):
                result = future.result()
                
                # Handle regular data fetches (inventory, friends, etc)
                if len(result) == 3 and result[0] in ['inventory', 'my_listings', 'friends', 'player_chests']:
                    key, data, error = result
                    results[key] = data
                    if error:
                        errors.append(f"{key}: {error}")
                # Handle skill fetches (class_name, skills, error)
                elif len(result) == 3 and isinstance(result[0], str) and result[0] not in ['inventory', 'my_listings', 'friends', 'player_chests']:
                    class_name, skills, error = result
                    if skills:
                        all_skills[class_name] = skills
                    elif error:
                        errors.append(f"skills:{class_name}: {error}")
            
            # Store all skills together
            results['skills'] = all_skills if all_skills else None
        
        # Return all results
        response_data = {
            "status": "success",
            "data": results
        }
        
        if errors:
            response_data["warnings"] = errors
            logger.warning(f"Prefetch completed with errors: {', '.join(errors)}")
        else:
            logger.info(f"Prefetch completed successfully for IP: {request.remote_addr}")
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Prefetch error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred during prefetch"
        }), 500


@app.route("/api/udata", methods=["POST"])
@limiter.limit("10 per minute")
def api_user_data():
    """Get complete user data including all characters"""
    try:
        token = request.cookies.get('rpg_user_token')
        if not token:
            req_data = request.get_json() or {}
            token = req_data.get('token')
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 400
        
        payload = {
            "route": "get_udata",
            "token": token,
            "version": "1.0.0"
        }
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"User data error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/my-listings", methods=["POST"])
@limiter.limit("10 per minute")
def api_my_listings():
    """Get user's active marketplace listings"""
    try:
        token = request.cookies.get('rpg_user_token')
        if not token:
            req_data = request.get_json() or {}
            token = req_data.get('token')
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 400
        
        req_data = request.get_json() or {}
        page = req_data.get('page', 1)
        
        payload = {
            "route": "my_listings",
            "token": token
        }
        
        # Only add page if backend supports it (test by checking response for total_pages)
        if page and page > 1:
            payload["page"] = page
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"My listings error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/top-players")
@limiter.limit("30 per minute")
def api_top_players():
    """Get leaderboard"""
    if not TOKEN:
        return jsonify({
            "status": "error",
            "message": "Service configuration error"
        }), 500
    
    try:
        payload = {
            "route": "get_top_players",
            "token": TOKEN
        }
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Top players error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/friends", methods=["POST"])
@limiter.limit("10 per minute")
def api_friends():
    """Get friends list"""
    try:
        token = request.cookies.get('rpg_user_token')
        if not token:
            req_data = request.get_json() or {}
            token = req_data.get('token')
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 400
        
        req_data = request.get_json() or {}
        page = req_data.get('page', 1)
        
        payload = {
            "route": "get_friend_list",
            "token": token
        }
        
        # Only add page if backend supports it
        if page and page > 1:
            payload["page"] = page
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Friends error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/shaders")
@limiter.limit("30 per minute")
def api_shaders():
    """Get available shaders"""
    if not TOKEN:
        return jsonify({
            "status": "error",
            "message": "Service configuration error"
        }), 500
    
    try:
        # Try to get from cache first
        data = cache.get('shaders')
        if data:
            logger.debug("Serving shaders from cache")
            return jsonify(data)
        
        # Fallback to direct API call if cache is empty
        logger.warning("Cache miss for shaders, fetching from API")
        payload = {
            "route": "get_shaders",
            "token": TOKEN  # Use admin token, not user token
        }
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Shaders error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/backs")
@limiter.limit("30 per minute")
def api_backs():
    """Get available back items"""
    if not TOKEN:
        return jsonify({
            "status": "error",
            "message": "Service configuration error"
        }), 500
    
    try:
        # Try to get from cache first
        data = cache.get('backs')
        if data:
            logger.debug("Serving backs from cache")
            return jsonify(data)
        
        # Fallback to direct API call if cache is empty
        logger.warning("Cache miss for backs, fetching from API")
        payload = {
            "route": "get_backs",
            "token": TOKEN  # Use admin token, not user token
        }
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Back items error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/chests")
@limiter.limit("30 per minute")
def api_chests():
    """Get available chests"""
    if not TOKEN:
        return jsonify({
            "status": "error",
            "message": "Service configuration error"
        }), 500
    
    try:
        # Try to get from cache first
        data = cache.get('chests')
        if data:
            logger.debug("Serving chests from cache")
            return jsonify(data)
        
        # Fallback to direct API call if cache is empty
        logger.warning("Cache miss for chests, fetching from API")
        payload = {
            "route": "get_chests",
            "token": TOKEN  # Use admin token, not user token
        }
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Chests error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/player-chests", methods=["POST"])
@limiter.limit("10 per minute")
def api_player_chests():
    """Get player's owned chests"""
    try:
        token = request.cookies.get('rpg_user_token')
        if not token:
            req_data = request.get_json() or {}
            token = req_data.get('token')
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 400
        
        req_data = request.get_json() or {}
        page = req_data.get('page', 1)
        
        payload = {
            "route": "get_player_chest",
            "token": token
        }
        
        # Only add page if backend supports it
        if page and page > 1:
            payload["page"] = page
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Player chests error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/skills", methods=["POST"])
@limiter.limit("30 per minute")
def api_skills():
    """Get skills for a class"""
    try:
        token = request.cookies.get('rpg_user_token')
        req_data = request.get_json() or {}
        
        if not token:
            token = req_data.get('token')
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 400
        
        char_class = req_data.get('class', 'barbarian')
        page = req_data.get('page', 1)
        
        # Try to get from cache first (only for page 1)
        if page == 1 or not page:
            cache_key = f'skills:{char_class}'
            data = cache.get(cache_key)
            if data:
                logger.debug(f"Serving skills for {char_class} from cache")
                return jsonify(data)
        
        # Fallback to direct API call if cache is empty or page > 1
        if page == 1 or not page:
            logger.warning(f"Cache miss for skills:{char_class}, fetching from API")
        
        payload = {
            "route": "get_skills",
            "token": token,
            "class": char_class
        }
        
        # Only add page if backend supports it
        if page and page > 1:
            payload["page"] = page
        
        r = requests.post(API_URL, json=payload, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.HTTPError as e:
        logger.error(f"Upstream API error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Service temporarily unavailable"
        }), 502
    except Exception as e:
        logger.error(f"Skills error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "An error occurred"
        }), 500


@app.route("/api/cache/status")
@limiter.limit("10 per minute")
def api_cache_status():
    """Get cache statistics for monitoring"""
    try:
        stats = cache.get_cache_stats()
        return jsonify({
            "status": "ok",
            "cache_stats": stats,
            "refresh_interval_seconds": cache.refresh_interval
        })
    except Exception as e:
        logger.error(f"Cache status error: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve cache stats"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Only use debug mode in development
    debug_mode = not IS_PRODUCTION
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
