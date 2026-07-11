import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowUpRight,
  BadgeHelp,
  Terminal,
  CodeXml,
  Sun,
  Moon,
} from "lucide-react";

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const dotsRef = useRef([]);
  const [cursorMode, setCursorMode] = useState("dot");
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );
  const mouse = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const position = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const trackMouse = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    document.addEventListener("pointermove", trackMouse);
    let rafId;
    const follow = () => {
      position.current.x += (mouse.current.x - position.current.x) * 0.2;
      position.current.y += (mouse.current.y - position.current.y) * 0.2;

      if (cursorRef.current) {
        gsap.set(cursorRef.current, {
          x: position.current.x,
          y: position.current.y,
        });
      }
      rafId = requestAnimationFrame(follow);
    };

    rafId = requestAnimationFrame(follow);

    return () => {
      document.removeEventListener("pointermove", trackMouse);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    let currentMode = "dot";
    const detectCursor = (e) => {
      const element =
        e.target instanceof HTMLElement
          ? e.target.closest("[data-cursor]")
          : null;

      if (!element) {
        if (currentMode !== "dot") {
          currentMode = "dot";
          setCursorMode("dot");
        }
        return;
      }

      const type = element.dataset.cursor || "dot";
      if (type === currentMode) return;
      currentMode = type;
      if (type === "theme") {
        setIsDark(document.documentElement.classList.contains("dark"));
      }

      setCursorMode(type);
    };

    document.addEventListener("pointermove", detectCursor);

    return () => {
      document.removeEventListener("pointermove", detectCursor);
    };
  }, []);

  useEffect(() => {
    if (cursorMode === "typing" || cursorMode === "dot") return;
    const icon = cursorRef.current?.querySelector("svg");
    if (!icon) return;

    gsap.fromTo(
      icon,
      {
        opacity: 0,
        scale: 0.6,
        rotate: -15,
      },
      {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 0.18,
        ease: "back.out(2)",
      },
    );
  }, [cursorMode]);

  useEffect(() => {
    if (cursorMode !== "typing") return;
    const dots = dotsRef.current.filter(Boolean);
    if (!dots.length) return;
    const tl = gsap.timeline({ repeat: -1 });

    tl.to(dots, {
      y: -6,
      duration: 0.3,
      ease: "power1.inOut",
      stagger: {
        each: 0.12,
        yoyo: true,
        repeat: 1,
      },
    });

    return () => {
      tl.kill();
      gsap.set(dots, { y: 0 });
    };
  }, [cursorMode]);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const down = () => {
      gsap.to(cursor, {
        scale: 0.8,
        duration: 0.12,
        ease: "power2.out",
      });
    };
    const up = () => {
      gsap.to(cursor, {
        scale: 1,
        duration: 0.22,
        ease: "back.out(2)",
      });
    };

    document.addEventListener("mousedown", down);
    document.addEventListener("mouseup", up);

    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div id="tars-cursor" ref={cursorRef}>
      {cursorMode === "dot" && <span className="cursor-single-dot" />}

      {cursorMode === "typing" && (
        <div className="cursor-dots">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              ref={(el) => (dotsRef.current[i] = el)}
              className="tars-dot"
            />
          ))}
        </div>
      )}

      {cursorMode === "link" && (
        <ArrowUpRight size={20} strokeWidth={2.5} className="cursor-icon" />
      )}

      {cursorMode === "faq" && (
        <BadgeHelp size={20} strokeWidth={2.5} className="cursor-icon" />
      )}

      {cursorMode === "terminal" && (
        <Terminal size={20} strokeWidth={2.4} className="cursor-icon" />
      )}

      {cursorMode === "code" && (
        <CodeXml size={20} strokeWidth={2.4} className="cursor-icon" />
      )}

      {cursorMode === "theme" &&
        (isDark ? (
          <Moon size={20} strokeWidth={2.3} className="cursor-icon" />
        ) : (
          <Sun size={20} strokeWidth={2.3} className="cursor-icon" />
        ))}
    </div>
  );
}
