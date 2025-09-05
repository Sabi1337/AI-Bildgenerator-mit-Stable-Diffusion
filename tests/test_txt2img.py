import base64
from app import app

def test_txt2img_ok(monkeypatch):
    # Minimaler Fake-Response von SD: Base64-String (kann ruhig minimal sein)
    fake_b64 = base64.b64encode(b"\x89PNG\r\n\x1a\nfake").decode()

    class FakeResp:
        status_code = 200
        def json(self):
            return {"images": [fake_b64]}

    monkeypatch.setattr("app.http_post_json", lambda url, payload: FakeResp())

    client = app.test_client()
    rv = client.post("/generate_txt2img", data={
        "prompt": "cat astronaut",
        "width": "64",
        "height": "64",
        "steps": "1"
    })
    assert rv.status_code == 200
    data = rv.get_json()
    assert "image_base64" in data
    assert data.get("mime") in (None, "image/png", "image/jpeg", "image/webp")
