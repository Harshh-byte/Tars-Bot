import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const aliases = ["whack"];

export const data = {
  name: "bonk",
  description: "Bonk someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to bonk.",
      type: 6,
      required: true,
    },
  ],
};

const PHRASES = [
  "Off to horny jail!",
  "Take that!",
  "Straight on the head!",
  "Bonk!! Think about what you did!",
];

const BACK_PHRASES = [
  "Brought out a bigger hammer!",
  "Bonked back with force!",
  "Counter-bonk delivered!",
  "Sent them to jail instead!",
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

function buildCard(content, gifUrl, buttons = [], accentColor = EMBED_COLORS.DARK_RED) {
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
      const payload = buildCard("Bonking the air? Mention someone to bonk.", null, [], EMBED_COLORS.WARNING);
      return interaction.reply({ ...payload, ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Bonking yourself? Bonk yourself harder, maybe it'll fix your brain.",
        "Bonking your own head? Natural selection taking its sweet time with you.",
        "Self-bonk logged. You deserve that one.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfPayload = buildCard(randomRoast, null, [], EMBED_COLORS.WARNING);
      return interaction.reply(selfPayload);
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Bonk a titanium bot? Your inflatable hammer bounced right back into your face.",
        "You swung a bat at pure hardened steel and broke your wrist. Good job.",
        "Attempting to bonk an AI? I'll re-route your Discord client into a crash loop.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    } else if (target.bot) {
      const botRoasts = [
        "Bonking a bot? A server rack doesn't feel your plastic hammer.",
        "Bot bonk attempt logged. Damage: 0. Clowning: 100%.",
        "Striking a bot? Save your energy for something that actually cares.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const phrase = getRandomItem(PHRASES);
    const gifUrl = await fetchAnimeGif("bonk");

    const buttons = [
      {
        type: 2,
        custom_id: `bonk_back_${target.id}`,
        label: "Bonk Back 🔨",
        style: 2,
      },
    ];

    const content = `**${senderShortName}** bonked **${targetShortName}**!! ${phrase}`;
    const initialPayload = buildCard(content, gifUrl, buttons, EMBED_COLORS.DARK_RED);

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
          content: `Duck! You're going to get hit by the hammer.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const bonkerUser = i.user;
      const bonkerMember = i.member;
      const bonkerShortName = getShortDisplayName(bonkerUser, bonkerMember);
      const backPhrase = getRandomItem(BACK_PHRASES);

      let newGif = await fetchAnimeGif("bonk");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("bonk")) || newGif;
      }

      const replyContent = `**${bonkerShortName}** bonked **${senderShortName}** back!! ${backPhrase}`;
      const replyPayload = buildCard(replyContent, newGif, [], EMBED_COLORS.DARK_RED);

      await i.followUp(replyPayload);
    });
  } catch (err) {
    logger.error("Error in Bonk command handler:", err);
    Sentry.captureException(err);
  }
}
