import Header from "./sections/Header";
import Hero from "./sections/Hero";
import TriageDemo from "./sections/TriageDemo";
import HowItWorks from "./sections/HowItWorks";
import Stats from "./sections/Stats";
import Features from "./sections/Features";
import Footer from "./sections/Footer";
import "./Sections.css";

export default function App() {
  return (
    <div className="site">
      <Header />
      <main>
        <div className="page">
          <Hero />
        </div>
        <TriageDemo />
        <HowItWorks />
        <Stats />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
