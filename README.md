# On-Device Triage Assistant

**Live demo:** _deploying to Render — see [Deploying to Render](#deploying-to-render)._

A symptom-triage classifier that runs **entirely on-device in the browser**
via a small, distilled transformer exported to ONNX and run with
onnxruntime-web — with a server-side Claude call as a fallback for cases the
on-device model isn't confident about, and a short clarifying-questions step
before it ever shows a high-stakes or uncertain verdict.

**Portfolio demo, not a medical product.** Training data is synthetic and
templated (see `ml/data/generate_synthetic_data.py`); labels are not
clinically validated. The point of the project is the systems design —
latency/cost tradeoffs between a small local model and an LLM API call — not
the medical accuracy of the classifier.

## Why this project

- Runs a real fine-tuned model on-device (not just "call an LLM API").
- Demonstrates a concrete cost/latency tradeoff: on-device inference is free
  and near-instant, but a distilled model will be wrong or unsure sometimes —
  the routing logic decides when it's worth paying for an LLM call instead.
- Keeps the LLM API key server-side instead of bundling it into the client,
  which is how this would actually have to work in production.
- Asks before it escalates: a low-confidence or emergency-leaning first
  guess triggers a few clarifying questions rather than an immediate verdict
  — see `web/src/clarify.ts`.

## Architecture

```
┌─────────────┐      confident enough       ┌──────────────────┐
│  Browser    │ ───────────────────────────▶│  Show result      │
│  (web/)     │                              └──────────────────┘
│  1. type    │
│     symptom │      low confidence /        ┌──────────────────┐
│  2. run     │      emergency-leaning        │  server/          │
│     ONNX    │ ──▶ ask clarifying Qs ──────▶ │  Express proxy    │
│     model   │      (or hard safety rule)    │  → Claude API     │
│     locally │ ◀─────────────────────────── │  (holds API key)  │
└─────────────┘         triage result         └──────────────────┘
```

## Repo layout

```
ml/       Python: synthetic data generation, fine-tuning, ONNX export/quantization
server/   Node/Express proxy that calls Claude for the fallback path (keeps the API key off-device)
web/      Vite/React browser app (onnxruntime-web) — the only client
render.yaml   Render Blueprint that deploys both server/ and web/
```

## Setup

### 1. Train and export the on-device model

```bash
cd ml
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python data/generate_synthetic_data.py --n-per-label 800
python data/hard_eval_set.py   # hand-written, non-templated — see below
python train.py --epochs 4
python export_onnx.py          # quantizes to int8 and copies into web/public/model/

python eval.py                                       # sanity check only — the templated
                                                       # val set hits 100% and is not a
                                                       # useful signal, see docs/ARCHITECTURE.md
python eval.py --val-csv data/hard_eval_set.csv       # the real signal for CONFIDENCE_THRESHOLD
```

Until you run `export_onnx.py`, `web/public/model/` contains placeholder
files so the app still builds — the classifier will throw a clear error if
you try to use it before a real model is exported.

### 2. Run the fallback server

```bash
cd server
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm install
npm start               # http://localhost:8787
```

### 3. Run the web app

```bash
cd web
npm install
npm run dev   # http://localhost:5173
```

If the fallback server isn't on `localhost:8787`, set `VITE_TRIAGE_SERVER_URL`
before starting (e.g. in `web/.env`).

## Deploying to Render

`render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that deploys both services in one shot:

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Render dashboard: **New +** → **Blueprint** → select this repo.
   Render reads `render.yaml` automatically and provisions both services.
3. Render will prompt for `ANTHROPIC_API_KEY` on the server service (it's
   marked `sync: false` in the Blueprint specifically so it's never written
   to git) — paste your key there.
4. Wait for both builds to finish. The web service's build embeds the
   server's URL into the bundle via `VITE_TRIAGE_SERVER_URL`.

If either service name in `render.yaml` was already taken on your account,
Render assigned it a different subdomain than the Blueprint assumed, and the
two services won't find each other. Fix: open the affected service's
**Environment** tab, correct the URL by hand, and trigger a manual redeploy.

The server has two abuse-mitigations baked in since it's genuinely public
now, not just a local dev convenience — see the comments in `server/index.js`:
a per-IP rate limit and a process-lifetime request budget
(`GLOBAL_REQUEST_BUDGET`, resets on redeploy). Neither is a substitute for
real auth on an actual product.

## Tuning the tradeoff

`web/src/config.ts` has the knobs that define the cost/latency tradeoff this
project is built around:

- `CONFIDENCE_THRESHOLD` — below this, ask clarifying questions / fall back
  to the LLM instead of trusting the on-device guess outright.
- `ALWAYS_VERIFY_LABELS` — labels that always get double-checked regardless
  of confidence (defaults to `emergency`, since a false negative there is the
  worst failure mode).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the fuller writeup of
these decisions, including why the confidence threshold is 0.95 and not a
more conventional-looking number.
