export const data = {
  name: "ping",
  description: "Sends pong.",
  dm_permission: false,
};

export async function execute(interaction, getUptimeString) {
  const gatewayLatency = Date.now() - interaction.createdTimestamp;
  return interaction.reply({
    content: `🏓 **Pong!**\nGateway latency is \`${gatewayLatency}ms\` and my uptime is \`${getUptimeString()}\`.`,
  });
}
