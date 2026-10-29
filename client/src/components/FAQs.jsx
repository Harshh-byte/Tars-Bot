import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronRight } from "lucide-react";
import { faqData } from "../data/faqs";

gsap.registerPlugin(ScrollTrigger);

export default function FAQs() {
  const [activeIndex, setActiveIndex] = useState(null);
  const sectionRef = useRef(null);

  const handleToggle = (index) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faqs-header",
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
        ".faqs-window-animate",
        { y: 50, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.95,
          delay: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="faqs"
      ref={sectionRef}
      className="py-16 md:py-24 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="faqs-header text-center mb-10 md:mb-14">
          <h2 className="font-body text-3xl sm:text-4xl md:text-5xl font-extrabold text-ds-text tracking-tight">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-ds-muted text-sm sm:text-base mt-3 font-sans">
            Got queries? We have answers. And sarcastic remarks.
          </p>
        </div>

        <div className="sandbox-window faqs-window-animate">
          <div className="sandbox-header flex items-center gap-2 px-5 py-3.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--color-ds-red)" }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--color-ds-yellow)" }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--color-ds-green)" }}
            />
            <span className="ml-3 font-mono text-[11px] text-ds-muted tracking-wide">
              tars@faq — session
            </span>
          </div>

          <div className="px-3 py-2 sm:px-5 sm:py-3">
            {faqData.map((item, idx) => {
              const isOpen = activeIndex === idx;
              const line = String(idx + 1).padStart(2, "0");

              return (
                <div
                  key={idx}
                  className="border-b border-ds-border/40 last:border-b-0"
                >
                  <button
                    type="button"
                    data-cursor="faq"
                    aria-expanded={isOpen}
                    onClick={() => handleToggle(idx)}
                    className="w-full flex items-start gap-3 py-3.5 sm:py-4 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple rounded-md"
                  >
                    <span className="font-mono text-xs text-ds-muted pt-0.5 select-none w-5">
                      {line}
                    </span>
                    <span className="font-body font-bold text-sm sm:text-base text-ds-text flex-1 group-hover:text-ds-blurple transition-colors">
                      {item.q}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 text-ds-muted transition-transform duration-200 mt-1 shrink-0 ${
                        isOpen ? "rotate-90 text-ds-blurple" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="font-body text-xs sm:text-sm text-ds-muted pb-4 pl-8 pr-2 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
