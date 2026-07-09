import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-ds-border py-8 md:py-10 relative z-10 bg-white/50">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
        <a href="#home" className="flex items-center gap-3">
          <img
            src="/Icon.png"
            alt="Tars Logo"
            className="w-8 h-8 rounded-lg bg-black border border-black p-0.5 shadow-sm"
          />
          <span className="font-display font-extrabold text-lg text-ds-text">
            Tars.
          </span>
        </a>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <p className="text-ds-muted text-xs">
            &copy; {currentYear} Tars Bot.
          </p>

          <div className="flex gap-4">
            <Link
              to="/privacy"
              className="text-ds-muted hover:text-ds-text text-xs transition-colors"
            >
              Privacy Policy
            </Link>

            <Link
              to="/terms"
              className="text-ds-muted hover:text-ds-text text-xs transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        <span className="text-ds-muted text-xs">
          Built with <span style={{ color: "var(--accent)" }}>♥</span> from
          Space.
        </span>
      </div>
    </footer>
  );
}
