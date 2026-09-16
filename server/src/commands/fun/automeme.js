import {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import {
  saveAutoMemeConfig,
  deleteAutoMemeConfig,
} from "../../services/database.js";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["automeme"];

export const data = {
  name: "automeme",
  description: "Schedule automated Reddit memes in the channel.",
  dm_permission: false,
  options: [
    {
      name: "interval",
      description: "Interval between memes or off.",
      type: 3,
      required: true,
      choices: [
        { name: "Hourly (1 Hour)", value: "hourly" },
        { name: "Quarterly (6 Hours)", value: "quarterly" },
        { name: "Daily (24 Hours)", value: "daily" },
        { name: "Disable", value: "off" },
      ],
    },
  ],
};

const INTERVAL_HOURS_MAP = {
  hourly: 1,
  quarterly: 6,
  daily: 24,
};

const INTERVAL_LABELS = {
  hourly: "hourly",
  quarterly: "quarterly (every 6 hours)",
  daily: "daily (every 24 hours)",
};

export async function execute(interaction, client) {
  try {
    const guild = interaction.guild;
    const member = interaction.member;
    const isOwner = interaction.user.id === process.env.OWNER_ID;
    const hasPerms =
      isOwner || member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!hasPerms) {
      const permsRes = {
        content: "You need `Manage Channels` or `Administrator` permission to configure AutoMeme!",
        ephemeral: true,
      };
      return interaction.reply ? interaction.reply(permsRes) : null;
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
      } else if (firstWord.includes("daily") || firstWord.includes("24h") || firstWord.includes("day")) {
        intervalInput = "daily";
      } else if (firstWord.includes("quarterly") || firstWord.includes("6h") || firstWord.includes("quarter")) {
        intervalInput = "quarterly";
      } else if (firstWord.includes("hourly") || firstWord.includes("1h") || firstWord.includes("hour")) {
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
      const usageMsg =
        "Please specify a frequency! Options: `hourly`, `quarterly`, `daily`, or `off`.\nExample: `.automeme hourly`";
      return interaction.reply ? interaction.reply({ content: usageMsg }) : null;
    }

    if (intervalInput === "off") {
      await deleteAutoMemeConfig(guild.id);
      const disableEmbed = new EmbedBuilder()
        .setTitle("🛑 AutoMeme Disabled")
        .setDescription("Meme delivery has been turned off for the server.")
        .setColor(EMBED_COLORS.ERROR);
      return interaction.reply ? interaction.reply({ embeds: [disableEmbed] }) : null;
    }

    const hours = INTERVAL_HOURS_MAP[intervalInput] || 1;
    const targetChannel = interaction.channel;

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      return interaction.reply
        ? interaction.reply({
            content: "Please select a valid text channel for memes!",
            ephemeral: true,
          })
        : null;
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

    const intervalLabel = INTERVAL_LABELS[intervalInput] || `${hours} hours`;

    const confirmEmbed = new EmbedBuilder()
      .setTitle("AutoMeme Enabled!")
      .setDescription(
        `Tars will now post fresh Reddit memes in ${targetChannel} every **${intervalLabel}**!`,
      )
      .addFields({
        name: "<:Timer:1542147643021725796> Next Meme Scheduled",
        value: `<t:${Math.floor(nextPostAt / 1000)}:R>`,
      })
      .setColor(EMBED_COLORS.SUCCESS);

    return interaction.reply ? interaction.reply({ embeds: [confirmEmbed] }) : null;
  } catch (err) {
    logger.error("Error in AutoMeme command execution:", err);
    Sentry.captureException(err);
    const errRes = { content: "An error occurred while configuring AutoMeme.", ephemeral: true };
    return interaction.reply ? interaction.reply(errRes) : null;
  }
}
