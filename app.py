import os
import requests
from flask import Flask, render_template, request, jsonify

API_URL = "https://streamarenarpg.com/portal/portal_api.php"
TOKEN = os.environ.get("RPG_TOKEN")

app = Flask(__name__)


def get_listings(page=1, slot=None, class_=None):
    if not TOKEN:
        raise RuntimeError("RPG_TOKEN environment variable not set")

    payload = {
        "route": "get_game_items",
        "token": TOKEN,
        "page": int(page),
    }

    if slot:
        payload["slot"] = slot
    if class_:
        payload["class"] = class_

    r = requests.post(API_URL, json=payload, timeout=15)
    r.raise_for_status()
    print(r.text)
    return r.json()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/listings")
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
        return jsonify({
            "status": "error",
            "message": f"Upstream API error: {str(e)}"
        }), 502
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)