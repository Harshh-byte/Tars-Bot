export default function StarBorder({
  as: Component = "button",
  className = "",
  color = "#d05b00",
  speed = "6s",
  innerClassName = "",
  children,
  ...props
}) {
  return (
    <Component
      className={`relative inline-flex p-[2px] overflow-hidden rounded-none shadow-[4px_4px_0px_0px_var(--border-shadow)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--border-shadow)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_var(--border-shadow)] transition-all duration-75 cursor-pointer ${className}`}
      {...props}
    >
      <div
        className="absolute inset-[-300%] animate-[spin_6s_linear_infinite]"
        style={{
          background: `conic-gradient(from 0deg, transparent 45%, ${color} 50%, transparent 55%, ${color} 100%)`,
          animationDuration: speed,
        }}
      />
      <div className={`relative z-10 w-full h-full bg-ds-card px-6 py-3.5 flex items-center justify-center gap-2.5 font-display text-xs uppercase tracking-wider text-ds-text ${innerClassName}`}>
        {children}
      </div>
    </Component>
  );
}
