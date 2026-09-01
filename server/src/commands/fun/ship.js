import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

export const aliases = ["love"];

export const data = {
  name: "ship",
  description: "Love meter for two users.",
  dm_permission: false,
  options: [
    {
      name: "user",
      description: "First user to ship.",
      type: 6,
      required: false,
    },
    {
      name: "target",
      description: "Second user to ship.",
      type: 6,
      required: false,
    },
  ],
};

function getLoveRating(percentage) {
  if (percentage === 100)
    return {
      title: "Perfect Match! 💖",
      comment: "Soulmates destined by eternity!",
    };
  if (percentage >= 85)
    return {
      title: "Madly in Love! 💕",
      comment: "The connection is insanely strong!",
    };
  if (percentage >= 70)
    return {
      title: "Super Compatible! ❤️",
      comment: "You two would make a great couple!",
    };
  if (percentage >= 50)
    return {
      title: "Good Potential! 💗",
      comment: "There is definitely a spark here!",
    };
  if (percentage >= 30)
    return {
      title: "Just Friends? 💛",
      comment: "Might take some work, but who knows!",
    };
  if (percentage >= 15)
    return {
      title: "Awkward Silence... 💔",
      comment: "Friendzone warning level: High.",
    };
  return {
    title: "Complete Disaster! ☠️",
    comment: "Better stay at least 100 feet apart...",
  };
}

function calculateShipScore() {
  return Math.floor(Math.random() * 101);
}

export async function execute(interaction, client) {
  try {
    let target1 = interaction.options?.getUser("user");
    let target2 = interaction.options?.getUser("target");

    if (!target1) {
      target1 = interaction.user;
    }

    if (!target2) {
      if (interaction.guild) {
        try {
          const members = await interaction.guild.members.fetch();
          const validUsers = members
            .map((m) => m.user)
            .filter((u) => !u.bot && u.id !== target1.id);

          if (validUsers.length > 0) {
            target2 = validUsers[Math.floor(Math.random() * validUsers.length)];
          } else {
            target2 = interaction.user;
          }
        } catch {
          target2 = interaction.user;
        }
      } else {
        target2 = interaction.user;
      }
    }

    const percentage = calculateShipScore(target1.id, target2.id);
    const { title, comment } = getLoveRating(percentage);

    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 700, 250);
    gradient.addColorStop(0, "#1e102a");
    gradient.addColorStop(0.5, "#2a0845");
    gradient.addColorStop(1, "#12051f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 700, 250);

    ctx.fillStyle = "rgba(255, 105, 180, 0.05)";
    ctx.beginPath();
    ctx.arc(350, 125, 180, 0, Math.PI * 2);
    ctx.fill();
    const avatarUrl1 = target1.displayAvatarURL({
      extension: "png",
      size: 256,
    });
    const avatarUrl2 = target2.displayAvatarURL({
      extension: "png",
      size: 256,
    });

    const [avatar1Img, avatar2Img] = await Promise.all([
      loadImage(avatarUrl1).catch(() => null),
      loadImage(avatarUrl2).catch(() => null),
    ]);

    if (avatar1Img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(130, 110, 65, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar1Img, 65, 45, 130, 130);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(130, 110, 67, 0, Math.PI * 2);
      ctx.strokeStyle = "#ff4081";
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    if (avatar2Img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(570, 110, 65, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar2Img, 505, 45, 130, 130);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(570, 110, 67, 0, Math.PI * 2);
      ctx.strokeStyle = "#ff4081";
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.font = "bold 42px sans-serif";
    ctx.fillStyle = "#ff4081";
    ctx.textAlign = "center";
    ctx.fillText("⚡❤️⚡", 350, 95);

    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${percentage}%`, 350, 135);

    const barX = 180;
    const barY = 190;
    const barW = 340;
    const barH = 24;
    const cornerRadius = 12;

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, cornerRadius);
    ctx.fill();

    const fillWidth = Math.max(12, (barW * percentage) / 100);
    const fillGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
    fillGradient.addColorStop(0, "#ff2a6d");
    fillGradient.addColorStop(1, "#ff62a5");

    ctx.fillStyle = fillGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, barH, cornerRadius);
    ctx.fill();

    const imageBuffer = await canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(imageBuffer, { name: "ship.png" });

    const name1 = target1.globalName || target1.displayName || target1.username;
    const name2 = target2.globalName || target2.displayName || target2.username;

    const shipName =
      name1.slice(0, Math.ceil(name1.length / 2)) +
      name2.slice(Math.floor(name2.length / 2));

    const embed = new EmbedBuilder()
      .setTitle(`${name1}  x  ${name2}`)
      .setDescription(
        `**Ship Name:** \`${shipName}\`\n` +
          `**Love Meter:** \`${percentage}%\` \n\n` +
          `### ${title}\n*${comment}*`,
      )
      .setColor(percentage > 50 ? 0xff4081 : 0x7289da)
      .setImage("attachment://ship.png");

    await interaction.reply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    logger.error("Error in Ship command handler:", err);
    Sentry.captureException(err);
  }
}
