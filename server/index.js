// This process serves two things: the built web/ frontend as static files,
// and the /triage/fallback API that holds the Anthropic API key. One Render
// service instead of a static site + a separate API service, on purpose —
// a static site product has no server-side runtime to keep a secret in, so
// the frontend and the key-holding API have to live in the same process
// (or at least the same kind of deployable) for this to work as one public
// deploy. Same-origin also means the frontend can call `/triage/fallback`
// with a relative path — no cross-service URL to keep in sync.
//
// This is deployed publicly (see ../render.yaml), so unlike a local-only
// dev server, an open /triage/fallback endpoint is a real cost-abuse risk —
// anyone who finds the URL could otherwise run up the Anthropic bill. The
// two limiters below are the mitigation: a per-IP rate limit, and a
// process-lifetime request budget as a hard ceiling regardless of how
// requests are distributed across IPs. Neither is a substitute for auth on
// a real product — see docs/ARCHITECTURE.md.

require("dotenv").config({ quiet: true });
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const Anthropic = require("@anthropic-ai/sdk");

const LABELS = ["self_care", "routine_care", "urgent_care", "emergency"];
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_TEXT_LENGTH = 1000;
const GLOBAL_REQUEST_BUDGET = Number(process.env.GLOBAL_REQUEST_BUDGET || 300);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for correct per-IP limiting
// Open (any origin) unless ALLOWED_ORIGIN is set, so local dev keeps working
// out of the box. render.yaml sets it to the deployed web service's origin.
app.use(cors(process.env.ALLOWED_ORIGIN ? { origin: process.env.ALLOWED_ORIGIN } : undefined));
app.use(express.json());

const fallbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — try again in a few minutes." },
});

let globalRequestCount = 0;
function globalBudgetGuard(_req, res, next) {
  if (globalRequestCount >= GLOBAL_REQUEST_BUDGET) {
    return res.status(503).json({
      error: "This demo's LLM fallback budget is exhausted for now. Try again later.",
    });
  }
  globalRequestCount += 1;
  next();
}

const SYSTEM_PROMPT = `You are the fallback triage step in a symptom-triage app. A small on-device \
model already tried to classify the user's message and was not confident enough, so you are being \
called to make the final call. Classify the user's described symptom(s) into exactly one of these \
categories:

- self_care: likely manageable at home with rest, fluids, or OTC remedies.
- routine_care: worth a routine doctor's visit, not time-critical.
- urgent_care: should see a clinician same-day or within a few hours.
- emergency: seek emergency care immediately (call local emergency services).

Err toward the more urgent category when the description is ambiguous or could plausibly involve a \
serious condition — accuracy on urgency comes first. But how you say it matters too: write the \
explanation like a calm, caring person giving clear advice, not a clinical alert. Avoid alarming or \
clinical-sounding phrasing ("EMERGENCY", "seek immediate medical attention", exclamation points) — \
say plainly what to do and why, the same way you'd tell a friend. Urgency should come through in the \
clarity of the instruction, not in how loud it sounds. This is a portfolio demo, not a medical \
device — always include a brief, kind explanation and a reminder that this is not a substitute for \
professional medical advice.`;

const TRIAGE_TOOL = {
  name: "submit_triage",
  description: "Submit the final triage classification for the user's symptom description.",
  input_schema: {
    type: "object",
    properties: {
      label: { type: "string", enum: LABELS },
      confidence: {
        type: "number",
        description: "Model's confidence in this label, from 0 to 1.",
      },
      explanation: {
        type: "string",
        description: "One or two sentence plain-language explanation for the user.",
      },
    },
    required: ["label", "confidence", "explanation"],
  },
};

app.get("/health", (_req, res) => res.json({ ok: true, model: MODEL }));

app.post("/triage/fallback", fallbackLimiter, globalBudgetGuard, async (req, res) => {
  const { text, onDeviceLabel, onDeviceConfidence } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "`text` is required" });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `text exceeds ${MAX_TEXT_LENGTH} characters` });
  }

  const userContent = onDeviceLabel
    ? `Symptom description: "${text}"\n\nOn-device model guessed "${onDeviceLabel}" with confidence ${onDeviceConfidence}, which was below the confidence threshold.`
    : `Symptom description: "${text}"`;

  const startedAt = Date.now();
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools: [TRIAGE_TOOL],
      tool_choice: { type: "tool", name: "submit_triage" },
      messages: [{ role: "user", content: userContent }],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse) {
      throw new Error("Model did not return a tool_use block");
    }

    res.json({
      ...toolUse.input,
      source: "llm_fallback",
      model: MODEL,
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("Claude fallback failed:", err.message);
    res.status(502).json({ error: "LLM fallback failed", detail: err.message });
  }
});

// Serves the built frontend if present. It won't be during local `npm run
// dev` here (the two apps run as separate dev servers locally for fast
// iteration — see README), but will be in production once render.yaml's
// buildCommand runs `npm run build` in web/ first. The fallback is a bare
// app.use(), not app.get("*", ...) — Express 5's router (path-to-regexp v8)
// dropped the old bare "*" wildcard route syntax, and a path-less app.use()
// sidesteps needing a route pattern at all. It's placed last and only
// handles GET, so it can't shadow the POST route above.
const WEB_DIST = path.join(__dirname, "..", "web", "dist");
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(WEB_DIST, "index.html"));
  });
}

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Triage server listening on http://localhost:${PORT}`);
});
