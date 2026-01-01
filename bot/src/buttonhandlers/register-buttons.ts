import { createProfileButtons } from "../components/buttons/create-profile.js";
import { registerEmbed } from "../components/embeds/register.js";
import { buildCanvas } from "../quickstart/canvas-builder.js";

export const handler = {
  id: "register",
  async execute(interaction: any) {
    console.log(interaction.customId);
    await interaction.reply({
      embeds: [registerEmbed],
      components: [createProfileButtons],
    });
    // const canvas = await buildCanvas();
    // await interaction.deferReply();
    // await interaction.editReply({
    //   embeds: [registerEmbed],
    //   files: [canvas],

    //   components: [createProfileButtons],
    // });
  },
};