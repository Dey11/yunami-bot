import { EmbedBuilder } from "discord.js";
import { buildProfileQuestionEmbed } from "../components/design/createprofile/createprofile";

module.exports = {
  id: "createProfile",
  async execute(interaction: any) {
    if (interaction.customId === "createProfile") {
      await interaction.update(
        buildProfileQuestionEmbed({
          userTag: interaction.user.tag,
          avatarURL: interaction.user.avatarURL(),
          questionIndex: 0,
        })
      );
    }
  },
};
