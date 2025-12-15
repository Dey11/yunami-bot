export const handler = {
  id: "exit",
  async execute(interaction: any) {
    console.log(interaction.customId);
    await interaction.message.delete();
  },
};
