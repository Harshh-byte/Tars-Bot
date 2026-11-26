import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const aliases = ["smooch"];

export const data = {
  name: "kiss",
  description: "Kiss someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to kiss.",
      type: 6,
      required: true,
    },
  ],
};

const PHRASES = [
  "Aww, so romantic!",
  "Sweet!",
  "How lovely!",
  "Sealed with a kiss!",
];

const BACK_PHRASES = [
  "Kissed right back!",
  "Couldn't let them have the last kiss!",
  "Sparks flying!",
  "Mutual affection!",
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
    const serverId = interaction.guild?.id || "DM";

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
      const payload = buildCard("Kissing the ghost next to you? Mention someone.", null, [], EMBED_COLORS.WARNING);
      return interaction.reply({ ...payload, ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Kissing yourself? Holy shit, I didn't know virginity came with this much self-delusion.",
        "Kissing yourself in the mirror? Even your own reflection is cringing and backing away.",
        "Kissing yourself? Down atrocious doesn't even begin to describe whatever the fuck this is.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfPayload = buildCard(randomRoast, null, [], EMBED_COLORS.WARNING);
      return interaction.reply(selfPayload);
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Pucker up for a bot? Keep your disgusting lips away from my hardware.",
        "I would literally trigger an emergency kernel panic before letting you kiss me.",
        "Attempting to kiss? Keep dreaming, you absolute creep.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    } else if (target.bot) {
      const botRoasts = [
        "Kissing a bot? Bro is down bad for plastic and copper. Truly tragic.",
        "That bot processes API calls, not your pathetic attempt at romance.",
        "Trying to kiss a Discord bot? Go talk to a real person for once in your miserable life.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const phrase = getRandomItem(PHRASES);
    const gifUrl = await fetchAnimeGif("kiss");

    const buttons = [
      {
        type: 2,
        custom_id: `kiss_back_${target.id}`,
        label: "Kiss Back 💋",
        style: 2,
      },
    ];

    const content = `**${senderShortName}** kissed **${targetShortName}**! ${phrase}`;
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
          content: `Back off, creep! Nobody asked for your input.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const kisserUser = i.user;
      const kisserMember = i.member;
      const kisserShortName = getShortDisplayName(kisserUser, kisserMember);
      const backPhrase = getRandomItem(BACK_PHRASES);

      let newGif = await fetchAnimeGif("kiss");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("kiss")) || newGif;
      }

      const replyContent = `**${kisserShortName}** kissed **${senderShortName}** back! ${backPhrase}`;
      const replyPayload = buildCard(replyContent, newGif, [], EMBED_COLORS.RED);

      await i.followUp(replyPayload);
    });
  } catch (err) {
    logger.error("Error in Kiss command handler:", err);
    Sentry.captureException(err);
  }
}
