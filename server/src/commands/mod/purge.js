import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from "discord.js";
import { deleteUserData, deleteServerData } from "../../services/database.js";
import { successEmbed, warningEmbed, errorEmbed } from "../../utils/embeds.js";
export const data = {
  name: "purge",
  description: "Delete stored bot memory.",
  dm_permission: false,
  options: [
    {
      type: 1,
      name: "user",
      description: "Delete one user's memory.",
      options: [
        {
          name: "user",
          description: "User whose memory should be deleted.",
          type: 6,
          required: true,
        },
      ],
    },
    {
      type: 1,
      name: "server",
      description: "Delete every stored memory in this server.",
    },
  ],
};
export async function execute(interaction) {
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
  switch (subcommand) {
    case "user":
      return purgeUser(interaction);
    case "server":
      return purgeServer(interaction);
    default:
      return interaction.reply({
        embeds: [
          errorEmbed({
            title: "Unknown Subcommand",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
  }
}
async function purgeUser(interaction) {
  const user = interaction.options.getUser("user");
  try {
    await deleteUserData(interaction.guild.id, user.id);
    return interaction.reply({
      embeds: [
        successEmbed({
          title: "Memory Purged",
          description: `Successfully erased all stored memory for **${user.tag}**.`,
          fields: [
            {
              name: "Deleted Data",
              value:
                "• Conversation history\n" +
                "• Saved profile\n" +
                "• AI context & memory",
            },
            {
              name: "Requested By",
              value: `<@${interaction.user.id}>`,
              inline: true,
            },
            {
              name: "User",
              value: `<@${user.id}>`,
              inline: true,
            },
          ],
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    return interaction.reply({
      embeds: [
        errorEmbed({
          title: "Purge Failed",
          description:
            "I couldn't delete this user's stored memory. Please try again later.",
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}
async function purgeServer(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("purge_confirm")
      .setLabel("Delete Everything")
      .setEmoji("1526228290413658184")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("purge_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );
  await interaction.reply({
    embeds: [
      warningEmbed({
        title: "Delete Server Memory?",
        description:
          "This will permanently delete every stored memory for this server. This action cannot be undone.",
      }),
    ],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
  const reply = await interaction.fetchReply();
  try {
    const button = await reply.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: (i) => i.user.id === interaction.user.id,
    });
    if (button.customId === "purge_cancel") {
      return button.update({
        embeds: [
          warningEmbed({
            title: "Cancelled",
            description: "The server memory purge has been cancelled.",
          }),
        ],
        components: [],
      });
    }
    await deleteServerData(interaction.guild.id);
    return button.update({
      embeds: [
        successEmbed({
          title: "Server Memory Purged",
          description: `Successfully deleted all stored memory for **${interaction.guild.name}**.`,
          fields: [
            {
              name: "Deleted Data",
              value:
                "• All conversation history\n" +
                "• All member profiles\n" +
                "• AI memory\n" +
                "• Server settings",
            },
            {
              name: "Requested By",
              value: `<@${interaction.user.id}>`,
              inline: true,
            },
          ],
        }),
      ],
      components: [],
    });
  } catch (error) {
    return interaction.editReply({
      embeds: [
        warningEmbed({
          title: "Confirmation Expired",
          description:
            "No response was received within 30 seconds. The purge operation has been cancelled.",
        }),
      ],
      components: [],
    });
  }
}
