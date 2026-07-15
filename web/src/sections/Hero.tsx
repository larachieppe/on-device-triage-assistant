function HeroIllustration() {
  return (
    <svg className="hero-illustration" viewBox="0 0 360 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M40 52c8-14 30-10 32 2 14-6 26 6 20 16 10 0 12 14 0 16H36c-14 0-16-16-4-18-10-6-6-18 8-16Z" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <path d="M280 30c6-10 22-7 24 2 10-4 19 4 15 12 8 0 9 10 0 12h-46c-10 0-11-11-3-13-7-4-4-13 6-11Z" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
      <rect x="128" y="18" width="104" height="160" rx="16" stroke="currentColor" strokeWidth="1.6" />
      <rect x="140" y="36" width="80" height="112" rx="4" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      <circle cx="180" cy="163" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M148 96h14l7-20 10 40 8-28 6 16 5-8h22"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="103" cy="70" r="3" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="90" cy="110" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="257" cy="90" r="3" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="270" cy="130" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M103 73v20M90 112v18M257 93v22M270 132v14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export default function Hero() {
  return (
    <div id="top" className="hero">
      <HeroIllustration />
      <span className="eyebrow">Runs on-device, in your browser</span>
      <h1>On-Device Triage Assistant</h1>
      <p className="disclaimer">
        A distilled classifier that decides whether it's confident enough to answer on its own —
        and asks before it escalates when it isn't. Portfolio demo only, not medical advice.
      </p>
      <div className="hero-actions">
        <a href="#try" className="hero-cta">
          Try it now
        </a>
        <a href="#how-it-works" className="hero-cta hero-cta--ghost">
          See how it works
        </a>
      </div>
    </div>
  );
}
