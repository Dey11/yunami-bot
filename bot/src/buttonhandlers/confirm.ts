import { ironPulseEmbed } from "../sample.js";

export const handler = {
  id: "confirm",
  async execute(interaction: any) {
    console.log(interaction.customId);
    await interaction.reply({
      content: "You chose to play " + interaction.message.embeds[0].title,
      embeds: [ironPulseEmbed],
    });
  },
};
