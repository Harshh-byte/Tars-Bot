export default function Capabilities() {
  return (
    <section id="features" className="py-12 md:py-16 lg:py-20 relative z-10 border-t border-ds-border reveal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-ds-text">
            Sarcasm isn't a feature. <br className="hidden md:inline" />It's a core parameter.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          
          <div className="custom-card relative overflow-hidden group">
            <h3 className="font-display text-xl font-bold text-ds-text">
              Devastating Roasts
            </h3>
            <div className="w-8 h-[2.5px] bg-ds-blurple/35 my-4 transition-all duration-300 group-hover:w-16 group-hover:bg-ds-blurple"></div>
            <p className="text-ds-muted text-sm leading-relaxed">
              Tars uses contextual analysis to roast user statements. No generic replies—only sharp, customized one-liners.
            </p>
          </div>

          <div className="custom-card relative overflow-hidden group">
            <h3 className="font-display text-xl font-bold text-ds-text">
              Premium Greetings
            </h3>
            <div className="w-8 h-[2.5px] bg-ds-blurple/35 my-4 transition-all duration-300 group-hover:w-16 group-hover:bg-ds-blurple"></div>
            <p className="text-ds-muted text-sm leading-relaxed">
              Generate smooth, celebratory wishes for birthdays or special achievements. Keeps server members feeling values.
            </p>
          </div>

          <div className="custom-card relative overflow-hidden group">
            <h3 className="font-display text-xl font-bold text-ds-text">
              Auto Detection
            </h3>
            <div className="w-8 h-[2.5px] bg-ds-blurple/35 my-4 transition-all duration-300 group-hover:w-16 group-hover:bg-ds-blurple"></div>
            <p className="text-ds-muted text-sm leading-relaxed">
              Automatically detects and responds in the same language, adapting organically to local colloquial patterns.
            </p>
          </div>

          <div className="custom-card relative overflow-hidden group">
            <h3 className="font-display text-xl font-bold text-ds-text">
              Context Memory
            </h3>
            <div className="w-8 h-[2.5px] bg-ds-blurple/35 my-4 transition-all duration-300 group-hover:w-16 group-hover:bg-ds-blurple"></div>
            <p className="text-ds-muted text-sm leading-relaxed">
              Tars holds context histories up to 10 messages, allowing threads to continue logically and adaptively over time.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
