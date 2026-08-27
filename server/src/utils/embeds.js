import { EmbedBuilder } from "discord.js";

export const EMBED_COLORS = {
  INFO: 0x5865f2,
  SUCCESS: 0x2ecc71,
  ERROR: 0xff4757,
  WARNING: 0xffa502,
  GREY: 0x2b2d31,
  WHITE: 0xffffff,
  TIMEOUT: 0x2b2d31,
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
    .setTitle(`<:Success:1526228339910643793> **${title}**`);
  if (author) embed.setAuthor(author);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  return embed;
}

export function errorEmbed({ title, description, author }) {
  const embed = new EmbedBuilder().setColor(EMBED_COLORS.ERROR);
  if (author) embed.setAuthor(author);
  if (title) embed.setTitle(`<:Failed:1526228290413658184> **${title}**`);
  if (description) embed.setDescription(description);
  return embed;
}

export function warningEmbed({ title = "Warning", description, author }) {
  const embed = new EmbedBuilder().setColor(EMBED_COLORS.WARNING);
  if (author) embed.setAuthor(author);
  if (title) embed.setTitle(`<:Warning:1526228248458035381> **${title}**`);
  if (description) embed.setDescription(description);
  return embed;
}
