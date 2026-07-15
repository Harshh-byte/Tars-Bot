export const data = {
  name: "ping",
  description: "Sends pong.",
  dm_permission: false,
};

export async function execute(interaction, client) {
  const gatewayLatency = Date.now() - interaction.createdTimestamp;
  let totalSeconds = Math.floor(client.uptime / 1000);
  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  return interaction.reply({
    content: `🏓 **Pong!**\nGateway latency is \`${gatewayLatency}ms\` and my uptime is \`${uptimeString}\`.`,
  });
}
