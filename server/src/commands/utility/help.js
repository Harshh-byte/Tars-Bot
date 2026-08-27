import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["h"];

export const data = {
  name: "help",
  description: "View available commands or get help for a specific command.",
  dm_permission: false,
  options: [
    {
      name: "command",
      description: "Specific command name or alias to inspect",
      type: 3,
      required: false,
    },
  ],
};

export async function execute(interaction, client) {
  try {
    const serverId = interaction.guild?.id || "DM";
    const prefix = client.prefixCache?.get(serverId) || ".";
    const botAvatar = client.user?.displayAvatarURL({ dynamic: true }) || null;

    let queryCmd =
      interaction.options?.getString("command") ||
      interaction.options?.getString();
    if (typeof queryCmd === "string") {
      queryCmd = queryCmd.trim().split(/ +/)[0].toLowerCase();
    }

    if (queryCmd) {
      const targetCmd = client.commands?.get(queryCmd);

      if (!targetCmd) {
        const notFoundEmbed = new EmbedBuilder()
          .setTitle("<:Failed:1526228290413658184> Command Not Found")
          .setDescription(
            `No command or alias found for \`${queryCmd}\`.\nType \`${prefix}help\` to view all commands.`,
          )
          .setColor(EMBED_COLORS.ERROR);
        return interaction.reply({ embeds: [notFoundEmbed] });
      }

      const cmdName = targetCmd.data.name;
      const cmdDesc = targetCmd.data.description || "No description provided.";
      const cmdAliases =
        targetCmd.aliases && targetCmd.aliases.length > 0
          ? targetCmd.aliases.map((a) => `\`${prefix}${a}\``).join(", ")
          : "None";

      const detailEmbed = new EmbedBuilder()
        .setTitle(
          `<:Book:1542272264710397992> **Command: ${prefix}${cmdName}**`,
        )
        .setDescription(cmdDesc)
        .addFields(
          {
            name: "Usage",
            value: `\`${prefix}${cmdName}\` or \`/${cmdName}\``,
            inline: true,
          },
          { name: "Aliases", value: cmdAliases, inline: true },
        )
        .setThumbnail(botAvatar)
        .setColor(EMBED_COLORS.GREY);

      return interaction.reply({ embeds: [detailEmbed] });
    }

    const totalCommands = new Set(client.commands?.values()).size || 11;
    const totalModules = 2;

    const bookNotice = `<:Book:1542272264710397992> Use \`${prefix}help (command)\` for details on a specific command`;

    const mainEmbed = new EmbedBuilder()
      .setTitle("Tars Help")
      .setDescription(
        "-# Experience the ultimate Discord bot designed for seamless management and community engagement.",
      )
      .addFields(
        {
          name: "\u200b",
          value: `<:Prefix:1542236764465274910> **Prefix** \`${prefix}\`\n<:Commands:1542236622521901088> **Commands** \`${totalCommands}\`\n<:Modules:1542236707599163422> **Modules** \`${totalModules}\``,
        },
        {
          name: "\u200b",
          value: bookNotice,
        },
      )
      .setThumbnail(botAvatar)
      .setColor(EMBED_COLORS.GREY);

    const buildMenu = (defaultValue = "module_home") => {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("help_category_select")
        .setPlaceholder("Select a module...")
        .addOptions([
          {
            label: "Home",
            description: "Main bot overview and system statistics.",
            value: "module_home",
            emoji: "<:Home:1542239907584409672>",
            default: defaultValue === "module_home",
          },
          {
            label: "Fun",
            description: "Interactive games, fun tools, and entertainment.",
            value: "module_games",
            emoji: "<:Fun:1542240014388170772>",
            default: defaultValue === "module_games",
          },
          {
            label: "Utility",
            description: "Prefix configuration, latency, and system status.",
            value: "module_utility",
            emoji: "<:Utility:1542239958612320306>",
            default: defaultValue === "module_utility",
          },
        ]);
      return new ActionRowBuilder().addComponents(menu);
    };

    const replyPayload = {
      embeds: [mainEmbed],
      components: [buildMenu("module_home")],
    };

    let response;
    if (interaction.replied || interaction.deferred) {
      response = await interaction.followUp({
        ...replyPayload,
        fetchReply: true,
      });
    } else if (
      typeof interaction.isStringSelectMenu === "function" &&
      interaction.isStringSelectMenu()
    ) {
      await interaction.update(replyPayload);
      response = await interaction.fetchReply();
    } else {
      response = await interaction.reply({ ...replyPayload, fetchReply: true });
    }

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.customId === "help_category_select",
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "Use `/help` or `.help` to open your own menu!",
          ephemeral: true,
        });
      }

      const selected = i.values[0];
      let categoryEmbed;

      if (selected === "module_home") {
        categoryEmbed = mainEmbed;
      } else if (selected === "module_games") {
        categoryEmbed = new EmbedBuilder()
          .setTitle("<:Fun:1542240014388170772> Fun Module")
          .setDescription(
            `Interactive games and entertainment commands. (Prefix: \`${prefix}\`)`,
          )
          .addFields(
            {
              name: "Rock, Paper, Scissors",
              value: `\`${prefix}rps\` - Play against Tars or friends.`,
            },
            {
              name: "Tic-Tac-Toe",
              value: `\`${prefix}ttt\` - Play against Tars or friends.`,
            },
            {
              name: "Gay Calculator",
              value: `\`${prefix}gay\` - Calculate gay percentage.`,
            },
            {
              name: "Lesbian Calculator",
              value: `\`${prefix}lesbian\` - Calculate lesbian percentage.`,
            },
            {
              name: "PP Calculator",
              value: `\`${prefix}pp\` - Check pp size.`,
            },
            {
              name: "IQ Calculator",
              value: `\`${prefix}iq\` - Calculate a user's IQ score.`,
            },
            {
              name: "Sarcastic Roast",
              value: `\`${prefix}roast\` - Customized verbal execution.`,
            },
            {
              name: "Charismatic Wish",
              value: `\`${prefix}wish\` - Generate custom event wishes.`,
            },
            {
              name: "Reddit Memes",
              value: `\`${prefix}meme\` - Fetch trending memes from Reddit.`,
            },
            {
              name: "Truth or Dare",
              value: `\`${prefix}tod\` - Play Truth or Dare with friends.`,
            },
            {
              name: "Would You Rather",
              value: `\`${prefix}wyr\` - Play Would You Rather with friends.`,
            },
            {
              name: "Never Have I Ever",
              value: `\`${prefix}nhie\` - Play Never Have I Ever with friends.`,
            },
            { name: "Coin Flip", value: `\`${prefix}flip\` - Flip a coin.` },
            { name: "Dice Roll", value: `\`${prefix}roll\` - Roll a dice.` },
            { name: "\u200b", value: bookNotice },
          )
          .setThumbnail(botAvatar)
          .setColor(EMBED_COLORS.GREY);
      } else if (selected === "module_utility") {
        categoryEmbed = new EmbedBuilder()
          .setTitle("<:Utility:1542239958612320306> Utility Module")
          .setDescription(
            `System diagnostics and configuration tools. (Prefix: \`${prefix}\`)`,
          )
          .addFields(
            {
              name: "Prefix Manager",
              value: `\`${prefix}prefix\` - View or update server command prefix.`,
            },
            {
              name: "Gateway Diagnostics",
              value: `\`${prefix}ping\` - Check API & WebSocket latency.`,
            },
            {
              name: "Cognitive Parameters",
              value: `\`${prefix}about\` - View system status, quotients & credits.`,
            },
            {
              name: "Help Menu",
              value: `\`${prefix}help\` - Display interactive command menu.`,
            },
            { name: "\u200b", value: bookNotice },
          )
          .setThumbnail(botAvatar)
          .setColor(EMBED_COLORS.GREY);
      }

      await i.update({
        embeds: [categoryEmbed],
        components: [buildMenu(selected)],
      });
    });

    collector.on("end", async () => {
      const disabledRow = buildMenu();
      disabledRow.components[0].setDisabled(true);
      await response.edit({ components: [disabledRow] }).catch(() => null);
    });
  } catch (err) {
    logger.error("Error in Help command handler:", err);
    Sentry.captureException(err);
  }
}
