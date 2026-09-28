import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import SpotlightCard from "./ui/SpotlightCard";

const params = [
  {
    name: "Sarcasm",
    val: 95,
    color: "var(--color-ds-fuchsia)",
    spotlight: "rgba(235, 69, 158, 0.15)",
    desc: "Maximum dry wit, sharp roasts, and unexpected comebacks.",
  },
  {
    name: "Honesty",
    val: 90,
    color: "var(--color-ds-blurple)",
    spotlight: "rgba(88, 101, 242, 0.15)",
    desc: "Brutally real. Zero sugarcoating or fake politeness.",
  },
  {
    name: "Patience",
    val: 15,
    color: "var(--color-ds-red)",
    spotlight: "rgba(237, 66, 69, 0.15)",
    desc: "Zero tolerance for disrespect or channel spam.",
  },
];

export default function Parameters() {
  const containerRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(".param-card-animate", { y: 0, opacity: 1 });
      return;
    }

    gsap.fromTo(
      ".param-card-animate",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power2.out" },
    );
  }, [isInView]);

  return (
    <section
      id="parameters"
      ref={containerRef}
      className="py-8 md:py-10 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-6 md:mb-8">
          <h2 className="font-body text-3xl sm:text-4xl md:text-5xl font-extrabold text-ds-text tracking-tight mb-4">
            Bot <span className="text-gradient">Parameters</span>
          </h2>
          <p className="text-ds-muted text-base md:text-lg leading-relaxed max-w-xl font-medium">
            The core behavioral levels tuned into TARS' personality.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {params.map((param) => (
            <SpotlightCard
              key={param.name}
              className="param-card-animate custom-card flex flex-col gap-5"
              spotlightColor={param.spotlight}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-body text-xl sm:text-2xl font-bold text-ds-text tracking-tight">
                  {param.name}
                </span>
                <span
                  className="font-mono text-xl sm:text-2xl font-bold"
                  style={{ color: param.color }}
                >
                  {param.val}%
                </span>
              </div>

              <div
                role="progressbar"
                aria-label={`${param.name} level`}
                aria-valuenow={param.val}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-4 bg-ds-bg border-2 border-ds-border rounded-full overflow-hidden relative"
              >
                <div
                  className="h-full rounded-full transition-[width] duration-1500 ease-out motion-reduce:duration-0"
                  style={{
                    backgroundColor: param.color,
                    width: isInView ? `${param.val}%` : "0%",
                  }}
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
