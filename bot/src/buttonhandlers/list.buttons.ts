import { MessageFlags } from "discord.js";

export const handler = {
  id: ["previous", "next", "exit"],
  async execute(interaction: any) {
    if (interaction.customId === "exit") {
      await interaction.message.delete();
      return;
    }
    await interaction.reply({
      content: "Only one page available for now.",
      flags: MessageFlags.Ephemeral
    });
  },
};
