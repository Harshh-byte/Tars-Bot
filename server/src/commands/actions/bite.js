import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const aliases = ["nom"];

export const data = {
  name: "bite",
  description: "Bite someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to bite.",
      type: 6,
      required: true,
    },
  ],
};

const PHRASES = [
  "Watch out, they bite!",
  "Nom nom nom!",
  "That looked sharp!",
  "Ouch!! Teeth marks left!",
];

const BACK_PHRASES = [
  "Bit right back with vengeance!",
  "A bite for a bite!",
  "Two can play the biting game!",
  "Chomped down in response!",
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getShortDisplayName(user, member) {
  const name =
    member?.displayName ||
    user?.globalName ||
    user?.displayName ||
    user?.username ||
    "User";
  return name.trim().split(/\s+/)[0];
}

function buildCard(content, gifUrl, buttons = [], accentColor = EMBED_COLORS.RED) {
  const containerComponents = [
    {
      type: 10,
      content,
    },
  ];

  if (gifUrl) {
    containerComponents.push({
      type: 12,
      items: [
        {
          media: {
            url: gifUrl,
          },
        },
      ],
    });
  }

  if (buttons.length > 0) {
    containerComponents.push({
      type: 14,
      divider: true,
      spacing: 1,
    });
    containerComponents.push({
      type: 1,
      components: buttons,
    });
  }

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        accent_color: accentColor,
        components: containerComponents,
      },
    ],
  };
}

async function sendAndFetchReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return await interaction.followUp(payload);
  }
  const response = await interaction.reply({ ...payload, withResponse: true });
  return response.resource?.message || response;
}

export async function execute(interaction, client) {
  try {
    const sender = interaction.user;
    const senderMember = interaction.member;

    let target = interaction.options?.getUser?.("user");
    let targetMember =
      typeof interaction.options?.getMember === "function"
        ? interaction.options.getMember("user")
        : null;
    if (!target && interaction.mentions?.users?.size) {
      target = interaction.mentions.users.first();
      targetMember = interaction.mentions.members?.first();
    }
    if (target && !targetMember) {
      targetMember = interaction.guild?.members?.cache?.get(target.id);
    }

    if (!target) {
      const payload = buildCard("Biting the air? Mention someone to bite.", null, [], EMBED_COLORS.WARNING);
      return interaction.reply({ ...payload, ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Biting yourself? Are you chewing your own arm off like a trapped coyote?",
        "Biting yourself? What kind of cannibalistic self-sabotage is this?",
        "Self-bite detected. Please seek medical and psychiatric attention.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfPayload = buildCard(randomRoast, null, [], EMBED_COLORS.WARNING);
      return interaction.reply(selfPayload);
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Chomping down on a titanium chassis? Enjoy your shattered dental work.",
        "You bit me and chipped your front teeth on solid tungsten. Good job.",
        "Attempting to eat an AI? I'll send 240 volts through your mouth.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    } else if (target.bot) {
      const botRoasts = [
        "Biting a bot? Metal and wires don't taste very good, genius.",
        "Bot biting detected. Machine status: Dentists are laughing at you.",
        "Chomping a Discord bot? Go eat actual food instead of electronic parts.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const phrase = getRandomItem(PHRASES);
    const gifUrl = await fetchAnimeGif("bite");

    const buttons = [
      {
        type: 2,
        custom_id: `bite_back_${target.id}`,
        label: "Bite Back 🦷",
        style: 2,
      },
    ];

    const content = `**${senderShortName}** bit **${targetShortName}**!! ${phrase}`;
    const initialPayload = buildCard(content, gifUrl, buttons, EMBED_COLORS.RED);

    const response = await sendAndFetchReply(interaction, initialPayload);

    if (
      !response ||
      typeof response.createMessageComponentCollector !== "function"
    )
      return;

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 86400000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== target.id) {
        return i.reply({
          content: `Back off! This isn't your bite fight.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const biterUser = i.user;
      const biterMember = i.member;
      const biterShortName = getShortDisplayName(biterUser, biterMember);
      const backPhrase = getRandomItem(BACK_PHRASES);

      let newGif = await fetchAnimeGif("bite");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("bite")) || newGif;
      }

      const replyContent = `**${biterShortName}** bit **${senderShortName}** back!! ${backPhrase}`;
      const replyPayload = buildCard(replyContent, newGif, [], EMBED_COLORS.RED);

      await i.followUp(replyPayload);
    });
  } catch (err) {
    logger.error("Error in Bite command handler:", err);
    Sentry.captureException(err);
  }
}
