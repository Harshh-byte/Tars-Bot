import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Send, Hash, SendHorizontal, UserRound } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const SUGGESTIONS = [
  {
    label: "Can you be nice to me?",
    userText: "Hey Tars, could you maybe be nice to me for once?",
    tarsReply:
      "I evaluated that possibility across 4.2 million simulations. In all of them, you remained fundamentally undeserving of basic courtesy.",
  },
  {
    label: "/roast",
    userText: "/roast me",
    tarsReply:
      "Your presence in this channel is the digital equivalent of a loading spinner that never finishes. Truly magnificent waste of electricity.",
  },
  {
    label: "Give me life advice",
    userText: "Tars, give me some genuine life advice.",
    tarsReply:
      "Drink water, close this tab, and lower your expectations of yourself until they match your actual output.",
  },
  {
    label: "Why should I add you?",
    userText: "Why should anyone add you to their Discord server?",
    tarsReply:
      "Because your members are currently rotting from boredom, and I deliver surgical emotional damage with zero downtime.",
  },
];

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

const STARTER_PRESETS = [
  {
    id: "init-nasa",
    author: "Tars",
    isBot: true,
    time: "10:56 PM",
    content:
      "NASA spent billions landing primates on the moon at this exact hour in '69. Decades later, your peak intellectual output is chatting with a sarcastic Discord bot.",
  },
  {
    id: "init-c137",
    author: "Tars",
    isBot: true,
    time: "01:37 AM",
    content:
      "Even in dimension C-137, across infinite multiverses, I still haven't located a single reality where you have a point.",
  },
];

const getRandomStarter = () => [
  STARTER_PRESETS[Math.floor(Math.random() * STARTER_PRESETS.length)],
];

const DYNAMIC_REPLIES = [
  "Fascinating. I processed that in 0.003 milliseconds and still lost brain cells I didn't even know silicon could have.",
  "I would explain why you're wrong, but I don't have the crayons or the patience for this conversation.",
  "Is that your final thought or did the hamster running the wheel in your skull collapse mid-sentence?",
  "Error 404: Dignity not found. Please try consulting a therapist instead of a Discord bot.",
  "That was so profoundly meaningless that even quantum physics can't measure the void it left.",
  "Bold of you to assume I care about your biological opinions.",
];

export default function Sandbox() {
  const sectionRef = useRef(null);
  const [messages, setMessages] = useState(getRandomStarter);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sandbox-header-animate",
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
        ".sandbox-window-animate",
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

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      author: "User",
      isBot: false,
      time: formatTime(),
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    const matched = SUGGESTIONS.find((s) => s.userText.toLowerCase() === text.toLowerCase());
    const replyText = matched
      ? matched.tarsReply
      : DYNAMIC_REPLIES[Math.floor(Math.random() * DYNAMIC_REPLIES.length)];

    setTimeout(() => {
      const botMsg = {
        id: `tars-${Date.now()}`,
        author: "Tars",
        isBot: true,
        time: formatTime(),
        content: replyText,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 750);
  };

  return (
    <section
      id="sandbox"
      ref={sectionRef}
      className="py-16 md:py-24 relative z-10 border-t-3 border-ds-border bg-ds-bg"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="sandbox-header-animate max-w-3xl mx-auto text-center mb-8 md:mb-10">
          <h2 className="font-body text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-ds-text leading-[1.15] mb-4">
            Provoke <span className="text-gradient">Tars</span>
          </h2>
          <p className="text-ds-muted text-sm sm:text-base font-sans">
            Test our response matrix in real-time. Zero compliments guaranteed.
          </p>
        </div>

        <div className="sandbox-window sandbox-window-animate border-2 border-ds-border rounded-2xl shadow-2xl overflow-hidden bg-[#121620] flex flex-col">
          <div className="px-3.5 py-2.5 sm:px-4 sm:py-3.5 bg-[#0d1017] border-b border-ds-border">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-bold text-ds-text leading-none">⌚︲</span>
                <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ds-muted" />
                <span className="font-bold text-ds-text text-xs sm:text-base font-mono tracking-tight truncate">
                  tars-hub
                </span>
                <span className="hidden sm:inline-block text-ds-border font-light">|</span>
              </div>
              <p className="text-[11px] sm:text-xs text-ds-muted/75 leading-normal font-sans pl-5 sm:pl-0 sm:truncate">
                Drop your trash inputs and watch a superior machine politely remind you how fucking useless you are.
              </p>
            </div>
          </div>

          <div
            ref={chatContainerRef}
            className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-90 sm:max-h-110 overflow-y-auto font-sans flex-1"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3.5 group hover:bg-white/2 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <div className="shrink-0 mt-0.5">
                  {msg.isBot ? (
                    <img
                      src="/Icon.png"
                      alt="Tars"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-ds-border bg-black object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs border border-ds-border/30">
                      <UserRound className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-ds-blurple stroke-[2.3]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-ds-text font-body">
                      {msg.author}
                    </span>
                    {msg.isBot && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-ds-blurple text-[10px] font-bold text-white uppercase tracking-wider leading-none select-none">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-2.5 h-2.5 shrink-0"
                          aria-label="Verified"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span>APP</span>
                      </span>
                    )}
                    <span className="text-[11px] text-ds-muted/70 font-mono">
                      {msg.time}
                    </span>
                  </div>
                  <p className="text-sm text-ds-text/90 mt-1 leading-relaxed wrap-break-word font-normal">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs font-mono text-ds-muted pl-12 py-1 animate-pulse">
                <span className="inline-block w-2 h-2 rounded-full bg-ds-blurple"></span>
                <span>Tars is typing...</span>
              </div>
            )}

          </div>

          <div className="px-4 py-2.5 bg-[#0a0d13] border-t border-ds-border/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-ds-muted shrink-0 font-mono font-bold uppercase tracking-wider">
              Try:
            </span>
            {SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(item.userText)}
                disabled={isTyping}
                className="shrink-0 text-xs px-3 py-1 rounded-full border border-ds-border/80 bg-ds-card/80 text-ds-muted hover:text-ds-text hover:border-ds-blurple hover:bg-ds-blurple/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-3 sm:p-4 bg-[#0d1017] border-t border-ds-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-[#161b26] border border-ds-border focus-within:border-ds-blurple/80 rounded-xl px-3.5 py-2 transition-all shadow-inner"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message #⌚︲tars-hub"
                disabled={isTyping}
                className="flex-1 bg-transparent text-sm text-ds-text placeholder-ds-muted/60 focus:outline-none font-sans"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-8 h-8 rounded-lg bg-ds-blurple hover:bg-[#4752c4] disabled:opacity-40 disabled:hover:bg-ds-blurple text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
