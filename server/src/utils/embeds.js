import { EmbedBuilder } from "discord.js";
import { EMOJIS } from "./emojis.js";

export const EMBED_COLORS = {
  INFO: 0x5865f2,
  SUCCESS: 0x2ecc71,
  ERROR: 0xff0055,
  WARNING: 0xffa502,
  GREY: 0x2b2d31,
  WHITE: 0xffffff,
  TIMEOUT: 0x2b2d31,
  DAYBREAK: 0xffb703,
  IMPOSTOR_WIN: 0xdc2626,
  PINK: 0xff69b4,
  RED: 0xff0055,
  ORANGE: 0xff6600,
  LIGHT_BLUE: 0x00ccff,
  DARK_RED: 0x990000,
};

export function infoEmbed({
  title,
  description,
  fields = [],
  thumbnail,
  footer,
  author,
}) {
  const embed = new EmbedBuilder().setColor(EMBED_COLORS.INFO);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (footer) embed.setFooter({ text: footer });
  if (author) embed.setAuthor(author);
  return embed;
}

export function successEmbed({
  title = "Success",
  description,
  fields = [],
  author,
}) {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.SUCCESS)
    .setTitle(`${EMOJIS.Success} **${title}**`);
  if (author) embed.setAuthor(author);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  return embed;
}

export function errorEmbed({ title = "Error", description, author }) {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.ERROR)
    .setTitle(`${EMOJIS.Failed} **${title}**`);
  if (author) embed.setAuthor(author);
  if (description) embed.setDescription(description);
  return embed;
}

export function warningEmbed({ title = "Warning", description, author }) {
  const embed = new EmbedBuilder().setColor(EMBED_COLORS.WARNING);
  if (author) embed.setAuthor(author);
  if (title) embed.setTitle(`${EMOJIS.Warning} **${title}**`);
  if (description) embed.setDescription(description);
  return embed;
}

export function accessDeniedEmbed(
  description = "Only the bot owner can execute this command.",
) {
  return errorEmbed({
    title: "Access Denied",
    description,
  });
}
