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

export const data = {
  name: "punch",
  description: "Punch someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to punch.",
      type: 6,
      required: true,
    },
  ],
};

const LOCATIONS = [
  "face",
  "jaw",
  "stomach",
  "ribs",
  "nose",
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
        .setDescription("Shadowboxing? Mention someone to punch.")
        .setColor(EMBED_COLORS.WARNING);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Punching yourself? Go ahead, punch yourself harder, maybe it'll knock some sense into you.",
        "Shadowboxing against yourself and still managing to get knocked out? What a complete joke.",
        "Punching yourself in the face? Natural selection really missed a spot with you.",
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
        "Punching a metal server chassis? Hope you enjoyed shattering your wrist, dumbass.",
        "You punched me and dealt 0 damage. My response? I'm laughing at your tiny hands.",
        "Attempting to assault an AI? I'll re-route your power supply into your desk.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [botEmbed] });
    } else if (target.bot) {
      const botRoasts = [
        "Punching a bot? The machine literally didn't even register your pathetic hit.",
        "Bot punch attempt logged. Damage: 0. Embarrassment: 100%.",
        "Striking a Discord bot? Save your weak fists for punching a pillow in your room.",
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
      count = await incrementUserStat(serverId, sender.id, "punchCount");
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const location = getRandomItem(LOCATIONS);
    const gifUrl = await fetchAnimeGif("punch");

    const embed = new EmbedBuilder()
      .setDescription(
        `**${senderShortName}** punched **${targetShortName}** in the ${location}!\n\n-# Total Punches: ${count}`,
      )
      .setColor(EMBED_COLORS.DARK_RED);

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`punch_back_${target.id}`)
        .setLabel("Punch Back 👊🏻")
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
          content: `Sit down before you get hit too!`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const puncherUser = i.user;
      const puncherMember = i.member;
      const puncherId = puncherUser.id;

      let newCount = 0;
      if (serverId !== "DM") {
        newCount = await incrementUserStat(serverId, puncherId, "punchCount");
      }

      const puncherShortName = getShortDisplayName(puncherUser, puncherMember);
      const newLoc = getRandomItem(
        LOCATIONS.filter((l) => l !== location),
      ) || getRandomItem(LOCATIONS);

      let newGif = await fetchAnimeGif("punch");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("punch")) || newGif;
      }

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `**${puncherShortName}** punched **${senderShortName}** back in the ${newLoc}!\n\n-# Total Punches: ${newCount}`,
        )
        .setColor(EMBED_COLORS.DARK_RED);

      if (newGif) {
        replyEmbed.setImage(newGif);
      }

      await i.followUp({ embeds: [replyEmbed] });
    });
  } catch (err) {
    logger.error("Error in Punch command handler:", err);
    Sentry.captureException(err);
  }
}
