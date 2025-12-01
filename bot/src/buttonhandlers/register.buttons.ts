import { createProfileButtons } from "../components/buttons/create.profile";
import { registerEmbed } from "../components/embeds/register";

module.exports = {
  id: "exit",
  async execute(interaction: any) {
    console.log(interaction.customId);
    await interaction.message.delete();
  },
};

module.exports = {
  id: "register",
  async execute(interaction: any) {
    console.log(interaction.customId);
    await interaction.update({
      embeds: [registerEmbed],
      components: [createProfileButtons],
    });
  },
};
