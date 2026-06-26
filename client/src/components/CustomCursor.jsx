import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);

  useEffect(() => {
    if (window.innerWidth <= 768) return;

    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      gsap.set(cursorRef.current, { x: mouseX, y: mouseY });
      
      gsap.to([cursorRef.current, followerRef.current], {
        opacity: 1,
        duration: 0.1,
        overwrite: "auto",
      });
    };

    const onMouseEnter = () => {
      gsap.to([cursorRef.current, followerRef.current], {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const onMouseLeave = () => {
      gsap.to([cursorRef.current, followerRef.current], {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const updateFollower = () => {
      posX += (mouseX - posX) * 0.15;
      posY += (mouseY - posY) * 0.15;
      gsap.set(followerRef.current, { x: posX, y: posY });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("mouseleave", onMouseLeave);
    gsap.ticker.add(updateFollower);

    const handleMouseEnter = () => document.body.classList.add("cursor-hover");
    const handleMouseLeave = () => document.body.classList.remove("cursor-hover");

    const interactiveElements = document.querySelectorAll(
      "a, button, .video-card, .loader-enter, .progress-wrap, .control-icon, .close-modal, .contact-pill, .magnetic-tilt, .scroll-indicator"
    );

    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseleave", onMouseLeave);
      gsap.ticker.remove(updateFollower);
      interactiveElements.forEach((el) => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);

  return (
    <>
      <div id="cursor" ref={cursorRef}></div>
      <div id="cursor-follower" ref={followerRef}></div>
    </>
  );
}
