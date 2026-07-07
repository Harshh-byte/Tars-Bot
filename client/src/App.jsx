import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Capabilities from "./components/Capabilities";
import Commands from "./components/Commands";
import Sandbox from "./components/Sandbox";
import FAQs from "./components/FAQs";
import Footer from "./components/Footer";
import CustomCursor from "./components/CustomCursor";
import Modal from "./components/Modal";

export default function App() {
  const [theme, setTheme] = useState("light");

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setTheme(nextTheme);
      });
    } else {
      setTheme(nextTheme);
    }
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    const revealElements = document.querySelectorAll(".reveal");
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <div className="min-h-screen transition-colors duration-300 overflow-x-hidden">
      <div
        className="fixed top-0 left-0 h-1 bg-linear-to-r from-ds-blurple to-ds-fuchsia z-100 transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />
      <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
      <Hero />
      <Capabilities />
      <Commands />
      <Sandbox />
      <FAQs />
      <Footer 
        onOpenPrivacy={() => setIsPrivacyOpen(true)} 
        onOpenTerms={() => setIsTermsOpen(true)} 
      />
      <CustomCursor />

      <Modal 
        isOpen={isPrivacyOpen} 
        onClose={() => setIsPrivacyOpen(false)} 
        title="Privacy Policy"
      >
        <p className="font-semibold text-ds-text">Last Updated: July 2026</p>
        <p>Your privacy is important to us. This Privacy Policy explains how Tars Bot handles information collected from Discord servers and users.</p>
        
        <h4 className="font-bold text-ds-text mt-4">1. Information We Collect</h4>
        <p>Tars Bot processes minimal data necessary to function, which includes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>User IDs & Usernames</strong>: To personalize sarcastic replies and roast commands.</li>
          <li><strong>Message Content</strong>: Temporarily processed to generate a response via the Gemini API when mentioned or replied to.</li>
          <li><strong>Server Emojis & Guild Context</strong>: To allow Tars to insert custom emojis in replies or react to your messages.</li>
          <li><strong>Conversation History</strong>: We temporarily cache the last 10 messages of a conversation in Firebase database to maintain context for follow-up questions.</li>
        </ul>

        <h4 className="font-bold text-ds-text mt-4">2. How We Use Information</h4>
        <p>The collected data is strictly used for providing the AI chat functionality, entertainment, and commands. We do not sell, share, or use your data for advertising or marketing.</p>

        <h4 className="font-bold text-ds-text mt-4">3. Data Retention & Deletion</h4>
        <p>Conversation logs are limited to 10 messages and overwrite automatically. If you wish to delete your data cached in our Firebase database, please contact the developer or remove the bot from your server.</p>
      </Modal>

      <Modal 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)} 
        title="Terms of Service"
      >
        <p className="font-semibold text-ds-text">Last Updated: July 2026</p>
        <p>Welcome to Tars Bot. By inviting or using Tars Bot in any Discord server, you agree to these Terms of Service.</p>

        <h4 className="font-bold text-ds-text mt-4">1. Use of Service</h4>
        <p>Tars Bot is provided purely for entertainment purposes. It generates AI-based sarcasm, roasts, and jokes. By using it, you understand that generated replies are automated and should not be taken seriously.</p>

        <h4 className="font-bold text-ds-text mt-4">2. Prohibited Behavior</h4>
        <p>You agree not to exploit, spam, or abuse the bot, including attempts to crash its handlers, bypass rate limits, or trick the AI into generating harmful or prohibited content. Any server or user found abusing the bot will be blacklisted.</p>

        <h4 className="font-bold text-ds-text mt-4">3. Disclaimer & Liability</h4>
        <p>Tars Bot is provided "as is" without warranty of any kind. The developers are not liable for any generated content, service interruptions, or data deletions.</p>

        <h4 className="font-bold text-ds-text mt-4">4. Changes to Terms</h4>
        <p>We reserve the right to modify these terms at any time. Your continued use of the bot constitutes acceptance of the new terms.</p>
      </Modal>
    </div>
  );
}
