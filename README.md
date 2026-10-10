# Tars Chat Bot

![Tars Bot Banner](./assets/ReadMe.png)

A sharp-witted, modern Discord bot built with **Discord.js v14**, **Node.js**, **React (Vite Dashboard)**, and powered by **Google Gemini AI**. Designed for server engagement, interactive games, custom prefix management, and dynamic help interfaces.

---

## ✨ Features

- **🧠 Conversational AI Engine:** Smart AI-powered chat, contextual roasts, personalized wishes, and instant Q&A powered by `@google/genai`.
- **⚙️ Dynamic Server Settings:** Per-server custom prefix configuration and automated database cleanup backed by Firebase Firestore.
- **📖 Next-Gen Help & Navigation:** Rich Discord component menus, paginated command catalogs, and category inspectors.
- **🎭 Social & Roleplay Interactions:** Interactive user reactions with animated media, custom counters, and persistent action stats.
- **🛠️ Administrative & Server Controls:** Fine-grained owner controls including system maintenance toggles, custom bot presence, and memory management.
- **🎮 Interactive Party & Mini-Games:** Comprehensive collection of multiplayer party games, decision tools, guessing games, and global leaderboards.
- **📊 Entertainment & Utilities:** Fun user rating calculators, automated Reddit meme feed, custom reminders, and server diagnostics.
- **🌐 Web Dashboard:** Modern React + Vite web dashboard displaying real-time command documentation and bot metrics.

---

## ⚡ Quick Command Reference

| Category    | Commands                                                                                                                          | Description                                                   |
| :---------- | :-------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------ |
| **Utility** | `/about`, `/ask`, `/avatar`, `/help`, `/ping`, `/prefix`, `/remind`, `/serverinfo`, `/userinfo`                                   | Server tools and utilities                                    |
| **Actions** | `/hug`, `/kiss`, `/pat`, `/punch`, `/slap`, `/smoke`, `/vape`                                                                     | Roleplay & social interactions                                |
| **Games**   | `/flag`, `/flip`, `/impostor`, `/leaderboard`, `/nhie`, `/para`, `/pokemon`, `/roll`, `/rps`, `/scramble`, `/tod`, `/ttt`, `/wyr` | Interactive games & scoreboards |
| **Fun**     | `/autism`, `/bitches`, `/gay`, `/iq`, `/lesbian`, `/meme`, `/pp`, `/roast`, `/ship`, `/simp`, `/wish`                             | Calculators, roasts, and memes                                |
| **Mod**     | `/automeme`, `/purge`, `/resetlb`                                                                                                 | Server moderation and management                              |
| **Admin**   | `/erase`, `/maintenance`                                                                                                          | Owner-only administrative tools                               |

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Discord.js v14, Express.js
- **AI Model:** Google Gemini AI (`gemini-2.5-flash-lite`)
- **Database & Logs:** Firebase Admin SDK (Firestore), Winston, Sentry
- **Frontend Dashboard:** React 18, Vite, Tailwind CSS

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/Harshh-byte/Tars-Bot.git
cd Tars-Bot/server
npm install
```

### 2. Environment Setup

Create `server/.env`:

```env
DISCORD_BOT_TOKEN=your_bot_token
GEMINI_API_KEY=your_gemini_key
OWNER_ID=your_owner_id
GIPHY_API_KEY=your_giphy_key
KLIPY_API_KEY=your_klipy_key
SENTRY_DSN=your_sentry_dsn
EXEMPT_GUILD_ID=your_guild_id
PORT=3000
```

Place your Firebase credentials in `server/serviceAccountKey.json`.

### 3. Launch Bot

```bash
npm start
```

---

<p align="center">
  <i>Built with 🤍 for Discord communities.</i>
</p>
