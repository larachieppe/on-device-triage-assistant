// Thin proxy that holds the Anthropic API key server-side. The web app
// never talks to Claude directly — it only calls this server, which is the
// whole point: an API key bundled into a client-side app is trivially
// extractable, so the fallback call has to happen behind a service boundary.
//
// This is deployed publicly (see ../render.yaml), so unlike a local-only
// dev server, an open /triage/fallback endpoint is a real cost-abuse risk —
// anyone who finds the URL could otherwise run up the Anthropic bill. The
// two limiters below are the mitigation: a per-IP rate limit, and a
// process-lifetime request budget as a hard ceiling regardless of how
// requests are distributed across IPs. Neither is a substitute for auth on
// a real product — see docs/ARCHITECTURE.md.

require("dotenv").config({ quiet: true });
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
serious condition. This is a portfolio demo, not a medical device — always include a brief plain-\
language explanation and a reminder that this is not a substitute for professional medical advice.`;

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

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Triage fallback server listening on http://localhost:${PORT}`);
});
