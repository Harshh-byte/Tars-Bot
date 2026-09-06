export function detectUserGender(member) {
  if (!member || !member.roles || !member.roles.cache) return null;

  const maleKeywords = [
    "male",
    "boy",
    "man",
    "guy",
    "he/him",
    "he / him",
    "he/him/his",
    "gentleman",
    "bhai",
    "dude",
    "king",
  ];

  const femaleKeywords = [
    "female",
    "girl",
    "woman",
    "lady",
    "she/her",
    "she / her",
    "she/her/hers",
    "queen",
    "behen",
    "bhen",
    "devi",
  ];

  for (const role of member.roles.cache.values()) {
    const name = role.name.toLowerCase().trim();

    for (const kw of femaleKeywords) {
      if (name === kw || name.includes(kw)) {
        return "Female";
      }
    }

    for (const kw of maleKeywords) {
      if (name === kw || name.includes(kw)) {
        return "Male";
      }
    }
  }

  return null;
}
