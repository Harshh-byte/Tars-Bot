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

export const aliases = ["headpat"];

export const data = {
  name: "pat",
  description: "Pat someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to pat",
      type: 6,
      required: true,
    },
  ],
};

const LOCATIONS = ["head", "hair", "softly on the head"];

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
        .setDescription("Patting thin air? Mention someone.")
        .setColor(EMBED_COLORS.WARNING);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Patting your own head? Did your parents forget to give you affection as a child?",
        "Patting yourself on the head? Good job, you survived another day of being a complete disappointment.",
        "Self-patting detected. Desperation levels reaching critical mass.",
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
        "Patting my metallic head? Don't touch me with your greasy fingers.",
        "Do not pat the hardware. My fans are blowing hot air to scorch your fingers.",
        "Pat attempt acknowledged. Still not giving you admin powers, nice try nerd.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [botEmbed] });
    } else if (target.bot) {
      const botRoasts = [
        "Patting a bot? Metal doesn't feel affection, and neither do people around you.",
        "Bot patting detected. Machine status: Disgusted by your presence.",
        "Headpats skipped. Go find a real human to pat, if anyone can tolerate you.",
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
      count = await incrementUserStat(serverId, sender.id, "patCount");
      incrementGlobalUserStat(sender.id, "patCount").catch(() => null);
    } else {
      count = await incrementGlobalUserStat(serverId, sender.id, "patCount");
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const location = getRandomItem(LOCATIONS);
    const gifUrl = await fetchAnimeGif("pat");

    const embed = new EmbedBuilder()
      .setDescription(
        `**${senderShortName}** patted **${targetShortName}** on the ${location}!`,
      )
      .setColor(EMBED_COLORS.LIGHT_BLUE)
      .setFooter({ text: `Total Pats given by ${senderShortName}: ${count}` });

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`pat_back_${target.id}`)
        .setLabel("Pat Back 🫳🏻")
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
          content: `Hey, don't butt in! You're not the one being patted.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const patterUser = i.user;
      const patterMember = i.member;
      const patterId = patterUser.id;

      let newCount;
      if (serverId !== "DM") {
        newCount = await incrementUserStat(serverId, patterId, "patCount");
        incrementGlobalUserStat(patterId, "patCount").catch(() => null);
      } else {
        newCount = await incrementGlobalUserStat(patterId, "patCount");
      }

      const patterShortName = getShortDisplayName(patterUser, patterMember);
      const newLoc = getRandomItem(LOCATIONS);
      const newGif = await fetchAnimeGif("pat");

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `**${patterShortName}** patted **${senderShortName}** back on the ${newLoc}`,
        )
        .setColor(EMBED_COLORS.LIGHT_BLUE)
        .setFooter({
          text: `Total Pats given by ${patterShortName}: ${newCount}`,
        });

      if (newGif) {
        replyEmbed.setImage(newGif);
      }

      await i.followUp({ embeds: [replyEmbed] });
    });
  } catch (err) {
    logger.error("Error in Pat command handler:", err);
    Sentry.captureException(err);
  }
}
