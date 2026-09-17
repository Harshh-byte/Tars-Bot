import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";
import { getAutoMemeConfigs, saveAutoMemeConfig } from "./database.js";

const SUBREDDITS = [
  "darkmemers",
  "dankmemes",
  "me_irl",
];

async function fetchMeme() {
  const subreddit = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.url) return null;
    return data;
  } catch (err) {
    logger.warn(`Failed to fetch auto-meme: ${err.message}`);
    return null;
  }
}

export function initAutoMemeService(client) {
  cron.schedule("*/10 * * * * *", async () => {
    try {
      const configs = await getAutoMemeConfigs();
      if (!configs || configs.length === 0) return;

      const now = Date.now();
      for (const cfg of configs) {
        if (!cfg.enabled || !cfg.channelId || !cfg.nextPostAt) continue;

        if (now >= cfg.nextPostAt) {
          const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
          if (!channel) continue;

          const meme = await fetchMeme();
          if (meme) {
            const randomColor = Math.floor(Math.random() * 16777215);
            const embed = new EmbedBuilder()
              .setTitle(
                meme.title.length > 256
                  ? meme.title.substring(0, 253) + "..."
                  : meme.title,
              )
              .setURL(meme.postLink)
              .setImage(meme.url)
              .setColor(randomColor)
              .setFooter({
                text: `AutoMeme • ${meme.ups ? meme.ups.toLocaleString() : 0} upvotes`,
                iconURL: "https://cdn.discordapp.com/emojis/1540698439594016778.png",
              });

            await channel.send({ embeds: [embed] }).catch(() => null);
          }

          const intervalMs = (cfg.intervalHours || 1) * 3600 * 1000;
          await saveAutoMemeConfig(cfg.serverId, {
            ...cfg,
            nextPostAt: now + intervalMs,
            lastPostedAt: now,
          });
        }
      }
    } catch (err) {
      logger.error("Error in AutoMeme service execution:", err);
    }
  });
}
