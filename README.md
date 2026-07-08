# On-Device Triage Assistant

A React Native app that classifies a user's described symptoms into a triage
category using a small, distilled transformer running **entirely on-device**
via ONNX Runtime Mobile — with a server-side Claude call as a fallback for
cases the on-device model isn't confident about.

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
- Keeps the LLM API key server-side instead of bundling it into the mobile
  app, which is how this would actually have to work in production.

## Architecture

```
┌─────────────┐      confident enough       ┌──────────────────┐
│  Mobile app │ ───────────────────────────▶│  Show result      │
│             │                              └──────────────────┘
│  1. type    │
│     symptom │      low confidence /        ┌──────────────────┐
│  2. run     │      always-verify label     │  server/          │
│     ONNX    │ ───────────────────────────▶ │  Express proxy    │
│     model   │                               │  → Claude API     │
│     locally │ ◀─────────────────────────── │  (holds API key)  │
└─────────────┘         triage result         └──────────────────┘
```

## Repo layout

```
ml/       Python: synthetic data generation, fine-tuning, ONNX export/quantization
server/   Node/Express proxy that calls Claude for the fallback path (keeps the API key off-device)
mobile/   Expo React Native app (onnxruntime-react-native + a hand-rolled WordPiece tokenizer)
```

## Setup

### 1. Train and export the on-device model

```bash
cd ml
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python data/generate_synthetic_data.py --n-per-label 800
python train.py --epochs 4
python export_onnx.py   # quantizes to int8 and copies into mobile/assets/model/
python eval.py          # per-class report + confidence histogram, use this to pick
                         # CONFIDENCE_THRESHOLD in mobile/src/config.ts
```

Until you run `export_onnx.py`, `mobile/assets/model/` contains placeholder
files so the app still builds — the classifier will throw a clear error if
you try to use it before a real model is exported.

### 2. Run the fallback server

```bash
cd server
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm install
npm start               # http://localhost:8787
```

### 3. Run the mobile app

`onnxruntime-react-native` is a native module, so this **will not run in
Expo Go** — it needs a custom dev client build.

```bash
cd mobile
npm install
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

If testing on a physical device, set `EXPO_PUBLIC_TRIAGE_SERVER_URL` to your
machine's LAN IP (not `localhost`) before starting the app, e.g.:

```bash
EXPO_PUBLIC_TRIAGE_SERVER_URL=http://192.168.1.23:8787 npx expo start
```

## Tuning the tradeoff

`mobile/src/config.ts` has the two knobs that define the cost/latency
tradeoff this project is built around:

- `CONFIDENCE_THRESHOLD` — below this, fall back to the LLM.
- `ALWAYS_VERIFY_LABELS` — labels that always get double-checked regardless
  of confidence (defaults to `emergency`, since a false negative there is the
  worst failure mode).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the fuller writeup of
these decisions.
