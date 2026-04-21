"""
AI Chat Application Backend
Flask server with OpenRouter API integration, chat history, and multi-model support.
Designed and Developed by Er. Sundram Tiwari
"""

import os
import json
import uuid
import requests
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()

# Initialize Flask app
app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html", models=AVAILABLE_MODELS, default_model=DEFAULT_MODEL)
    
@app.route("/models")
def get_models():
    return jsonify({
        "models": AVAILABLE_MODELS,
        "default": DEFAULT_MODEL
    })


# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
CHATS_FILE = os.path.join(os.path.dirname(__file__), "data", "chats.json")

AVAILABLE_MODELS = [
    "anthropic/claude-sonnet-4.6",
    "qwen/qwen-2.5-7b-instruct",
    "minimax/minimax-m2.7",
    "deepseek/deepseek-v3.2-speciale",
    "google/gemini-3.1-pro-preview",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "xiaomi/mimo-v2-omni"
]

DEFAULT_MODEL = AVAILABLE_MODELS[0]

# ─────────────────────────────────────────────
# Storage Helpers
# ─────────────────────────────────────────────

def load_chats() -> dict:
    os.makedirs(os.path.dirname(CHATS_FILE), exist_ok=True)
    if not os.path.exists(CHATS_FILE):
        return {}
    try:
        with open(CHATS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_chats(chats: dict) -> None:
    os.makedirs(os.path.dirname(CHATS_FILE), exist_ok=True)
    with open(CHATS_FILE, "w", encoding="utf-8") as f:
        json.dump(chats, f, indent=2, ensure_ascii=False)


# ─────────────────────────────────────────────
# OpenRouter API Call
# ─────────────────────────────────────────────

def call_openrouter(messages: list, model: str) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "NeuralChat by Er. Sundram Tiwari",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 1500,
        "temperature": 0.7,
    }
    response = requests.post(
        OPENROUTER_API_URL,
        headers=headers,
        json=payload,
        timeout=45,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────


@app.route("/chat", methods=["POST"])
def chat():
    """
    POST /chat
    Body: {
        "chat_id": "uuid-string",
        "message": "user text",
        "model": "model-id"
    }
    Returns: { "chat_id": ..., "model": ..., "response": ... }
    """
    body = request.get_json(silent=True)
    if not body or "message" not in body:
        return jsonify({"error": "Request body must contain 'message'."}), 400

    if not OPENROUTER_API_KEY:
        return jsonify({"error": "OPENROUTER_API_KEY is not configured on the server."}), 500

    user_message = body["message"].strip()
    model = body.get("model", DEFAULT_MODEL)
    if model not in AVAILABLE_MODELS:
        model = DEFAULT_MODEL

    chat_id = body.get("chat_id") or str(uuid.uuid4())

    # Load existing chat history
    chats = load_chats()
    if chat_id not in chats:
        chats[chat_id] = {
            "id": chat_id,
            "title": user_message[:60],
            "created_at": datetime.now().isoformat(),
            "model": model,
            "messages": []
        }

    # Append user message
    chats[chat_id]["messages"].append({"role": "user", "content": user_message})

    # Build messages array for API (only role+content)
    api_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in chats[chat_id]["messages"]
    ]

    # Call OpenRouter with selected model, fallback on error
    reply = None
    used_model = model
    last_error = None

    # Try selected model first, then fallbacks
    models_to_try = [model] + [m for m in AVAILABLE_MODELS if m != model]

    for attempt_model in models_to_try:
        try:
            print(f"[INFO] Trying model: {attempt_model}")
            reply = call_openrouter(api_messages, attempt_model)
            used_model = attempt_model
            break
        except Exception as exc:
            print(f"[WARN] Model {attempt_model} failed: {exc}")
            last_error = str(exc)
            continue

    if reply is None:
        return jsonify({"error": f"All models failed. Last error: {last_error}"}), 502

    # Append assistant reply
    chats[chat_id]["messages"].append({"role": "assistant", "content": reply})
    chats[chat_id]["model"] = used_model
    save_chats(chats)

    return jsonify({
        "chat_id": chat_id,
        "model": used_model,
        "response": reply,
    })


@app.route("/history", methods=["GET"])
def history():
    """GET /history — returns list of all chats (id, title, created_at, model)"""
    chats = load_chats()
    summaries = []
    for chat_id, chat_data in chats.items():
        summaries.append({
            "id": chat_id,
            "title": chat_data.get("title", "Untitled Chat"),
            "created_at": chat_data.get("created_at", ""),
            "model": chat_data.get("model", DEFAULT_MODEL),
        })
    # Sort by created_at descending
    summaries.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(summaries)


@app.route("/new_chat", methods=["POST"])
def new_chat():
    """POST /new_chat — generates and returns a new chat ID"""
    new_id = str(uuid.uuid4())
    return jsonify({"chat_id": new_id})


@app.route("/load_chat/<chat_id>", methods=["GET"])
def load_chat(chat_id):
    """GET /load_chat/<chat_id> — returns full chat messages"""
    chats = load_chats()
    if chat_id not in chats:
        return jsonify({"error": "Chat not found."}), 404
    return jsonify(chats[chat_id])


@app.route("/delete_chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    """DELETE /delete_chat/<chat_id>"""
    chats = load_chats()
    if chat_id in chats:
        del chats[chat_id]
        save_chats(chats)
    return jsonify({"success": True})


# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  NeuralChat — Designed by Er. Sundram Tiwari")
    print("HTTP-Referer: https://neuralchat-n0k0.onrender.com")
    print("=" * 55)
    app.run(debug=True, port=5000)
