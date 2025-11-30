module.exports = {
  id: "cancel",
  async execute(interaction: any) {
    console.log(interaction.customId);
    await interaction.message.delete();
  },
};
