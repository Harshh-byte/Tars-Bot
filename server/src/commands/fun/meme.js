import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EmbedBuilder } from "discord.js";
import { EMOJI_IDS } from "../../utils/emojis.js";

export const data = {
  name: "meme",
  description: "View trending memes.",
  dm_permission: false,
  options: [
    {
      name: "type",
      description: "Meme type / subreddit",
      type: 3,
      required: false,
      choices: [
        { name: "Dank Memes", value: "dankmemes" },
        { name: "Bikini Bottom", value: "BikiniBottomTwitter" },
        { name: "Shitposting", value: "shitposting" },
        { name: "General Memes", value: "memes" },
      ],
    },
  ],
};

const SUBREDDITS = [
  "dankmemes",
  "BikiniBottomTwitter",
  "shitposting",
  "memes",
];

function formatUpvotes(num) {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toString();
}

export async function execute(interaction, client) {
  try {
    await interaction.deferReply();

    // Only honor category choices from slash commands; prefix (.meme) always picks randomly
    const isSlashCommand = typeof interaction.isCommand === "function" && interaction.isCommand();
    const selectedType = isSlashCommand ? interaction.options.getString("type") : null;
    const subreddit =
      selectedType || SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

    const response = await fetch(`https://meme-api.com/gimme/${subreddit}/50`);

    if (!response.ok) {
      return interaction.editReply({
        content:
          "Couldn't fetch a meme right now. Meme servers might be rate-limited!",
      });
    }

    const payload = await response.json();
    const memes = Array.isArray(payload.memes)
      ? payload.memes
      : payload.url
        ? [payload]
        : [];

    const validMemes = memes.filter(
      (m) =>
        m &&
        m.url &&
        !m.nsfw &&
        /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(m.url.toLowerCase()),
    );

    if (validMemes.length === 0) {
      return interaction.editReply({
        content: "Failed to load a suitable meme. Try running `/meme` again!",
      });
    }

    // Sort descending by upvotes so high quality memes come first
    validMemes.sort((a, b) => (b.ups || 0) - (a.ups || 0));

    // Filter for quality: prefer posts with at least 150 upvotes
    const qualityMemes = validMemes.filter((m) => (m.ups || 0) >= 150);
    const candidatePool = qualityMemes.length >= 3 ? qualityMemes : validMemes;

    // Pick randomly from the top upvoted memes to ensure quality and humor
    const topTierPool = candidatePool.slice(0, Math.min(5, candidatePool.length));
    const data = topTierPool[Math.floor(Math.random() * topTierPool.length)];

    const randomColor = Math.floor(Math.random() * 16777215);

    const embed = new EmbedBuilder()
      .setTitle(
        data.title.length > 256
          ? data.title.substring(0, 253) + "..."
          : data.title,
      )
      .setURL(data.postLink)
      .setImage(data.url)
      .setColor(randomColor)
      .setFooter({
        text: `${formatUpvotes(data.ups)} ${data.ups === 1 ? "upvote" : "upvotes"} • r/${data.subreddit}`,
        iconURL: `https://cdn.discordapp.com/emojis/${EMOJI_IDS.Like}.png`,
      });

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (err) {
    logger.error("Error in Meme command execution handler:", err);
    Sentry.captureException(err);
    await interaction
      .followUp({
        content: "Something went wrong while fetching your meme. Try again!",
        ephemeral: true,
      })
      .catch(() => null);
  }
}
