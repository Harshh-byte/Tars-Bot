import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Flame, Sliders, Gift } from "lucide-react";
import SpotlightCard from "./ui/SpotlightCard";

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  {
    icon: Brain,
    title: "Context Retention",
    description:
      "Unlike simple reply bots, Tars maintains context up to 10 messages deep, naturally tracking the flow of conversations and remembering past roasts.",
    iconColor: "text-ds-blurple",
    spotlightColor: "var(--accent-glow)",
    span: true,
  },
  {
    icon: Flame,
    title: "Savage Roasts",
    description:
      "Proactive and reactive verbal execution. Will roast you or your targets in one line of absolute destruction if provoked.",
    iconColor: "text-ds-red",
    spotlightColor: "rgba(237, 66, 69, 0.15)",
    span: false,
  },
  {
    icon: Sliders,
    title: "Tone Adjuster",
    description: (
      <>
        Automatically adapts pronouns and personality tones based on specific
        roles in your server (e.g. <i>alpha-homie</i> or <i>smooth-dominant</i>
        ).
      </>
    ),
    iconColor: "text-ds-yellow",
    spotlightColor: "rgba(254, 231, 92, 0.15)",
    span: false,
  },
  {
    icon: Gift,
    title: "Premium Wishes",
    description:
      'Need to congratulate a friend? Tars switches to "Smooth Alpha" mode—charming, cool, heartfelt, and memorable.',
    iconColor: "text-ds-fuchsia",
    spotlightColor: "rgba(235, 69, 158, 0.15)",
    span: true,
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
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-ds-text leading-[1.15] mb-4">
            Built for Menace &amp;{" "}
            <span className="block sm:inline">Mischief</span>
          </h2>
          <p className="text-ds-muted text-base md:text-lg leading-relaxed max-w-xl font-medium">
            Loaded with advanced cognitive parameters to adjust dynamically from
            supportive homie to verbal wrecking ball.
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
                  <h3 className="font-display text-xl font-black text-ds-text uppercase mb-1">
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
