import { ComponentType } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { EMOJI_IDS } from "../../utils/emojis.js";

export const aliases = ["nasa"];

export const data = {
  name: "apod",
  description: "View NASA's Astronomy Picture of the Day (APOD)!",
  dm_permission: false,
};

const colorCache = new Map();

async function extractAccentColor(imageUrl) {
  if (!imageUrl) return 0x00e5ff;
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl);

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Tars-Discord-Bot/4.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return 0x00e5ff;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const img = await loadImage(buffer);

    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;

    let bestR = 0,
      bestG = 229,
      bestB = 255;
    let maxScore = -1;
    let totalR = 0,
      totalG = 0,
      totalB = 0,
      totalCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      totalR += r;
      totalG += g;
      totalB += b;
      totalCount++;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const saturation = max === 0 ? 0 : delta / max;
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      if (brightness > 0.08 && brightness < 0.92) {
        const score = saturation * 3 + (1 - Math.abs(brightness - 0.5));
        if (score > maxScore) {
          maxScore = score;
          bestR = r;
          bestG = g;
          bestB = b;
        }
      }
    }

    if (maxScore < 0.2 && totalCount > 0) {
      bestR = Math.round(totalR / totalCount);
      bestG = Math.round(totalG / totalCount);
      bestB = Math.round(totalB / totalCount);
    }

    const finalBrightness =
      (bestR * 0.299 + bestG * 0.587 + bestB * 0.114) / 255;
    if (finalBrightness < 0.25) {
      const scale = 0.35 / Math.max(0.05, finalBrightness);
      bestR = Math.min(255, Math.round(bestR * scale));
      bestG = Math.min(255, Math.round(bestG * scale));
      bestB = Math.min(255, Math.round(bestB * scale));
    }

    const hexColor = (bestR << 16) | (bestG << 8) | bestB;
    colorCache.set(imageUrl, hexColor);
    return hexColor;
  } catch (err) {
    logger.warn(`[APOD Color Extraction] Failed: ${err.message}`);
    return 0x00e5ff;
  }
}

async function fetchApodByOffset(offset = 0) {
  try {
    const page = offset + 1;
    const res = await fetch(
      `https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1&page=${page}`,
      {
        headers: { "User-Agent": "Tars-Discord-Bot/4.0" },
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!res.ok) return null;
    const items = await res.json();
    return Array.isArray(items) && items.length > 0 ? items[0] : null;
  } catch (err) {
    logger.warn(`[APOD Command] Fetch failed: ${err.message}`);
    return null;
  }
}

function cleanHtmlTags(str = "") {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function buildApodV2Payload(apod, offset = 0, disabled = false) {
  const imageUrl = apod.hdurl || apod.url;
  const rawExplanation = cleanHtmlTags(apod.explanation || "");
  const trimmedExplanation =
    rawExplanation.length > 700
      ? rawExplanation.substring(0, 697) + "..."
      : rawExplanation || "No explanation provided by NASA.";

  const titlePrefix =
    offset === 0 ? "🌌 Today's APOD: " : `🌌 APOD (${apod.date}): `;
  const apodTitle = apod.title || "Astronomy Picture";
  const apodUrl =
    apod.permalink || apod.url || "https://science.nasa.gov/apod/";

  const accentColor = await extractAccentColor(
    apod.media_type === "image" ? imageUrl : apod.hdurl,
  );

  const containerComponents = [];

  containerComponents.push({
    type: 10,
    content: `### ${titlePrefix}[${apodTitle}](${apodUrl})\n\n${trimmedExplanation}`,
  });

  if (apod.media_type === "image" && imageUrl) {
    containerComponents.push({
      type: 12,
      items: [
        {
          media: {
            url: imageUrl,
          },
          description: apodTitle,
        },
      ],
    });
  } else if (apod.media_type === "video") {
    if (apod.hdurl) {
      containerComponents.push({
        type: 12,
        items: [
          {
            media: {
              url: apod.hdurl,
            },
            description: apodTitle,
          },
        ],
      });
    }
    containerComponents.push({
      type: 10,
      content: `Video: [${apodTitle}](${apod.url})`,
    });
  }

  containerComponents.push({
    type: 14,
    divider: true,
    spacing: 1,
  });

  const buttonsRow = {
    type: 1,
    components: [
      {
        type: 2,
        style: 1,
        custom_id: "apod_today",
        label: "Today",
        emoji: { id: EMOJI_IDS.Home, name: "Home" },
        disabled: disabled || offset === 0,
      },
      {
        type: 2,
        style: 2,
        custom_id: "apod_prev",
        label: "Previous",
        emoji: { id: EMOJI_IDS.Left, name: "Left" },
        disabled: disabled || offset >= 30,
      },
      {
        type: 2,
        style: 2,
        custom_id: "apod_next",
        label: "Next",
        emoji: { id: EMOJI_IDS.Right, name: "Right" },
        disabled: disabled || offset <= 0,
      },
    ],
  };
  containerComponents.push(buttonsRow);

  const footerTypeLabel =
    apod.media_type === "video" ? "Video" : "Picture";

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

export async function execute(interaction, client) {
  try {
    if (interaction.deferReply) {
      await interaction.deferReply().catch(() => null);
    }

    let currentOffset = 0;
    let apod = await fetchApodByOffset(currentOffset);

    if (!apod) {
      const errorMsg =
        "Couldn't connect to NASA APOD servers right now. Please try again shortly!";
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply({ content: errorMsg });
      }
      return await interaction.reply({ content: errorMsg });
    }

    const payload = await buildApodV2Payload(apod, currentOffset, false);

    let replyMessage;
    if (interaction.deferred || interaction.replied) {
      replyMessage = await interaction.editReply(payload);
    } else {
      replyMessage = await interaction.reply({
        ...payload,
        fetchReply: true,
      });
    }

    const targetUserId = interaction.user?.id || interaction.author?.id;
    const collector = replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.user.id !== targetUserId) {
        return btnInteraction.reply({
          content: "Run `/apod` to explore NASA images yourself!",
          ephemeral: true,
        });
      }

      await btnInteraction.deferUpdate().catch(() => null);

      if (btnInteraction.customId === "apod_today") {
        currentOffset = 0;
      } else if (btnInteraction.customId === "apod_prev") {
        currentOffset = Math.min(currentOffset + 1, 30);
      } else if (btnInteraction.customId === "apod_next") {
        currentOffset = Math.max(currentOffset - 1, 0);
      }

      const updatedApod = await fetchApodByOffset(currentOffset);
      if (updatedApod) {
        const updatedPayload = await buildApodV2Payload(
          updatedApod,
          currentOffset,
          false,
        );
        await btnInteraction.editReply(updatedPayload);
      }
    });

    collector.on("end", async () => {
      if (apod) {
        const disabledPayload = await buildApodV2Payload(
          apod,
          currentOffset,
          true,
        );
        await replyMessage.edit(disabledPayload).catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in APOD command execution:", err);
    Sentry.captureException(err);
    if (interaction.deferred || interaction.replied) {
      await interaction
        .editReply({
          content: "Something went wrong while retrieving NASA APOD.",
        })
        .catch(() => null);
    } else {
      await interaction
        .reply({
          content: "Something went wrong while retrieving NASA APOD.",
          ephemeral: true,
        })
        .catch(() => null);
    }
  }
}
