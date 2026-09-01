import { useState } from "react";
import { commands, categories } from "../data/commands";

export default function Commands() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredCommands = commands.filter(
    (cmd) => activeCategory === "all" || cmd.category === activeCategory,
  );

  return (
    <section
      id="commands"
      className="py-16 md:py-20 lg:py-24 relative z-10 border-t border-ds-border reveal"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-body text-3xl sm:text-4xl md:text-5xl font-extrabold text-ds-text tracking-tight">
            Command <span className="text-gradient">Directory</span>
          </h2>
        </div>

        <div
          role="group"
          aria-label="Filter commands by category"
          className="flex justify-center gap-3 flex-wrap mb-8"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-blurple ${
                  isActive
                    ? "border-ds-blurple/50 bg-ds-blurple/10 text-ds-blurple shadow-[0_0_20px_rgba(88,101,242,0.15)]"
                    : "border-ds-border text-ds-muted hover:text-ds-text hover:bg-ds-border/60"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredCommands.map((cmd) => (
            <div
              key={cmd.trigger}
              className="custom-card flex flex-col justify-between p-4 sm:p-5 h-full"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <code className="text-ds-text font-mono bg-ds-border/50 px-2 py-0.5 rounded text-xs font-bold border border-ds-border">
                    {cmd.trigger}
                  </code>
                  <span
                    className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${cmd.badgeColor}`}
                  >
                    {cmd.badge}
                  </span>
                </div>
                <h3 className="font-body text-base font-bold text-ds-text mb-1">
                  {cmd.title}
                </h3>
                <p className="text-ds-muted text-xs sm:text-sm leading-relaxed">
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
