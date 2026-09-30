import { EMBED_COLORS } from "../../utils/embeds.js";
import logger from "../../utils/logger.js";
import * as Sentry from "@sentry/node";

export const aliases = ["imp"];

export const data = {
  name: "impostor",
  description: "Find the Imposter.",
  dm_permission: false,
};

function getProgressBar(current, total, length = 10) {
  const progress = Math.min(Math.max(current / total, 0), 1);
  const filled = Math.round(length * progress);
  const empty = length - filled;
  return "■".repeat(filled) + "□".repeat(empty);
}

async function sendAndFetchReply(interaction, payload) {
  const fullPayload = {
    ...payload,
    allowedMentions: { parse: [] },
    allowed_mentions: { parse: [] },
  };
  if (interaction.replied || interaction.deferred) {
    if (typeof interaction.followUp === "function") {
      return await interaction.followUp(fullPayload);
    }
  }
  if (typeof interaction.reply === "function") {
    const response = await interaction.reply({
      ...fullPayload,
      withResponse: true,
    });
    return response.resource?.message || response;
  }
  return null;
}

export async function execute(interaction) {
  try {
    const host = interaction.user || interaction.author;
    const channel = interaction.channel;
    const hostMember =
      interaction.member || interaction.guild?.members?.cache.get(host.id);
    const hostDisplayName =
      hostMember?.displayName || host.globalName || host.username;

    if (!channel) return;

    let players = [
      {
        id: host.id,
        user: host,
        displayName: hostDisplayName,
        isBot: false,
        role: null,
        alive: true,
        hasShot: false,
      },
    ];

    let gameStarted = false;

    const buildLobby = () => {
      const playerListStr = players
        .map((p, idx) => `${idx + 1}. ${p.displayName} (<@${p.id}>)`)
        .join("\n");

      return {
        flags: 32768,
        allowedMentions: { parse: [] },
        allowed_mentions: { parse: [] },
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.INFO,
            components: [
              {
                type: 10,
                content: "### IMPOSTOR LOBBY",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content:
                  `**Host:** ${hostDisplayName} (<@${host.id}>)\n\n` +
                  `**Current Players (${players.length}/15):**\n${playerListStr}\n\n` +
                  `Click **Join** to participate! Host can click **Start** once ready.`,
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
                    style: 3,
                    custom_id: "imp_join",
                    label: "Join",
                  },
                  {
                    type: 2,
                    style: 2,
                    custom_id: "imp_leave",
                    label: "Leave",
                  },
                  {
                    type: 2,
                    style: 1,
                    custom_id: "imp_start",
                    label: "Start",
                  },
                  {
                    type: 2,
                    style: 4,
                    custom_id: "imp_cancel",
                    label: "Cancel",
                  },
                ],
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content: "-# Min 3 players required. Max 15 players.",
              },
            ],
          },
        ],
      };
    };

    const msg = await sendAndFetchReply(interaction, buildLobby());

    if (!msg) return;

    const collector = msg.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (btnInt) => {
      const clicker = btnInt.user;
      const member =
        btnInt.member || btnInt.guild?.members?.cache.get(clicker.id);
      const displayName =
        member?.displayName || clicker.globalName || clicker.username;

      if (btnInt.customId === "imp_join") {
        if (players.some((p) => p.id === clicker.id)) {
          return btnInt
            .reply({
              content: "You are already in the lobby!",
              flags: 64,
            })
            .catch(() => null);
        }
        if (players.length >= 15) {
          return btnInt
            .reply({
              content: "The lobby is full (Max 15 players)! Cannot join.",
              flags: 64,
            })
            .catch(() => null);
        }
        players.push({
          id: clicker.id,
          user: clicker,
          displayName: displayName,
          isBot: false,
          role: null,
          alive: true,
          hasShot: false,
        });
        await btnInt.update(buildLobby()).catch(() => null);
      } else if (btnInt.customId === "imp_leave") {
        if (!players.some((p) => p.id === clicker.id)) {
          return btnInt
            .reply({
              content: "You are not in the lobby!",
              flags: 64,
            })
            .catch(() => null);
        }
        if (clicker.id === host.id) {
          return btnInt
            .reply({
              content:
                "The host cannot leave the lobby! Click Cancel to abort.",
              flags: 64,
            })
            .catch(() => null);
        }
        players = players.filter((p) => p.id !== clicker.id);
        await btnInt.update(buildLobby()).catch(() => null);
      } else if (btnInt.customId === "imp_cancel") {
        if (clicker.id !== host.id) {
          return btnInt
            .reply({
              content: "Only the host can cancel the game!",
              flags: 64,
            })
            .catch(() => null);
        }
        collector.stop("cancelled");
        await btnInt
          .update({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: 0xff4757,
                components: [
                  {
                    type: 10,
                    content:
                      "<:Failed:1526228290413658184> Game lobby was cancelled by the host.",
                  },
                ],
              },
            ],
          })
          .catch(() => null);
      } else if (btnInt.customId === "imp_start") {
        if (clicker.id !== host.id) {
          return btnInt
            .reply({
              content: "Only the host can start the game!",
              flags: 64,
            })
            .catch(() => null);
        }

        if (players.length < 3) {
          const isOwner = clicker.id === process.env.OWNER_ID;
          const isExemptGuild =
            btnInt.guild?.id && btnInt.guild.id === process.env.EXEMPT_GUILD_ID;

          if (!isOwner && !isExemptGuild) {
            return btnInt
              .reply({
                content: "At least 3 players are required to start the game!",
                flags: 64,
              })
              .catch(() => null);
          }

          const botNames = ["TARS", "CASE"];
          let needed = 3 - players.length;
          for (let i = 0; i < needed; i++) {
            players.push({
              id: `bot_${i + 1}`,
              user: null,
              displayName: botNames[i],
              isBot: true,
              role: null,
              alive: true,
              hasShot: false,
            });
          }
        }

        gameStarted = true;
        collector.stop("started");
        await btnInt.deferUpdate().catch(() => null);
        await msg.delete().catch(() => null);
        runGameLoop(channel, players);
      }
    });

    collector.on("end", async (_, reason) => {
      if (!gameStarted && reason !== "cancelled") {
        await msg
          .edit({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: 0x2b2d31,
                components: [
                  {
                    type: 10,
                    content: "Lobby expired due to inactivity.",
                  },
                ],
              },
            ],
          })
          .catch(() => null);
      }
    });
  } catch (err) {
    logger.error("Error in Impostor command execution:", err);
    Sentry.captureException(err);
  }
}

async function runGameLoop(channel, players) {
  try {
    const total = players.length;
    let roles = [];

    let impostorCount = 1;
    if (total >= 15) impostorCount = 3;
    else if (total >= 7) impostorCount = 2;

    for (let i = 0; i < impostorCount; i++) {
      roles.push("IMPOSTOR");
    }

    if (total >= 3) roles.push("SHERIFF");
    if (total >= 4) roles.push("DOCTOR");
    if (total >= 5) roles.push("DETECTIVE");
    if (total >= 6) roles.push("JESTER");
    while (roles.length < total) {
      roles.push("CREWMATE");
    }

    roles.sort(() => Math.random() - 0.5);
    players.forEach((p, i) => {
      p.role = roles[i];
    });

    const roleDescriptions = {
      IMPOSTOR:
        "🔪 **IMPOSTOR**: Eliminate all crewmates without getting caught!",
      DOCTOR: "🩺 **DOCTOR**: Save 1 player each night from being killed!",
      DETECTIVE:
        "🕵🏻 **DETECTIVE**: Investigate 1 player each night to discover their role!",
      SHERIFF:
        "🤠 **SHERIFF**: You have 1 shot! Shoot the Impostor, or die if you hit an Innocent!",
      JESTER:
        "🤡 **JESTER**: Your goal is to get voted out during the day to win the game!",
      CREWMATE:
        "🧑🏻‍🚀 **CREWMATE**: Work together with the crew to identify & eject the Impostor!",
    };

    const announcePayload = {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: EMBED_COLORS.INFO,
          components: [
            {
              type: 10,
              content: "### 🎭 Game Started: Roles Assigned!",
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content:
                `All ${players.length} players have been assigned their secret roles.\n\n` +
                `Click the **View My Role** button below to check your secret role privately!`,
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
                  custom_id: "view_secret_role",
                  label: "View My Role",
                },
              ],
            },
          ],
        },
      ],
    };

    const announceMsg = await channel.send(announcePayload);

    const roleCollector = announceMsg.createMessageComponentCollector({
      time: 300000,
    });

    roleCollector.on("collect", async (rInt) => {
      if (rInt.customId === "view_secret_role") {
        const p = players.find((player) => player.id === rInt.user.id);
        if (!p) {
          return rInt
            .reply({
              content: "You are not a registered player in this game!",
              flags: 64,
            })
            .catch(() => null);
        }

        await rInt
          .reply({
            flags: 32832,
            components: [
              {
                type: 17,
                accent_color: p.role === "IMPOSTOR" ? 0xff4757 : 0x2ecc71,
                components: [
                  {
                    type: 10,
                    content: `### Your Secret Role`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content: roleDescriptions[p.role],
                  },
                ],
              },
            ],
          })
          .catch(() => null);
      }
    });

    let gameOver = false;

    while (!gameOver) {
      const alivePlayers = players.filter((p) => p.alive);
      const impostorsAlive = alivePlayers.filter((p) => p.role === "IMPOSTOR");
      const crewAlive = alivePlayers.filter((p) => p.role !== "IMPOSTOR");
      const totalImpostorsInGame = players.filter(
        (p) => p.role === "IMPOSTOR",
      ).length;

      if (impostorsAlive.length === 0) {
        const elimText =
          totalImpostorsInGame > 1
            ? "All Impostors have been eliminated from the ship! Great job team!"
            : "The Impostor has been eliminated from the ship! Great job team!";
        await channel.send({
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 0x2ecc71,
              components: [
                {
                  type: 10,
                  content: "### <a:Tada:1544329561955770488> CREWMATES WIN!",
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content: elimText,
                },
              ],
            },
          ],
        });
        break;
      }

      if (impostorsAlive.length >= crewAlive.length) {
        const isMultiple =
          impostorsAlive.length > 1 || totalImpostorsInGame > 1;
        const winTitle = isMultiple
          ? "### 🔪 IMPOSTORS WIN!"
          : "### 🔪 IMPOSTOR WINS!";
        const winContent = isMultiple
          ? "The Impostors have taken over the ship! Better luck next time."
          : "The Impostor has taken over the ship! Better luck next time.";

        await channel.send({
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: EMBED_COLORS.IMPOSTOR_WIN,
              components: [
                {
                  type: 10,
                  content: winTitle,
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content: winContent,
                },
              ],
            },
          ],
        });
        break;
      }

      const nightPayload = {
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 0x2b2d31,
            components: [
              {
                type: 10,
                content: "### 🌃 Night Phase Falls!",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content: `Special roles are taking their actions.\n-# Night ends in 20s...`,
              },
            ],
          },
        ],
      };

      await channel.send(nightPayload);

      let nightKilledId = null;
      let nightSavedId = null;
      let sheriffShotTargetId = null;
      let sheriffShooterId = null;

      const botImpostor = players.find(
        (p) => p.alive && p.isBot && p.role === "IMPOSTOR",
      );
      if (botImpostor) {
        const validTargets = alivePlayers.filter(
          (p) => p.id !== botImpostor.id,
        );
        if (validTargets.length > 0) {
          nightKilledId =
            validTargets[Math.floor(Math.random() * validTargets.length)].id;
        }
      }

      const botDoctor = players.find(
        (p) => p.alive && p.isBot && p.role === "DOCTOR",
      );
      if (botDoctor) {
        nightSavedId =
          alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
      }

      const humanSpecialRoles = alivePlayers.filter(
        (p) => !p.isBot && p.role !== "CREWMATE" && p.role !== "JESTER",
      );

      if (humanSpecialRoles.length > 0) {
        const actionPayload = {
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 0x5865f2,
              components: [
                {
                  type: 10,
                  content:
                    "### 🎭 Special Roles Action Menu\nSelect a target player below to perform your night action.",
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
                      type: 3,
                      custom_id: "night_action",
                      placeholder: "Select a target player...",
                      options: alivePlayers.map((p) => ({
                        label: p.displayName,
                        value: p.id,
                        description: `Target ${p.displayName}`,
                      })),
                    },
                  ],
                },
              ],
            },
          ],
        };

        const menuMsg = await channel.send(actionPayload);

        const menuCollector = menuMsg.createMessageComponentCollector({
          time: 18000,
        });

        menuCollector.on("collect", async (selInt) => {
          const actor = players.find((p) => p.id === selInt.user.id && p.alive);
          if (!actor || actor.role === "CREWMATE" || actor.role === "JESTER") {
            return selInt
              .reply({
                content: "You don't have a special action tonight!",
                flags: 64,
              })
              .catch(() => null);
          }

          const targetId = selInt.values[0];
          const target = players.find((p) => p.id === targetId);

          if (actor.role === "IMPOSTOR") {
            nightKilledId = targetId;
            await selInt
              .reply({
                content: `🔪 You targeted **${target.displayName}** for elimination!`,
                flags: 64,
              })
              .catch(() => null);
          } else if (actor.role === "DOCTOR") {
            nightSavedId = targetId;
            await selInt
              .reply({
                content: `🩺 You chose to protect **${target.displayName}** tonight!`,
                flags: 64,
              })
              .catch(() => null);
          } else if (actor.role === "DETECTIVE") {
            const isImp = target.role === "IMPOSTOR";
            await selInt
              .reply({
                content: `🕵🏻 Investigation Result: **${target.displayName}** is ${isImp ? "🗡️ **AN IMPOSTOR!**" : "🛡️ **INNOCENT**"}.`,
                flags: 64,
              })
              .catch(() => null);
          } else if (actor.role === "SHERIFF") {
            if (actor.hasShot) {
              return selInt
                .reply({
                  content:
                    "🤠 You have already used your 1 bullet in this game!",
                  flags: 64,
                })
                .catch(() => null);
            }
            actor.hasShot = true;
            sheriffShooterId = actor.id;
            sheriffShotTargetId = targetId;
            await selInt
              .reply({
                content: `🤠 You took a shot at **${target.displayName}**!`,
                flags: 64,
              })
              .catch(() => null);
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 20000));
        await menuMsg.delete().catch(() => null);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      const ROOMS = [
        "Electrical",
        "Navigation",
        "Shields",
        "MedBay",
        "Reactor",
        "Security",
        "Storage",
        "Cafeteria",
        "Communications",
        "Weapons",
      ];

      const deathNotices = [];

      if (nightKilledId && nightKilledId !== nightSavedId) {
        const killedPlayer = players.find((p) => p.id === nightKilledId);
        if (killedPlayer && killedPlayer.alive) {
          killedPlayer.alive = false;
          const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
          deathNotices.push(
            `💀 \`${killedPlayer.displayName}\` was found eliminated in **${room}**!`,
          );
        }
      }

      if (sheriffShotTargetId && sheriffShooterId) {
        const target = players.find((p) => p.id === sheriffShotTargetId);
        const shooter = players.find((p) => p.id === sheriffShooterId);
        if (target && target.role === "IMPOSTOR") {
          if (target.alive) {
            target.alive = false;
            deathNotices.push(
              `🤠 \`${target.displayName}\` (Impostor) was shot dead by the Sheriff!`,
            );
          }
        } else if (shooter && shooter.alive) {
          shooter.alive = false;
          deathNotices.push(
            `🤠 \`${shooter.displayName}\` (Sheriff) shot an innocent and died from guilt!`,
          );
        }
      }

      const daybreakPayload = {
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: EMBED_COLORS.DAYBREAK,
            components: [
              {
                type: 10,
                content: "### 🌅 Daybreak Arrives!",
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content:
                  deathNotices.length > 0
                    ? deathNotices.join("\n")
                    : `The sun rises. Nobody was killed last night! (maybe the doctor saved someone?)`,
              },
            ],
          },
        ],
      };

      await channel.send(daybreakPayload);

      const postNightAlive = players.filter((p) => p.alive);
      const postNightImpostors = postNightAlive.filter(
        (p) => p.role === "IMPOSTOR",
      );
      const postNightCrew = postNightAlive.filter((p) => p.role !== "IMPOSTOR");

      const postNightTotalImpostorsInGame = players.filter(
        (p) => p.role === "IMPOSTOR",
      ).length;

      const getRoleSummary = () => {
        const formatPlayer = (p) => p.displayName;
        const imps = players
          .filter((p) => p.role === "IMPOSTOR")
          .map(formatPlayer)
          .join(", ");
        const doc = players.find((p) => p.role === "DOCTOR");
        const shf = players.find((p) => p.role === "SHERIFF");
        const det = players.find((p) => p.role === "DETECTIVE");
        const jst = players.find((p) => p.role === "JESTER");

        const lines = [`- **Impostor(s):** ${imps || "None"}`];
        if (doc) lines.push(`- **Doctor:** ${formatPlayer(doc)}`);
        if (shf) lines.push(`- **Sheriff:** ${formatPlayer(shf)}`);
        if (det) lines.push(`- **Detective:** ${formatPlayer(det)}`);
        if (jst) lines.push(`- **Jester:** ${formatPlayer(jst)}`);
        return lines.join("\n");
      };

      if (postNightImpostors.length === 0) {
        const elimText =
          postNightTotalImpostorsInGame > 1
            ? "All Impostors have been eliminated! Crewmates win!"
            : "The Impostor has been eliminated! Crewmates win!";
        await channel.send({
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 0x2ecc71,
              components: [
                {
                  type: 10,
                  content: "### <a:Tada:1544329561955770488> CREWMATES WIN!",
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content: `${elimText}\n\n**Role Summary:**\n${getRoleSummary()}`,
                },
              ],
            },
          ],
        });
        break;
      }

      if (postNightImpostors.length >= postNightCrew.length) {
        const isMultiple =
          postNightImpostors.length > 1 || postNightTotalImpostorsInGame > 1;
        const winTitle = isMultiple
          ? "### 🔪 IMPOSTORS WIN!"
          : "### 🔪 IMPOSTOR WINS!";
        const winContent = isMultiple
          ? "The Impostors have taken over the ship! Better luck next time."
          : "The Impostor has taken over the ship! Better luck next time.";

        await channel.send({
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: EMBED_COLORS.IMPOSTOR_WIN,
              components: [
                {
                  type: 10,
                  content: winTitle,
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content: `${winContent}\n\n**Role Summary:**\n${getRoleSummary()}`,
                },
              ],
            },
          ],
        });
        break;
      }

      const voteOptions = postNightAlive.map((p) => ({
        label: p.displayName,
        value: p.id,
        description: `Vote to eject ${p.displayName}`,
      }));
      voteOptions.push({
        label: "Skip Vote",
        value: "SKIP",
        description: "Vote to skip ejection",
      });

      const votes = new Map();

      for (const b of postNightAlive.filter((p) => p.isBot)) {
        const candidates = postNightAlive.filter((p) => p.id !== b.id);
        if (candidates.length > 0) {
          const randomTarget =
            candidates[Math.floor(Math.random() * candidates.length)].id;
          votes.set(b.id, randomTarget);
        }
      }

      const buildVotePayload = () => {
        const totalVoters = postNightAlive.length;
        const currentVotes = votes.size;
        const bar = getProgressBar(currentVotes, totalVoters, 10);
        const playerStatusList = postNightAlive
          .map((p) => {
            const hasVoted = votes.has(p.id);
            return `• ${p.displayName} ${hasVoted ? "<:Success:1526228339910643793> *(Voted)*" : "<:Timer:1554945799308443748> *(Thinking...)*"}`;
          })
          .join("\n");

        return {
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 0x5865f2,
              components: [
                {
                  type: 10,
                  content: "### 🗳️ Discussion & Voting",
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content:
                    `Discuss in chat who you think the Impostor is!\n\n` +
                    `**Alive Players:**\n${playerStatusList}\n\n` +
                    `**Voting Progress:** \`${currentVotes}/${totalVoters}\` Votes Cast\n${bar}\n\n` +
                    `-# Voting ends in 25 seconds...`,
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
                      type: 3,
                      custom_id: "day_vote",
                      placeholder: "Cast your vote...",
                      options: voteOptions,
                    },
                  ],
                },
              ],
            },
          ],
        };
      };

      const voteMsg = await channel.send(buildVotePayload());

      const voteCollector = voteMsg.createMessageComponentCollector({
        time: 25000,
      });

      voteCollector.on("collect", async (vInt) => {
        const voter = players.find((p) => p.id === vInt.user.id);
        if (!voter || !voter.alive) {
          return vInt
            .reply({
              content: "Dead players cannot vote!",
              flags: 64,
            })
            .catch(() => null);
        }

        const choice = vInt.values[0];
        votes.set(voter.id, choice);

        const choiceName =
          choice === "SKIP"
            ? "Skip Vote"
            : players.find((p) => p.id === choice)?.displayName;

        await vInt
          .reply({
            content: `🗳️ You voted for **${choiceName}**!`,
            flags: 64,
          })
          .catch(() => null);

        await voteMsg.edit(buildVotePayload()).catch(() => null);
      });

      await new Promise((resolve) => setTimeout(resolve, 26000));
      await voteMsg.delete().catch(() => null);

      const voteCounts = {};
      for (const [, targetId] of votes.entries()) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
      }

      let topTarget = null;
      let maxVotes = 0;
      let tie = false;

      for (const [targetId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          topTarget = targetId;
          tie = false;
        } else if (count === maxVotes) {
          tie = true;
        }
      }

      if (tie || !topTarget || topTarget === "SKIP") {
        await channel.send({
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 0x2b2d31,
              components: [
                {
                  type: 10,
                  content: "### 🗳️ Voting Result: No Ejection",
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1,
                },
                {
                  type: 10,
                  content:
                    "No single player received a clear majority vote. **No one was ejected!**",
                },
              ],
            },
          ],
        });
      } else {
        const ejectedPlayer = players.find((p) => p.id === topTarget);
        if (ejectedPlayer) {
          ejectedPlayer.alive = false;

          if (ejectedPlayer.role === "JESTER") {
            await channel.send({
              flags: 32768,
              components: [
                {
                  type: 17,
                  accent_color: 0x9b59b6,
                  components: [
                    {
                      type: 10,
                      content:
                        "### <a:Tada:1544329561955770488> 🤡 JESTER WINS!",
                    },
                    {
                      type: 14,
                      divider: true,
                      spacing: 1,
                    },
                    {
                      type: 10,
                      content:
                        `**${ejectedPlayer.displayName}** fooled everyone into voting them out!\n\n` +
                        `🤡 **The Jester wins the game!**\n\n` +
                        `**Role Summary:**\n${getRoleSummary()}`,
                    },
                  ],
                },
              ],
            });
            gameOver = true;
            break;
          }

          const isImp = ejectedPlayer.role === "IMPOSTOR";
          const remainingImps = players.filter(
            (p) => p.alive && p.role === "IMPOSTOR",
          ).length;

          const impQuotes = [
            `\`${ejectedPlayer.displayName}\` was launched into deep space.\n\n🗡️ **\`${ejectedPlayer.displayName}\` was An Impostor.** ${remainingImps === 0 ? "No Impostors remain!" : `(${remainingImps} Impostor${remainingImps > 1 ? "s" : ""} remain)`}`,
            `\`${ejectedPlayer.displayName}\` was thrown out of the airlock.\n\n🗡️ **\`${ejectedPlayer.displayName}\` was An Impostor.**`,
            `\`${ejectedPlayer.displayName}\` was ejected into the void.\n\n🗡️ **\`${ejectedPlayer.displayName}\` was An Impostor.**`,
          ];

          const innocentQuotes = [
            `\`${ejectedPlayer.displayName}\` was launched into deep space...\n\n🛡️ **\`${ejectedPlayer.displayName}\` was NOT an Impostor.** (${remainingImps} Impostor${remainingImps > 1 ? "s" : ""} remain among us)`,
            `\`${ejectedPlayer.displayName}\` was voted out by the ship crew...\n\n🛡️ **\`${ejectedPlayer.displayName}\` was innocent.** (${remainingImps} Impostor${remainingImps > 1 ? "s" : ""} remain)`,
            `\`${ejectedPlayer.displayName}\` was ejected into zero gravity.\n\n🛡️ **\`${ejectedPlayer.displayName}\` was NOT an Impostor.**`,
          ];

          const quotes = isImp ? impQuotes : innocentQuotes;
          const selectedQuote =
            quotes[Math.floor(Math.random() * quotes.length)];

          await channel.send({
            flags: 32768,
            components: [
              {
                type: 17,
                accent_color: isImp ? 0x2ecc71 : 0xff4757,
                components: [
                  {
                    type: 10,
                    content: `### 🚀 ${ejectedPlayer.displayName} was Ejected!`,
                  },
                  {
                    type: 14,
                    divider: true,
                    spacing: 1,
                  },
                  {
                    type: 10,
                    content: selectedQuote,
                  },
                ],
              },
            ],
          });
        }
      }
    }
  } catch (err) {
    logger.error("Error in Impostor game loop:", err);
    Sentry.captureException(err);
  }
}
