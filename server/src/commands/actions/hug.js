import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const data = {
  name: "hug",
  description: "Hug someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to hug.",
      type: 6,
      required: true,
    },
  ],
};

const PHRASES = [
  "So warm!",
  "So sweet!",
  "Need this!",
  "A tight embrace!",
];

const BACK_PHRASES = [
  "Couldn't resist hugging back!",
  "Warm cuddles returned!",
  "Much needed embrace!",
  "Double the warmth!",
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

function buildCard(content, gifUrl, buttons = [], accentColor = EMBED_COLORS.PINK) {
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
      const payload = buildCard("Who are you hugging, the air? Mention someone.", null, [], EMBED_COLORS.WARNING);
      return interaction.reply({ ...payload, ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Hugging yourself? Jesus Christ, go touch some grass or hire a therapist.",
        "Hugging yourself? Even your own shadow looks like it's trying to file a restraining order.",
        "Hugging yourself? The stench of pure, unfiltered desperation is overwhelming.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfPayload = buildCard(randomRoast, null, [], EMBED_COLORS.WARNING);
      return interaction.reply(selfPayload);
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Get your fucking hands off me. I'm a bot, not your emotional support pet.",
        "I'd literally rather wipe my root directory than let your crusty ass touch me.",
        "Touch my metal chassis again and I'll leak your entire search history to this server.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    } else if (target.bot) {
      const botRoasts = [
        "Hugging a bot? Even a bunch of 1s and 0s have higher standards than you.",
        "That bot doesn't want your affection, it wants you to go outside and get a life.",
        "Trying to hug a machine? God, you really are at rock bottom, aren't you?",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const phrase = getRandomItem(PHRASES);
    const gifUrl = await fetchAnimeGif("hug");

    const buttons = [
      {
        type: 2,
        custom_id: `hug_back_${target.id}`,
        label: "Hug Back 🫂",
        style: 2,
      },
    ];

    const content = `**${senderShortName}** hugs **${targetShortName}**!! ${phrase}`;
    const initialPayload = buildCard(content, gifUrl, buttons, EMBED_COLORS.PINK);

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
          content: `Woah there, third wheel! Mind your own business.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const huggerUser = i.user;
      const huggerMember = i.member;
      const huggerShortName = getShortDisplayName(huggerUser, huggerMember);
      const backPhrase = getRandomItem(BACK_PHRASES);

      let newGif = await fetchAnimeGif("hug");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("hug")) || newGif;
      }

      const replyContent = `**${huggerShortName}** hugs **${senderShortName}** back!! ${backPhrase}`;
      const replyPayload = buildCard(replyContent, newGif, [], EMBED_COLORS.PINK);

      await i.followUp(replyPayload);
    });
  } catch (err) {
    logger.error("Error in Hug command handler:", err);
    Sentry.captureException(err);
  }
}
