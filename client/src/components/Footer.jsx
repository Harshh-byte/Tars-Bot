import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SpotlightCard from "./ui/SpotlightCard";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setTime(
        date.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t-3 border-ds-border relative z-10 bg-ds-card font-mono overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[6px] bg-linear-to-r from-ds-blurple via-ds-fuchsia to-ds-red opacity-80" />

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 pb-12 border-b-3 border-ds-border/30">
          
          <div className="md:col-span-6 flex flex-col items-start gap-4">
            <a href="#home" className="flex items-center gap-3">
              <img
                src="/Icon.png"
                alt="Tars Logo"
                className="w-10 h-10 rounded-none bg-black border border-ds-text p-0.5"
              />
              <span className="font-display font-extrabold text-xl tracking-wider text-ds-text">
                Tars.
              </span>
            </a>
            <p className="text-ds-muted text-sm leading-relaxed max-w-sm">
              The ultimate sarcastic Discord companion. Monitoring chats, delivering calculated roasts, and managing communities with absolute digital precision.
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-sm font-bold uppercase text-ds-text mb-4 border-b-2 border-ds-border/20 pb-1 inline-block">
              Navigation
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>
                <a href="#home" className="text-ds-muted hover:text-ds-text transition-colors flex items-center gap-1.5 group">
                  <span className="text-ds-fuchsia opacity-0 group-hover:opacity-100 transition-opacity">&gt;</span> Home
                </a>
              </li>
              <li>
                <a href="#features" className="text-ds-muted hover:text-ds-text transition-colors flex items-center gap-1.5 group">
                  <span className="text-ds-fuchsia opacity-0 group-hover:opacity-100 transition-opacity">&gt;</span> Capabilities
                </a>
              </li>
              <li>
                <a href="#sandbox" className="text-ds-muted hover:text-ds-text transition-colors flex items-center gap-1.5 group">
                  <span className="text-ds-fuchsia opacity-0 group-hover:opacity-100 transition-opacity">&gt;</span> Sandbox
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-sm font-bold uppercase text-ds-text mb-4 border-b-2 border-ds-border/20 pb-1 inline-block">
              Support
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ds-muted hover:text-ds-text transition-colors flex items-center gap-1.5 group"
                >
                  <span className="text-ds-fuchsia opacity-0 group-hover:opacity-100 transition-opacity">&gt;</span> Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ds-muted hover:text-ds-text transition-colors flex items-center gap-1.5 group"
                >
                  <span className="text-ds-fuchsia opacity-0 group-hover:opacity-100 transition-opacity">&gt;</span> Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-ds-muted">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <span>&copy; {currentYear} Tars. All logic is brutal.</span>
            <span className="hidden sm:inline text-ds-border/40">|</span>
            <Link to="/privacy" className="hover:text-ds-text transition-colors">Privacy</Link>
            <span className="hidden sm:inline text-ds-border/40">|</span>
            <Link to="/terms" className="hover:text-ds-text transition-colors">Terms</Link>
          </div>
          <div className="flex items-center gap-2">
            <span>Built with</span>
            <span className="text-ds-blurple animate-pulse text-sm">♥</span>
            <span>from outer space.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
