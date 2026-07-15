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

Deployed as **one Node process**: `server/index.js` serves the built `web/`
frontend as static files *and* handles the `/triage/fallback` API that holds
the Anthropic key — not a static site plus a separate API service. Same
origin means the frontend calls `/triage/fallback` as a plain relative path,
nothing to wire up between services.

```
┌──────────────────────────────────────────────────┐
│  server/ (one Express process)                     │
│                                                      │
│  serves web/dist  ──────────▶  Browser loads the app │
│                                                      │
│  Browser: 1. type symptom                           │
│           2. run ONNX model locally                 │
│                                                      │
│           confident enough ──────────▶ show result  │
│           low confidence / emergency-leaning         │
│             ──▶ ask clarifying Qs (or hard safety    │
│                 rule) ──▶ POST /triage/fallback ───▶│
│                 Claude API (key stays server-side)   │
└──────────────────────────────────────────────────┘
```

## Repo layout

```
ml/       Python: synthetic data generation, fine-tuning, ONNX export/quantization
server/   Node/Express app — serves the built web/ frontend AND the Claude fallback API
web/      Vite/React browser app (onnxruntime-web) — the only client
render.yaml   Render Blueprint that deploys the whole thing as one service
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

### 2. Local development

Locally, the frontend and the API run as **two separate dev servers** for
fast iteration (Vite's dev server gives instant HMR; that's not available
once the frontend is a built static bundle). This is dev-only — production
is one process, see below.

```bash
# terminal 1
cd server
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm install
npm run dev              # http://localhost:8787

# terminal 2
cd web
npm install
cp .env.example .env   # VITE_TRIAGE_SERVER_URL=http://localhost:8787
npm run dev              # http://localhost:5173
```

### 3. Run it the way production runs it (optional)

To sanity-check the actual merged deploy locally before pushing:

```bash
cd web && npm ci && npm run build && cd ..
cd server && npm start   # now serves the built web/ app AND the API on :8787
```

## Deploying to Render

`render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that deploys the whole app as **one Node web service** — no static site
product involved, no second service to keep in sync:

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the Render dashboard: **New +** → **Blueprint** → select this repo.
   Render reads `render.yaml` and provisions the service automatically —
   build command, start command, and health check path all come from that
   file, nothing to fill in by hand.
3. Render will prompt for `ANTHROPIC_API_KEY` (it's marked `sync: false` in
   the Blueprint specifically so it's never written to git) — paste your
   key there.
4. Wait for the build to finish (it runs `npm ci && npm run build` in `web/`,
   then `npm ci` in `server/`, then starts `server/index.js`).

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
