const REPO_URL = "https://github.com/larachieppe/on-device-triage-assistant";

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="#top" className="wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          Triage
        </a>
        <nav className="site-nav">
          <a href="#try">Try it</a>
          <a href="#how-it-works">How it works</a>
          <a href="#numbers">Numbers</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
