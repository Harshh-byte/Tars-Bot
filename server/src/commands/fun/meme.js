import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EmbedBuilder } from "discord.js";

export const data = {
  name: "meme",
  description: "Display a random trending meme from Reddit!",
  dm_permission: false,
  options: [
    {
      name: "type",
      description: "Meme type",
      type: 3,
      required: false,
      choices: [
        { name: "Dank Memes", value: "dankmemes" },
        // { name: "Dark Memes", value: "darkmemers" },
        { name: "General Memes", value: "memes" },
        { name: "Wholesome", value: "wholesomememes" },
        { name: "Me_IRL", value: "me_irl" },
        { name: "Programmer Humor", value: "programmerhumor" },
        { name: "Comics", value: "comics" },
      ],
    },
  ],
};

const SUBREDDITS = [
  "dankmemes",
  // "darkmemers",
  "memes",
  "wholesomememes",
  "me_irl",
  "programmerhumor",
  "comics",
];

export async function execute(interaction, client) {
  try {
    await interaction.deferReply();

    const selectedType = interaction.options.getString("type");
    const subreddit =
      selectedType || SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

    const response = await fetch(`https://meme-api.com/gimme/${subreddit}`);

    if (!response.ok) {
      return interaction.editReply({
        content:
          "Couldn't fetch a meme right now. Meme servers might be rate-limited!",
      });
    }

    const data = await response.json();

    if (!data || !data.url || data.nsfw) {
      return interaction.editReply({
        content: "Failed to load a suitable meme. Try running `/meme` again!",
      });
    }

    const isGif = data.url.endsWith(".gif");

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
        text: `${data.ups ? data.ups.toLocaleString() : 0} upvotes • Posted by u/${data.author || "anonymous"}`,
        iconURL: "https://cdn.discordapp.com/emojis/1540698439594016778.png",
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
