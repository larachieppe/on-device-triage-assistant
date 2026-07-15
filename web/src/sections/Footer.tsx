const REPO_URL = "https://github.com/larachieppe/on-device-triage-assistant";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <a href="#top" className="wordmark">
            <span className="wordmark-mark" aria-hidden="true" />
            Triage
          </a>
          <p className="footer-tagline">
            A portfolio demo of on-device ML, confidence-aware routing, and knowing when to ask
            instead of guess.
          </p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Project</h4>
            <a href="#try">Try it</a>
            <a href="#how-it-works">How it works</a>
            <a href="#numbers">Numbers</a>
          </div>
          <div>
            <h4>Source</h4>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub repo
            </a>
            <a href={`${REPO_URL}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer">
              Architecture notes
            </a>
            <a href={`${REPO_URL}/blob/main/README.md`} target="_blank" rel="noreferrer">
              README
            </a>
          </div>
          <div>
            <h4>Built with</h4>
            <span>React · Vite · onnxruntime-web</span>
            <span>MobileBERT · Claude · Express</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          Portfolio demo only — not medical advice. Training data is synthetic and templated;
          labels are not clinically validated.
        </p>
      </div>
    </footer>
  );
}
