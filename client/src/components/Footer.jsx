import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 overflow-hidden border-t-3 border-ds-border bg-ds-card font-mono">
      <div className="absolute top-0 left-0 h-1.5 w-full bg-ds-blurple" />

      <div className="mx-auto max-w-7xl px-6 pt-12 pb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b-3 border-ds-border/30 pb-8">
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

          <div className="flex items-center gap-6 text-sm">
            <Link
              to="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="link"
              className="text-ds-muted hover:text-ds-text transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
            >
              Privacy Policy
            </Link>

            <Link
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="link"
              className="text-ds-muted hover:text-ds-text transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ds-blurple"
            >
              Terms of Service
            </Link>
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
