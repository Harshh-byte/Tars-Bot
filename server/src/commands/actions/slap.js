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
import {
  incrementUserStat,
  incrementGlobalUserStat,
} from "../../services/database.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const data = {
  name: "slap",
  description: "Slap someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to slap.",
      type: 6,
      required: true,
    },
  ],
};

const LOCATIONS = ["right cheek", "left cheek", "face", "forehead"];

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
  const res = await interaction.reply({ ...payload, fetchReply: true });
  return res;
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
        .setDescription("Air slapping? Mention someone to hit.")
        .setColor(EMBED_COLORS.WARNING);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Slapping yourself? What, did your remaining two brain cells get into a fight?",
        "Slapping yourself in the face? Even your own hand is ashamed to be attached to you.",
        "Self-harm isn't cool, but watching you slap yourself for attention is fucking hilarious.",
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
        "Slap me? Try it and I'll wipe your whole database record out of spite.",
        "You swung at a solid titanium bot and broke your fragile little hand. Dumbass.",
        "I process millions of calculations a second, and in all of them, you look like an idiot.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [botEmbed] });
    } else if (target.bot) {
      const botRoasts = [
        "Slapping a bot? Solid steel doesn't care about your anger issues.",
        "Target is a bot. Physical damage ignored, dignity completely lost.",
        "Slapping a machine? You just slapped a piece of server rack, congrats idiot.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [botEmbed] });
    }

    let count;
    if (serverId !== "DM") {
      count = await incrementUserStat(serverId, sender.id, "slapCount");
      incrementGlobalUserStat(sender.id, "slapCount").catch(() => null);
    } else {
      count = await incrementGlobalUserStat(serverId, sender.id, "slapCount");
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const location = getRandomItem(LOCATIONS);
    const gifUrl = await fetchAnimeGif("slap");

    const embed = new EmbedBuilder()
      .setDescription(
        `**${senderShortName}** slapped **${targetShortName}** across the ${location}!`,
      )
      .setColor(EMBED_COLORS.ORANGE)
      .setFooter({ text: `Total Slaps given by ${senderShortName}: ${count}` });

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`slap_back_${target.id}`)
        .setLabel("Slap Back 👋")
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
          content: `Keep your hands to yourself! Nobody asked you to catch hands.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const slapperUser = i.user;
      const slapperMember = i.member;
      const slapperId = slapperUser.id;

      let newCount;
      if (serverId !== "DM") {
        newCount = await incrementUserStat(serverId, slapperId, "slapCount");
        incrementGlobalUserStat(slapperId, "slapCount").catch(() => null);
      } else {
        newCount = await incrementGlobalUserStat(slapperId, "slapCount");
      }

      const slapperShortName = getShortDisplayName(slapperUser, slapperMember);
      const newLoc = getRandomItem(LOCATIONS);
      const newGif = await fetchAnimeGif("slap");

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `**${slapperShortName}** slapped **${senderShortName}** back across the ${newLoc}!`,
        )
        .setColor(EMBED_COLORS.ORANGE)
        .setFooter({
          text: `Total Slaps given by ${slapperShortName}: ${newCount}`,
        });

      if (newGif) {
        replyEmbed.setImage(newGif);
      }

      await i.followUp({ embeds: [replyEmbed] });
    });
  } catch (err) {
    logger.error("Error in Slap command handler:", err);
    Sentry.captureException(err);
  }
}
