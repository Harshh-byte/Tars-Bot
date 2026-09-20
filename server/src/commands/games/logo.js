import {
  ComponentType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { EMBED_COLORS } from "../../utils/embeds.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";
import { addLogoScore } from "../../services/database.js";
import { showLeaderboard } from "./leaderboard.js";

export const data = {
  name: "logo",
  description: "Guess the brand by its logo!",
  dm_permission: false,
  options: [
    {
      name: "difficulty",
      description: "Select game difficulty",
      type: 3,
      required: false,
      choices: [
        { name: "Easy", value: "easy" },
        { name: "Medium", value: "medium" },
        { name: "Hard", value: "hard" },
      ],
    },
  ],
};

const channelSkipsMap = new Map();
const channelSessionScoresMap = new Map();
const activeCollectorsMap = new Map();

function getBasePoints(difficultyKey) {
  if (difficultyKey === "easy") return 10;
  if (difficultyKey === "hard") return 30;
  return 20;
}

const CATEGORIES = {
  easy: {
    label: "Easy",
    brands: [
      { name: "Google", domain: "google.com", aliases: ["google"] },
      { name: "Apple", domain: "apple.com", aliases: ["apple"] },
      { name: "Microsoft", domain: "microsoft.com", aliases: ["microsoft"] },
      { name: "Amazon", domain: "amazon.com", aliases: ["amazon"] },
      { name: "Netflix", domain: "netflix.com", aliases: ["netflix"] },
      { name: "Spotify", domain: "spotify.com", aliases: ["spotify"] },
      { name: "YouTube", domain: "youtube.com", aliases: ["youtube"] },
      { name: "Twitter", domain: "twitter.com", aliases: ["twitter"] },
      { name: "Instagram", domain: "instagram.com", aliases: ["instagram"] },
      { name: "TikTok", domain: "tiktok.com", aliases: ["tiktok"] },
      { name: "Discord", domain: "discord.com", aliases: ["discord"] },
      { name: "Reddit", domain: "reddit.com", aliases: ["reddit"] },
      { name: "GitHub", domain: "github.com", aliases: ["github"] },
      { name: "Samsung", domain: "samsung.com", aliases: ["samsung"] },
      { name: "Meta", domain: "meta.com", aliases: ["meta", "facebook"] },
      { name: "WhatsApp", domain: "whatsapp.com", aliases: ["whatsapp"] },
      { name: "McDonald's", domain: "mcdonalds.com", aliases: ["mcdonalds"] },
      { name: "Starbucks", domain: "starbucks.com", aliases: ["starbucks"] },
      { name: "Pepsi", domain: "pepsi.com", aliases: ["pepsi"] },
      { name: "Coca-Cola", domain: "coca-cola.com", aliases: ["coca cola"] },
      { name: "Red Bull", domain: "redbull.com", aliases: ["redbull"] },
      {
        name: "Burger King",
        domain: "burgerking.com",
        aliases: ["burger king"],
      },
      { name: "KFC", domain: "kfc.com", aliases: ["kentucky fried chicken"] },
      { name: "Domino's", domain: "dominos.com", aliases: ["dominos"] },
      { name: "Subway", domain: "subway.com", aliases: ["subway"] },
      { name: "Pizza Hut", domain: "pizzahut.com", aliases: ["pizza hut"] },
      { name: "Oreo", domain: "oreo.com", aliases: ["oreo"] },
      { name: "Nutella", domain: "nutella.com", aliases: ["nutella"] },
      { name: "Tesla", domain: "tesla.com", aliases: ["tesla"] },
      { name: "BMW", domain: "bmw.com", aliases: ["Bayerische Motoren Werke"] },
      { name: "Ferrari", domain: "ferrari.com", aliases: ["ferrari"] },
      { name: "Ford", domain: "ford.com", aliases: ["ford"] },
      { name: "Toyota", domain: "toyota.com", aliases: ["toyota"] },
      { name: "Nike", domain: "nike.com", aliases: ["nike"] },
      { name: "Adidas", domain: "adidas.com", aliases: ["adidas"] },
      { name: "Puma", domain: "puma.com", aliases: ["puma"] },
      { name: "Gucci", domain: "gucci.com", aliases: ["gucci"] },
      {
        name: "Louis Vuitton",
        domain: "louisvuitton.com",
        aliases: ["louis vuitton"],
      },
      {
        name: "PlayStation",
        domain: "playstation.com",
        aliases: ["playstation"],
      },
      { name: "Xbox", domain: "xbox.com", aliases: ["xbox"] },
      { name: "Nintendo", domain: "nintendo.com", aliases: ["nintendo"] },
      { name: "Steam", domain: "steampowered.com", aliases: ["steam"] },
      { name: "Roblox", domain: "roblox.com", aliases: ["roblox"] },
      { name: "Minecraft", domain: "minecraft.net", aliases: ["minecraft"] },
      { name: "Disney", domain: "disney.com", aliases: ["disney"] },
      { name: "Marvel", domain: "marvel.com", aliases: ["marvel"] },
      { name: "Walmart", domain: "walmart.com", aliases: ["walmart"] },
      { name: "Target", domain: "target.com", aliases: ["target"] },
      { name: "Visa", domain: "visa.com", aliases: ["visa"] },
      { name: "Mastercard", domain: "mastercard.com", aliases: ["mastercard"] },
    ],
  },
  medium: {
    label: "Medium",
    brands: [
      { name: "Uber", domain: "uber.com", aliases: ["uber"] },
      { name: "Airbnb", domain: "airbnb.com", aliases: ["airbnb"] },
      { name: "Intel", domain: "intel.com", aliases: ["intel"] },
      { name: "Nvidia", domain: "nvidia.com", aliases: ["nvidia"] },
      { name: "AMD", domain: "amd.com", aliases: ["amd"] },
      { name: "Adobe", domain: "adobe.com", aliases: ["adobe"] },
      { name: "Twitch", domain: "twitch.tv", aliases: ["twitch"] },
      { name: "Snapchat", domain: "snapchat.com", aliases: ["snapchat"] },
      { name: "Pinterest", domain: "pinterest.com", aliases: ["pinterest"] },
      { name: "Telegram", domain: "telegram.org", aliases: ["telegram"] },
      { name: "Duolingo", domain: "duolingo.com", aliases: ["duolingo"] },
      { name: "Figma", domain: "figma.com", aliases: ["figma"] },
      { name: "Canva", domain: "canva.com", aliases: ["canva"] },
      { name: "PayPal", domain: "paypal.com", aliases: ["paypal"] },
      { name: "OpenAI", domain: "openai.com", aliases: ["openai", "chatgpt"] },
      { name: "Slack", domain: "slack.com", aliases: ["slack"] },
      { name: "Zoom", domain: "zoom.us", aliases: ["zoom"] },
      { name: "LinkedIn", domain: "linkedin.com", aliases: ["linkedin"] },
      { name: "Taco Bell", domain: "tacobell.com", aliases: ["taco bell"] },
      { name: "Dunkin'", domain: "dunkindonuts.com", aliases: ["dunkin"] },
      { name: "Nestlé", domain: "nestle.com", aliases: ["nestle"] },
      {
        name: "Monster Energy",
        domain: "monsterenergy.com",
        aliases: ["monster"],
      },
      { name: "Doritos", domain: "doritos.com", aliases: ["doritos"] },
      { name: "Pringles", domain: "pringles.com", aliases: ["pringles"] },
      { name: "Sprite", domain: "sprite.com", aliases: ["sprite"] },
      { name: "Fanta", domain: "fanta.com", aliases: ["fanta"] },
      { name: "Chipotle", domain: "chipotle.com", aliases: ["chipotle"] },
      { name: "Gatorade", domain: "gatorade.com", aliases: ["gatorade"] },
      { name: "Lays", domain: "lays.com", aliases: ["lays"] },
      {
        name: "Mercedes-Benz",
        domain: "mercedes-benz.com",
        aliases: ["mercedes"],
      },
      { name: "Porsche", domain: "porsche.com", aliases: ["porsche"] },
      { name: "Audi", domain: "audi.com", aliases: ["audi"] },
      {
        name: "Lamborghini",
        domain: "lamborghini.com",
        aliases: ["lamborghini"],
      },
      { name: "Honda", domain: "honda.com", aliases: ["honda"] },
      { name: "Volkswagen", domain: "vw.com", aliases: ["volkswagen"] },
      { name: "Nissan", domain: "nissan-global.com", aliases: ["nissan"] },
      { name: "Hyundai", domain: "hyundai.com", aliases: ["hyundai"] },
      { name: "Chevrolet", domain: "chevrolet.com", aliases: ["chevrolet"] },
      { name: "Jeep", domain: "jeep.com", aliases: ["jeep"] },
      { name: "Subaru", domain: "subaru.com", aliases: ["subaru"] },
      { name: "Zara", domain: "zara.com", aliases: ["zara"] },
      { name: "H&M", domain: "hm.com", aliases: ["h&m"] },
      { name: "Chanel", domain: "chanel.com", aliases: ["chanel"] },
      { name: "Prada", domain: "prada.com", aliases: ["prada"] },
      { name: "Balenciaga", domain: "balenciaga.com", aliases: ["balenciaga"] },
      { name: "Rolex", domain: "rolex.com", aliases: ["rolex"] },
      { name: "Vans", domain: "vans.com", aliases: ["vans"] },
      { name: "Converse", domain: "converse.com", aliases: ["converse"] },
      {
        name: "Under Armour",
        domain: "underarmour.com",
        aliases: ["under armour"],
      },
      { name: "Levi's", domain: "levi.com", aliases: ["levi's"] },
      {
        name: "Calvin Klein",
        domain: "calvinklein.com",
        aliases: ["calvin klein"],
      },
      {
        name: "New Balance",
        domain: "newbalance.com",
        aliases: ["new balance"],
      },
      { name: "Epic Games", domain: "epicgames.com", aliases: ["epic games"] },
      { name: "Riot Games", domain: "riotgames.com", aliases: ["riot games"] },
      { name: "Ubisoft", domain: "ubisoft.com", aliases: ["ubisoft"] },
      { name: "EA", domain: "ea.com", aliases: ["electronic arts"] },
      { name: "Razer", domain: "razer.com", aliases: ["razer"] },
      { name: "Logitech", domain: "logitech.com", aliases: ["logitech"] },
      {
        name: "Rockstar Games",
        domain: "rockstargames.com",
        aliases: ["rockstar"],
      },
      {
        name: "Warner Bros",
        domain: "warnerbros.com",
        aliases: ["warner bros"],
      },
      { name: "Sony", domain: "sony.com", aliases: ["sony"] },
      { name: "HBO", domain: "hbo.com", aliases: ["hbo"] },
      { name: "DC Comics", domain: "dc.com", aliases: ["dc"] },
      { name: "Lego", domain: "lego.com", aliases: ["lego"] },
      { name: "Pixar", domain: "pixar.com", aliases: ["pixar"] },
      { name: "Hulu", domain: "hulu.com", aliases: ["hulu"] },
      { name: "IKEA", domain: "ikea.com", aliases: ["ikea"] },
      { name: "Best Buy", domain: "bestbuy.com", aliases: ["best buy"] },
      { name: "eBay", domain: "ebay.com", aliases: ["ebay"] },
      { name: "Costco", domain: "costco.com", aliases: ["costco"] },
      {
        name: "American Express",
        domain: "americanexpress.com",
        aliases: ["american express"],
      },
      { name: "Venmo", domain: "venmo.com", aliases: ["venmo"] },
      { name: "Cash App", domain: "cash.app", aliases: ["cash app"] },
      { name: "Emirates", domain: "emirates.com", aliases: ["emirates"] },
      { name: "Booking.com", domain: "booking.com", aliases: ["booking"] },
      { name: "Boeing", domain: "boeing.com", aliases: ["boeing"] },
      { name: "Delta", domain: "delta.com", aliases: ["delta"] },
    ],
  },
  hard: {
    label: "Hard",
    brands: [
      { name: "Shopify", domain: "shopify.com", aliases: ["shopify"] },
      { name: "Notion", domain: "notion.so", aliases: ["notion"] },
      { name: "Stripe", domain: "stripe.com", aliases: ["stripe"] },
      { name: "Heineken", domain: "heineken.com", aliases: ["heineken"] },
      {
        name: "Panda Express",
        domain: "pandaexpress.com",
        aliases: ["panda express"],
      },
      {
        name: "Dairy Queen",
        domain: "dairyqueen.com",
        aliases: ["dq", "dairy queen"],
      },
      { name: "Bugatti", domain: "bugatti.com", aliases: ["bugatti"] },
      { name: "Bentley", domain: "bentley.com", aliases: ["bentley"] },
      {
        name: "Rolls-Royce",
        domain: "rolls-roycemotorcars.com",
        aliases: ["rolls royce"],
      },
      { name: "Volvo", domain: "volvocars.com", aliases: ["volvo"] },
      { name: "Maserati", domain: "maserati.com", aliases: ["maserati"] },
      {
        name: "Aston Martin",
        domain: "astonmartin.com",
        aliases: ["aston martin"],
      },
      { name: "Hermès", domain: "hermes.com", aliases: ["hermes"] },
      { name: "Burberry", domain: "burberry.com", aliases: ["burberry"] },
      { name: "Versace", domain: "versace.com", aliases: ["versace"] },
      { name: "Asics", domain: "asics.com", aliases: ["asics"] },
      { name: "Blizzard", domain: "blizzard.com", aliases: ["blizzard"] },
      { name: "Capcom", domain: "capcom.com", aliases: ["capcom"] },
      { name: "Sega", domain: "sega.com", aliases: ["sega"] },
      { name: "Atari", domain: "atari.com", aliases: ["atari"] },
      { name: "Paramount", domain: "paramount.com", aliases: ["paramount"] },
      {
        name: "Universal Pictures",
        domain: "universalpictures.com",
        aliases: ["universal"],
      },
      {
        name: "Crunchyroll",
        domain: "crunchyroll.com",
        aliases: ["crunchyroll"],
      },
      { name: "Home Depot", domain: "homedepot.com", aliases: ["home depot"] },
      { name: "Alibaba", domain: "alibaba.com", aliases: ["alibaba"] },
      { name: "Sephora", domain: "sephora.com", aliases: ["sephora"] },
      { name: "Revolut", domain: "revolut.com", aliases: ["revolut"] },
      { name: "Chase", domain: "chase.com", aliases: ["chase"] },
      { name: "Robinhood", domain: "robinhood.com", aliases: ["robinhood"] },
      { name: "Wise", domain: "wise.com", aliases: ["wise"] },
      {
        name: "Tripadvisor",
        domain: "tripadvisor.com",
        aliases: ["tripadvisor"],
      },
      { name: "Ryanair", domain: "ryanair.com", aliases: ["ryanair"] },
      { name: "Expedia", domain: "expedia.com", aliases: ["expedia"] },
      {
        name: "Qatar Airways",
        domain: "qatarairways.com",
        aliases: ["qatar airways"],
      },
    ],
  },
};

async function fetchBrandsFromLogoDev(difficultyKey) {
  const brands = [];
  for (const [diffKey, diffObj] of Object.entries(CATEGORIES)) {
    if (difficultyKey && difficultyKey !== diffKey) continue;
    for (const b of diffObj.brands) {
      brands.push({
        ...b,
        difficultyKey: diffKey,
      });
    }
  }
  return brands;
}

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isCloseMatch(input, targetAliases) {
  if (!input || input.length < 3) return false;
  return targetAliases.some((alias) => {
    const cleanAlias = alias.toLowerCase();
    const distance = levenshteinDistance(input, cleanAlias);
    const maxAllowedDist =
      cleanAlias.length > 7 ? 2 : cleanAlias.length > 4 ? 1 : 0;
    return distance > 0 && distance <= maxAllowedDist;
  });
}

function getRevealedHint(name, revealedIndices = new Set()) {
  const words = name.split(" ");
  let globalIndex = 0;

  return words
    .map((word) => {
      const chars = word.split("");
      const wordStr = chars
        .map((char) => {
          const idx = globalIndex++;
          if (!/[a-zA-Z0-9]/.test(char)) return char;
          if (revealedIndices.has(idx)) {
            return char.toUpperCase();
          }
          return "`_`";
        })
        .join(" ");
      return wordStr;
    })
    .join("   ");
}

async function getLogoUrl(domain) {
  const token = process.env.LOGO_API_KEY;
  if (!token) return `https://img.logo.dev/${domain}?size=256`;

  try {
    const res = await fetch(`https://api.logo.dev/brand?domain=${domain}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.brandmark) {
        return data.brandmark;
      }
      if (data.logo) {
        return data.logo;
      }
    }
  } catch (err) {
    logger.warn(`Logo.dev Brand API error for ${domain}: ${err.message}`);
  }

  return `https://img.logo.dev/${domain}?token=${token}&size=256`;
}

export async function execute(interaction, client, { buildAiReply } = {}) {
  if (
    typeof interaction.deferReply === "function" &&
    !interaction.deferred &&
    !interaction.replied
  ) {
    await interaction.deferReply().catch(() => null);
  }
  return startLogoGame(interaction, client, false, buildAiReply);
}

async function startLogoGame(
  interaction,
  client,
  isFollowUp = false,
  buildAiReply,
) {
  try {
    const channelId =
      interaction.channelId || interaction.channel?.id || "default";

    if (activeCollectorsMap.has(channelId)) {
      const oldCollector = activeCollectorsMap.get(channelId);
      if (oldCollector && !oldCollector.ended) {
        oldCollector.stop("superceded");
      }
      activeCollectorsMap.delete(channelId);
    }

    if (!isFollowUp) {
      channelSkipsMap.set(channelId, 0);
    }

    const selectedDifficulty = interaction.options?.getString("difficulty");

    const allBrands = await fetchBrandsFromLogoDev(selectedDifficulty);
    const targetBrand = allBrands[Math.floor(Math.random() * allBrands.length)];
    const logoUrl = await getLogoUrl(targetBrand.domain);

    const revealedIndices = new Set();
    const letterIndices = [];
    let isFirstLetter = true;
    targetBrand.name.split("").forEach((char, idx) => {
      if (/[a-zA-Z0-9]/.test(char)) {
        letterIndices.push(idx);
        if (isFirstLetter) {
          revealedIndices.add(idx);
          isFirstLetter = false;
        }
      } else if (char === " ") {
        isFirstLetter = true;
      }
    });

    let hintClicks = 0;
    const maxHintClicks = 1;

    const difficultyLabel =
      targetBrand?.difficultyKey && CATEGORIES[targetBrand.difficultyKey]
        ? CATEGORIES[targetBrand.difficultyKey].label
        : "Medium";

    const buildLogoPrompt = (currentHint) => ({
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.INFO,
          components: [
            {
              type: 10,
              content: `### 🏷️ Guess the Logo!`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content:
                    `**Difficulty:** ${difficultyLabel}\n` +
                    `**Brand:** ${currentHint}\n\n` +
                    `-# You have 30 seconds to guess!\n` +
                    `-# Hint Penalty: -5 pts`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: logoUrl,
                },
              },
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 1,
              components: [
                hintClicks >= maxHintClicks
                  ? {
                      type: 2,
                      style: 2,
                      custom_id: "logo_hint",
                      label: "Hint Revealed",
                      disabled: true,
                    }
                  : {
                      type: 2,
                      style: 2,
                      custom_id: "logo_hint",
                      label: "Get Hint",
                    },
                {
                  type: 2,
                  style: 4,
                  custom_id: "logo_skip",
                  label: "Skip",
                },
              ],
            },
          ],
        },
      ],
    });

    const payload = buildLogoPrompt(
      getRevealedHint(targetBrand.name, revealedIndices),
    );

    const channel = interaction.channel;
    if (!channel || typeof channel.createMessageCollector !== "function")
      return;

    let response;
    if (isFollowUp) {
      response = await channel.send(payload);
    } else if (interaction.deferred || interaction.replied) {
      if (typeof interaction.editReply === "function") {
        response = await interaction.editReply(payload);
      } else {
        response = await channel.send(payload);
      }
    } else {
      await interaction.reply(payload);
      response = await interaction.fetchReply();
    }

    const filter = (m) => !m.author.bot;
    const collector = channel.createMessageCollector({ filter, time: 30000 });
    activeCollectorsMap.set(channelId, collector);

    const btnCollector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    btnCollector.on("collect", async (bInt) => {
      if (bInt.customId === "logo_hint") {
        if (hintClicks >= maxHintClicks) {
          return bInt
            .reply({
              content: "Maximum hints already revealed for this logo!",
              flags: 64,
            })
            .catch(() => null);
        }

        const unrevealed = letterIndices.filter(
          (idx) => !revealedIndices.has(idx),
        );
        if (unrevealed.length > 0) {
          const revealAmount = Math.min(
            unrevealed.length,
            Math.ceil(unrevealed.length * 0.4),
          );
          for (let i = 0; i < revealAmount; i++) {
            const randomIndex = Math.floor(Math.random() * unrevealed.length);
            const chosen = unrevealed.splice(randomIndex, 1)[0];
            revealedIndices.add(chosen);
          }
        }
        hintClicks++;

        const updatedHint = getRevealedHint(targetBrand.name, revealedIndices);
        await bInt.update(buildLogoPrompt(updatedHint)).catch(() => null);
      } else if (bInt.customId === "logo_skip") {
        const currentSkips = channelSkipsMap.get(channelId) || 0;
        if (currentSkips >= 5) {
          return bInt
            .reply({
              content:
                "<:Warning:1526228248458035381> **Maximum skips reached (5/5)!** You must guess this logo or wait for the timer.",
              flags: 64,
            })
            .catch(() => null);
        }

        channelSkipsMap.set(channelId, currentSkips + 1);
        collector.stop("skipped");
        btnCollector.stop("skipped");
        await bInt.deferUpdate().catch(() => null);
      }
    });

    let winnerMessage = null;
    const closeMatchUsers = new Set();

    collector.on("collect", async (m) => {
      const input = m.content.trim().toLowerCase();

      const isCorrect = targetBrand.aliases.some(
        (alias) => alias.toLowerCase() === input,
      );

      if (isCorrect) {
        winnerMessage = m;
        collector.stop("correct");
        await m
          .react("1526228339910643793")
          .catch(() =>
            m
              .react("<:Success:1526228339910643793>")
              .catch(() => m.react("✅").catch(() => null)),
          );
      } else if (isCloseMatch(input, targetBrand.aliases)) {
        if (!closeMatchUsers.has(m.author.id)) {
          closeMatchUsers.add(m.author.id);
          await m
            .reply({
              content: `*You're so close! Check for typos!*`,
            })
            .catch(() => null);
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (activeCollectorsMap.get(channelId) === collector) {
        activeCollectorsMap.delete(channelId);
      }

      if (reason === "superceded") return;

      try {
        if (reason === "skipped") {
          const currentSkips = channelSkipsMap.get(channelId) || 1;
          const remainingSkips = Math.max(0, 5 - currentSkips);

          await channel.send({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: EMBED_COLORS.WARNING,
                components: [
                  {
                    type: 10,
                    content: `### Logo Skipped!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content:
                      `The brand was **${targetBrand.name}**!\n\n` +
                      `Skips remaining: **${remainingSkips}/5**`,
                  },
                ],
              },
            ],
          });

          setTimeout(async () => {
            await startLogoGame(interaction, client, true, buildAiReply);
          }, 1500);
        } else if (reason === "correct" && winnerMessage) {
          const winnerMention = `<@${winnerMessage.author.id}>`;
          const guildId = winnerMessage.guild?.id || interaction.guild?.id;

          const basePoints = getBasePoints(targetBrand.difficultyKey);
          const pointsGained = Math.max(5, basePoints - hintClicks * 5);

          const previousSession = channelSessionScoresMap.get(channelId) || 0;
          const currentSessionScore = previousSession + pointsGained;
          channelSessionScoresMap.set(channelId, currentSessionScore);

          let scoreData = { totalPoints: pointsGained, totalWins: 1 };
          if (guildId && winnerMessage.author?.id) {
            scoreData = await addLogoScore(
              guildId,
              winnerMessage.author.id,
              pointsGained,
            );
          }

          await channel.send({
            flags: 32768,
            allowedMentions: { parse: [] },
            allowed_mentions: { parse: [] },
            components: [
              {
                type: 17,
                accent_color: EMBED_COLORS.SUCCESS,
                components: [
                  {
                    type: 10,
                    content: `### <a:Tada:1544329561955770488> Correct Guess!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content:
                      `${winnerMention} guessed it right!\n` +
                      `The brand was **${targetBrand.name}**!\n\n` +
                      `🏆 **+${pointsGained} Points** | **Total: ${scoreData.totalPoints}** Pts`,
                  },
                ],
              },
            ],
          });

          setTimeout(async () => {
            await startLogoGame(interaction, client, true, buildAiReply);
          }, 1500);
        } else {
          channelSkipsMap.set(channelId, 0);
          channelSessionScoresMap.set(channelId, 0);

          const resultMsg = await channel.send({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: EMBED_COLORS.TIMEOUT,
                components: [
                  {
                    type: 10,
                    content: `### ⌛ Time's Up!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content:
                      `Nobody guessed the brand in time!\n\n` +
                      `The correct answer was **${targetBrand.name}**.`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 1,
                        custom_id: "logo_next",
                        label: "Play Again",
                      },
                      {
                        type: 2,
                        style: 2,
                        custom_id: "show_lb_logo",
                        label: "Leaderboard",
                        emoji: { name: "🏆" },
                      },
                    ],
                  },
                ],
              },
            ],
          });

          attachLogoNextCollector(
            resultMsg,
            interaction,
            client,
            buildAiReply,
          );
        }
      } catch (err) {
        logger.error("Error in logo collector end handler:", err);
      }
    });
  } catch (err) {
    logger.error("Error in Logo command execution:", err);
    Sentry.captureException(err);
  }
}

function attachLogoNextCollector(
  message,
  originalInteraction,
  client,
  buildAiReply,
) {
  if (!message || typeof message.createMessageComponentCollector !== "function")
    return;

  const buttonCollector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 86400000,
  });

  buttonCollector.on("collect", async (btnInteraction) => {
    try {
      const channelId =
        btnInteraction.channelId || btnInteraction.channel?.id || "default";

      if (btnInteraction.customId === "logo_next") {
        buttonCollector.stop("clicked");
        if (btnInteraction.message && btnInteraction.message.components) {
          const disabledRows = btnInteraction.message.components.map((row) => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach((comp) => {
              if (comp.data.custom_id === "logo_next") {
                comp.setDisabled(true);
              }
            });
            return newRow;
          });
          await btnInteraction
            .update({ components: disabledRows })
            .catch(() => null);
        } else {
          await btnInteraction.deferUpdate().catch(() => null);
        }

        channelSkipsMap.set(channelId, 0);
        channelSessionScoresMap.set(channelId, 0);

        await startLogoGame(btnInteraction, client, true, buildAiReply);
      } else if (btnInteraction.customId === "show_lb_logo") {
        await showLeaderboard(btnInteraction, client, "logo");
      }
    } catch (err) {
      logger.error("Error in logo button execution:", err);
    }
  });
}
