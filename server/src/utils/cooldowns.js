const cooldowns = new Map();

export function checkCooldown(userId, commandName, cooldownSeconds = 3) {
  if (userId === process.env.OWNER_ID) {
    return {
      onCooldown: false,
      remainingSeconds: "0.0",
      expirationTimestamp: 0,
    };
  }

  const key = `${userId}_${commandName}`;
  const now = Date.now();
  const cooldownAmount = cooldownSeconds * 1000;

  if (cooldowns.has(key)) {
    const expirationTime = cooldowns.get(key);
    if (now < expirationTime) {
      const remainingSeconds = ((expirationTime - now) / 1000).toFixed(1);
      const expirationTimestamp = Math.ceil(expirationTime / 1000);
      return { onCooldown: true, remainingSeconds, expirationTimestamp };
    }
  }

  const expirationTime = now + cooldownAmount;
  cooldowns.set(key, expirationTime);
  setTimeout(() => cooldowns.delete(key), cooldownAmount);

  return { onCooldown: false, remainingSeconds: "0.0", expirationTimestamp: 0 };
}
