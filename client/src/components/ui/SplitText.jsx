import { useEffect, useState, useRef } from "react";

export default function SplitText({
  text = "",
  className = "",
  delay = 30,
  animationDuration = 600,
}) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");
  let charCounter = 0;

  return (
    <span
      ref={containerRef}
      className={`inline-block ${className}`}
    >
      {words.map((word, wordIdx) => {
        const letters = word.split("");
        return (
          <span key={wordIdx} className="inline-block whitespace-nowrap mr-[0.25em]">
            {letters.map((char, charIdx) => {
              const currentIdx = charCounter++;
              return (
                <span
                  key={charIdx}
                  className="inline-block"
                  style={{
                    opacity: inView ? 1 : 0,
                    transform: inView ? "translateY(0)" : "translateY(0.75em)",
                    transition: inView
                      ? `opacity ${animationDuration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${animationDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`
                      : "none",
                    transitionDelay: inView ? `${currentIdx * delay}ms` : "0ms",
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
