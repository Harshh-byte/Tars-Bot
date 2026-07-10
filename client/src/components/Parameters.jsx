import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import gsap from "gsap";
import SpotlightCard from "./ui/SpotlightCard";

export default function Parameters() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  useEffect(() => {
    if (isInView) {
      gsap.fromTo(
        ".param-card-animate",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power2.out" }
      );
    }
  }, [isInView]);

  const params = [
    {
      name: "Honesty",
      val: 90,
      color: "#d05b00",
      desc: "Brutally honest. Zero fluff or fake affirmations.",
    },
    {
      name: "Humor",
      val: 75,
      color: "#0077aa",
      desc: "Sarcastic, dry, and sharp responses.",
    },
    {
      name: "Discretion",
      val: 10,
      color: "#ff3333",
      desc: "Will hold absolutely nothing back if provoked.",
    },
  ];

  return (
    <section
      id="parameters"
      ref={containerRef}
      className="py-8 md:py-10 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-6 md:mb-8">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-ds-text leading-tight mb-4">
            Cognitive Tuning
          </h2>
          <p className="text-ds-muted text-base md:text-lg leading-relaxed max-w-xl font-medium">
            The precise internal weights injected into TARS' logic prompts.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {params.map((param, index) => (
            <SpotlightCard
              key={index}
              className="param-card-animate custom-card flex flex-col gap-5"
              spotlightColor="var(--accent-glow)"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display text-xl sm:text-2xl font-black text-ds-text">
                  {param.name}
                </span>
                <span
                  className="font-mono text-2xl sm:text-3xl font-bold"
                  style={{ color: param.color }}
                >
                  {param.val}%
                </span>
              </div>

              <div className="w-full h-4 bg-ds-bg border-2 border-ds-border rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: param.color }}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${param.val}%` } : { width: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.15 }}
                />
              </div>

              <p className="text-ds-muted text-sm font-medium leading-relaxed">
                {param.desc}
              </p>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
