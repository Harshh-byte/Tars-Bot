// Dynamic Year
document.getElementById("currentYear").textContent = new Date().getFullYear();

// Typewriter Effect Logic
const words = [
  "Master Roaster",
  "Wish Specialist",
  "Context Expert",
  "Pure Chaos",
];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typewriterEl = document.getElementById("typewriter");

function type() {
  const currentWord = words[wordIndex];

  if (isDeleting) {
    typewriterEl.textContent = currentWord.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typewriterEl.textContent = currentWord.substring(0, charIndex + 1);
    charIndex++;
  }

  let typeSpeed = isDeleting ? 40 : 100;

  if (!isDeleting && charIndex === currentWord.length) {
    typeSpeed = 2000; // Pause at end of word
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    wordIndex = (wordIndex + 1) % words.length;
    typeSpeed = 500; // Pause before next word
  }

  setTimeout(type, typeSpeed);
}
setTimeout(type, 500);

// Scroll Navigation Style
const nav = document.getElementById("nav");
window.addEventListener(
  "scroll",
  () => {
    if (window.scrollY > 50) {
      nav.classList.add(
        "bg-background/80",
        "backdrop-blur-md",
        "border-white/5",
        "py-3",
      );
      nav.classList.remove("py-4", "border-transparent");
    } else {
      nav.classList.remove(
        "bg-background/80",
        "backdrop-blur-md",
        "border-white/5",
        "py-3",
      );
      nav.classList.add("py-4", "border-transparent");
    }
  },
  { passive: true },
);

// Mobile Menu Toggle
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const mobileLinks = document.querySelectorAll(".mobile-link");

function toggleMenu() {
  const isOpen = hamburger.classList.toggle("active-menu");

  if (isOpen) {
    mobileMenu.classList.remove("opacity-0", "pointer-events-none");
    document.body.style.overflow = "hidden";
    // Animate hamburger to X (visual toggle utilizing children spans)
    hamburger.children[0].classList.add("rotate-45", "translate-y-2");
    hamburger.children[1].classList.add("opacity-0");
    hamburger.children[2].classList.add("-rotate-45", "-translate-y-2");
  } else {
    mobileMenu.classList.add("opacity-0", "pointer-events-none");
    document.body.style.overflow = "";
    hamburger.children[0].classList.remove("rotate-45", "translate-y-2");
    hamburger.children[1].classList.remove("opacity-0");
    hamburger.children[2].classList.remove("-rotate-45", "-translate-y-2");
  }
}

hamburger.addEventListener("click", toggleMenu);
mobileLinks.forEach((link) => link.addEventListener("click", toggleMenu));

// Simulated Chat Animation
const TARS_REPLY =
  "My sarcasm detector just broke—it hit maximum capacity. You need a PhD to recover from that. 💀";
const botMsg = document.getElementById("botMsg");
const botText = document.getElementById("botText");
const typingIndicator = document.getElementById("typingIndicator");

function streamText(text, index) {
  if (index < text.length) {
    botText.textContent += text.charAt(index);
    setTimeout(() => streamText(text, index + 1), 30);
  } else {
    setTimeout(resetChat, 8000); // Wait before looping
  }
}

function triggerChat() {
  setTimeout(() => {
    typingIndicator.classList.remove("hidden");
    typingIndicator.classList.add("flex");
  }, 1000);

  setTimeout(() => {
    typingIndicator.classList.add("hidden");
    typingIndicator.classList.remove("flex");
    botMsg.classList.remove("opacity-0");
    streamText(TARS_REPLY, 0);
  }, 3500);
}

function resetChat() {
  botMsg.classList.add("opacity-0");
  setTimeout(() => {
    botText.textContent = "";
    triggerChat();
  }, 500);
}

// Start chat sequence
window.addEventListener("load", triggerChat);

// Command Tabs Filtering
const tabs = document.querySelectorAll(".cmd-tab");
const cards = document.querySelectorAll(".cmd-card");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.cat;

    // Reset tabs
    tabs.forEach((t) => {
      t.className =
        "cmd-tab px-5 py-2 rounded-full border border-white/10 text-sm font-medium text-slate-400 hover:text-white hover:border-white/30 transition-all";
    });

    // Active tab styling
    tab.className =
      "cmd-tab px-5 py-2 rounded-full border border-primary/50 bg-primary/20 text-indigo-300 text-sm font-medium transition-all";

    cards.forEach((card) => {
      if (category === "all" || card.dataset.cat === category) {
        card.style.display = "block";
        setTimeout(() => (card.style.opacity = "1"), 10);
      } else {
        card.style.opacity = "0";
        setTimeout(() => (card.style.display = "none"), 300); // match tailwind transition duration
      }
    });
  });
});

// Parallax Effect for Background Orbs
const orb1 = document.getElementById("orb1");
const orb2 = document.getElementById("orb2");

document.addEventListener("mousemove", (e) => {
  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;

  if (orb1 && orb2) {
    orb1.style.transform = `translate(-50%, -25%) translate(${x * 30}px, ${y * 30}px)`;
    orb2.style.transform = `translate(33%, 33%) translate(${x * -40}px, ${y * -40}px)`;
  }
});

// Intersection Observer for Reveal Elements & Number Counters
const observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.1,
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");

      // If it has stat-num class inside, trigger counter
      const statNums = entry.target.querySelectorAll(".stat-num");
      statNums.forEach((stat) =>
        animateValue(stat, 0, parseInt(stat.textContent), 1500),
      );

      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(".reveal").forEach((el, i) => {
  // Add staggered delay to grid items automatically
  if (el.parentElement.classList.contains("grid")) {
    el.style.transitionDelay = `${(i % 3) * 0.15}s`;
  }
  observer.observe(el);
});

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      // Re-add v if it was version
      if (end < 10) obj.innerHTML = "v" + end + ".0";
    }
  };
  window.requestAnimationFrame(step);
}
