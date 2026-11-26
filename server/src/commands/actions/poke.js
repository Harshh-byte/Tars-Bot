import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const aliases = ["prod"];

export const data = {
  name: "poke",
  description: "Poke someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to poke.",
      type: 6,
      required: true,
    },
  ],
};

const PHRASES = [
  "Hey! Look over here!",
  "Poke poke!",
  "Notice me!",
  "Boop!",
];

const BACK_PHRASES = [
  "Poked right back!",
  "Returned the boop!",
  "Double poke combo!",
  "Gotcha back!",
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

function buildCard(content, gifUrl, buttons = [], accentColor = EMBED_COLORS.ORANGE) {
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
      const payload = buildCard("Poking the air? Mention someone to poke.", null, [], EMBED_COLORS.WARNING);
      return interaction.reply({ ...payload, ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Poking yourself? What are you checking for, a pulse?",
        "Poking yourself in the chest? Yes, you're still lonely. Move along.",
        "Self-poke detected. Desperate for attention even from yourself.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfPayload = buildCard(randomRoast, null, [], EMBED_COLORS.WARNING);
      return interaction.reply(selfPayload);
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Poke my chassis again and I'll wipe your Discord permissions.",
        "Do not poke the AI. My sensors are not capacitive touchscreens.",
        "Poke attempt logged. Annoyance meter at maximum.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    } else if (target.bot) {
      const botRoasts = [
        "Poking a bot? Metal and plastic don't flinch.",
        "Target is a machine. Poke disregarded, time wasted.",
        "Poking code? That bot doesn't care about your little finger.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const phrase = getRandomItem(PHRASES);
    const gifUrl = await fetchAnimeGif("poke");

    const buttons = [
      {
        type: 2,
        custom_id: `poke_back_${target.id}`,
        label: "Poke Back 👉🏻",
        style: 2,
      },
    ];

    const content = `**${senderShortName}** poked **${targetShortName}**! ${phrase}`;
    const initialPayload = buildCard(content, gifUrl, buttons, EMBED_COLORS.ORANGE);

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
          content: `Hands off! You're not in this poke session.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const pokerUser = i.user;
      const pokerMember = i.member;
      const pokerShortName = getShortDisplayName(pokerUser, pokerMember);
      const backPhrase = getRandomItem(BACK_PHRASES);

      let newGif = await fetchAnimeGif("poke");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("poke")) || newGif;
      }

      const replyContent = `**${pokerShortName}** poked **${senderShortName}** back! ${backPhrase}`;
      const replyPayload = buildCard(replyContent, newGif, [], EMBED_COLORS.ORANGE);

      await i.followUp(replyPayload);
    });
  } catch (err) {
    logger.error("Error in Poke command handler:", err);
    Sentry.captureException(err);
  }
}
