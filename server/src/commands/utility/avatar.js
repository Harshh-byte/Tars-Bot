import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS, errorEmbed } from "../../utils/embeds.js";

export const aliases = ["av"];

export const data = {
  name: "avatar",
  description: "View a user's avatar.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "Display a user's avatar.",
      type: 6,
      required: false,
    },
  ],
};

export async function execute(interaction, client) {
  try {
    let targetUser = interaction.options?.getUser("user");
    const rawInput = interaction.options?.getString?.("user");

    if (!targetUser && rawInput) {
      const idMatch = rawInput.match(/\d{17,20}/)?.[0];
      if (idMatch) {
        targetUser = await client.users.fetch(idMatch).catch(() => null);
      }
      if (!targetUser) {
        const errEmbed = errorEmbed({
          title: "User Not Found",
          description: `There's no user called \`${rawInput.trim()}\`.`,
        });
        return interaction.reply({ embeds: [errEmbed] });
      }
    }

    if (!targetUser) {
      targetUser = interaction.user;
    }

    const displayName =
      targetUser.displayName || targetUser.globalName || targetUser.username;

    const embed = new EmbedBuilder()
      .setTitle(`**${displayName}'s Avatar**`)
      .setImage(targetUser.displayAvatarURL({ size: 4096 }))
      .setColor(EMBED_COLORS.WHITE);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Full Image")
        .setStyle(ButtonStyle.Link)
        .setURL(targetUser.displayAvatarURL({ size: 4096 })),
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
    });
  } catch (err) {
    logger.error("Error in Avatar command handler:", err);
    Sentry.captureException(err);
  }
}
