import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";
import { getAutoMemeConfigs, saveAutoMemeConfig } from "./database.js";
import { EMOJI_IDS } from "../utils/emojis.js";

const SUBREDDITS = ["memes", "dankmemes", "meirl", "comics", "darkmemers", "wholesomememes"];

async function fetchMeme() {
  const subreddit = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}/25`);
    if (!res.ok) return null;
    const payload = await res.json();
    const memes = Array.isArray(payload.memes)
      ? payload.memes
      : payload.url
        ? [payload]
        : [];

    const validMemes = memes.filter(
      (m) =>
        m &&
        m.url &&
        /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(m.url.toLowerCase()),
    );
    if (validMemes.length === 0) return null;

    validMemes.sort((a, b) => (b.ups || 0) - (a.ups || 0));
    const topTier = validMemes.slice(0, Math.min(5, validMemes.length));
    return topTier[Math.floor(Math.random() * topTier.length)];
  } catch (err) {
    logger.warn(`Failed to fetch auto-meme: ${err.message}`);
    return null;
  }
}

export function initAutoMemeService(client) {
  cron.schedule("* * * * *", async () => {
    try {
      const configs = await getAutoMemeConfigs();
      if (!configs || configs.length === 0) return;

      const now = Date.now();
      for (const cfg of configs) {
        if (!cfg.enabled || !cfg.channelId || !cfg.nextPostAt) continue;

        if (now >= cfg.nextPostAt) {
          const channel = await client.channels
            .fetch(cfg.channelId)
            .catch(() => null);
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
                text: `AutoMeme • ${meme.ups ? meme.ups.toLocaleString() : 0} ${meme.ups === 1 ? "upvote" : "upvotes"} • r/${meme.subreddit}`,
                iconURL: `https://cdn.discordapp.com/emojis/${EMOJI_IDS.Like}.png`,
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
