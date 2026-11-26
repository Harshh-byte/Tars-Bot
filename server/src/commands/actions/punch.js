import { ComponentType } from "discord.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMBED_COLORS } from "../../utils/embeds.js";
import { fetchAnimeGif } from "../../utils/gif.js";

export const data = {
  name: "punch",
  description: "Punch someone.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "User to punch.",
      type: 6,
      required: true,
    },
  ],
};

const PHRASES = [
  "Knocked right out!",
  "That gotta leave a mark!",
  "Oof! Brutal hit!",
  "Sent flying!",
];

const BACK_PHRASES = [
  "Returned with double the force!",
  "Threw a counter punch!",
  "Never saw it coming!",
  "Paid back in full!",
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
      const payload = buildCard("Shadowboxing? Mention someone to punch.", null, [], EMBED_COLORS.WARNING);
      return interaction.reply({ ...payload, ephemeral: true });
    }

    if (target.id === sender.id) {
      const selfRoasts = [
        "Punching yourself? Go ahead, punch yourself harder, maybe it'll knock some sense into you.",
        "Shadowboxing against yourself and still managing to get knocked out? What a complete joke.",
        "Punching yourself in the face? Natural selection really missed a spot with you.",
      ];
      const randomRoast =
        selfRoasts[Math.floor(Math.random() * selfRoasts.length)];
      const selfPayload = buildCard(randomRoast, null, [], EMBED_COLORS.WARNING);
      return interaction.reply(selfPayload);
    }

    if (target.id === client?.user?.id) {
      const tarsRoasts = [
        "Punching a metal server chassis? Hope you enjoyed shattering your wrist, dumbass.",
        "You punched me and dealt 0 damage. My response? I'm laughing at your tiny hands.",
        "Attempting to assault an AI? I'll re-route your power supply into your desk.",
      ];
      const randomRoast =
        tarsRoasts[Math.floor(Math.random() * tarsRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    } else if (target.bot) {
      const botRoasts = [
        "Punching a bot? The machine literally didn't even register your pathetic hit.",
        "Bot punch attempt logged. Damage: 0. Embarrassment: 100%.",
        "Striking a Discord bot? Save your weak fists for punching a pillow in your room.",
      ];
      const randomRoast =
        botRoasts[Math.floor(Math.random() * botRoasts.length)];
      const botPayload = buildCard(randomRoast, null, [], EMBED_COLORS.ERROR);
      return interaction.reply(botPayload);
    }

    const senderShortName = getShortDisplayName(sender, senderMember);
    const targetShortName = getShortDisplayName(target, targetMember);

    const phrase = getRandomItem(PHRASES);
    const gifUrl = await fetchAnimeGif("punch");

    const buttons = [
      {
        type: 2,
        custom_id: `punch_back_${target.id}`,
        label: "Punch Back 👊🏻",
        style: 2,
      },
    ];

    const content = `**${senderShortName}** punched **${targetShortName}**!! ${phrase}`;
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
          content: `Sit down before you get hit too!`,
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const puncherUser = i.user;
      const puncherMember = i.member;
      const puncherShortName = getShortDisplayName(puncherUser, puncherMember);
      const backPhrase = getRandomItem(BACK_PHRASES);

      let newGif = await fetchAnimeGif("punch");
      if (newGif && newGif === gifUrl) {
        newGif = (await fetchAnimeGif("punch")) || newGif;
      }

      const replyContent = `**${puncherShortName}** punched **${senderShortName}** back!! ${backPhrase}`;
      const replyPayload = buildCard(replyContent, newGif, [], EMBED_COLORS.DARK_RED);

      await i.followUp(replyPayload);
    });
  } catch (err) {
    logger.error("Error in Punch command handler:", err);
    Sentry.captureException(err);
  }
}
