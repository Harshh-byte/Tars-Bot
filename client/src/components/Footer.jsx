import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 overflow-hidden border-t-3 border-ds-border bg-ds-card font-mono">
      <div className="absolute top-0 left-0 h-[6px] w-full bg-ds-blurple" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 gap-10 border-b-3 border-ds-border/30 pb-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-6">
            <a
              href="#home"
              data-cursor="link"
              className="flex items-center gap-3 w-fit rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
            >
              <img
                src="/Icon.png"
                alt="Tars Logo"
                className="h-10 w-10 border border-ds-text bg-black p-0.5"
              />
              <span className="font-display text-xl font-extrabold tracking-wider text-ds-text">
                Tars<span className="text-ds-blurple">.</span>
              </span>
            </a>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ds-muted">
              Context-aware Discord companion for smarter communities, memorable
              interactions, and unapologetically bold conversations.
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="grid grid-cols-2 gap-12">
              <nav aria-labelledby="footer-nav-heading">
                <h4
                  id="footer-nav-heading"
                  className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-ds-muted"
                >
                  Navigation
                </h4>

                <ul className="space-y-3 text-sm">
                  <li>
                    <a
                      href="#home"
                      data-cursor="link"
                      className="group flex items-center gap-2 text-ds-muted hover:text-ds-text transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
                    >
                      <span className="font-bold text-ds-blurple opacity-0 transition-opacity group-hover:opacity-100">
                        &gt;
                      </span>
                      Home
                    </a>
                  </li>

                  <li>
                    <a
                      href="#features"
                      data-cursor="link"
                      className="group flex items-center gap-2 text-ds-muted hover:text-ds-text transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
                    >
                      <span className="font-bold text-ds-blurple opacity-0 transition-opacity group-hover:opacity-100">
                        &gt;
                      </span>
                      Capabilities
                    </a>
                  </li>

                  <li>
                    <a
                      href="#sandbox"
                      data-cursor="link"
                      className="group flex items-center gap-2 text-ds-muted hover:text-ds-text transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
                    >
                      <span className="font-bold text-ds-blurple opacity-0 transition-opacity group-hover:opacity-100">
                        &gt;
                      </span>
                      Sandbox
                    </a>
                  </li>
                </ul>
              </nav>

              <nav aria-labelledby="footer-support-heading">
                <h4
                  id="footer-support-heading"
                  className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-ds-muted"
                >
                  Support
                </h4>

                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cursor="link"
                      className="group flex items-center gap-2 text-ds-muted hover:text-ds-text transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
                    >
                      <span className="font-bold text-ds-blurple opacity-0 transition-opacity group-hover:opacity-100">
                        &gt;
                      </span>
                      Privacy Policy
                    </Link>
                  </li>

                  <li>
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cursor="link"
                      className="group flex items-center gap-2 text-ds-muted hover:text-ds-text transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
                    >
                      <span className="font-bold text-ds-blurple opacity-0 transition-opacity group-hover:opacity-100">
                        &gt;
                      </span>
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-center text-xs text-ds-muted sm:flex-row">
          <span>&copy; {currentYear} Tars. All logic is brutal.</span>

          <span>
            Built with{" "}
            <span className="text-ds-blurple motion-safe:animate-pulse">♥</span>{" "}
            from outer space.
          </span>
        </div>
      </div>
    </footer>
  );
}
