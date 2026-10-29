import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { commands, categories } from "../data/commands";
import RubberSegment from "./ui/RubberSegment";

gsap.registerPlugin(ScrollTrigger);

const BADGE_THEMES = {
  games: "text-ds-blurple bg-ds-blurple/10 border border-ds-blurple/25",
  fun: "text-ds-yellow bg-ds-yellow/10 border border-ds-yellow/25",
  actions: "text-ds-fuchsia bg-ds-fuchsia/10 border border-ds-fuchsia/25",
  util: "text-ds-green bg-ds-green/10 border border-ds-green/25",
};

export default function Commands() {
  const [activeCategory, setActiveCategory] = useState("games");
  const sectionRef = useRef(null);
  const cardsGridRef = useRef(null);

  const filteredCommands = commands.filter(
    (cmd) => cmd.category === activeCategory,
  );

  const segmentItems = useMemo(
    () => categories.map((cat) => ({ label: cat.label, value: cat.value })),
    [],
  );

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Reveal header + tabs
      gsap.fromTo(
        ".commands-header",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );

      gsap.fromTo(
        ".commands-tabs",
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Animate cards on category change or initial appearance
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !cardsGridRef.current) return;

    gsap.fromTo(
      ".command-card-item",
      { y: 24, opacity: 0, scale: 0.98 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.45,
        stagger: 0.05,
        ease: "power2.out",
      },
    );
  }, [activeCategory]);

  return (
    <section
      id="commands"
      ref={sectionRef}
      className="py-16 md:py-24 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="commands-header text-center max-w-2xl mx-auto mb-8">
          <h2 className="font-body text-3xl sm:text-4xl md:text-5xl font-extrabold text-ds-text tracking-tight">
            Command <span className="text-gradient">Directory</span>
          </h2>
          <p className="text-ds-muted text-sm sm:text-base mt-3 font-sans">
            Every tool in TARS&apos; arsenal, built for instant execution and maximum banter.
          </p>
        </div>

        <div className="commands-tabs flex justify-center mb-10 overflow-x-auto no-scrollbar py-2">
          <RubberSegment
            items={segmentItems}
            value={activeCategory}
            onChange={(val) => setActiveCategory(val)}
            trackColor="rgba(26, 32, 46, 0.7)"
            thumbColor="#5865F2"
            textColor="#94a3b8"
            activeTextColor="#ffffff"
            size="md"
            radius={999}
            inset={4}
            equalSlots={false}
            stretch={90}
            squash={4}
            speed={1.05}
            className="border border-ds-border backdrop-blur-md shadow-md"
            aria-label="Command categories"
          />
        </div>

        <div
          ref={cardsGridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {filteredCommands.map((cmd) => (
            <div
              key={cmd.trigger}
              className="command-card-item custom-card flex flex-col justify-between p-4 sm:p-5 h-full"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <code className="text-ds-text font-mono bg-ds-border/50 px-2 py-0.5 rounded text-xs font-bold border border-ds-border">
                    {cmd.trigger}
                  </code>
                  <span
                    className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      BADGE_THEMES[cmd.category] || cmd.badgeColor
                    }`}
                  >
                    {cmd.badge}
                  </span>
                </div>
                <h3 className="font-body text-base font-bold text-ds-text mb-1">
                  {cmd.title}
                </h3>
                <p className="text-ds-muted text-xs sm:text-sm leading-relaxed">
                  {cmd.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
