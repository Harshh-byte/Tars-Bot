import { useEffect } from "react";

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="bg-ds-card/90 border border-ds-border backdrop-blur-2xl w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 scale-100 transition-all duration-300 max-h-[85vh] flex flex-col animate-[fadeIn_0.3s_ease-out]">
        <div className="px-6 py-5 border-b border-ds-border flex items-center justify-between">
          <h3 className="font-display font-extrabold text-xl text-ds-text">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ds-muted hover:text-ds-text hover:bg-ds-border transition-colors cursor-pointer focus:outline-none"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-sm text-ds-muted leading-relaxed space-y-4 font-sans">
          {children}
        </div>

        <div className="px-6 py-4 border-t border-ds-border flex justify-end">
          <button
            onClick={onClose}
            className="btn-primary py-2 px-5 text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
