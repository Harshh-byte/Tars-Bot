import fs from "fs";

const filePath = "d:/Music Bot/src/events/distubeEvents.js";
let content = fs.readFileSync(filePath, "utf-8");

const oldCode = `distube.on("error", (channel, error) => {
    logger.error("DisTube Error:", error);
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.ERROR)
      .setTitle("❌ **Audio Engine Error**")
      .setDescription(\`An error occurred while playing: \\\`\${error.message || error}\\\`\`);

    if (channel) {
      channel.send({ embeds: [embed] }).catch(() => null);
    }
  });`;

const newCode = `distube.on("error", (error, queue, song) => {
    logger.error("DisTube Error:", error);
    const textChannel = queue?.textChannel || (queue && typeof queue.send === "function" ? queue : null);
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.ERROR)
      .setTitle("❌ **Audio Engine Error**")
      .setDescription(\`An error occurred while playing: \\\`\${error?.message || error}\\\`\`);

    if (textChannel && typeof textChannel.send === "function") {
      textChannel.send({ embeds: [embed] }).catch(() => null);
    }
  });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated distubeEvents.js error listener.");
