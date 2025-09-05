import io
import base64
from PIL import Image
from app import app

def _png_bytes(w=2, h=2, color=(255, 0, 0, 255)):
    img = Image.new("RGBA", (w, h), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_img2img_ok(monkeypatch):
    fake_b64 = base64.b64encode(b"\x89PNG\r\n\x1a\nfake").decode()

    class FakeResp:
        status_code = 200
        def json(self):
            return {"images": [fake_b64]}

    monkeypatch.setattr("app.http_post_json", lambda url, payload: FakeResp())

    png = _png_bytes()

    client = app.test_client()
    data = {
        "prompt": "a photo",
        "width": "64",
        "height": "64",
        "steps": "1",
        "image": (io.BytesIO(png), "input.png"),
    }
    rv = client.post("/generate_img2img", data=data, content_type="multipart/form-data")
    assert rv.status_code == 200
    body = rv.get_json()
    assert "image_base64" in body
