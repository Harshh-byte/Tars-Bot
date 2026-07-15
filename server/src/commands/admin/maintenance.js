import { EmbedBuilder, MessageFlags, ActivityType } from "discord.js";
import { errorEmbed } from "../../utils/embeds.js";
import fs from "fs";

export const data = {
  name: "maintenance",
  description: "Manage system-wide maintenance mode.",
  dm_permission: false,
  options: [
    {
      type: 1,
      name: "start",
      description: "Start maintenance mode and block commands for normal users.",
    },
    {
      type: 1,
      name: "complete",
      description: "Complete maintenance mode and restore normal operations.",
    },
  ],
};

export async function execute(interaction, client) {
  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({
      embeds: [
        errorEmbed({
          title: "Access Denied",
          description: "Only the bot owner can use this command.",
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "start") {
    try {
      const botAvatar = client.user.displayAvatarURL({
        extension: "png",
        size: 256,
      });

      const startEmbed = new EmbedBuilder()
        .setColor(0x34495e)
        .setAuthor({
          name: "Tars Update",
          iconURL: botAvatar,
        })
        .setTitle("<a:Maintenance:1526290002974343308> **Maintenance Started**")
        .setDescription(
          "The bot is temporarily offline for a system update. Thank you for your patience.",
        )
        .setTimestamp();

      const startMsg = await interaction.channel.send({ embeds: [startEmbed] });

      client.maintenanceMode = true;
      fs.writeFileSync(
        new URL("../../../../maintenance.json", import.meta.url),
        JSON.stringify(
          {
            active: true,
            messageId: startMsg.id,
            channelId: startMsg.channel.id,
          },
          null,
          2
        )
      );

      return interaction.reply({
        content: "<a:Maintenance:1526290002974343308> Tars is going under maintenance.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      return interaction.reply({
        content: `<:Failed:1526228290413658184> Failed to start maintenance mode: \`${err.message || err}\``,
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (subcommand === "complete") {
    try {
      client.maintenanceMode = false;
  
      let messageId = null;
      let channelId = null;
      try {
        const savedData = JSON.parse(
          fs.readFileSync(new URL("../../../../maintenance.json", import.meta.url), "utf-8")
        );
        messageId = savedData.messageId;
        channelId = savedData.channelId;
      } catch (e) {
      }
  
      fs.writeFileSync(
        new URL("../../../../maintenance.json", import.meta.url),
        JSON.stringify({ active: false }, null, 2)
      );

      const botAvatar = client.user.displayAvatarURL({
        extension: "png",
        size: 256,
      });

      const completeEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({
          name: "Tars Update",
          iconURL: botAvatar,
        })
        .setTitle("<a:Complete:1526291398863880293> **Maintenance Completed**")
        .setDescription(
          "Tars update completed successfully. All features are now fully functional.",
        )
        .setTimestamp();

      let edited = false;
      if (messageId && channelId) {
        try {
          const targetChannel = await client.channels.fetch(channelId);
          if (targetChannel) {
            const startMsg = await targetChannel.messages.fetch(messageId);
            if (startMsg) {
              await startMsg.edit({ embeds: [completeEmbed] });
              edited = true;
            }
          }
        } catch (err) {
        }
      }

      if (!edited) {
        await interaction.channel.send({ embeds: [completeEmbed] });
      }

      return interaction.reply({
        content: "<a:Complete:1526291398863880293> Tars is back online.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      return interaction.reply({
        content: `<:Failed:1526228290413658184> Failed to complete maintenance mode: \`${err.message || err}\``,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
