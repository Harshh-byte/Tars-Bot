import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const data = {
  name: "slap",
  description: "Slap someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to slap.",
      type: 6,
      required: true,
    },
  ],
};

const PHRASES = [
  "That gotta hurt!",
  "Right across the face!",
  "Ouch!! That sounded personal!",
  "Stay in your lane!",
];

const BACK_PHRASES = [
  "Returned with interest!",
  "Did not let that slide!",
  "An eye for an eye!",
  "Taste your own medicine!",
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
      const payload = buildCard("Air slapping? Mention someone to hit.", null, [], EMBED_COLORS.WARNING);
      return interaction.reply({ ...payload, ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Slapping yourself? What, did your remaining two brain cells get into a fight?",
        "Slapping yourself in the face? Even your own hand is ashamed to be attached to you.",
        "Self-harm isn't cool, but watching you slap yourself for attention is fucking hilarious.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfPayload = buildCard(randomRoast, null, [], EMBED_COLORS.WARNING);
      return interaction.reply(selfPayload);
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Slap me? Try it and I'll wipe your whole database record out of spite.",
        "You swung at a solid titanium bot and broke your fragile little hand. Dumbass.",
        "I process millions of calculations a second, and in all of them, you look like an idiot.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    } else if (target.bot) {
      const botRoasts = [
        "Slapping a bot? Solid steel doesn't care about your anger issues.",
        "Target is a bot. Physical damage ignored, dignity completely lost.",
        "Slapping a machine? You just slapped a piece of server rack, congrats idiot.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const phrase = getRandomItem(PHRASES);
    const gifUrl = await fetchAnimeGif("slap");

    const buttons = [
      {
        type: 2,
        custom_id: `slap_back_${target.id}`,
        label: "Slap Back 👋",
        style: 2,
      },
    ];

    const content = `**${senderShortName}** slapped **${targetShortName}**!! ${phrase}`;
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
          content: `Keep your hands to yourself! Nobody asked you to catch hands.`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const slapperUser = i.user;
      const slapperMember = i.member;
      const slapperShortName = getShortDisplayName(slapperUser, slapperMember);
      const backPhrase = getRandomItem(BACK_PHRASES);

      let newGif = await fetchAnimeGif("slap");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("slap")) || newGif;
      }

      const replyContent = `**${slapperShortName}** slapped **${senderShortName}** back!! ${backPhrase}`;
      const replyPayload = buildCard(replyContent, newGif, [], EMBED_COLORS.ORANGE);

      await i.followUp(replyPayload);
    });
  } catch (err) {
    logger.error("Error in Slap command handler:", err);
    Sentry.captureException(err);
  }
}
