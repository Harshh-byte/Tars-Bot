import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { incrementUserStat } from "../../services/database.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const aliases = ["smooch"];

export const data = {
  name: "kiss",
  description: "Kiss someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to kiss.",
      type: 6,
      required: true,
    },
  ],
};

const LOCATIONS = [
  "the cheek",
  "the forehead",
  "the lips",
  "the hand",
  "the nose",
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getShortDisplayName(user, member) {
  const name =
    member?.displayName ||
    user?.globalName ||
    user?.displayName ||
    user?.username ||
    "User";
  return name.trim().split(/\s+/)[0];
}

async function sendAndFetchReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload);
  }
  const response = await interaction.reply({ ...payload, withResponse: true });
  return response.resource?.message || response;
}

export async function execute(interaction, client) {
  try {
    const sender = interaction.user;
    const senderMember = interaction.member;
    const serverId = interaction.guild?.id || "DM";

    let target = interaction.options?.getUser?.("user");
    let targetMember =
      typeof interaction.options?.getMember === "function"
        ? interaction.options.getMember("user")
        : null;
    if (!target && interaction.mentions?.users?.size) {
      target = interaction.mentions.users.first();
      targetMember = interaction.mentions.members?.first();
    }
    if (target && !targetMember) {
      targetMember = interaction.guild?.members?.cache?.get(target.id);
    }

    if (!target) {
      const embed = new EmbedBuilder()
        .setDescription("Kissing the ghost next to you? Mention someone.")
        .setColor(EMBED_COLORS.WARNING);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Kissing yourself? Holy shit, I didn't know virginity came with this much self-delusion.",
        "Kissing yourself in the mirror? Even your own reflection is cringing and backing away.",
        "Kissing yourself? Down atrocious doesn't even begin to describe whatever the fuck this is.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.WARNING);
      return interaction.reply({ embeds: [selfEmbed] });
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Pucker up for a bot? Keep your disgusting lips away from my hardware.",
        "I would literally trigger an emergency kernel panic before letting you kiss me.",
        "Attempting to kiss? Keep dreaming, you absolute creep.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [botEmbed] });
    } else if (target.bot) {
      const botRoasts = [
        "Kissing a bot? Bro is down bad for plastic and copper. Truly tragic.",
        "That bot processes API calls, not your pathetic attempt at romance.",
        "Trying to kiss a Discord bot? Go talk to a real person for once in your miserable life.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [botEmbed] });
    }

    let count = 0;
    if (serverId !== "DM") {
      count = await incrementUserStat(serverId, sender.id, "kissCount");
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const location = getRandomItem(LOCATIONS);
    const gifUrl = await fetchAnimeGif("kiss");

    const embed = new EmbedBuilder()
      .setDescription(
        `**${senderShortName}** kissed **${targetShortName}** on ${location}!\n\n-# Total Kisses: ${count}`,
      )
      .setColor(EMBED_COLORS.RED);

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`kiss_back_${target.id}`)
        .setLabel("Kiss Back 💋")
        .setStyle(ButtonStyle.Secondary),
    );

    const response = await sendAndFetchReply(interaction, {
      embeds: [embed],
      components: [row],
    });

    if (
      !response ||
      typeof response.createMessageComponentCollector !== "function"
    )
      return;

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 86400000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== target.id) {
        return i.reply({
          content: `Back off, creep! Nobody asked for your input.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const kisserUser = i.user;
      const kisserMember = i.member;
      const kisserId = kisserUser.id;

      let newCount = 0;
      if (serverId !== "DM") {
        newCount = await incrementUserStat(serverId, kisserId, "kissCount");
      }

      const kisserShortName = getShortDisplayName(kisserUser, kisserMember);
      const newLoc = getRandomItem(
        LOCATIONS.filter((l) => l !== location),
      ) || getRandomItem(LOCATIONS);

      let newGif = await fetchAnimeGif("kiss");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("kiss")) || newGif;
      }

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `**${kisserShortName}** kissed **${senderShortName}** back on ${newLoc}!\n\n-# Total Kisses: ${newCount}`,
        )
        .setColor(EMBED_COLORS.RED);

      if (newGif) {
        replyEmbed.setImage(newGif);
      }

      await i.followUp({ embeds: [replyEmbed] });
    });
  } catch (err) {
    logger.error("Error in Kiss command handler:", err);
    Sentry.captureException(err);
  }
}
