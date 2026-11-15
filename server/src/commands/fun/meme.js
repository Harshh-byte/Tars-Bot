import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EmbedBuilder } from "discord.js";
import { EMOJI_IDS } from "../../utils/emojis.js";

export const data = {
  name: "meme",
  description: "Display a trending meme from Reddit!",
  dm_permission: false,
  options: [
    {
      name: "type",
      description: "Meme type.",
      type: 3,
      required: false,
      choices: [
        { name: "Dark Memes", value: "darkmemers" },
        { name: "General Memes", value: "memes" },
        { name: "Comics", value: "comics" },
        { name: "Me IRL", value: "meirl" },
      ],
    },
  ],
};

const SUBREDDITS = [
  "memes",
  "dankmemes",
  "meirl",
  "comics",
  "darkmemers",
  "wholesomememes",
];

export async function execute(interaction, client) {
  try {
    await interaction.deferReply();

    const selectedType = interaction.options.getString("type");
    const subreddit =
      selectedType || SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

    const response = await fetch(`https://meme-api.com/gimme/${subreddit}/30`);

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
        /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(m.url.toLowerCase()),
    );

    if (validMemes.length === 0) {
      return interaction.editReply({
        content: "Failed to load a suitable meme. Try running `/meme` again!",
      });
    }

    validMemes.sort((a, b) => (b.ups || 0) - (a.ups || 0));

    const topTierPool = validMemes.slice(0, Math.min(5, validMemes.length));
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
        text: `${data.ups ? data.ups.toLocaleString() : 0} ${data.ups === 1 ? "upvote" : "upvotes"} • r/${data.subreddit}`,
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
