
export const handler = {
  id: "cancel",
  async execute(interaction: any) {
    console.log(interaction.customId);
    await interaction.deferUpdate();
    await interaction.deleteReply();
  },
};
