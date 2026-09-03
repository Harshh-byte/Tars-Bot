import fs from "fs";

// 1. Update case.js with 320kbps FFmpeg args and ytdlOptions
const casePath = "d:/Music Bot/case.js";
let caseContent = fs.readFileSync(casePath, "utf-8");

const oldDistubeDef = /export const distube = new DisTube\(client, \{[\s\S]*?\n\}\);/;
const newDistubeDef = `export const distube = new DisTube(client, {
  ffmpeg: {
    path: ffmpegPath,
    args: {
      global: {
        "-reconnect": "1",
        "-reconnect_streamed": "1",
        "-reconnect_delay_max": "5",
      },
      process: {
        "-b:a": "320k",
        "-ar": "48000",
        "-ac": "2",
      },
    },
  },
  ytdlOptions: {
    highWaterMark: 1 << 25,
    filter: "audioonly",
    quality: "highestaudio",
  },
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  leaveOnEmpty: true,
  emptyTimeout: 60,
  plugins: [
    new SpotifyPlugin({
      emitEventsAfterFetching: true,
    }),
    new SoundCloudPlugin(),
    new YtDlpPlugin(),
  ],
});`;

caseContent = caseContent.replace(oldDistubeDef, newDistubeDef);
fs.writeFileSync(casePath, caseContent, "utf-8");
console.log("Updated case.js with 320kbps audio engine settings.");

// 2. Update distubeEvents.js
const eventsPath = "d:/Music Bot/src/events/distubeEvents.js";
const newEventsContent = `import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import logger from "../utils/logger.js";
import { createProgressBar } from "../utils/progressBar.js";
import { EMBED_COLORS } from "../utils/embeds.js";

export function getPlatformBadge(song) {
  const url = song.url || "";
  const source = (song.source || "").toLowerCase();

  if (url.includes("music.youtube.com")) {
    return { name: "YouTube Music", emoji: "🔴", color: 0xff0000 };
  }
  if (source === "spotify" || url.includes("spotify.com")) {
    return { name: "Spotify Music", emoji: "🟢", color: 0x1db954 };
  }
  if (source === "soundcloud" || url.includes("soundcloud.com")) {
    return { name: "SoundCloud", emoji: "🟠", color: 0xff5500 };
  }
  if (source === "youtube" || url.includes("youtube.com") || url.includes("youtu.be")) {
    return { name: "YouTube", emoji: "🔴", color: 0xff0000 };
  }
  return { name: "Audio Stream", emoji: "📡", color: 0x5865f2 };
}

export function createPlayerButtons(queue) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_pause_resume")
      .setEmoji(queue.paused ? "▶️" : "⏸️")
      .setStyle(queue.paused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_skip")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("music_loop")
      .setEmoji(queue.repeatMode === 1 ? "🔂" : queue.repeatMode === 2 ? "🔁" : "🔄")
      .setStyle(queue.repeatMode > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_shuffle")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

export function registerDistubeEvents(distube) {
  distube.on("playSong", (queue, song) => {
    logger.info(\`Playing: \${song.name} in guild \${queue.textChannel?.guild?.id}\`);

    const platform = getPlatformBadge(song);
    const progressBarStr = createProgressBar(0, song.duration, 14);

    const embed = new EmbedBuilder()
      .setColor(platform.color)
      .setAuthor({
        name: \`CASE Audio • \${platform.emoji} \${platform.name}\`,
        iconURL: song.user?.displayAvatarURL({ dynamic: true }),
      })
      .setTitle("🎶 **Now Playing**")
      .setDescription(\`[**\${song.name}**](\${song.url})\\n\\n\${progressBarStr}\`)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: "⏱️ Duration", value: \`\\\`\${song.formattedDuration}\\\`\`, inline: true },
        { name: "👤 Requested By", value: \`\${song.user}\`, inline: true },
        { name: "🎧 Quality", value: \`\\\`🔊 320kbps HQ\\\`\`, inline: true },
        { name: "📊 Queue Pos", value: \`\\\`1 / \${queue.songs.length}\\\`\`, inline: true },
        { name: "🔊 Volume", value: \`\\\`\${queue.volume}%\\\`\`, inline: true },
        { name: "🔁 Loop Mode", value: \`\\\`\${queue.repeatMode === 1 ? "Track" : queue.repeatMode === 2 ? "Queue" : "Off"}\\\`\`, inline: true }
      )
      .setFooter({ text: "CASE Audio Engine • Zero-Latency Stream" })
      .setTimestamp();

    const components = createPlayerButtons(queue);

    if (queue.textChannel) {
      queue.textChannel.send({ embeds: [embed], components }).then((msg) => {
        queue.nowPlayingMessage = msg;
      }).catch((err) => logger.error("Error sending playSong message:", err));
    }
  });

  distube.on("addSong", (queue, song) => {
    const platform = getPlatformBadge(song);
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setAuthor({
        name: \`CASE Audio • \${platform.emoji} \${platform.name}\`,
        iconURL: song.user?.displayAvatarURL({ dynamic: true }),
      })
      .setTitle("🎵 **Added to Queue**")
      .setDescription(\`[**\${song.name}**](\${song.url})\`)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: "⏱️ Duration", value: \`\\\`\${song.formattedDuration}\\\`\`, inline: true },
        { name: "📊 Queue Position", value: \`\\\`#\${queue.songs.length}\\\`\`, inline: true },
        { name: "👤 Requested By", value: \`\${song.user}\`, inline: true }
      );

    if (queue.textChannel) {
      queue.textChannel.send({ embeds: [embed] }).catch(() => null);
    }
  });

  distube.on("addList", (queue, playlist) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setTitle("🎶 **Playlist Added**")
      .setDescription(\`Added playlist [**\${playlist.name}**](\${playlist.url}) with \\\`\${playlist.songs.length}\\\` tracks!\`)
      .setThumbnail(playlist.thumbnail);

    if (queue.textChannel) {
      queue.textChannel.send({ embeds: [embed] }).catch(() => null);
    }
  });

  distube.on("empty", (queue) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.WARNING)
      .setTitle("🔇 **Voice Channel Empty**")
      .setDescription("Voice channel is empty. Leaving to save resources.");

    if (queue.textChannel) {
      queue.textChannel.send({ embeds: [embed] }).catch(() => null);
    }
  });

  distube.on("error", (error, queue, song) => {
    logger.error("DisTube Error:", error);
    const textChannel = queue?.textChannel || (queue && typeof queue.send === "function" ? queue : null);
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.ERROR)
      .setTitle("❌ **Audio Engine Error**")
      .setDescription(\`An error occurred while playing: \\\`\${error?.message || error}\\\`\`);

    if (textChannel && typeof textChannel.send === "function") {
      textChannel.send({ embeds: [embed] }).catch(() => null);
    }
  });

  distube.on("finish", (queue) => {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.INFO)
      .setTitle("🏁 **Queue Completed**")
      .setDescription("No more tracks in queue. Add songs with \`/play\` or \`!play\`!");

    if (queue.textChannel) {
      queue.textChannel.send({ embeds: [embed] }).catch(() => null);
    }
  });
}
`;

fs.writeFileSync(eventsPath, newEventsContent, "utf-8");
console.log("Updated distubeEvents.js with platform badges & rich embed layout.");

// 3. Update nowplaying.js command
const npPath = "d:/Music Bot/src/commands/music/nowplaying.js";
const newNpContent = `import { EmbedBuilder } from "discord.js";
import { errorEmbed } from "../../utils/embeds.js";
import { createProgressBar } from "../../utils/progressBar.js";
import { createPlayerButtons, getPlatformBadge } from "../../events/distubeEvents.js";

export const aliases = ["np", "current"];

export const data = {
  name: "nowplaying",
  description: "View details of the song currently playing.",
};

export async function execute(interaction, client, { distube }) {
  const queue = distube.getQueue(interaction.guild.id);
  if (!queue || !queue.songs.length) {
    return interaction.reply({
      embeds: [errorEmbed({ title: "Nothing Playing", description: "There is no track currently playing!" })],
      flags: 64,
    });
  }

  const song = queue.songs[0];
  const platform = getPlatformBadge(song);
  const progressBarStr = createProgressBar(queue.currentTime, song.duration, 14);

  const embed = new EmbedBuilder()
    .setColor(platform.color)
    .setAuthor({
      name: \`CASE Audio • \${platform.emoji} \${platform.name}\`,
      iconURL: song.user?.displayAvatarURL({ dynamic: true }),
    })
    .setTitle("🎶 **Now Playing**")
    .setDescription(\`[**\${song.name}**](\${song.url})\\n\\n\${progressBarStr}\`)
    .setThumbnail(song.thumbnail)
    .addFields(
      { name: "⏱️ Duration", value: \`\\\`\${song.formattedDuration}\\\`\`, inline: true },
      { name: "👤 Requested By", value: \`\${song.user}\`, inline: true },
      { name: "🎧 Quality", value: \`\\\`🔊 320kbps HQ\\\`\`, inline: true },
      { name: "📊 Queue Pos", value: \`\\\`1 / \${queue.songs.length}\\\`\`, inline: true },
      { name: "🔊 Volume", value: \`\\\`\${queue.volume}%\\\`\`, inline: true },
      { name: "🔁 Loop Mode", value: \`\\\`\${queue.repeatMode === 1 ? "Track" : queue.repeatMode === 2 ? "Queue" : "Off"}\\\`\`, inline: true }
    )
    .setFooter({ text: "CASE Audio Engine • Zero-Latency Stream" })
    .setTimestamp();

  const components = createPlayerButtons(queue);

  return interaction.reply({ embeds: [embed], components });
}
`;

fs.writeFileSync(npPath, newNpContent, "utf-8");
console.log("Updated nowplaying.js command.");
