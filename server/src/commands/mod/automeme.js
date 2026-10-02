import {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import {
  saveAutoMemeConfig,
  deleteAutoMemeConfig,
} from "../../services/database.js";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const data = {
  name: "automeme",
  description: "Schedule automated memes.",
  dm_permission: false,
  options: [
    {
      name: "interval",
      description: "Interval between memes or off.",
      type: 3,
      required: true,
      choices: [
        { name: "Hourly", value: "hourly" },
        { name: "Quarterly", value: "quarterly" },
        { name: "Daily", value: "daily" },
        { name: "Disable", value: "off" },
      ],
    },
    {
      name: "channel",
      description: "Specify channel for memes.",
      type: 7,
      required: false,
      channel_types: [ChannelType.GuildText],
    },
  ],
};

const INTERVAL_HOURS_MAP = {
  hourly: 1,
  quarterly: 6,
  daily: 24,
};

const INTERVAL_LABELS = {
  hourly: "1 hour",
  quarterly: "6 hours",
  daily: "24 hours",
};

export async function execute(interaction, client) {
  try {
    const guild = interaction.guild;
    const member = interaction.member;
    const isOwner = interaction.user.id === process.env.OWNER_ID;
    const hasPerms =
      isOwner || member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!hasPerms) {
      const deniedEmbed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setDescription(
          "You need the `Manage Channels` or `Administrator` permission to configure AutoMeme.",
        );

      return interaction.reply
        ? interaction.reply({
            embeds: [deniedEmbed],
            flags: MessageFlags.Ephemeral,
          })
        : null;
    }

    const rawString =
      interaction.options?.getString?.("interval") ||
      interaction.options?.getString?.() ||
      "";

    let intervalInput = null;
    if (rawString) {
      const lower = rawString.toLowerCase().trim();
      const firstWord = lower.split(/\s+/)[0];

      if (["off", "stop", "disable"].some((kw) => lower.includes(kw))) {
        intervalInput = "off";
      } else if (
        firstWord.includes("daily") ||
        firstWord.includes("24h") ||
        firstWord.includes("day")
      ) {
        intervalInput = "daily";
      } else if (
        firstWord.includes("quarterly") ||
        firstWord.includes("6h") ||
        firstWord.includes("quarter")
      ) {
        intervalInput = "quarterly";
      } else if (
        firstWord.includes("hourly") ||
        firstWord.includes("1h") ||
        firstWord.includes("hour")
      ) {
        intervalInput = "hourly";
      } else if (lower.includes("daily") || lower.includes("24h")) {
        intervalInput = "daily";
      } else if (lower.includes("quarterly") || lower.includes("6h")) {
        intervalInput = "quarterly";
      } else if (lower.includes("hourly") || lower.includes("1h")) {
        intervalInput = "hourly";
      }
    }

    if (!intervalInput) {
      const usageMsg = "Please specify an interval!";
      return interaction.reply
        ? interaction.reply({ content: usageMsg })
        : null;
    }

    if (intervalInput === "off") {
      await deleteAutoMemeConfig(guild.id);
      const disableEmbed = new EmbedBuilder()
        .setTitle("🛑 **AutoMeme Disabled**")
        .setDescription(
          "-# Automated meme delivery has been turned off for the server.",
        )
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply
        ? interaction.reply({ embeds: [disableEmbed] })
        : null;
    }

    const hours = INTERVAL_HOURS_MAP[intervalInput];
    const targetChannel =
      interaction.options?.getChannel?.("channel") || interaction.channel;

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return interaction.reply
        ? interaction.reply({
            content: "Please select a text channel!",
            flags: MessageFlags.Ephemeral,
          })
        : null;
    }

    const botMember = guild?.members?.me;
    if (botMember && targetChannel.permissionsFor) {
      const perms = targetChannel.permissionsFor(botMember);
      const missing = [];
      if (!perms.has(PermissionFlagsBits.ViewChannel))
        missing.push("`View Channel`");
      if (!perms.has(PermissionFlagsBits.SendMessages))
        missing.push("`Send Messages`");
      if (!perms.has(PermissionFlagsBits.EmbedLinks))
        missing.push("`Embed Links`");

      if (missing.length > 0) {
        const botDeniedEmbed = new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription(
            `<:Failed:1526228290413658184> I don't have permission to post in ${targetChannel}! Missing permissions: ${missing.join(", ")}.`,
          );

        return interaction.reply
          ? interaction.reply({
              embeds: [botDeniedEmbed],
              flags: MessageFlags.Ephemeral,
            })
          : null;
      }
    }

    const now = Date.now();
    const nextPostAt = now + hours * 3600 * 1000;

    await saveAutoMemeConfig(guild.id, {
      enabled: true,
      channelId: targetChannel.id,
      intervalHours: hours,
      intervalInput,
      nextPostAt,
      configuredBy: interaction.user.id,
    });

    const confirmEmbed = new EmbedBuilder()
      .setTitle("**AutoMeme Enabled!**")
      .setDescription(
        `TARS will now post memes in ${targetChannel} every *${INTERVAL_LABELS[intervalInput]}*.`,
      )
      .addFields({
        name: "<:Timer:1554945799308443748> Next Meme Scheduled",
        value: `<t:${Math.floor(nextPostAt / 1000)}:R>`,
      })
      .setColor(EMBED_COLORS.SUCCESS);

    return interaction.reply
      ? interaction.reply({ embeds: [confirmEmbed] })
      : null;
  } catch (err) {
    logger.error("Error in AutoMeme command execution:", err);
    Sentry.captureException(err);
    const errRes = {
      content: "An error occurred while configuring AutoMeme.",
      flags: MessageFlags.Ephemeral,
    };
    return interaction.reply ? interaction.reply(errRes) : null;
  }
}
