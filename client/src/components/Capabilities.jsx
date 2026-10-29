import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Sparkles,
  Gamepad2,
  PartyPopper,
  Shield,
  MessageSquare,
} from "lucide-react";
import SpotlightCard from "./ui/SpotlightCard";

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  {
    icon: Sparkles,
    title: "Maximum Sarcasm",
    description:
      "Engineered with zero chill. Advanced dry humor that roasts your server into submission with surgical emotional precision.",
    span: true,
    spotlightColor: "rgba(88, 101, 242, 0.18)",
    iconColor: "text-ds-blurple",
  },
  {
    icon: Gamepad2,
    title: "Classic Arcade",
    description:
      "RPS, Tic-Tac-Toe, and Connect4 embedded right in chat. Zero lag, high stakes.",
    spotlightColor: "rgba(254, 231, 92, 0.18)",
    iconColor: "text-ds-yellow",
  },
  {
    icon: PartyPopper,
    title: "Party Utilities",
    description:
      "Truth or Dare, Never Have I Ever, and trivia engines designed to violently kill quiet text channels.",
    spotlightColor: "rgba(235, 69, 158, 0.18)",
    iconColor: "text-ds-fuchsia",
  },
  {
    icon: Shield,
    title: "Battle-Tested",
    description:
      "Enterprise uptime architecture. Sub-second response times, zero ghosting, and bulletproof uptime.",
    spotlightColor: "rgba(87, 242, 135, 0.18)",
    iconColor: "text-ds-green",
  },
  {
    icon: MessageSquare,
    title: "Dynamic Banter",
    description:
      "Context-aware comebacks that analyze ongoing threads and deliver perfectly timed chaos.",
    span: true,
    spotlightColor: "rgba(237, 66, 69, 0.18)",
    iconColor: "text-ds-red",
  },
];

export default function Capabilities() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        ".capabilities-header",
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

      // Cards staggered reveal
      gsap.fromTo(
        ".bento-card-animate",
        { y: 55, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.85,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".capabilities-grid",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-16 md:py-24 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="capabilities-header max-w-3xl mx-auto text-center mb-10 md:mb-14">
          <h2 className="font-body text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-ds-text leading-[1.15] mb-4">
            Built for Chaos &amp;{" "}
            <span className="block sm:inline">
              <span className="text-gradient">Zero Chill</span>
            </span>
          </h2>
          <p className="text-ds-muted text-base sm:text-lg max-w-xl mx-auto font-sans leading-relaxed">
            Engineered with raw computational superiority, sharp comedic timing, and zero tolerance for small talk.
          </p>
        </div>

        <div className="capabilities-grid grid grid-cols-1 md:grid-cols-3 gap-6">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <SpotlightCard
                key={cap.title}
                data-cursor="link"
                className={`bento-card-animate custom-card flex flex-col gap-6 items-start ${
                  cap.span ? "md:col-span-2 md:flex-row" : "md:gap-4"
                }`}
                spotlightColor={cap.spotlightColor}
              >
                <div
                  className={`p-3 bg-ds-bg border-2 border-ds-border select-none mb-2 ${cap.iconColor}`}
                >
                  <Icon className="w-8 h-8" aria-hidden="true" />
                </div>
                <div className={cap.span ? "flex-1" : undefined}>
                  <h3 className="font-body text-xl font-bold tracking-tight text-ds-text mb-1.5">
                    {cap.title}
                  </h3>
                  <p className="text-ds-muted text-sm leading-relaxed font-medium">
                    {cap.description}
                  </p>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
