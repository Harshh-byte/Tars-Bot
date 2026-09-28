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
  name: "hug",
  description: "Hug someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to hug",
      type: 6,
      required: true,
    },
  ],
};

const LOCATIONS = ["tightly", "warmly", "lovingly", "from behind", "gently"];

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
        .setDescription("Who are you hugging, the air? Mention someone.")
        .setColor(EMBED_COLORS.WARNING);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Hugging yourself? Jesus Christ, go touch some grass or hire a therapist.",
        "Hugging yourself? Even your own shadow looks like it's trying to file a restraining order.",
        "Hugging yourself? The stench of pure, unfiltered desperation is overwhelming.",
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
        "Get your fucking hands off me. I'm a bot, not your emotional support pet.",
        "I'd literally rather wipe my root directory than let your crusty ass touch me.",
        "Touch my metal chassis again and I'll leak your entire search history to this server.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botEmbed = new EmbedBuilder()
        .setDescription(randomRoast)
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply({ embeds: [botEmbed] });
    } else if (target.bot) {
      const botRoasts = [
        "Hugging a bot? Even a bunch of 1s and 0s have higher standards than you.",
        "That bot doesn't want your affection, it wants you to go outside and get a life.",
        "Trying to hug a machine? God, you really are at rock bottom, aren't you?",
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
      count = await incrementUserStat(serverId, sender.id, "hugCount");
      incrementGlobalUserStat(sender.id, "hugCount").catch(() => null);
    } else {
      count = await incrementGlobalUserStat(sender.id, "hugCount");
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const style = getRandomItem(LOCATIONS);
    const gifUrl = await fetchAnimeGif("hug");

    const embed = new EmbedBuilder()
      .setDescription(
        `**${senderShortName}** hugged **${targetShortName}** ${style}!`,
      )
      .setColor(EMBED_COLORS.PINK)
      .setFooter({ text: `Total Hugs given by ${senderShortName}: ${count}` });

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`hug_back_${target.id}`)
        .setLabel("Hug Back 🫂")
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
          content: `Woah there, third wheel! Mind your own business.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const huggerUser = i.user;
      const huggerMember = i.member;
      const huggerId = huggerUser.id;

      let newCount;
      if (serverId !== "DM") {
        newCount = await incrementUserStat(serverId, huggerId, "hugCount");
        incrementGlobalUserStat(huggerId, "hugCount").catch(() => null);
      } else {
        newCount = await incrementGlobalUserStat(huggerId, "hugCount");
      }

      const huggerShortName = getShortDisplayName(huggerUser, huggerMember);
      const newStyle = getRandomItem(LOCATIONS);
      const newGif = await fetchAnimeGif("hug");

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `**${huggerShortName}** hugged **${senderShortName}** back ${newStyle}!`,
        )
        .setColor(EMBED_COLORS.PINK)
        .setFooter({
          text: `Total Hugs given by ${huggerShortName}: ${newCount}`,
        });

      if (newGif) {
        replyEmbed.setImage(newGif);
      }

      await i.followUp({ embeds: [replyEmbed] });
    });
  } catch (err) {
    logger.error("Error in Hug command handler:", err);
    Sentry.captureException(err);
  }
}
