import { useState, useEffect } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => {
      const next = !prev;
      document.body.style.overflow = next ? "hidden" : "";
      return next;
    });
  };

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = "";
  };

  return (
    <>
      <nav
        id="nav"
        className={`fixed w-full top-0 z-50 transition-all duration-500 py-6 border-b ${
          isScrolled
            ? "bg-ds-bg/85 backdrop-blur-xl border-ds-border py-4 shadow-sm"
            : "border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative">
          <a href="#home" className="flex items-center gap-3 group">
            <img
              src="/Icon.png"
              alt="Tars Logo"
              className="w-10 h-10 rounded-none bg-black border border-ds-text p-0.5"
            />
            <span className="font-display font-extrabold text-xl tracking-wider text-ds-text">
              Tars<span className="text-ds-blurple">.</span>
            </span>
          </a>

          <ul className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-10 bg-ds-card border border-ds-border backdrop-blur-md px-8 py-2.5 rounded-full shadow-sm">
            <li>
              <a
                href="#features"
                className="text-[11px] font-bold uppercase tracking-wider text-ds-muted hover:text-ds-text transition-colors"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#commands"
                className="text-[11px] font-bold uppercase tracking-wider text-ds-muted hover:text-ds-text transition-colors"
              >
                Commands
              </a>
            </li>
            <li>
              <a
                href="#faqs"
                className="text-[11px] font-bold uppercase tracking-wider text-ds-muted hover:text-ds-text transition-colors"
              >
                FAQs
              </a>
            </li>
          </ul>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://discord.com/users/569766329960103941"
              className="btn-primary flex items-center justify-center gap-2.5"
              data-cursor="code"
            >
              <svg
                className="w-4 h-4 fill-none stroke-current shrink-0"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>Contact Developer</span>
            </a>
          </div>

          <div className="flex items-center gap-3 md:hidden">

            <button
              onClick={toggleMobileMenu}
              className="flex flex-col gap-1.5 p-2 focus:outline-none relative z-50"
            >
              <span
                className={`w-6 h-0.5 bg-ds-text rounded-full block transition-transform duration-300 origin-center ${
                  isMobileMenuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              ></span>
              <span
                className={`w-6 h-0.5 bg-ds-text rounded-full block transition-opacity duration-300 ${
                  isMobileMenuOpen ? "opacity-0" : ""
                }`}
              ></span>
              <span
                className={`w-6 h-0.5 bg-ds-text rounded-full block transition-transform duration-300 origin-center ${
                  isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              ></span>
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 bg-ds-bg/95 backdrop-blur-2xl z-40 flex flex-col items-center justify-center gap-10 transition-all duration-500 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto scale-100"
            : "opacity-0 pointer-events-none scale-95"
        }`}
      >
        <ul className="flex flex-col items-center gap-8 text-center">
          <li>
            <a
              href="#features"
              onClick={handleMobileLinkClick}
              className="block font-display text-3xl font-extrabold text-ds-muted hover:text-ds-text transition-all"
            >
              Features
            </a>
          </li>
          <li>
            <a
              href="#commands"
              onClick={handleMobileLinkClick}
              className="block font-display text-3xl font-extrabold text-ds-muted hover:text-ds-text transition-all"
            >
              Commands
            </a>
          </li>
          <li>
            <a
              href="#faqs"
              onClick={handleMobileLinkClick}
              className="block font-display text-3xl font-extrabold text-ds-muted hover:text-ds-text transition-all"
            >
              FAQs
            </a>
          </li>
        </ul>
        <a
          href="https://discord.com/users/569766329960103941"
          className="btn-primary w-4/5 mt-6 flex items-center justify-center gap-2.5"
          data-cursor="code"
        >
          <svg
            className="w-4 h-4 fill-none stroke-current shrink-0"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>Contact Developer</span>
        </a>
      </div>
    </>
  );
}
