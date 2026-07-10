import { useRef, useEffect } from "react";

export default function Squares({
  direction = "diagonal",
  speed = 1,
  squareSize = 40,
  borderColor = "rgba(0, 255, 102, 0.08)",
  hoverFillColor = "rgba(0, 255, 102, 0.15)",
  className = "",
}) {
  const canvasRef = useRef(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const mouseRef = useRef({ x: -10000, y: -10000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let animationFrameId;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const step = speed * 0.15;
      if (direction === "right" || direction === "diagonal") {
        gridOffset.current.x = (gridOffset.current.x + step) % squareSize;
      }
      if (direction === "left" || direction === "diagonal") {
        gridOffset.current.x = (gridOffset.current.x - step) % squareSize;
      }
      if (direction === "down" || direction === "diagonal") {
        gridOffset.current.y = (gridOffset.current.y + step) % squareSize;
      }
      if (direction === "up" || direction === "diagonal") {
        gridOffset.current.y = (gridOffset.current.y - step) % squareSize;
      }

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;

      const startX = (gridOffset.current.x % squareSize) - squareSize;
      const startY = (gridOffset.current.y % squareSize) - squareSize;

      for (let x = startX; x < width + squareSize; x += squareSize) {
        for (let y = startY; y < height + squareSize; y += squareSize) {
          ctx.strokeRect(x, y, squareSize, squareSize);

          if (
            mouseRef.current.x >= x &&
            mouseRef.current.x < x + squareSize &&
            mouseRef.current.y >= y &&
            mouseRef.current.y < y + squareSize
          ) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(x, y, squareSize, squareSize);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [direction, speed, squareSize, borderColor, hoverFillColor]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: -10000, y: -10000 };
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`w-full h-full block ${className}`}
    />
  );
}
