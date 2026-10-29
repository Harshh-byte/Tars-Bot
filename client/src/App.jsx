import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Capabilities from "./components/Capabilities";
import Commands from "./components/Commands";
import Sandbox from "./components/Sandbox";
import FAQs from "./components/FAQs";
import Footer from "./components/Footer";
import SEO from "./components/shared/SEO";
import CustomCursor from "./components/CustomCursor";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.05,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const updateLenis = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  return (
    <div className="min-h-screen overflow-x-hidden transition-colors duration-300">
      <SEO />
      <Navbar />
      <Hero />
      <Capabilities />
      <Commands />
      <Sandbox />
      <FAQs />
      <Footer />
      <CustomCursor />
    </div>
  );
}
