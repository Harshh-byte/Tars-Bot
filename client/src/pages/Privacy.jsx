import { useEffect } from "react";
import { Link } from "react-router-dom";
import CustomCursor from "../components/CustomCursor";
import SEO from "../components/shared/SEO";

export default function Privacy() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-ds-bg text-ds-text font-mono flex flex-col">
      <SEO title="Privacy Policy" description="How we handle your data and privacy parameters at Tars Bot." />
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
              Privacy Policy
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
            Privacy Policy
          </h1>
        </header>

        <div className="space-y-10 leading-relaxed text-base">
          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">01.</span> Data Collection
            </h2>
            <p className="text-ds-muted mb-4">
              Tars only collects the minimal scope of metrics required to execute
              bot prompts and maintain standard quality operations:
            </p>
            <ul className="list-none pl-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-ds-fuchsia font-bold">&gt;&gt;</span>{" "}
                Discord User IDs (for tracking author configurations)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-ds-fuchsia font-bold">&gt;&gt;</span> Server
                IDs (for saving channel settings)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-ds-fuchsia font-bold">&gt;&gt;</span>{" "}
                Configured Settings (e.g. customized role names)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-ds-fuchsia font-bold">&gt;&gt;</span>{" "}
                Latency Logs (for internal performance profiling)
              </li>
            </ul>
          </section>

          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">02.</span> Retention & Purging
            </h2>
            <p className="text-ds-muted">
              All transient chat contexts (used for calculating roasts and wishes)
              are held exclusively in short-term RAM buffers and automatically
              purged. Persistent database storage is strictly reserved for
              user/guild configurations and is deleted after six months of
              consecutive server inactivity.
            </p>
          </section>

          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">03.</span> Third-Party Boundaries
            </h2>
            <p className="text-ds-muted">
              Tars executes commands through the official Discord API.
              Consequently, all communications are subject to Discord's Developer
              Terms and Privacy Protocols. We never sell, exchange, or rent server
              statistics to outer third parties.
            </p>
          </section>

          <section className="custom-card border-2 border-ds-border p-6 bg-ds-card/45 shadow-[4px_4px_0px_var(--border-shadow)]">
            <h2 className="text-xl font-display font-bold text-ds-text uppercase mb-4 flex items-center gap-2">
              <span className="text-ds-blurple">04.</span> Inquiries
            </h2>
            <p className="text-ds-muted">
              For access requests, compliance tickets, or standard data purge
              official support channel.
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
