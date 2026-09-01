import { showLeaderboard } from "./guess.js";

export const aliases = ["pklb", "plb"];

export const data = {
  name: "guessboard",
  description: "View top guessers in the server.",
  dm_permission: false,
};

export async function execute(interaction, client) {
  return showLeaderboard(interaction, client);
}
