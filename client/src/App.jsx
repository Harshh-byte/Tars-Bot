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

export default function App() {
  const [theme, setTheme] = useState("light");

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      setTheme(nextTheme);
    }
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.1,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // 2. Track Scroll Progress
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const scrolled = (window.scrollY / scrollHeight) * 100;
        setScrollProgress(scrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Clean up
    return () => {
      window.removeEventListener("scroll", handleScroll);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    // 3. Simple Intersection Observer for entry animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    const revealElements = document.querySelectorAll(".reveal");
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 overflow-x-hidden">
      <SEO />
      <div
        className="fixed top-0 left-0 h-1 bg-linear-to-r from-ds-blurple to-ds-fuchsia z-100 transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />
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

