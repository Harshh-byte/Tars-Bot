import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";

export const aliases = ["h"];

export const data = {
  name: "help",
  description: "View command list.",
  dm_permission: false,
  options: [
    {
      name: "command",
      description: "Command to inspect.",
      type: 3,
      required: false,
    },
  ],
};

const ITEMS_PER_PAGE = 5;

const modulesCatalog = {
  module_games: {
    title: "<:Games:1542645834808565821> Games Module",
    description: "Interactive games & scoreboards.",
    commands: [
      {
        name: "Rock, Paper, Scissors",
        cmd: "rps",
        desc: "Play Rock, Paper, Scissors.",
      },
      { name: "Impostor", cmd: "impostor", desc: "Find the Imposter." },
      { name: "Tic-Tac-Toe", cmd: "ttt", desc: "Play Tic-Tac-Toe." },
      { name: "Truth or Dare", cmd: "tod", desc: "Play Truth or Dare." },
      { name: "Would You Rather", cmd: "wyr", desc: "Play Would You Rather." },
      {
        name: "Never Have I Ever",
        cmd: "nhie",
        desc: "Play Never Have I Ever.",
      },
      { name: "Paranoia", cmd: "para", desc: "Play Paranoia." },
      {
        name: "Guess the Country",
        cmd: "flag",
        desc: "Guess the country by its flag.",
      },
      {
        name: "Who's That Pokémon?",
        cmd: "pokemon",
        desc: "Guess the Pokémon by its artwork!",
      },
      {
        name: "Word Scramble",
        cmd: "scramble",
        desc: "Unscramble the word!",
      },
      {
        name: "Leaderboard",
        cmd: "leaderboard",
        desc: "View top scorers.",
      },
      { name: "Coin Flip", cmd: "flip", desc: "Flip a coin." },
      { name: "Dice Roll", cmd: "roll", desc: "Roll a dice." },
    ],
  },
  module_fun: {
    title: "<:Fun:1542240014388170772> Fun Module",
    description: "Calculators, roasts, and memes.",
    commands: [
      {
        name: "Love Calculator",
        cmd: "ship",
        desc: "Calculate love percentage between two users!",
      },
      {
        name: "Gay Calculator",
        cmd: "gay",
        desc: "Calculate how gay a user is.",
      },
      {
        name: "Lesbian Calculator",
        cmd: "lesbian",
        desc: "Calculate how lesbian a user is.",
      },
      {
        name: "Bitches Calculator",
        cmd: "bitches",
        desc: "Calculate how many bitches a user has.",
      },
      {
        name: "Simp Calculator",
        cmd: "simp",
        desc: "Calculate how simp a user is.",
      },
      {
        name: "Autism Calculator",
        cmd: "autism",
        desc: "Calculate how autism a user is.",
      },
      { name: "PP Calculator", cmd: "pp", desc: "Check a user's pp size." },
      {
        name: "IQ Calculator",
        cmd: "iq",
        desc: "Calculate a user's IQ score.",
      },
      { name: "Sarcastic Roast", cmd: "roast", desc: "Roast a user." },
      { name: "Charismatic Wish", cmd: "wish", desc: "Send a wish message." },
      {
        name: "Memes",
        cmd: "meme",
        desc: "Display a trending meme from Reddit!",
      },
    ],
  },
  module_actions: {
    title: "<:Actions:1542647256782737559> Actions Module",
    description: "Roleplay & social interactions.",
    commands: [
      { name: "Smoke", cmd: "smoke", desc: "Take a hit of smoke." },
      { name: "Vape", cmd: "vape", desc: "Hit the vape." },
      { name: "Hug", cmd: "hug", desc: "Hug someone." },
      { name: "Kiss", cmd: "kiss", desc: "Kiss someone." },
      { name: "Slap", cmd: "slap", desc: "Slap someone." },
      { name: "Pat", cmd: "pat", desc: "Pat someone." },
      { name: "Punch", cmd: "punch", desc: "Punch someone." },
    ],
  },
  module_utility: {
    title: "<:Utility:1542239958612320306> Utility Module",
    description: "Server tools and utilities.",
    commands: [
      {
        name: "Server Info",
        cmd: "serverinfo",
        desc: "Gets information about the server.",
      },
      {
        name: "User Info",
        cmd: "userinfo",
        desc: "Gets information about a user.",
      },
      { name: "Avatar", cmd: "avatar", desc: "View a user's avatar." },
      { name: "Prefix", cmd: "prefix", desc: "View or change command prefix." },
      {
        name: "Reset Leaderboard",
        cmd: "resetlb",
        desc: "Reset game leaderboards.",
      },
      { name: "Ping", cmd: "ping", desc: "Check bot latency." },
      { name: "About", cmd: "about", desc: "View information about the bot." },
      { name: "Remind", cmd: "remind", desc: "Set a reminder." },
      { name: "Ask", cmd: "ask", desc: "Ask Tars anything." },
      { name: "Purge", cmd: "purge", desc: "Purge messages from the channel." },
      {
        name: "AutoMeme",
        cmd: "automeme",
        desc: "Automated scheduled memes.",
      },
      { name: "Help", cmd: "help", desc: "View command list or help." },
    ],
  },
};

export async function execute(interaction, client) {
  try {
    const serverId = interaction.guild?.id;
    const prefix = client.prefixCache?.get(serverId);

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

      let usageText = `\`${prefix}${cmdName}\``;
      if (targetCmd.data.options && targetCmd.data.options.length > 0) {
        const hasSubcommands = targetCmd.data.options.some(
          (opt) => opt.type === 1,
        );
        if (!hasSubcommands) {
          const optStr = targetCmd.data.options
            .map((opt) => (opt.required ? `[${opt.name}]` : `(${opt.name})`))
            .join(" ");
          usageText = `\`${prefix}${cmdName} ${optStr}\``;
        } else {
          const subNames = targetCmd.data.options
            .map((opt) => opt.name)
            .join("|");
          usageText = `\`${prefix}${cmdName} [${subNames}]\``;
        }
      }

      const detailEmbed = new EmbedBuilder()
        .setTitle(
          `<:Book:1542647324570816532> **Command: ${prefix}${cmdName}**`,
        )
        .setDescription(cmdDesc)
        .addFields(
          { name: "Usage", value: usageText, inline: false },
          { name: "Aliases", value: cmdAliases, inline: false },
        )
        .setColor(EMBED_COLORS.WHITE);

      return interaction.reply({ embeds: [detailEmbed] });
    }

    const totalCommands = new Set(client.commands?.values()).size;
    const totalModules = 4;
    const botAvatar = client.user.displayAvatarURL({
      extension: "png",
      size: 512,
    });

    const bookNotice = `<:Book:1542647324570816532> Use \`${prefix}help (command)\` for details on a specific command`;

    const mainEmbed = new EmbedBuilder()
      .setTitle(`${client.user.displayName} Help`)
      .setDescription(
        "-# Experience the ultimate Discord bot designed for seamless management and community engagement.",
      )
      .setThumbnail(botAvatar)
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
      .setColor(EMBED_COLORS.WHITE);

    let currentSelectedModule = "module_home";
    let currentPage = 0;

    const buildMenu = (defaultValue = "module_home") => {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("help_category_select")
        .setPlaceholder("Select a module...")
        .addOptions([
          {
            label: "Home",
            description: "Overview & bot stats.",
            value: "module_home",
            emoji: "<:Home:1542647191691071548>",
            default: defaultValue === "module_home",
          },
          {
            label: "Games",
            description: "Interactive games & scoreboards.",
            value: "module_games",
            emoji: "<:Games:1542645834808565821>",
            default: defaultValue === "module_games",
          },
          {
            label: "Fun",
            description: "Calculators, roasts & memes.",
            value: "module_fun",
            emoji: "<:Fun:1542240014388170772>",
            default: defaultValue === "module_fun",
          },
          {
            label: "Actions",
            description: "Interactive commands & animations.",
            value: "module_actions",
            emoji: "<:Actions:1542647256782737559>",
            default: defaultValue === "module_actions",
          },
          {
            label: "Utility",
            description: "Server tools & utilities.",
            value: "module_utility",
            emoji: "<:Utility:1542239958612320306>",
            default: defaultValue === "module_utility",
          },
        ]);
      return new ActionRowBuilder().addComponents(menu);
    };

    const buildPaginationButtons = (page, totalPages) => {
      if (totalPages <= 1) return null;

      const prevBtn = new ButtonBuilder()
        .setCustomId("help_prev_page")
        .setEmoji("<:Left:1542658287894528100>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);

      const pageIndicator = new ButtonBuilder()
        .setCustomId("help_page_indicator")
        .setLabel(`Page ${page + 1} of ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const nextBtn = new ButtonBuilder()
        .setCustomId("help_next_page")
        .setEmoji("<:Right:1542658241400414298>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1);

      return new ActionRowBuilder().addComponents(
        prevBtn,
        pageIndicator,
        nextBtn,
      );
    };

    const buildPayload = (selectedModule, page = 0) => {
      const menuOptions = [
        {
          label: "Home",
          description: "Overview & bot stats.",
          value: "module_home",
          emoji: { id: "1542647191691071548", name: "Home" },
          default: selectedModule === "module_home",
        },
        {
          label: "Games",
          description: "Interactive games & scoreboards.",
          value: "module_games",
          emoji: { id: "1542645834808565821", name: "Games" },
          default: selectedModule === "module_games",
        },
        {
          label: "Fun",
          description: "Calculators, roasts & memes.",
          value: "module_fun",
          emoji: { id: "1542240014388170772", name: "Fun" },
          default: selectedModule === "module_fun",
        },
        {
          label: "Actions",
          description: "Roleplay & social interactions.",
          value: "module_actions",
          emoji: { id: "1542647256782737559", name: "Actions" },
          default: selectedModule === "module_actions",
        },
        {
          label: "Utility",
          description: "Server tools & utilities.",
          value: "module_utility",
          emoji: { id: "1542239958612320306", name: "Utility" },
          default: selectedModule === "module_utility",
        },
      ];

      const selectRow = {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: "help_category_select",
            placeholder: "Select a module...",
            options: menuOptions,
          },
        ],
      };

      let titleText = "";
      let bodyText = "";
      let buttonRow = null;

      if (selectedModule === "module_home") {
        titleText =
          `## ${client.user.displayName} Help\n` +
          `-# Experience the ultimate Discord bot designed for seamless management and community engagement.`;
        bodyText =
          `<:Prefix:1542236764465274910> **Prefix** \`${prefix}\`\n` +
          `<:Commands:1542236622521901088> **Commands** \`${totalCommands}\`\n` +
          `<:Modules:1542236707599163422> **Modules** \`${totalModules}\``;
      } else {
        const mod = modulesCatalog[selectedModule];
        if (!mod) {
          return buildPayload("module_home", 0);
        }

        const totalPages = Math.ceil(mod.commands.length / ITEMS_PER_PAGE);
        const validPage = Math.max(0, Math.min(page, totalPages - 1));
        const startIndex = validPage * ITEMS_PER_PAGE;
        const pageCommands = mod.commands.slice(
          startIndex,
          startIndex + ITEMS_PER_PAGE,
        );

        const listLines = pageCommands
          .map(
            (c, idx) =>
              `**${startIndex + idx + 1}. ${c.name}** — \`${prefix}${c.cmd}\` — *${c.desc}*`,
          )
          .join("\n");

        titleText = `### ${mod.title}\n*${mod.description}*`;
        bodyText = listLines + `\n\n-# ${mod.commands.length} total commands`;

        if (totalPages > 1) {
          buttonRow = {
            type: 1,
            components: [
              {
                type: 2,
                custom_id: "help_prev_page",
                style: 2,
                emoji: { id: "1542658287894528100", name: "Left" },
                disabled: validPage === 0,
              },
              {
                type: 2,
                custom_id: "help_page_indicator",
                style: 2,
                label: `Page ${validPage + 1} of ${totalPages}`,
                disabled: true,
              },
              {
                type: 2,
                custom_id: "help_next_page",
                style: 2,
                emoji: { id: "1542658241400414298", name: "Right" },
                disabled: validPage === totalPages - 1,
              },
            ],
          };
        }
      }

      const avatarUrl = client.user.displayAvatarURL({
        extension: "png",
        size: 512,
      });

      const headerSection = {
        type: 9,
        components: [
          {
            type: 10,
            content: titleText,
          },
        ],
        accessory: {
          type: 11,
          media: {
            url: avatarUrl,
          },
        },
      };

      const containerComponents = [
        headerSection,
        {
          type: 14,
          divider: true,
          spacing: 1,
        },
        {
          type: 10,
          content: bodyText,
        },
        {
          type: 14,
          divider: true,
          spacing: 1,
        },
        selectRow,
      ];

      if (buttonRow) {
        containerComponents.push(buttonRow);
      }

      containerComponents.push({
        type: 10,
        content: bookNotice,
      });

      const container = {
        type: 17,
        accent_color: 0xffffff,
        components: containerComponents,
      };

      return {
        flags: 32768,
        components: [container],
      };
    };

    const initialPayload = buildPayload("module_home", 0);

    let response;
    if (
      typeof interaction.isStringSelectMenu === "function" &&
      interaction.isStringSelectMenu()
    ) {
      await interaction.update(initialPayload);
      response =
        typeof interaction.fetchReply === "function"
          ? await interaction.fetchReply()
          : interaction.message;
    } else if (interaction.deferred || interaction.replied) {
      response = await interaction.editReply(initialPayload);
    } else {
      response = await interaction.reply({
        ...initialPayload,
        fetchReply: true,
      });
      if (!response && typeof interaction.fetchReply === "function") {
        response = await interaction.fetchReply();
      }
    }

    const collector = response.createMessageComponentCollector();

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "Use `/help` or `.help` to open your own menu!",
          ephemeral: true,
        });
      }

      if (i.isStringSelectMenu() && i.customId === "help_category_select") {
        currentSelectedModule = i.values[0];
        currentPage = 0;
      } else if (i.isButton()) {
        if (i.customId === "help_prev_page") {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === "help_next_page") {
          currentPage++;
        }
      }

      const newPayload = buildPayload(currentSelectedModule, currentPage);
      await i.update(newPayload);
    });
  } catch (err) {
    logger.error("Error in Help command handler:", err);
    Sentry.captureException(err);
  }
}
