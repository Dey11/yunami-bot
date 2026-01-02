export const handler = {
  id: 'confirm',
  async execute(interaction: any) {
    const title = interaction.message.embeds?.[0]?.title ?? '';
    await interaction.reply({
      content: `You chose to play ${title}.`,
    });
  },
};
