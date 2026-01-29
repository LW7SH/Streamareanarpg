import os
import requests
from flask import Flask, render_template, request, jsonify, make_response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Only use debug mode in development
    debug_mode = not IS_PRODUCTION
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
