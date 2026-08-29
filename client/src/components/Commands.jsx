import { useState } from "react";

const commands = [
  {
    trigger: "/tod",
    category: "games",
    title: "Truth or Dare",
    description: "Play Truth or Dare.",
    badge: "Games",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/wyr",
    category: "games",
    title: "Would You Rather",
    description: "Play Would You Rather.",
    badge: "Games",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/nhie",
    category: "games",
    title: "Never Have I Ever",
    description: "Play Never Have I Ever.",
    badge: "Games",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/flip",
    category: "games",
    title: "Coin Flip",
    description: "Flip a coin.",
    badge: "Games",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/roll",
    category: "games",
    title: "Dice Roll",
    description: "Roll a dice.",
    badge: "Games",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/rps",
    category: "games",
    title: "Rock, Paper, Scissors",
    description: "Play Rock, Paper, Scissors.",
    badge: "Games",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/ttt",
    category: "games",
    title: "Tic-Tac-Toe",
    description: "Play Tic-Tac-Toe.",
    badge: "Games",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/iq",
    category: "fun",
    title: "IQ Calculator",
    description: "Calculate a user's IQ score.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/gay",
    category: "fun",
    title: "Gay Calculator",
    description: "Calculate how gay a user is.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/lesbian",
    category: "fun",
    title: "Lesbian Calculator",
    description: "Calculate how lesbian a user is.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/bitches",
    category: "fun",
    title: "Bitches Calculator",
    description: "Calculate how many bitches a user has.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/simp",
    category: "fun",
    title: "Simp Calculator",
    description: "Calculate how simp a user is.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/autism",
    category: "fun",
    title: "Autism Calculator",
    description: "Calculate how autism a user is.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/pp",
    category: "fun",
    title: "PP Size Calculator",
    description: "Check a user's pp size.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/roast",
    category: "fun",
    title: "Sarcastic Roasting",
    description: "Roast a user.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/wish",
    category: "fun",
    title: "Premium Wishes",
    description: "Send a wish message.",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/meme",
    category: "fun",
    title: "Dank Memes",
    description: "Display a trending meme from Reddit!",
    badge: "Fun",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/smoke",
    category: "actions",
    title: "Smoke",
    description: "Take a hit of smoke.",
    badge: "Actions",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/vape",
    category: "actions",
    title: "Vape",
    description: "Hit the vape.",
    badge: "Actions",
    badgeColor: "text-ds-blurple bg-ds-blurple/10",
  },
  {
    trigger: "/prefix",
    category: "util",
    title: "Prefix",
    description: "View or change command prefix.",
    badge: "Utility",
    badgeColor: "text-ds-green bg-ds-green/10",
  },
  {
    trigger: "/ping",
    category: "util",
    title: "Ping",
    description: "Check bot latency.",
    badge: "Utility",
    badgeColor: "text-ds-green bg-ds-green/10",
  },
  {
    trigger: "/serverinfo",
    category: "util",
    title: "Server Info",
    description: "Gets information about the server.",
    badge: "Utility",
    badgeColor: "text-ds-green bg-ds-green/10",
  },
  {
    trigger: "/userinfo",
    category: "util",
    title: "User Info",
    description: "Gets information about a user.",
    badge: "Utility",
    badgeColor: "text-ds-green bg-ds-green/10",
  },
  {
    trigger: "/avatar",
    category: "util",
    title: "Avatar",
    description: "View a user's avatar.",
    badge: "Utility",
    badgeColor: "text-ds-green bg-ds-green/10",
  },
  {
    trigger: "/about",
    category: "util",
    title: "About",
    description: "View information about the bot.",
    badge: "Utility",
    badgeColor: "text-ds-green bg-ds-green/10",
  },
  {
    trigger: "/help",
    category: "util",
    title: "Help",
    description: "View command list or help.",
    badge: "Utility",
    badgeColor: "text-ds-green bg-ds-green/10",
  },
];

const categories = [
  { value: "all", label: "All" },
  { value: "games", label: "Games" },
  { value: "fun", label: "Fun" },
  { value: "actions", label: "Actions" },
  { value: "util", label: "Tools" },
];

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
