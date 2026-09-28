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
  ];
  return actions.find((act) => q.includes(act)) || null;
}

export async function fetchAnimeGif(searchQuery) {
  const actionName = parseActionName(searchQuery) || "hug";

  try {
    const res = await fetch(`https://nekos.best/api/v2/${actionName}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.results?.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.results.length);
        const url = data.results[randomIndex]?.url;
        if (url) return url;
      }
    }
  } catch (err) {
    logger.warn(`nekos.best fetch failed for ${actionName}:`, err);
  }

  try {
    const res = await fetch(
      `https://api.otakugifs.xyz/gif?reaction=${actionName}`,
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url;
    }
  } catch (err) {
    logger.warn(`Otakugifs fetch failed for ${actionName}:`, err);
  }

  return null;
}
