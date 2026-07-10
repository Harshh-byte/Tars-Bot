import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Flame, Sliders, Gift } from "lucide-react";
import SpotlightCard from "./ui/SpotlightCard";

gsap.registerPlugin(ScrollTrigger);

export default function Capabilities() {
  useEffect(() => {
    gsap.fromTo(
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
      }
    );
  }, []);

  return (
    <section
      id="features"
      className="py-10 md:py-14 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-8 md:mb-10">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-ds-text leading-tight mb-4">
            Built for Menace & Wholesomeness
          </h2>
          <p className="text-ds-muted text-base md:text-lg leading-relaxed max-w-xl font-medium">
            Loaded with advanced cognitive parameters to adjust dynamically from supportive homie to verbal wrecking ball.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <SpotlightCard
            className="bento-card-animate md:col-span-2 custom-card flex flex-col md:flex-row gap-6 items-start"
            spotlightColor="var(--accent-glow)"
          >
            <div className="p-3 bg-ds-bg border-2 border-ds-border select-none text-ds-blurple mb-3 md:mb-0">
              <Brain className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-black text-ds-text uppercase mb-3.5 md:mb-2">
                Context Retention
              </h3>
              <p className="text-ds-muted text-sm leading-relaxed font-medium">
                Unlike simple reply bots, Tars maintains context up to 10 messages deep, naturally tracking the flow of conversations and remembering past roasts.
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard
            className="bento-card-animate custom-card flex flex-col gap-6 md:gap-4 items-start"
            spotlightColor="rgba(255, 51, 51, 0.15)"
          >
            <div className="p-3 bg-ds-bg border-2 border-ds-border select-none text-ds-red mb-1 md:mb-0">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-ds-text uppercase mb-3.5 md:mb-2">
                Savage Roasts
              </h3>
              <p className="text-ds-muted text-sm leading-relaxed font-medium">
                Proactive and reactive verbal execution. Will roast you or your targets in one line of absolute destruction if provoked.
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard
            className="bento-card-animate custom-card flex flex-col gap-6 md:gap-4 items-start"
            spotlightColor="rgba(255, 176, 0, 0.15)"
          >
            <div className="p-3 bg-ds-bg border-2 border-ds-border select-none text-ds-yellow mb-1 md:mb-0">
              <Sliders className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display text-xl font-black text-ds-text uppercase mb-3.5 md:mb-2">
                Tone Adjuster
              </h3>
              <p className="text-ds-muted text-sm leading-relaxed font-medium">
                Automatically adapts pronouns and personality tones based on specific roles in your server (e.g. <i>alpha-homie</i> or <i>smooth-dominant</i>).
              </p>
            </div>
          </SpotlightCard>

          <SpotlightCard
            className="bento-card-animate md:col-span-2 custom-card flex flex-col md:flex-row gap-6 items-start"
            spotlightColor="rgba(0, 119, 170, 0.15)"
          >
            <div className="p-3 bg-ds-bg border-2 border-ds-border select-none text-ds-fuchsia mb-3 md:mb-0">
              <Gift className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-black text-ds-text uppercase mb-3.5 md:mb-2">
                Premium Wishes
              </h3>
              <p className="text-ds-muted text-sm leading-relaxed font-medium">
                Need to congratulate a friend? Tars switches to "Smooth Alpha" mode—charming, cool, heartfelt, and memorable.
              </p>
            </div>
          </SpotlightCard>

        </div>
      </div>
    </section>
  );
}

