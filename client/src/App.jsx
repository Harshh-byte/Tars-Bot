import { useState, useEffect } from "react";
import Lenis from "lenis";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Capabilities from "./components/Capabilities";
import Commands from "./components/Commands";
import Sandbox from "./components/Sandbox";
import Parameters from "./components/Parameters";
import FAQs from "./components/FAQs";
import Footer from "./components/Footer";
import SEO from "./components/shared/SEO";
import CustomCursor from "./components/CustomCursor";

function getInitialTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    if (document.startViewTransition && !prefersReducedMotion) {
      document.startViewTransition(() => setTheme(nextTheme));
    } else {
      setTheme(nextTheme);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.1,
    });

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, [prefersReducedMotion]);

  useEffect(() => {
    const revealEls = document.querySelectorAll(".reveal");

    if (prefersReducedMotion) {
      revealEls.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.05 },
    );

    revealEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <div className="min-h-screen overflow-x-hidden transition-colors duration-300">
      <SEO />
      <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
      <Hero />
      <Capabilities />
      <Commands />
      <Sandbox />
      <Parameters />
      <FAQs />
      <Footer />
      <CustomCursor />
    </div>
  );
}
