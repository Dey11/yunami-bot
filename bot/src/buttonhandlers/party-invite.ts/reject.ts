export const handler = {
  id: "reject_party_invite",
  async execute(interaction: any) {
    if (interaction.customId === "reject_party_invite") {
      await interaction.reply({
        content: `${interaction.user} rejected your party invite`,
      });
    }
  },
};
