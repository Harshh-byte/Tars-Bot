import { EmbedBuilder } from "discord.js";
export function infoEmbed({
  title,
  description,
  fields = [],
  thumbnail,
  footer,
  author,
}) {
  const embed = new EmbedBuilder().setColor(0x5865f2);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (footer)
    embed.setFooter({
      text: footer,
    });
  if (author) embed.setAuthor(author);
  return embed;
}
export function successEmbed({ title = "Success", description, fields = [] }) {
  const embed = new EmbedBuilder().setColor(0x57f287).setTitle(`✅ ${title}`);
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  return embed;
}
export function errorEmbed({ title = "Something went wrong", description }) {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`❌ ${title}`)
    .setDescription(
      description ?? "An unexpected error occurred. Please try again later.",
    );
}
export function warningEmbed({ title = "Warning", description }) {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}
