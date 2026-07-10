import { useEffect, useState, useRef } from "react";

export default function DecryptedText({
  text = "",
  speed = 50,
  maxIterations = 10,
  sequential = false,
  className = "",
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+{}[]|;:,.<>?",
  animateOn = "view", // "view" | "hover"
}) {
  const [displayText, setDisplayText] = useState(text);
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (animateOn !== "view") return;

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
  }, [animateOn]);

  const startAnimation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    let iteration = 0;
    const textLength = text.length;

    intervalRef.current = setInterval(() => {
      setDisplayText(() => {
        return text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            
            if (sequential) {
              if (index < iteration / maxIterations) {
                return char;
              }
            } else {
              if (iteration >= maxIterations) {
                return char;
              }
            }
            
            if (Math.random() < 0.25) {
              return char;
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("");
      });

      iteration++;
      if (iteration >= maxIterations * (sequential ? textLength : 1) + 2) {
        clearInterval(intervalRef.current);
        setDisplayText(text);
      }
    }, speed);
  };

  useEffect(() => {
    if (animateOn === "view" && inView) {
      startAnimation();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [inView, text, animateOn]);

  const handleMouseEnter = () => {
    if (animateOn === "hover") {
      startAnimation();
    }
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className={`inline-block font-mono ${className}`}
    >
      {displayText}
    </span>
  );
}
