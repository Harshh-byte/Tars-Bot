import { useState, useMemo } from "react";
import { commands, categories } from "../data/commands";
import RubberSegment from "./ui/RubberSegment";

const BADGE_THEMES = {
  games: "text-ds-blurple bg-ds-blurple/10 border border-ds-blurple/25",
  fun: "text-ds-yellow bg-ds-yellow/10 border border-ds-yellow/25",
  actions: "text-ds-fuchsia bg-ds-fuchsia/10 border border-ds-fuchsia/25",
  util: "text-ds-green bg-ds-green/10 border border-ds-green/25",
};

export default function Commands() {
  const [activeCategory, setActiveCategory] = useState("games");

  const filteredCommands = commands.filter(
    (cmd) => cmd.category === activeCategory,
  );

  const segmentItems = useMemo(
    () => categories.map((cat) => ({ label: cat.label, value: cat.value })),
    [],
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

        <div className="flex justify-center mb-10 overflow-x-auto no-scrollbar py-2">
          <RubberSegment
            items={segmentItems}
            value={activeCategory}
            onChange={(val) => setActiveCategory(val)}
            trackColor="rgba(26, 32, 46, 0.7)"
            thumbColor="#5865F2"
            textColor="#94a3b8"
            activeTextColor="#ffffff"
            size="md"
            radius={999}
            inset={4}
            equalSlots={false}
            stretch={90}
            squash={4}
            speed={1.05}
            className="border border-ds-border backdrop-blur-md shadow-md"
            aria-label="Command categories"
          />
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
                    className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      BADGE_THEMES[cmd.category] || cmd.badgeColor
                    }`}
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

