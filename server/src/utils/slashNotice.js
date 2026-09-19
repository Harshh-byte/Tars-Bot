import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../utils/embeds.js";

const userWarningCooldowns = new Map();

export function createSlashNoticeEmbed(botName = "Tars") {
  return new EmbedBuilder()
    .setTitle("<:Warning:1526228248458035381> **Important Notice**")
    .setDescription(
      `Prefixes are retiring soon, please switch to Slash (/) commands!\n\n` +
        `**Why the change?**\n` +
        `Discord is shifting toward Slash Commands to improve user privacy, security, and discoverability. We need to align with Discord's requirements for privileged Intents, and Slash Commands are slowly becoming a requirement for bots to function properly in the future.\n\n` +
        `**Timeline**\n` +
        `• **Currently:** Prefix commands still function but will occasionally trigger this reminder.\n` +
        `• **5th October 2026:** Standard prefix commands will be fully disabled.\n\n` +
        `**What stays**\n` +
        `• @${botName} mentions will still work to invoke commands.`,
    )
    .setColor(EMBED_COLORS.WARNING);
}

export function shouldSendSlashNotice(userId, chancePercent = 15, cooldownMs = 600000) {
  const now = Date.now();
  const lastNoticeTime = userWarningCooldowns.get(userId) || 0;

  if (now - lastNoticeTime < cooldownMs) {
    return false;
  }

  const randomRoll = Math.random() * 100;
  if (randomRoll < chancePercent) {
    userWarningCooldowns.set(userId, now);
    return true;
  }

  return false;
}
