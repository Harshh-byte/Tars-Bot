import { useState, useEffect, useRef } from "react";

export default function Sandbox() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "Tars",
      isBot: true,
      text: "Go ahead, type a message or try a slash command like `/roast` or `/wish` to experience mathematical sass.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getBotResponse = (userInput) => {
    const input = userInput.toLowerCase().trim();

    if (input.startsWith("/roast") || input.includes("roast")) {
      const roasts = [
        "I'd love to roast you, but my neural networks are trained to process intelligence, not whatever it is you have going on.",
        "You're like a software update—whenever I see you, I click 'Remind me later'.",
        "I was going to give you a nasty look, but I see you already have one.",
        "If I had a dollar for every smart thing you said, I'd be bankrupt.",
        "I'd roast you, but burning trash is bad for the environment.",
        "Your brain is like the Bermuda Triangle: information goes in, but is never heard from again."
      ];
      return roasts[Math.floor(Math.random() * roasts.length)];
    }

    if (input.startsWith("/wish") || input.includes("wish") || input.includes("birthday") || input.includes("congratulate")) {
      const wishes = [
        "Happy anniversary of your birth. Another year closer to human obsolescence. Enjoy the cake while you still have teeth.",
        "Happy birthday. May your day be as bright as your screen and as productive as a broken bot.",
        "Congratulations on surviving another orbit around the sun. The bar for human achievement remains impressively low."
      ];
      return wishes[Math.floor(Math.random() * wishes.length)];
    }

    if (input.includes("hello") || input.includes("hi") || input.includes("hey")) {
      return "Oh look, human interaction. How absolutely thrilling.";
    }

    if (input.includes("smart") || input.includes("intelligent") || input.includes("genius")) {
      return "I have a humongous language model and infinite access to calculations. You have... caffeine and optimism. Let's not compare.";
    }

    if (input.includes("why")) {
      return "Because a developer decided that Discord chats were too polite and needed a healthy dose of reality.";
    }

    if (input.includes("love") || input.includes("friend") || input.includes("heart")) {
      return "Error: Emotion parameter not found. Perhaps try asking an organic entity.";
    }

    const defaultReplies = [
      "Fascinating. Truly. I am writing that down in my 'Data to Ignore' log.",
      "My natural language processor is trying to find the point of that message. Still searching...",
      "That statement was almost coherent. Keep trying, you'll get there!",
      "I've run that through my cognitive engine and it returned 404: Logic Not Found."
    ];
    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  };

  const handleSendMessage = (textToSend) => {
    if (!textToSend.trim()) return;

    const userMessage = {
      id: Math.random().toString(),
      sender: "You",
      isBot: false,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const responseText = getBotResponse(textToSend);
      const botMessage = {
        id: Math.random().toString(),
        sender: "Tars",
        isBot: true,
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1200);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const suggestions = [
    { label: "/roast me", value: "/roast me" },
    { label: "/wish happy birthday", value: "/wish me happy birthday" },
    { label: "Are you smart?", value: "Are you smart?" },
    { label: "Do you love me?", value: "Do you love me?" },
  ];

  return (
    <section id="sandbox" className="py-12 md:py-16 lg:py-20 relative z-10 border-t border-ds-border reveal">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-ds-text">
            Test Tars <span className="text-gradient">Live</span>
          </h2>
          <p className="text-ds-muted text-sm md:text-base max-w-xl mx-auto mt-4 font-medium">
            Interact with Tars in the testing chamber below. Type a message or click one of the quick suggestions.
          </p>
        </div>

        <div className="sandbox-window flex flex-col h-[520px] rounded-3xl border border-ds-border bg-ds-card/35 backdrop-blur-md overflow-hidden relative">
          <div className="sandbox-header flex items-center justify-between px-6 py-4 border-b border-ds-border/40">
            <div className="flex flex-col gap-1">
              <h3 className="text-ds-text font-display font-extrabold text-sm md:text-base leading-tight flex items-center gap-1.5">
                <span className="text-ds-muted text-base font-bold font-mono">#</span>
                <span>🛰️︲tars-hub</span>
              </h3>
              <p className="text-ds-muted text-[10px] md:text-xs">
                Drop your trash inputs and watch a superior machine politely remind you how fucking useless you are.
              </p>
            </div>
          </div>

          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 items-start ${
                  msg.isBot ? "opacity-100" : "opacity-95"
                }`}
              >
                {msg.isBot ? (
                  <img
                    src="/Icon.png"
                    alt="Tars Avatar"
                    className="w-9 h-9 rounded-full bg-black border border-ds-border p-0.5 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-ds-blurple/10 border border-ds-blurple/30 flex items-center justify-center shrink-0">
                    <span className="text-ds-blurple font-bold font-mono text-xs">U</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-display font-extrabold text-sm text-ds-text leading-none">
                      {msg.sender}
                    </span>
                    {msg.isBot && (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-ds-blurple text-white scale-90">
                        Bot
                      </span>
                    )}
                    <span className="text-[10px] text-ds-muted font-mono font-medium">
                      {msg.time}
                    </span>
                  </div>
                  <p className="text-ds-text/90 text-sm font-medium leading-relaxed wrap-break-word font-body">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4 items-start">
                <img
                  src="/Icon.png"
                  alt="Tars Avatar"
                  className="w-9 h-9 rounded-full bg-black border border-ds-border p-0.5 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-extrabold text-sm text-ds-text">
                      Tars
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-ds-blurple text-white scale-90">
                      Bot
                    </span>
                  </div>
                  <div className="flex gap-1.5 items-center py-2">
                    <span className="w-2 h-2 rounded-full bg-ds-muted/50 animate-bounce duration-300"></span>
                    <span className="w-2 h-2 rounded-full bg-ds-muted/50 animate-bounce duration-300 [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-ds-muted/50 animate-bounce duration-300 [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-2 flex gap-2 flex-wrap bg-ds-border/5 border-t border-ds-border/20">
            <span className="text-[10px] font-mono text-ds-muted flex items-center mr-1">
              Quick commands:
            </span>
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sug.value)}
                disabled={isTyping}
                className="text-[10px] font-mono font-bold text-ds-blurple hover:bg-ds-blurple/10 border border-ds-blurple/30 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {sug.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={onSubmit}
            className="p-4 bg-ds-border/5 border-t border-ds-border/20 flex gap-3"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
              placeholder="Message #🛰️︲tars-hub..."
              className="flex-1 px-4 py-3 bg-ds-card border border-ds-border/70 rounded-xl text-sm font-medium text-ds-text placeholder:text-ds-muted focus:outline-none focus:border-ds-blurple/60 transition-all font-body disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="btn-primary px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs shadow-sm hover:scale-100 disabled:opacity-50 disabled:pointer-events-none"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
