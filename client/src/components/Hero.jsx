import { useState, useEffect, useRef } from "react";

function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !triggered) {
          setTriggered(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) observer.disconnect();
    };
  }, [triggered]);

  useEffect(() => {
    if (!triggered) return;
    let startTimestamp = null;
    const end = parseInt(target);
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [triggered, target, duration]);

  return [count, elementRef];
}

function useTypewriter(words, speed = 80, delay = 2500) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timer;

    if (isDeleting) {
      timer = setTimeout(() => {
        setText(currentWord.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, speed / 2.5);
    } else {
      timer = setTimeout(() => {
        setText(currentWord.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, speed);
    }

    if (!isDeleting && charIndex === currentWord.length) {
      clearTimeout(timer);
      timer = setTimeout(() => setIsDeleting(true), delay);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, wordIndex, words, speed, delay]);

  return text;
}

export default function Hero() {
  const words = [
    "Master Roaster.",
    "Savage Bot.",
    "Premium Wisher.",
    "Context Expert."
  ];
  
  const typewriterText = useTypewriter(words);
  const [versionVal, versionRef] = useCountUp(3);
  const [honestyVal, honestyRef] = useCountUp(90);
  const [humorVal, humorRef] = useCountUp(75);

  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width, height;
    let points = [];
    const spacing = 40;
    let mouse = { x: -1000, y: -1000 };
    let animationFrameId;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = canvas.width = rect.width;
      height = canvas.height = rect.height;
      points = [];
      for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
          points.push({ x, y, originX: x, originY: y });
        }
      }
    };
    
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener("mouseleave", onMouseLeave);

    const animateCanvas = () => {
      ctx.clearRect(0, 0, width, height);
      const computedStyle = getComputedStyle(document.documentElement);
      const dotColor =
        computedStyle.getPropertyValue("--grid-color").trim() ||
        computedStyle.getPropertyValue("--dot-color").trim() ||
        "rgba(15,23,42,0.1)";
      ctx.fillStyle = dotColor;

      points.forEach((p) => {
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 150) {
          let force = (150 - distance) / 150;
          p.x -= (dx / distance) * force * 5;
          p.y -= (dy / distance) * force * 5;
        }
        p.x += (p.originX - p.x) * 0.1;
        p.y += (p.originY - p.y) * 0.1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animateCanvas);
    };
    animateCanvas();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-28 md:pt-36 pb-12 md:pb-16 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          id="orb1"
          style={{
            transform: `translate(-25%, -25%) translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`,
          }}
          className="absolute top-10 left-10 w-[700px] h-[700px] bg-ds-blurple/10 rounded-full blur-[140px] transition-transform duration-300 ease-out"
        ></div>
        <div
          id="orb2"
          style={{
            transform: `translate(25%, 25%) translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)`,
          }}
          className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-ds-fuchsia/10 rounded-full blur-[120px] transition-transform duration-300 ease-out"
        ></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight uppercase mb-6 text-ds-text">
            Sarcasm <br className="hidden lg:inline" />
            <span className="text-outline">On Demand</span> <br className="hidden lg:inline" />
            For Discord
          </h1>

          <div className="flex items-center justify-center lg:justify-start mb-6 min-h-[1.5em] text-lg md:text-xl font-mono text-gradient font-bold uppercase tracking-wider">
            <span>{typewriterText}</span>
            <span className="w-[3px] h-[0.9em] bg-ds-blurple ml-2 animate-blink rounded-full"></span>
          </div>

          <p className="text-ds-muted text-base md:text-lg leading-relaxed max-w-xl mb-6 font-medium text-center lg:text-left mx-auto lg:mx-0">
            Tars is an AI companion designed with a personality. It monitors
            chats, delivers calculated sarcasm to roasters, and generates
            high-fidelity event wishes. Completely responsive and context-aware.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center lg:justify-start">
            <a
              href="https://discord.com/oauth2/authorize?client_id=1413246880954978417&permissions=274878286912&integration_type=0&scope=bot+applications.commands"
              className="btn-primary flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
              </svg>
              <span>Add to Discord</span>
            </a>
            <a
              href="https://discord.gg/GMJA3M5TWy"
              className="btn-secondary flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span>Support Server</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-6">
          <div
            ref={versionRef}
            className="custom-card flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div>              <h3 className="text-2xl font-display font-extrabold text-ds-text mt-1">
                Version
              </h3>
            </div>
            <span className="text-3xl font-mono text-ds-blurple font-bold uppercase tracking-wider">
              v{versionVal}.0
            </span>
          </div>

          <div
            ref={honestyRef}
            className="custom-card flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-2xl font-display font-extrabold text-ds-text mt-1">
                Brutal Logic
              </h3>
            </div>
            <span className="text-3xl font-mono text-ds-red font-bold">
              {honestyVal}%
            </span>
          </div>

          <div
            ref={humorRef}
            className="custom-card flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-2xl font-display font-extrabold text-ds-text mt-1">
                Sarcasm Index
              </h3>
            </div>
            <span className="text-3xl font-mono text-ds-fuchsia font-bold">
              {humorVal}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
