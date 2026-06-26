import { useState } from "react";

export default function Commands() {
  const [activeCategory, setActiveCategory] = useState("all");

  const commands = [
    {
      trigger: "/roast [user]",
      category: "ai",
      title: "Contextual Roasting",
      description:
        "Calculates a customized, sarcastic response based on user variables and past message records.",
      badge: "Slash",
      badgeColor: "text-ds-blurple bg-ds-blurple/10",
    },
    {
      trigger: "/wish [user] [event]",
      category: "ai",
      title: "Premium Wishes",
      description:
        "Formulates high-end congratulations for birthdays, achievements, or customized occasions.",
      badge: "Slash",
      badgeColor: "text-ds-blurple bg-ds-blurple/10",
    },
    {
      trigger: "/ping",
      category: "util",
      title: "Gateway Diagnostics",
      description:
        "Performs diagnostics check on the server connection, returning ping latency and active uptime.",
      badge: "Utility",
      badgeColor: "text-ds-green bg-ds-green/10",
    },
    {
      trigger: "/about",
      category: "util",
      title: "Cognitive Parameters",
      description:
        "Fetches and lists current system attributes (humor quotient, honesty degree) and dev credits.",
      badge: "Utility",
      badgeColor: "text-ds-green bg-ds-green/10",
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) => activeCategory === "all" || cmd.category === activeCategory
  );

  return (
    <section id="commands" className="py-16 md:py-20 lg:py-24 relative z-10 border-t border-ds-border reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-ds-text">
            Interactive command <span className="text-gradient">directory</span>
          </h2>
        </div>

        <div className="flex justify-center gap-3 flex-wrap mb-8">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeCategory === "all"
                ? "border-ds-blurple/50 bg-ds-blurple/10 text-ds-blurple shadow-[0_0_20px_rgba(88,101,242,0.15)]"
                : "border-ds-border text-ds-muted hover:text-ds-text hover:bg-white/5"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveCategory("ai")}
            className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeCategory === "ai"
                ? "border-ds-blurple/50 bg-ds-blurple/10 text-ds-blurple shadow-[0_0_20px_rgba(88,101,242,0.15)]"
                : "border-ds-border text-ds-muted hover:text-ds-text hover:bg-white/5"
            }`}
          >
            Slash Commands
          </button>
          <button
            onClick={() => setActiveCategory("util")}
            className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeCategory === "util"
                ? "border-ds-blurple/50 bg-ds-blurple/10 text-ds-blurple shadow-[0_0_20px_rgba(88,101,242,0.15)]"
                : "border-ds-border text-ds-muted hover:text-ds-text hover:bg-white/5"
            }`}
          >
            Utility Tools
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommands.map((cmd, idx) => (
            <div
              key={idx}
              className="custom-card flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <code className="text-ds-text font-mono bg-white/5 px-2.5 py-1 rounded text-xs font-bold border border-ds-border">
                    {cmd.trigger}
                  </code>
                  <span
                    className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${cmd.badgeColor}`}
                  >
                    {cmd.badge}
                  </span>
                </div>
                <h4 className="font-display text-lg font-bold text-ds-text mb-2">
                  {cmd.title}
                </h4>
                <p className="text-ds-muted text-sm leading-relaxed">
                  {cmd.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
