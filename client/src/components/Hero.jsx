import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import Squares from "./ui/Squares";
import DecryptedText from "./ui/DecryptedText";
import ShinyText from "./ui/ShinyText";
import CircularText from "./ui/CircularText";
import StarBorder from "./ui/StarBorder";


function useTypewriter(words, speed = 60, delay = 2500) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timer;

    if (isDeleting) {
      timer = setTimeout(() => {
        setText(currentWord.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, speed / 2.5);
    } else {
      timer = setTimeout(() => {
        setText(currentWord.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, speed);
    }

    if (!isDeleting && charIndex === currentWord.length) {
      clearTimeout(timer);
      timer = setTimeout(() => setIsDeleting(true), delay);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, wordIndex, words, speed, delay]);

  return text;
}

export default function Hero() {
  const [isDecrypted, setIsDecrypted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDecrypted(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const phrases = [
    "The ultimate cognitive powerhouse for your Discord server.",
    "Engineered for brutal honesty and precise sarcasm.",
    "Premium AI execution. Supportive when needed, savage when provoked.",
    "Your digital companion, upgraded with a razor-sharp wit."
  ];

  const typewriterText = useTypewriter(phrases);
  const heroImageRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      ".hero-title-text",
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power4.out" }
    );

    gsap.fromTo(
      ".hero-description-container",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.3 }
    );

    gsap.fromTo(
      ".hero-action-btn",
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.5)", stagger: 0.15, delay: 0.6 }
    );

    gsap.to(".floating-avatar-container", {
      y: -15,
      repeat: -1,
      yoyo: true,
      duration: 3,
      ease: "power1.inOut"
    });
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-28 md:pt-36 pb-12 md:pb-16 overflow-hidden bg-ds-bg"
    >
      <div className="absolute inset-0 z-0 opacity-40 dark:opacity-85 pointer-events-none">
        <Squares
          direction="diagonal"
          speed={0.4}
          squareSize={40}
          borderColor="var(--dot-color)"
          hoverFillColor="var(--accent-glow)"
        />
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-35">
        <div className="absolute top-8 left-8 w-12 h-12 border-t-3 border-l-3 border-ds-text"></div>
        <div className="absolute top-8 right-8 w-12 h-12 border-t-3 border-r-3 border-ds-text"></div>
        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-3 border-l-3 border-ds-text"></div>
        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-3 border-r-3 border-ds-text"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left">

          <h1 className="hero-title-text font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight uppercase mb-6 text-ds-text">
            Meet <br />
            <span className={`text-gradient text-ds-blurple ${isDecrypted ? "shiny-text animate-shine" : ""}`}>
              <DecryptedText text="TARS" speed={60} maxIterations={12} />
            </span>
          </h1>

          <div className="hero-description-container flex items-center justify-center lg:justify-start mb-8 min-h-[4em] text-lg sm:text-xl font-mono text-ds-muted leading-relaxed max-w-xl">
            <span className="font-mono text-ds-text">
              {typewriterText}
              <span className="animate-[pulse_1s_infinite] font-black text-ds-text ml-0.5">|</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center lg:justify-start">
            <StarBorder
              as="a"
              href="https://discord.com/oauth2/authorize?client_id=1413246880954978417&permissions=274878286912&integration_type=0&scope=bot+applications.commands"
              color="var(--accent-color)"
              className="hero-action-btn"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" style={{ color: "var(--text-color)" }}>
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
              </svg>
              <span>Add to Discord</span>
            </StarBorder>

            <StarBorder
              as="a"
              href="https://discord.gg/GMJA3M5TWy"
              color="var(--accent-secondary)"
              className="hero-action-btn"
            >
              <svg className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-color)" }}>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span>Support Server</span>
            </StarBorder>
          </div>
        </div>

        <div className="lg:col-span-5 flex items-center justify-center relative w-full overflow-hidden">
          <div ref={heroImageRef} className="floating-avatar-container relative flex items-center justify-center p-6 sm:p-12 w-full max-w-[320px] sm:max-w-none mx-auto">
            <div className="absolute w-48 h-48 rounded-full bg-linear-to-tr from-ds-blurple/25 to-ds-fuchsia/20 blur-xl pointer-events-none" />

            <CircularText
              text="• Sarcastic Discord Bot • Brutal AI Companion • Event Wishes • Context Memory"
              radius={120}
              fontSize="9px"
              className="scale-75 xs:scale-90 sm:scale-100 text-ds-muted opacity-80"
              spinDuration={24}
            >
              <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full border-3 border-ds-border bg-ds-card p-1 overflow-hidden shadow-[6px_6px_0px_var(--border-shadow)] pointer-events-auto">
                <img
                  src="/Icon.png"
                  alt="Tars Avatar"
                  className="w-full h-full object-cover rounded-full bg-black"
                />
              </div>
            </CircularText>
          </div>
        </div>
      </div>
    </section>
  );
}
