export default function ShinyText({
  text = "",
  disabled = false,
  speed = 6,
  className = "",
}) {
  const animationStyle = disabled
    ? {}
    : {
        animationDuration: `${speed}s`,
      };

  return (
    <span
      className={`shiny-text ${disabled ? "" : "animate-shine"} ${className}`}
      style={animationStyle}
    >
      {text}
    </span>
  );
}
