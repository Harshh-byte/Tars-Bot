import { useState } from "react";

export default function FAQs() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqData = [
    {
      question: "Why is Tars so sarcastic?",
      answer: "Because sugarcoating logic is a human trait we chose not to inherit. You're welcome."
    },
    {
      question: "How do I invite Tars to my server?",
      answer: "Click the 'Add to Discord' button at the top of this station. Grant the required permissions, and let Tars roast your channels."
    },
    {
      question: "Does Tars detect different languages?",
      answer: "Absolutely. Tars automatically decodes the language you speak (including casual bilingual dialects) and responds organically in that same language."
    },
    {
      question: "How long is Tars' context memory?",
      answer: "Tars remembers up to 10 messages of conversation history per user, allowing natural contextual dialogue before clearing the buffer."
    },
    {
      question: "Can Tars roast admin roles?",
      answer: "Tars operates on cognitive logic, not server hierarchy. Admins get roasted with the same math-grade precision as anyone else."
    },
    {
      question: "Can Tars express emotions visually?",
      answer: "Tars has full access to your server's custom emojis (static and animated) and can search Giphy to attach context-relevant GIFs to roasts, wishes, or chats."
    }
  ];

  const handleToggle = (index) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faqs" className="py-12 md:py-16 lg:py-20 relative z-10 border-t border-ds-border bg-white/0.1 reveal">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-ds-text">
            FAQ <span className="text-gradient">Database</span>
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqData.map((item, idx) => {
            const isOpen = activeIndex === idx;
            return (
              <div
                key={idx}
                className="custom-card flex flex-col cursor-pointer transition-all duration-300 select-none"
                onClick={() => handleToggle(idx)}
              >
                <div className="flex justify-between items-center gap-4">
                  <h3 className={`font-display text-base md:text-lg font-bold transition-colors duration-300 ${
                    isOpen ? "text-ds-blurple" : "text-ds-text"
                  }`}>
                    {item.question}
                  </h3>
                  <div className="shrink-0 w-8 h-8 rounded-full border border-ds-border flex items-center justify-center bg-ds-card/50 transition-all duration-300 group-hover:border-ds-text">
                    <svg
                      className={`w-4 h-4 text-ds-text transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-ds-blurple" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>

                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isOpen ? "max-h-48 opacity-100 mt-4" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-ds-muted text-xs md:text-sm leading-relaxed font-mono font-medium pt-2 border-t border-ds-border/40">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
