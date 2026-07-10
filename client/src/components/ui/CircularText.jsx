import { motion } from "framer-motion";

export default function CircularText({
  text = "TARS_BOT • COGNITIVE_POWERHOUSE • SAVAGE_COMPANION • ",
  radius = 80,
  fontSize = "10px",
  className = "",
  spinDuration = 20,
  children,
}) {
  const characters = text.split("");
  const angleStep = 360 / characters.length;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: radius * 2, height: radius * 2 }}
    >
      <motion.div
        className="w-full h-full absolute top-0 left-0"
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: spinDuration,
          ease: "linear",
        }}
      >
        {characters.map((char, index) => {
          const angle = index * angleStep;
          return (
            <span
              key={index}
              className="absolute left-1/2 top-0 origin-bottom select-none text-ds-text font-mono font-bold"
              style={{
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transformOrigin: `50% ${radius}px`,
                fontSize: fontSize,
                height: `${radius}px`,
              }}
            >
              {char}
            </span>
          );
        })}
      </motion.div>
      {children && <div className="relative flex items-center justify-center z-10">{children}</div>}
    </div>
  );
}
