# Stable‑Diffusion Bildgenerator (Flask)

![CI](https://github.com/Sabi1337/AI-Bildgenerator-mit-Stable-Diffusion/actions/workflows/ci.yml/badge.svg)
![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.x-000?logo=flask)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-choose_MIT-orange)

Ein leichtgewichtiges, **stateless** Frontend (Flask) für **Stable Diffusion WebUI (AUTOMATIC1111)**. Unterstützt **Text→Bild (txt2img)** und **Bild→Bild (img2img)** mit modernem UI, **sauberer API**, **OpenAPI‑Spec**, **Tests (mit Mocks)** und **CI (GitHub Actions)**. Ideal als Referenzprojekt für **DevOps/MLOps** & **Full‑Stack** Kompetenzen.

---

## TL;DR – warum dieses Projekt?
- **Stateless Architektur**: Response enthält `image_base64` (kein Server‑Storage) → **render/serverless‑freundlich**.
- **Saubere SD‑Integration**: Model/Sampler Discovery, Validierung, klares Fehlerhandling.
- **CI/CD‑Reife**: PyTest (mit Mocks, ohne echte SD‑Instanz), Docker‑Build, optional OpenAPI‑Validation.
- **UX**: Modus‑Switch (Txt2Img/Img2Img), Drag&Drop, Preview, Clear‑Button, Dark/Light‑Theme.
- **Prod‑Denken**: `/health`, Eingabe‑Raster (Vielfache von 64), Security‑Hinweise, Deployment‑Beispiele.

---

## Inhaltsverzeichnis
- [Features](#features)
- [Architektur](#architektur)
- [Projektstruktur](#projektstruktur)
- [Screenshots & Demo](#screenshots--demo)
- [Quickstart](#quickstart)
- [Stable Diffusion vorbereiten](#stable-diffusion-vorbereiten)
- [Konfiguration](#konfiguration)
- [API (OpenAPI)](#api-openapi)
- [Tests & Qualität](#tests--qualität)
- [Docker & Compose](#docker--compose)
- [Deployment (Render/Fly/Server)](#deployment-renderflyserver)
- [Security‑Hinweise](#security-hinweise)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Lizenz](#lizenz)

---

## Features
- **Txt2Img & Img2Img** inkl. Prompt, Negativ‑Prompt, Steps, Größe (Vielfache von 64), Sampler & Modell.
- **Auto‑Discovery**: Modelle & Sampler via SD‑API (`/sdapi/v1/sd-models`, `/sdapi/v1/samplers`).
- **Stateless Backend**: JSON‑Response mit `image_base64` + `mime` (kein Dateispeichern auf dem Server).
- **UX**: Drag&Drop‑Dropzone (Img2Img), Live‑Preview, Entfernen‑Button, Dark/Light‑Toggle.
- **Health‑Check**: `/health` (Reachability).
- **Robuste Fehler**: strukturierte JSON‑Errors, Eingabe‑Validierung.
- **CI**: GitHub Actions (Install → Sanity‑Import → Tests → Docker‑Build).
- **Tests**: PyTest mit **Mocks** (kein laufender SD‑Server nötig).

---

## Architektur

```text
Browser (HTML/CSS/JS)
   │
   ▼
Flask (app.py)
  ├─ POST /generate_txt2img  ──► SD WebUI /sdapi/v1/txt2img
  ├─ POST /generate_img2img  ──► SD WebUI /sdapi/v1/img2img
  ├─ GET  /health            ──► ok:true/false
  └─ GET  /openapi.(yaml|json)  (optional)
   │
   ▼
Stable Diffusion WebUI (AUTOMATIC1111 API; z. B. http://127.0.0.1:7860)
```

> Bilder werden **nicht** serverseitig gespeichert. Die API liefert PNG/JPEG/WEBP als **Base64** zurück; das Frontend rendert & bietet Download an.

---

## Projektstruktur

```
.
├─ app.py
├─ requirements.txt
├─ templates/
│  └─ index.html
├─ static/
│  ├─ app.js
│  └─ style.css
├─ tests/
│  ├─ test_txt2img.py         # pytest mit Mock der SD-API
│  └─ test_img2img.py
├─ openapi.yaml               # OpenAPI 3.0 Spezifikation
├─ Dockerfile
├─ docker-compose.yml
└─ .github/workflows/ci.yml   # GitHub Actions
```

---

## Screenshots & Demo
### Text-2-img 
<img width="1108" height="776" alt="image" src="https://github.com/user-attachments/assets/bcf0a880-6496-4776-8e20-8db0c45b291e" />
<img width="1344" height="1204" alt="image" src="https://github.com/user-attachments/assets/22a42ad0-6752-4a11-b2a1-c8068bd00ff4" />

### Img-2-img 
<img width="1087" height="869" alt="image" src="https://github.com/user-attachments/assets/7c7ee707-5c5a-4707-a279-0c6dfaec8bf4" />

> ```

---

## Quickstart

### Lokal (Windows, PowerShell)
```powershell
# 1) Repo klonen
git clone https://github.com/Sabi1337/AI-Bildgenerator-mit-Stable-Diffusion.git
cd AI-Bildgenerator-mit-Stable-Diffusion

# 2) Virtuelle Umgebung & Abhängigkeiten
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

# 3) SD-API URL setzen (falls abweichend)
$env:SD_API_URL = "http://127.0.0.1:7860"

# 4) Start
python app.py  # → http://127.0.0.1:5000
```

### Lokal (macOS/Linux)
```bash
git clone https://github.com/Sabi1337/AI-Bildgenerator-mit-Stable-Diffusion.git
cd AI-Bildgenerator-mit-Stable-Diffusion

python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

export SD_API_URL="http://127.0.0.1:7860"
python app.py
```

### UI nutzen
1. Modus wählen: „Text→Bild“ oder „Bild→Bild“ (bei Bild→Bild erscheint die Dropzone).
2. Prompt/Negativ‑Prompt eingeben, Modell & Sampler auswählen.
3. Breite/Höhe (Vielfache von 64) und Steps setzen.
4. **Generieren** → Bild erscheint inkl. Download.

---

## Stable Diffusion vorbereiten
**AUTOMATIC1111 WebUI kurz & schmerzlos:**
- **Windows**: `webui-user.bat` öffnen und `COMMANDLINE_ARGS` um `--api` ergänzen (optional: `--port 7860 --listen`). Danach starten.
- **Linux/macOS**: `./webui.sh --api --port 7860 --listen`
- **Check**: `http://127.0.0.1:7860/sdapi/v1/samplers` muss JSON liefern.
- Diese App ruft SD **serverseitig** auf → **kein CORS‑Setup** im Browser nötig. Nur `SD_API_URL` korrekt setzen.

---

## Konfiguration

| Variable     | Default                 | Beschreibung                                     |
|--------------|-------------------------|--------------------------------------------------|
| `SD_API_URL` | `http://127.0.0.1:7860` | Adresse der Stable‑Diffusion WebUI API           |

Parameter wie Größe/Steps/Sampler/Modell kommen **per Formular** aus dem Frontend.

---

## API (OpenAPI)
- Spezifikation: **`openapi.yaml`** (OpenAPI 3.0).  
- Schnell ansehen im Browser: https://editor.swagger.io → Datei reinziehen.
- (Optional) per Flask ausliefern:
  ```python
  from flask import send_file, jsonify
  import yaml

  @app.route("/openapi.yaml")
  def openapi_yaml():
      return send_file("openapi.yaml", mimetype="text/yaml")

  @app.route("/openapi.json")
  def openapi_json():
      with open("openapi.yaml", "r", encoding="utf-8") as f:
          return jsonify(yaml.safe_load(f))
  ```

**Response‑Beispiel (vereinfacht):**
```json
{ "message": "Erfolgreich!", "image_base64": "<...>", "mime": "image/png" }
```

---

## Tests & Qualität
- **PyTest** mit **Mocks**: SD muss in CI **nicht** laufen.  
- **GitHub Actions**: `.github/workflows/ci.yml` → Checkout → Python 3.11 → Install → Sanity‑Import → Tests → Docker‑Build.
- Optional: **OpenAPI‑Validation** in CI
  ```yaml
  - name: Validate OpenAPI
    run: |
      python -m pip install --quiet openapi-spec-validator pyyaml
      python - <<'PY'
      import yaml
      from openapi_spec_validator import validate_spec
      with open("openapi.yaml","r",encoding="utf-8") as f:
          spec = yaml.safe_load(f)
      validate_spec(spec)
      print("OpenAPI valid ✅")
      PY
  ```

Lokal:
```bash
pytest -q
```

---

## Docker & Compose

**Direkt:**
```bash
docker build -t sd-bildgenerator:local .
docker run -d --name sd-bildgen -p 5000:5000 \
  -e SD_API_URL=http://host.docker.internal:7860 \
  --restart unless-stopped sd-bildgenerator:local
# App: http://localhost:5000
```

**Compose (Beispiel):**
```yaml
services:
  app:
    build: .
    container_name: sd-bildgen
    ports:
      - "5000:5000"
    environment:
      SD_API_URL: "http://host.docker.internal:7860"
    restart: unless-stopped
```

**Linux‑Hinweis:** Falls `host.docker.internal` fehlt → `--add-host=host.docker.internal:host-gateway`.

---

## Deployment (Render/Fly/Server)
- **Render/Fly.io**: funktioniert dank **stateless** Response ohne Persistenz. `SD_API_URL` auf die erreichbare SD‑Instanz zeigen lassen.
- **Reverse Proxy** (Nginx/Caddy): Port 5000 weiterleiten, optional GZip aktivieren.
- **Gunicorn** (im Container): Worker‑Zahl CPU‑abhängig wählen.

---

## Security‑Hinweise
- Öffentliche Deployments: **Rate‑Limiting** (z. B. Flask‑Limiter) & optional **Auth** (Basic/API‑Key).
- Dateiuploads: Max‑Size & MIME‑Check (PNG/JPG/WEBP) setzen.
- Keine sensiblen Daten im Response‑Body; Logs anonymisieren.

---

## Troubleshooting
- **Leere Model/Sampler‑Listen** → SD‑API nicht erreichbar → `SD_API_URL` prüfen.
- **400/422** → Größe nicht Vielfaches von 64 / fehlende Pflichtfelder.
- **Docker erreicht SD nicht** → Windows/Mac `host.docker.internal`; Linux: `--add-host`.
- **CI rot** → „Run tests“‑Logs prüfen (Import‑Pfad/Mocks).

---

## Roadmap
- [ ] Galerie (Client‑seitig, LocalStorage)
- [ ] Mehrere Ergebnisse pro Request
- [ ] Prompt‑Presets & Seed‑Management
- [ ] Eingebaute Swagger‑UI unter `/docs`
- [ ] Rate‑Limiting & Auth (Public Deploys)

---

## Lizenz
Wähle eine Lizenz (z. B. **MIT**) und lege `LICENSE` ins Repo.
