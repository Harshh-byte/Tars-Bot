# Tars Bot 🤖 — The Savage & Interactive Discord Companion

![Tars Bot Banner](./assets/ReadMe.png)

**Tars** is a modern, savage, and highly interactive Discord companion built with **Discord.js v14**, **Node.js**, **React (Vite frontend)**, and powered by **Google's Gemini AI**. Designed as a ruthless, sharp-witted Discord bot, Tars features dark humor, game calculators, decision tools, interactive button controls, custom prefix support, and a full web console dashboard.

---

## 🌟 Key Features

- 🧠 **AI-Powered Responses & Sarcasm:** Powered by Google's `@google/genai` SDK (`gemini-2.5-flash-lite`) to deliver sharp roasts, charismatic wishes, and instant sarcastic remarks.
- ⚙️ **Dynamic Per-Guild Prefix Manager:** Custom server prefix support (`.prefix <new_prefix>`) with real-time Firebase caching and fallback to default `.`.
- 📖 **Interactive Custom Help System:** Interactive select menus with custom server emojis, module categories (Home, Fun, Utility), and command-specific detail cards (`.help <command>`).
- 🛠️ **System Maintenance Mode:** Toggleable maintenance mode (`/maintenance start`, `/maintenance complete`) with configurable exempted guild (`EXEMPT_GUILD_ID`) and dynamic presence updates (`🛠️ System Maintenance`).
- 🎮 **Interactive Games & Party Tools:**
  - **Truth or Dare** (`.tod`, `.truth`, `.dare`, `/tod`): Hybrid API & fallback generator supporting `PG`, `PG-13`, and `R` rating filters, AI commentary, requestor footers, and dynamic non-overwriting message flows.
  - **Would You Rather** (`.wyr`, `.wouldyourather`, `/wyr`): Dilemma generator with rating filters, AI commentary, random vibrant embed colors, and interactive continuation.
  - **Never Have I Ever** (`.nhie`, `/nhie`): Party game prompt generator with rating filters, Tars AI commentary, and seamless next-question buttons.
  - **IQ Calculator** (`.iq`, `/iq`): Score calculation across 5 intelligence classification categories (`🍷`, `🎓`, `🧠`, `📉`, `🤡`) formatted in inline code.
  - **PP Calculator** (`.pp`, `.dih`, `/pp`): Size generator (1–15 inches) with 4-tier category classification (`🫦`, `🍆`, `🍌`, `🤏`) and clean inline code formatting.
  - **Gay / Lesbian Calculators** (`.gay`, `.howgay`, `.lesbian`, `.howlesbian`, `/gay`, `/lesbian`): Percentage calculators with custom emoji category tiers (`🤨`, `💅`, `👑`, `🦄`, `👀`).
  - **Rock, Paper, Scissors & Tic-Tac-Toe** (`.rps`, `.ttt`): Real-time interactive Discord games played against Tars or server members with dynamic turn mention pings, random turn colors, and tie alerts.
  - **Coin Flip & Dice Roll** (`.flip`, `.coin`, `.cf`, `.roll`, `.dice`): Fast decision-making utilities returning heads/tails or dice roll results with random embed colors and Tars remarks.
  - **Sarcastic Roasts & Wishes** (`.roast`, `.wish`): Custom AI verbal executions and charismatic occasion wishes.
  - **Reddit Dank Memes** (`.meme`): Fetches hot memes from top subreddits.
- 🌐 **Web Dashboard Frontend:** A modern React + Vite + TailwindCSS landing page displaying real-time command documentation and system stats.
- 📊 **Firebase Realtime Database & Winston Logging:** Persistent prefix caching, conversation context tracking, production-grade Winston logging, and Sentry error telemetry.

---

## 📜 Command Reference

| Command                 | Text Aliases              | Slash Command | Description                                                                 |
| :---------------------- | :------------------------ | :------------ | :-------------------------------------------------------------------------- |
| **Help Menu**           | `.help`, `.h`             | `/help`       | Interactive command list or detailed command inspector (`.help <command>`). |
| **Prefix Manager**      | `.prefix`, `.pref`        | `/prefix`     | View or change the server command prefix.                                   |
| **Gateway Diagnostics** | `.ping`, `.p`             | `/ping`       | Check bot latency and WebSocket connection.                                 |
| **Cognitive Stats**     | `.about`, `.info`         | `/about`      | View bot statistics, quotients, and system info.                            |
| **Maintenance Mode**    | N/A                       | `/maintenance`| Toggle bot maintenance mode (`start` / `complete`).                         |
| **Truth or Dare**       | `.tod`, `.truth`, `.dare` | `/tod`        | Play Truth or Dare with rating selection (`PG`, `PG13`, `R`) & AI commentary.|
| **Would You Rather**    | `.wyr`, `.wouldyourather` | `/wyr`        | Play Would You Rather with rating options & AI commentary.                  |
| **Never Have I Ever**   | `.nhie`                   | `/nhie`       | Play Never Have I Ever with rating options & AI commentary.                 |
| **IQ Calculator**       | `.iq`                     | `/iq`         | Calculate a user's IQ score with classification tiers.                      |
| **PP Calculator**       | `.pp`, `.dih`             | `/pp`         | Check a user's dih size with 4-tier categories.                             |
| **Gay Calculator**      | `.gay`, `.howgay`         | `/gay`        | Calculate gay percentage with category levels & custom emojis.              |
| **Lesbian Calculator**  | `.lesbian`, `.howlesbian` | `/lesbian`    | Calculate lesbian percentage with category levels & custom emojis.          |
| **Coin Flip**           | `.flip`, `.coin`, `.cf`   | `/flip`       | Flip a coin (Heads or Tails).                                               |
| **Dice Roll**           | `.roll`, `.dice`          | `/roll`       | Roll a 6-sided dice (1–6).                                                  |
| **Rock Paper Scissors** | `.rps`                    | `/rps`        | Challenge Tars or a server member to RPS with dynamic turn pings.           |
| **Tic-Tac-Toe**         | `.ttt`                    | `/ttt`        | Play 3x3 Tic-Tac-Toe against Tars or a friend with dynamic turn pings.      |
| **Sarcastic Roast**     | `.roast`                  | `/roast`      | Unleash a customized sarcastic roast.                                       |
| **Charismatic Wish**    | `.wish`                   | `/wish`       | Generate a charismatic wish for an occasion.                                |
| **Reddit Memes**        | `.meme`                   | `/meme`       | Fetch fresh memes directly from Reddit.                                     |

---

## 🛠️ Tech Stack

### Client (Web Dashboard)

- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS & Custom CSS Design Tokens
- **Icons:** Lucide React

### Server (Bot Backend)

- **Runtime:** Node.js (v18+)
- **Bot Framework:** Discord.js (v14)
- **Web Server:** Express.js (for status API and web serving)
- **AI Engine:** Google Gemini API (`@google/genai`)
- **Database:** Firebase Admin SDK (Realtime Database)
- **Logging & Monitoring:** Winston Logger & Sentry Telemetry

---

## 🚀 Quick Setup Guide

### 1. Prerequisites

- Node.js (v18 or higher recommended)
- Discord Bot Token with **Message Content Intent** enabled
- Google Gemini API Key
- Firebase Project (with Realtime Database enabled)

### 2. Installation & Configuration

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Harshh-byte/Tars-Bot.git
   cd Tars-Bot
   ```

2. **Setup Server:**

   ```bash
   cd server
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env` in the `server` directory:

   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   EXEMPT_GUILD_ID=1524326288595222539
   PORT=3000
   ```

4. **Firebase Admin Credentials:**
   Place your Firebase service account key JSON as `server/serviceAccountKey.json`.

5. **Start TARS Server:**

   ```bash
   npm start
   ```

6. **Start Web Frontend (Optional):**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

---

<p align="center">
  <i>Built with 🤍 for Discord communities.</i>
</p>
