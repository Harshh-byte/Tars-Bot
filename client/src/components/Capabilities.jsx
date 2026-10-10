import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flame, PartyPopper, GamepadDirectional, Gift, MessagesSquare, ShieldCheck } from "lucide-react";
import SpotlightCard from "./ui/SpotlightCard";

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  {
    icon: Flame,
    title: "Adaptive Roasts",
    description:
      "Chill and witty by default. If provoked, Tars unleashes absolute verbal destruction with zero filter.",
    iconColor: "text-ds-red",
    spotlightColor: "rgba(237, 66, 69, 0.15)",
    span: false,
  },
  {
    icon: PartyPopper,
    title: "Party Games",
    description:
      "Host multiplayer mini-games, truth challenges, dilemma games, and instant chat showdowns.",
    iconColor: "text-cyan-400",
    spotlightColor: "rgba(34, 211, 238, 0.15)",
    span: false,
  },
  {
    icon: GamepadDirectional,
    title: "Entertainment",
    description:
      "Instant IQ checks, simp meters, size calculators, personality ratings, and fresh memes on demand.",
    iconColor: "text-ds-yellow",
    spotlightColor: "rgba(254, 231, 92, 0.15)",
    span: false,
  },
  {
    icon: Gift,
    title: "Smooth Wishes",
    description:
      'Switches to charming mode for birthdays & achievements.',
    iconColor: "text-ds-fuchsia",
    spotlightColor: "rgba(235, 69, 158, 0.15)",
    span: false,
  },
  {
    icon: MessagesSquare,
    title: "Chat Actions",
    description:
      "Expressive animated interactions and casual smoke actions to keep channel conversations active.",
    iconColor: "text-ds-green",
    spotlightColor: "rgba(87, 242, 135, 0.15)",
    span: false,
  },
  {
    icon: ShieldCheck,
    title: "Server Tools",
    description:
      "Inspect server & user stats, check avatars, and bulk purge channel spam in seconds.",
    iconColor: "text-ds-blurple",
    spotlightColor: "rgba(88, 101, 242, 0.15)",
    span: false,
  },
];

export default function Capabilities() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(".bento-card-animate", { y: 0, opacity: 1 });
      return;
    }

    const anim = gsap.fromTo(
      ".bento-card-animate",
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#features",
          start: "top 80%",
        },
      },
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  return (
    <section
      id="features"
      className="py-10 md:py-14 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-8 md:mb-10">
          <h2 className="font-body text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-ds-text leading-[1.15] mb-4">
            Built for Chaos &amp;{" "}
            <span className="block sm:inline">Zero Chill</span>
          </h2>
          <p className="text-ds-muted text-base md:text-lg leading-relaxed max-w-xl font-medium">
            Packed with savage responses, interactive party games, and just enough utility to keep the server alive.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
