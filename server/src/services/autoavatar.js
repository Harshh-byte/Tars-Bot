import cron from "node-cron";
import fs from "fs";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

const DEFAULT_ICON_PATH = fileURLToPath(
  new URL("../../../assets/Icon.png", import.meta.url),
);

async function setFallbackAvatar(client) {
  try {
    if (fs.existsSync(DEFAULT_ICON_PATH)) {
      const iconBuffer = fs.readFileSync(DEFAULT_ICON_PATH);
      await client.user.setAvatar(iconBuffer);
    }
  } catch (fallbackErr) {
    if (fallbackErr.status !== 429 && !fallbackErr.message?.includes("429")) {
      logger.error(`[AutoAvatar] Failed to apply fallback avatar: ${fallbackErr.message}`);
    }
  }
}

async function fetchTodaysNasaApod() {
  try {
    const res = await fetch(
      "https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1",
      {
        headers: { "User-Agent": "Tars-Discord-Bot/4.0" },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) return null;
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) return null;

    const apod = items[0];
    if (apod.media_type !== "image") return null;

    const imageUrl = apod.hdurl || apod.url;
    if (!imageUrl) return null;

    return {
      url: imageUrl,
      title: apod.title || "NASA Astronomy Picture of the Day",
      date: apod.date,
    };
  } catch (err) {
    return null;
  }
}

async function updateDailyAvatar(client) {
  if (!client.user) return;
  try {
    const apod = await fetchTodaysNasaApod();
    if (!apod || !apod.url) {
      await setFallbackAvatar(client);
      return;
    }

    const imgRes = await fetch(apod.url, {
      headers: { "User-Agent": "Tars-Discord-Bot/4.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!imgRes.ok) {
      await setFallbackAvatar(client);
      return;
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await client.user.setAvatar(buffer);
  } catch (err) {
    if (err.status === 429 || err.message?.includes("429")) {
      logger.warn("[AutoAvatar] Rate limited by Discord for avatar changes.");
    } else {
      logger.error(`[AutoAvatar] Failed to set avatar: ${err.message}`);
      await setFallbackAvatar(client);
    }
  }
}

export function initAutoAvatarService(client) {
  setTimeout(() => {
    updateDailyAvatar(client);
  }, 3000);

  cron.schedule(
    "0 11 * * *",
    () => { 
      updateDailyAvatar(client);
    },
    {
      timezone: "Asia/Kolkata",
    },
  );
}
