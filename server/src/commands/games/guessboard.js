import { execute as executeGuess } from "./guess.js";

export const aliases = ["flaglb", "pklb"];

export const data = {
  name: "guessboard",
  description: "View top guessers in the server.",
  dm_permission: false,
  options: [
    {
      name: "category",
      description: "Select a category.",
      type: 3,
      required: true,
      choices: [
        { name: "Flag", value: "flag" },
        { name: "Pokemon", value: "pokemon" },
      ],
    },
  ],
};

export async function execute(interaction, client, extras) {
  return executeGuess(interaction, client, extras);
}
