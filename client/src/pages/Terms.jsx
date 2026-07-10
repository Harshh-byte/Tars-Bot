import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import CustomCursor from "../components/CustomCursor";
import SEO from "../components/shared/SEO";

export default function Terms() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-ds-bg text-ds-text font-mono flex flex-col">
      <SEO title="Terms of Service" description="Rules, guidelines, and permitted usage policies for Tars Bot." />
      <header className="border-b-3 border-ds-border py-4 px-6 bg-ds-card/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/Icon.png"
                alt="Tars Logo"
                className="w-8 h-8 rounded-none bg-black border border-ds-text p-0.5"
              />
              <span className="font-display font-extrabold tracking-wider text-ds-text text-lg">
                Tars<span className="text-ds-blurple">.</span>
              </span>
            </Link>
            <div className="h-5 w-[2px] bg-ds-border/40" />
            <span className="text-xs sm:text-sm font-bold text-ds-muted tracking-wider">
              Terms of Service
            </span>
          </div>
          
          <Link
            to="/"
            className="text-xs font-bold text-ds-muted hover:text-ds-text transition-colors tracking-wider"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <header className="border-b-3 border-ds-border pb-6 mb-10">
          <h1 className="text-4xl sm:text-5xl font-display font-black uppercase text-gradient">
            Terms of Service
          </h1>
        </header>

        <div className="space-y-10 leading-relaxed text-base">
          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">01.</span> Acceptance of Terms
            </h2>
            <p className="text-ds-muted">
              By inviting Tars to your Discord server or using its commands, you
              agree to comply with this network license and all applicable
              boundaries set by the Discord Terms of Service. If you do not accept
              these policies, do not invite or execute the bot.
            </p>
          </section>

          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">02.</span> Permitted Usage
            </h2>
            <p className="text-ds-muted mb-4">
              Tars is designated for entertainment and moderation support. Users
              must not:
            </p>
            <ul className="list-none pl-4 space-y-2 text-sm">
              <li className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-ds-red shrink-0" />
                <span>Use the bot to scrape member IDs or execute cyber harassment</span>
              </li>
              <li className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-ds-red shrink-0" />
                <span>Flood commands to rate-limit server gateways</span>
              </li>
              <li className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-ds-red shrink-0" />
                <span>Attempt to decompile or inject malicious code into the bot framework</span>
              </li>
            </ul>
          </section>

          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">03.</span> Liability Boundaries
            </h2>
            <p className="text-ds-muted">
              TARS' responses are AI-synthesized and designed with a high level of
              sarcasm. The bot operators accept absolutely zero liability for any
              mental strain, severe roasts, or misunderstandings caused by TARS'
              automated sarcasm index. Use under server moderation oversight.
            </p>
          </section>

          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">04.</span> Termination
            </h2>
            <p className="text-ds-muted">
              We reserve the right to ban specific servers or individual user IDs
              agreements.
            </p>
          </section>

          <section className="pt-8 border-t border-ds-border/40 mt-8">
            <p className="text-sm font-medium text-ds-muted">Last Updated: July 2026</p>
          </section>
        </div>
      </main>
      <CustomCursor />
    </div>
  );
}
