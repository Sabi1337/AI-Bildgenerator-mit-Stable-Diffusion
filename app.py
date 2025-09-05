import os
import io
import base64
import threading
import webbrowser
from flask import Flask, request, jsonify, render_template
from PIL import Image
import requests
from werkzeug.exceptions import HTTPException

API_URL = os.getenv("SD_API_URL", "http://127.0.0.1:7860")

app = Flask(__name__, static_folder="static", static_url_path="/static")

def http_get_json(url: str, timeout=8):
    try:
        r = requests.get(url, timeout=timeout)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[HTTP GET] {url} -> {e}")
        return None


def http_post_json(url: str, payload: dict, timeout=120):
    try:
        r = requests.post(url, json=payload, timeout=timeout)
        return r
    except Exception as e:
        print(f"[HTTP POST] {url} -> {e}")
        return None


def get_available_samplers():
    data = http_get_json(f"{API_URL}/sdapi/v1/samplers")
    if not data:
        return []
    try:
        return [s["name"] for s in data if "name" in s]
    except Exception:
        return []


def get_available_models():
    data = http_get_json(f"{API_URL}/sdapi/v1/sd-models")
    if not data:
        return []
    try:
        return [m["model_name"] for m in data if "model_name" in m]
    except Exception:
        return []


def strip_data_url_prefix(b64str: str) -> str:
    if isinstance(b64str, str) and b64str.startswith("data:image"):
        return b64str.split(",", 1)[-1]
    return b64str


def pil_to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def get_uploaded_image_file():
    for key in ("image", "input-image", "input_image"):
        f = request.files.get(key)
        if f:
            return f
    return None

@app.route("/")
def index():
    models = get_available_models()
    samplers = get_available_samplers()
    return render_template("index.html", styles=models, samplers=samplers)


@app.route("/generate_txt2img", methods=["POST"])
def generate_txt2img():
    try:
        prompt = request.form.get("prompt", "")
        negative_prompt = request.form.get("negative-prompt", "")

        models = get_available_models()
        model = request.form.get("model") or (models[0] if models else "")

        samplers = get_available_samplers()
        sampler = request.form.get("sampler") or (samplers[0] if samplers else "Euler")

        # Fallbacks/Validierung
        width = int(request.form.get("width", 256))
        height = int(request.form.get("height", 256))
        steps = int(request.form.get("steps", 20))

        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "styles": [""],
            "seed": -1,
            "subseed": -1,
            "width": width,
            "height": height,
            "steps": steps,
            "sampler_index": sampler,
            "cfg_scale": 7,
            "send_images": True,
            "save_images": False,
            "alwayson_scripts": {},
            "sd_model_checkpoint": model
        }

        resp = http_post_json(f"{API_URL}/sdapi/v1/txt2img", payload)
        if not resp:
            return jsonify({"error": "Keine Verbindung zur Stable-Diffusion API."}), 502

        if resp.status_code != 200:
            return jsonify({"error": f"API error: {resp.status_code}, {resp.text}"}), 500

        data = resp.json()
        images = data.get("images", [])
        if not images:
            return jsonify({"error": "Kein Bild generiert."}), 500

        b64 = strip_data_url_prefix(images[0])

        try:
            png = Image.open(io.BytesIO(base64.b64decode(b64)))
            png_bytes = pil_to_png_bytes(png)
            b64_png = base64.b64encode(png_bytes).decode("utf-8")
        except Exception:
            b64_png = b64

        return jsonify({
            "message": "Erfolgreich!",
            "image_base64": b64_png,
            "mime": "image/png"
        })

    except Exception as e:
        print(f"[generate_txt2img] {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/generate_img2img", methods=["POST"])
def generate_img2img():
    try:
        prompt = request.form.get("prompt", "")
        negative_prompt = request.form.get("negative-prompt", "")

        models = get_available_models()
        model = request.form.get("model") or (models[0] if models else "")

        sampler = request.form.get("sampler", "Euler")

        width = int(request.form.get("width", 512))
        height = int(request.form.get("height", 512))
        steps = int(request.form.get("steps", 50))

        f = get_uploaded_image_file()
        if not f:
            return jsonify({"error": "Kein Bild für Img2Img gefunden."}), 400

        try:
            src = Image.open(f.stream)
        except Exception:
            f.stream.seek(0)
            src = Image.open(f)

        init_png_bytes = pil_to_png_bytes(src)
        init_b64 = base64.b64encode(init_png_bytes).decode("utf-8")

        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "steps": steps,
            "sampler_index": sampler,
            "init_images": [init_b64],
            "cfg_scale": 7,
            "send_images": True,
            "save_images": False,
            "sd_model_checkpoint": model,
        }

        resp = http_post_json(f"{API_URL}/sdapi/v1/img2img", payload)
        if not resp:
            return jsonify({"error": "Keine Verbindung zur Stable-Diffusion API."}), 502

        if resp.status_code != 200:
            return jsonify({"error": f"API error: {resp.status_code}, {resp.text}"}), 500

        data = resp.json()
        images = data.get("images", [])
        if not images:
            return jsonify({"error": "Keine Bilder gefunden!"}), 500

        b64 = strip_data_url_prefix(images[0])

        try:
            png = Image.open(io.BytesIO(base64.b64decode(b64)))
            png_bytes = pil_to_png_bytes(png)
            b64_png = base64.b64encode(png_bytes).decode("utf-8")
        except Exception:
            b64_png = b64

        return jsonify({
            "message": "Erfolgreich ein Bild erstellt!",
            "image_base64": b64_png,
            "mime": "image/png"
        })

    except Exception as e:
        print(f"[generate_img2img] {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health")
def health():
    try:
        r = requests.get(f"{API_URL}/sdapi/v1/samplers", timeout=3)
        ok = r.status_code == 200
        return jsonify({"ok": ok}), (200 if ok else 502)
    except Exception:
        return jsonify({"ok": False}), 502

@app.errorhandler(Exception)
def handle_exc(e):
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    return jsonify({"error": "Unerwarteter Fehler"}), 500

def open_browser():
    try:
        webbrowser.open("http://127.0.0.1:5000")
    except Exception:
        pass


if __name__ == "__main__":
    threading.Thread(target=lambda: app.run(debug=True, use_reloader=False)).start()
    threading.Timer(1, open_browser).start()
