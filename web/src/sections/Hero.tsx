export default function Hero() {
  return (
    <div id="top" className="hero">
      <span className="eyebrow">Runs on-device, in your browser</span>
      <h1>On-Device Triage Assistant</h1>
      <p className="disclaimer">
        A distilled classifier that decides whether it's confident enough to answer on its own —
        and asks before it escalates when it isn't. Portfolio demo only, not medical advice.
      </p>
      <div className="hero-actions">
        <a href="#try" className="hero-cta hud-cta">
          Try it now
        </a>
        <a href="#how-it-works" className="hero-cta hero-cta--ghost">
          See how it works
        </a>
      </div>
    </div>
  );
}
