const typewriterPhrases = [
  "The ultimate cognitive powerhouse for your Discord server.",
  "Engineered for brutal honesty and precise sarcasm.",
  "Premium AI execution. Supportive when needed, savage when provoked.",
  "Your digital companion, upgraded with a razor-sharp wit."
];
let phraseIndex = 0;
let characterIndex = 0;
const typewriterElement = document.getElementById("typewriter-text");

function typePhrase() {
  if (characterIndex < typewriterPhrases[phraseIndex].length) {
    typewriterElement.textContent += typewriterPhrases[phraseIndex].charAt(characterIndex);
    characterIndex++;
    setTimeout(typePhrase, 40);
  } else {
    setTimeout(erasePhrase, 3000);
  }
}

function erasePhrase() {
  if (characterIndex > 0) {
    typewriterElement.textContent = typewriterPhrases[phraseIndex].substring(0, characterIndex - 1);
    characterIndex--;
    setTimeout(erasePhrase, 20);
  } else {
    phraseIndex = (phraseIndex + 1) % typewriterPhrases.length;
    setTimeout(typePhrase, 500);
  }
}

async function fetchBotInfo() {
  try {
    const res = await fetch("/api/info");
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    
    if (data.clientId) {
      const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${data.clientId}&permissions=2415938560&integration_type=0&scope=bot+applications.commands`;
      document.getElementById("invite-btn-nav")?.setAttribute("href", inviteUrl);
      document.getElementById("invite-btn-hero")?.setAttribute("href", inviteUrl);
    }
    
    if (data.avatar) {
      document.querySelectorAll(".nav-logo, .tars-avatar-hero, .d-avatar").forEach(img => {
        img.src = data.avatar;
      });
    }
    if (data.tag) {
      document.querySelectorAll(".bot-tag-name").forEach(span => {
        span.textContent = data.tag.split("#")[0];
      });
    }

    const statusBadge = document.getElementById("status-badge");
    const statusText = statusBadge?.querySelector(".status-text");
    if (statusBadge && statusText) {
      statusText.textContent = "Status: Online";
      statusBadge.classList.remove("badge-offline");
    }
  } catch (err) {
    const statusBadge = document.getElementById("status-badge");
    const statusText = statusBadge?.querySelector(".status-text");
    if (statusBadge && statusText) {
      statusText.textContent = "Status: Offline";
      statusBadge.classList.add("badge-offline");
    }
  }
}

const playgroundScreen = document.getElementById("playground-screen");
const cmdButtons = document.querySelectorAll(".cmd-btn");

const cmdSimulations = {
  roast: {
    command: "tars run roast --target @Ecstasy",
    output: `<span class="term-output">Analyzing target vulnerabilities... [100%]</span>
<div class="d-message"><div class="d-message-header"><img src="/assets/Icon.png" alt="Tars" class="d-avatar" style="width:32px; height:32px;"><span class="d-author bot-tag-name">TARS</span><span class="bot-badge">BOT</span></div><div class="d-msg-body"><span style="color:var(--accent-blue);">@Ecstasy</span> built a beautiful website just to check if I would validate his life choices. Error 404: attention span not found. 🙄</div></div>`
  },
  wish: {
    command: "tars run wish --target @Ecstasy --event launch",
    output: `<span class="term-output">Synthesizing premium dopamine boosters... [100%]</span>
<div class="d-message"><div class="d-message-header"><img src="/assets/Icon.png" alt="Tars" class="d-avatar" style="width:32px; height:32px;"><span class="d-author bot-tag-name">TARS</span><span class="bot-badge">BOT</span></div><div class="d-msg-body"><span style="color:var(--accent-blue);">@Ecstasy</span> Huge congratulations on the launch! I hope your code compiles on the first try today, you absolute legend. Keep winning. 🥂</div></div>`
  },
  about: {
    command: "tars fetch info",
    output: `<div class="discord-embed-sim"><div class="embed-author"><img src="/assets/Icon.png" alt="Tars Logo" class="d-avatar" style="width:20px; height:20px;"><span>Tars</span></div><div class="embed-desc">Hey, I'm <b>Tars</b>!
The ultimate cognitive powerhouse for your Discord server.
  
🧬 <b>Core Parameters:</b>
• <b>Honesty:</b> ▰▰▰▰▰▰▰▰▰▱ <b>90%</b>
• <b>Humor:</b> ▰▰▰▰▰▰▰▰▱▱ <b>75%</b>
• <b>Discretion:</b> ▰▱▱▱▱▱▱▱▱▱ <b>10%</b></div><div class="embed-footer">v/3.0 · built with discord.js</div></div>`
  },
  ping: {
    command: "tars execute network_ping",
    output: `<span class="term-output">🏓 <b>Pong!</b></span><span class="term-output">Gateway latency is <b>42ms</b>.</span><span class="term-output">Current Uptime: <b>2d 5h 12m 3s</b>.</span>`
  }
};

function runCommandSim(cmdKey) {
  const sim = cmdSimulations[cmdKey];
  playgroundScreen.innerHTML = `<span class="term-input">user@tars ~ % ${sim.command}</span><br><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
  
  setTimeout(() => {
    playgroundScreen.innerHTML = `<span class="term-input">user@tars ~ % ${sim.command}</span><br>${sim.output}`;
    fetchBotInfo();
  }, 1200);
}

cmdButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    cmdButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    runCommandSim(btn.dataset.cmd);
  });
});

function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.15
  };
  
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  revealElements.forEach(el => revealObserver.observe(el));
}

document.getElementById("features")?.addEventListener("mousemove", (e) => {
  const cards = document.querySelectorAll(".bento-card");
  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const currentYearSpan = document.getElementById("current-year");
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }
  typePhrase();
  fetchBotInfo();
  initScrollAnimations();
  setInterval(fetchBotInfo, 5000);
  runCommandSim("roast");
});
