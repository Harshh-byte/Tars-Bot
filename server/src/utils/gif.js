import logger from "./logger.js";

function parseActionName(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  const actions = [
    "slap",
    "hug",
    "kiss",
    "pat",
    "punch",
    "kick",
    "cuddle",
    "poke",
    "bite",
    "tickle",
    "highfive",
    "wave",
    "smile",
    "blush",
    "cry",
    "dance",
    "laugh",
    "pout",
    "sleep",
    "stare",
    "think",
    "thumbsup",
    "wink",
    "feed",
    "lick",
    "bonk",
    "kill",
    "yeet",
  ];
  return actions.find((act) => q.includes(act)) || null;
}

export async function fetchAnimeGif(searchQuery) {
  const actionName = parseActionName(searchQuery) || "hug";

  try {
    const res = await fetch(`https://api.gifukai.com/v1/${actionName}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url;
    }
  } catch (err) {
    logger.warn(`gifukai fetch failed for ${actionName}:`, err);
  }

  return null;
}
