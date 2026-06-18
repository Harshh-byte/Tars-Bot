document.getElementById("currentYear").textContent = new Date().getFullYear();

const words = [
  "Master Roaster.",
  "Savage Bot.",
  "Premium Wisher.",
  "Context Expert."
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

  let typeSpeed = isDeleting ? 30 : 80;

  if (!isDeleting && charIndex === currentWord.length) {
    typeSpeed = 2500;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    wordIndex = (wordIndex + 1) % words.length;
    typeSpeed = 400;
  }

  setTimeout(type, typeSpeed);
}
setTimeout(type, 800);

const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    nav.classList.add("bg-[#0B0D12]/80", "backdrop-blur-xl", "border-white/5", "py-3", "shadow-xl");
    nav.classList.remove("py-5", "border-transparent");
  } else {
    nav.classList.remove("bg-[#0B0D12]/80", "backdrop-blur-xl", "border-white/5", "py-3", "shadow-xl");
    nav.classList.add("py-5", "border-transparent");
  }
}, { passive: true });

const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const mobileLinks = document.querySelectorAll(".mobile-link");

function toggleMenu() {
  const isOpen = hamburger.classList.toggle("active");
  if (isOpen) {
    mobileMenu.classList.remove("opacity-0", "pointer-events-none", "translate-y-4");
    document.body.style.overflow = "hidden";
    hamburger.children[0].classList.add("rotate-45", "translate-y-2");
    hamburger.children[1].classList.add("opacity-0");
    hamburger.children[2].classList.add("-rotate-45", "-translate-y-2");
  } else {
    mobileMenu.classList.add("opacity-0", "pointer-events-none", "translate-y-4");
    document.body.style.overflow = "";
    hamburger.children[0].classList.remove("rotate-45", "translate-y-2");
    hamburger.children[1].classList.remove("opacity-0");
    hamburger.children[2].classList.remove("-rotate-45", "-translate-y-2");
  }
}

hamburger.addEventListener("click", toggleMenu);
mobileLinks.forEach((link) => link.addEventListener("click", toggleMenu));

const botMsg = document.getElementById("botMsg");
const botText = document.getElementById("botText");
const typingIndicator = document.getElementById("typingIndicator");

const chatSequence = [
  "My sarcasm detector just broke... you need a PhD to recover from that. 💀",
  "I'd roast you, but my system only processes high-level threats.",
  "Sure, blame the bot. Classic human move."
];
let chatIndex = 0;

function streamText(text, index) {
  if (index < text.length) {
    botText.innerHTML += text.charAt(index);
    setTimeout(() => streamText(text, index + 1), 25);
  } else {
    setTimeout(resetChat, 6000);
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
    botMsg.classList.remove("opacity-0", "translate-y-2");
    streamText(chatSequence[chatIndex], 0);
  }, 3000);
}

function resetChat() {
  botMsg.classList.add("opacity-0", "translate-y-2");
  setTimeout(() => {
    botText.innerHTML = "";
    chatIndex = (chatIndex + 1) % chatSequence.length;
    triggerChat();
  }, 500);
}

window.addEventListener("load", triggerChat);

const tabs = document.querySelectorAll(".cmd-tab");
const cards = document.querySelectorAll(".cmd-card");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.cat;
    
    tabs.forEach((t) => {
      t.className = "cmd-tab px-6 py-2.5 rounded-full border border-white/5 text-sm font-medium text-ds-muted hover:text-white hover:bg-white/5 transition-all";
    });
    
    tab.className = "cmd-tab px-6 py-2.5 rounded-full border border-ds-blurple/50 bg-ds-blurple/10 text-ds-blurple text-sm font-medium shadow-[0_0_20px_rgba(88,101,242,0.15)] transition-all";

    cards.forEach((card) => {
      if (category === "all" || card.dataset.cat === category) {
        card.style.display = "block";
        setTimeout(() => {
          card.style.opacity = "1";
          card.style.transform = "scale(1)";
        }, 10);
      } else {
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
        setTimeout(() => card.style.display = "none", 300);
      }
    });
  });
});

const orb1 = document.getElementById("orb1");
const orb2 = document.getElementById("orb2");
let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;

document.addEventListener("mousemove", (e) => {
  targetX = e.clientX / window.innerWidth;
  targetY = e.clientY / window.innerHeight;
});

function animateOrbs() {
  currentX += (targetX - currentX) * 0.05;
  currentY += (targetY - currentY) * 0.05;
  
  if (orb1 && orb2) {
    orb1.style.transform = `translate(-50%, -25%) translate(${currentX * 50}px, ${currentY * 50}px)`;
    orb2.style.transform = `translate(30%, 30%) translate(${currentX * -60}px, ${currentY * -60}px)`;
  }
  requestAnimationFrame(animateOrbs);
}
animateOrbs();

const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      
      const statNums = entry.target.querySelectorAll(".stat-num");
      statNums.forEach(stat => {
        if (!stat.dataset.animated) {
          animateValue(stat, 0, parseInt(stat.dataset.target || stat.textContent), 2000);
          stat.dataset.animated = true;
        }
      });
      
      obs.unobserve(entry.target);
    }
  });
}, { root: null, rootMargin: "0px", threshold: 0.1 });

document.querySelectorAll(".reveal").forEach((el, i) => {
  if (el.parentElement.classList.contains("grid")) {
    el.style.transitionDelay = `${(i % 3) * 100}ms`;
  }
  observer.observe(el);
});

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const isVersion = obj.classList.contains('is-version');
  
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easeProgress * (end - start) + start);
    
    obj.innerHTML = isVersion ? "v" + current + ".0" : current;
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}
