# Tars Bot 🤖 — The Savage Discord Companion

![Tars Bot Banner](./assets/ReadMe.png)

Tars is a bold, savage, and highly adaptive Discord AI companion built with Discord.js and powered by Google's Gemini models. He is designed to be a "ruthless Discord homie" with dark humor, capable of roasting users, giving premium wishes, sending server emojis, reacting to messages, and attaching relevant Giphy GIFs.

---

## 🌟 Key Features

- **AI-Powered Responses:** Uses Gemini API (`gemini-2.5-flash-lite` or custom models) to generate contextual, savage, or wholesome responses.
- **Context Awareness:** Remembers the last 10 messages of conversation history per user, securely stored in a Firebase Realtime Database.
- **Winston Structured Logging:** Production-grade logging system writing to the console and dynamic log files (`logs/error.log` and `logs/combined.log`).
- **Giphy Integration:** Searches Giphy and attaches context-relevant GIFs directly as native attachments.
- **Emoji Reactions & Text Emojis:** Auto-resolves custom server emojis (static/animated) for text replies and applies corresponding emoji reactions to messages.
- **Robust Error Handling:** Seamless retry mechanisms with exponential backoff for transient API (503/429) errors.
- **Slash Commands:**
  - `/about` - View detailed stats and bot parameters.
  - `/ping` - Check bot latency and uptime.
  - `/roast [user]` - Unleash a brutal, one-line roast.
  - `/wish [user] [event]` - Deliver a premium, charming wish for any occasion.
- **Status Server:** Includes a lightweight Express server for simple uptime monitoring (e.g., via Render or UptimeRobot).

---

## 🛠️ Tech Stack

### Framework & Library
- **Framework:** Express (for status monitoring)
- **Library:** Discord.js (v14)

### Backend & AI Services
- **Database:** Firebase Admin SDK (Realtime Database)
- **AI Core:** Google Gemini API (via `@google/genai` SDK)
- **GIF Engine:** Giphy Search API
- **Logger:** Winston

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Discord Application with a Bot Token
- A Google Gemini API Key
- A Giphy API Key (Developer account)
- A Firebase project with Realtime Database enabled

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "Tars Bot/server"
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory and add your credentials:
   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   GIPHY_API_KEY=your_giphy_api_key_here
   PORT=3000
   ```

4. Configure Firebase:
   - Go to your Firebase Console and navigate to **Project Settings > Service Accounts**.
   - Generate a new private key and download the JSON file.
   - Rename the file to `serviceAccountKey.json` and place it in the `server` directory.
   - Ensure the `databaseURL` in `database.js` matches your Firebase Realtime Database URL.

5. Run the bot:
   ```bash
   npm start
   ```

*Note: Make sure your Discord bot has the `Message Content Intent` and `Guilds` enabled in the Discord Developer Portal.*

---

## 🎨 Persona & Customization

Tars uses a highly specific system prompt to drive his personality:
- **Persona:** You can adjust Tars' behavior, tone, and rules by modifying the `tarsSystemPrompt` located in `config.js`.
- **User Customization:** Context values (like usernames/displayNames) are parsed dynamically, so you don't need hardcoded server roles to run the bot.

<br>

<p align="center">
  <i>Built with 🤍 for Discord communities.</i>
</p>
