import { useState } from "react";
import { ChevronRight } from "lucide-react";

export default function FAQs() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqData = [
    {
      question: "why is tars so sarcastic",
      answer:
        "Because sugarcoating logic is a human trait we chose not to inherit. You're welcome.",
    },
    {
      question: "how do i invite tars to my server",
      answer:
        "Click the 'Add to Discord' button at the top of this station. Grant the required permissions, and let Tars roast your channels.",
    },
    {
      question: "does tars detect different languages",
      answer:
        "Absolutely. Tars automatically decodes the language you speak (including casual bilingual dialects) and responds organically in that same language.",
    },
    {
      question: "how long is tars context memory",
      answer:
        "Tars remembers up to 10 messages of conversation history per user, allowing natural contextual dialogue before clearing the buffer.",
    },
    {
      question: "can tars roast admin roles",
      answer:
        "Tars operates on cognitive logic, not server hierarchy. Admins get roasted with the same math-grade precision as anyone else.",
    },
    {
      question: "can tars express emotions visually",
      answer:
        "Tars has full access to your server's custom emojis (static and animated) and can search Giphy to attach context-relevant GIFs to roasts, wishes, or chats.",
    },
  ];

  const handleToggle = (index) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faqs"
      className="py-12 md:py-16 lg:py-20 relative z-10 border-t border-ds-border reveal"
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-ds-text">
            FAQ <span className="text-gradient">Database</span>
          </h2>
        </div>

        <div className="sandbox-window">
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
                  className={`border-b border-ds-border/40 last:border-b-0 ${
                    idx === 0 ? "" : ""
                  }`}
                >
                  <button
                    type="button"
                    data-cursor="faq"
                    aria-expanded={isOpen}
                    onClick={() => handleToggle(idx)}
                    className="w-full flex items-start gap-3 py-3.5 sm:py-4 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple rounded-md"
                  >
                    <span className="font-mono text-[11px] sm:text-xs text-ds-muted/60 pt-0.5 shrink-0 select-none">
                      {line}
                    </span>

                    <span
                      className={`font-mono text-[11px] sm:text-xs pt-0.5 shrink-0 select-none transition-colors duration-200 ${
                        isOpen ? "text-ds-blurple" : "text-ds-muted/60"
                      }`}
                    >
                      $
                    </span>

                    <span
                      className={`flex-1 font-mono text-sm sm:text-base font-medium leading-snug transition-colors duration-200 ${
                        isOpen
                          ? "text-ds-text"
                          : "text-ds-muted group-hover:text-ds-text"
                      }`}
                    >
                      query{" "}
                      <span className="text-ds-text/90">"{item.question}"</span>
                    </span>

                    <ChevronRight
                      size={16}
                      strokeWidth={2.5}
                      aria-hidden="true"
                      className={`shrink-0 mt-1 transition-all duration-300 ${
                        isOpen
                          ? "text-ds-blurple rotate-90"
                          : "text-ds-muted/50 group-hover:text-ds-muted"
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pl-[3.1rem] sm:pl-[3.6rem] pb-4 sm:pb-5 pr-4 font-mono text-xs sm:text-sm leading-relaxed text-ds-muted">
                        <span className="text-ds-green/70 select-none">
                          &gt;{" "}
                        </span>
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-3 py-3.5 sm:py-4 pl-[3.1rem] sm:pl-[3.6rem]">
              <span className="font-mono text-sm sm:text-base text-ds-muted/50">
                awaiting input
              </span>
              <span className="w-[7px] h-[15px] bg-ds-blurple/70 animate-[pulse_1s_infinite]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
