import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { errorEmbed } from "../../utils/embeds.js";
import fs from "fs";

export const data = {
  name: "maintenance",
  description: "Manage maintenance mode.",
  dm_permission: false,
  default_member_permissions: PermissionFlagsBits.Administrator.toString(),
  options: [
    {
      type: 1,
      name: "start",
      description: "Start maintenance mode.",
    },
    {
      type: 1,
      name: "complete",
      description: "Complete maintenance mode.",
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
      const v2StartContainerPayload = {
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 0x34495e,
            components: [
              {
                type: 10,
                content: "### <a:Maintenance:1526290002974343308> Maintenance Started",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content:
                  "The bot is temporarily offline for a scheduled system update and maintenance. Thank you for your patience!\n\n-# Status: Offline • Maintenance Active",
              },
            ],
          },
        ],
      };

      const startMsg = await interaction.channel.send(v2StartContainerPayload);

      const startTime = Date.now();
      client.maintenanceMode = true;
      client.maintenanceStartTime = startTime;
      if (typeof client.updateBotPresence === "function") {
        client.updateBotPresence();
      }
      fs.writeFileSync(
        new URL("../../../../maintenance.json", import.meta.url),
        JSON.stringify(
          {
            active: true,
            messageId: startMsg.id,
            channelId: startMsg.channel.id,
            startTime: startTime,
          },
          null,
          2
        )
      );

      return interaction.reply({
        content: "<a:Maintenance:1526290002974343308> **Tars is now under maintenance mode.**",
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
      client.maintenanceStartTime = null;
      if (typeof client.updateBotPresence === "function") {
        client.updateBotPresence();
      }

      let messageId = null;
      let channelId = null;
      try {
        const savedData = JSON.parse(
          fs.readFileSync(new URL("../../../../maintenance.json", import.meta.url), "utf-8")
        );
        messageId = savedData.messageId;
        channelId = savedData.channelId;
      } catch (e) {}

      fs.writeFileSync(
        new URL("../../../../maintenance.json", import.meta.url),
        JSON.stringify({ active: false }, null, 2)
      );

      const v2CompleteContainerPayload = {
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 0x2ecc71,
            components: [
              {
                type: 10,
                content: "### <a:Complete:1526291398863880293> Maintenance Completed",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content:
                  "Tars update completed successfully. All features, commands, and systems are now fully operational!\n\n-# Status: Online • Systems Operational",
              },
            ],
          },
        ],
      };

      let repliedToStart = false;
      if (messageId && channelId) {
        try {
          const targetChannel = await client.channels.fetch(channelId);
          if (targetChannel) {
            const startMsg = await targetChannel.messages.fetch(messageId);
            if (startMsg) {
              await startMsg.reply(v2CompleteContainerPayload);
              repliedToStart = true;
            }
          }
        } catch (err) {}
      }

      if (!repliedToStart) {
        await interaction.channel.send(v2CompleteContainerPayload);
      }

      return interaction.reply({
        content: "<a:Complete:1526291398863880293> **Tars maintenance mode completed!**",
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
