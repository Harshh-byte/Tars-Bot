# Tars Bot 🤖 — The Savage Discord Companion

![Tars Bot Banner](./assets/ReadMe.png)

Tars is a bold, savage, and highly adaptive Discord AI companion built with Discord.js and powered by Google's Gemini 2.5 Flash Lite. He is designed to be a "ruthless Discord homie" with dark humor, capable of roasting users, giving premium wishes, and keeping track of conversation context seamlessly.

---

## 🌟 Key Features

- **AI-Powered Responses:** Uses Google Gemini to generate contextual, savage, or wholesome responses based on the situation.
- **Context Awareness:** Remembers the last 10 messages of conversation history per user, securely stored in a Firebase Realtime Database.
- **Dynamic Tone Adjustments:** Adapts its tone based on specific user roles (e.g., "alpha-homie", "smooth-dominant").
- **Slash Commands:**
  - `/about` - View detailed stats and bot parameters.
  - `/ping` - Check bot latency and uptime.
  - `/roast [user]` - Unleash a brutal, one-line roast.
  - `/wish [user] [event]` - Deliver a premium, charming wish for any occasion.
- **Status Server:** Includes a lightweight Express server for simple uptime monitoring (e.g., via UptimeRobot).

---

## 🛠️ Tech Stack

### Framework & Library
- **Framework:** Express (for status monitoring)
- **Library:** Discord.js (v14)

### Backend & AI Services
- **Database:** Firebase Admin SDK (Realtime Database)
- **AI Core:** Google Gemini API (via `@google/genai` sdk)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Discord Application with a Bot Token
- A Google Gemini API Key
- A Firebase project with Realtime Database enabled

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "Tars Bot"
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your API credentials:
   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. Configure Firebase:
   - Go to your Firebase Console and navigate to **Project Settings > Service Accounts**.
   - Generate a new private key and download the JSON file.
   - Rename the file to `serviceAccountKey.json` and place it in the root directory.
   - Ensure the `databaseURL` in `database.js` matches your Firebase Realtime Database URL.

5. Run the bot:
   ```bash
   npm start
   ```

*Note: Make sure your Discord bot has the `Message Content Intent` enabled in the Discord Developer Portal.*

---

## 🎨 Persona & Customization

Tars uses a highly specific system prompt to drive his personality:
- **Persona:** You can adjust Tars' behavior, tone, and rules by modifying the `tarsSystemPrompt` located in `config.js`.
- **Role Detection:** Role-based targeting (for dynamic pronouns and tone) can be customized by editing the `MALE_ROLE_ID` and `FEMALE_ROLE_IDS` constants in `tars.js`.

<br>

<p align="center">
  <i>Built with 🤍 for Discord communities.</i>
</p>
