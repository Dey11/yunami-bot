import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { spStartButtons } from "../../components/design/singleplayer1";
import { storyBeg } from "../../components/design/singleplayer1";

export const data = new SlashCommandBuilder()
  .setName("start singleplayer")
  .setDescription("View or start a single‑player story.")
  .addIntegerOption((option) =>
    option
      .setName("story")
      .setDescription("Story number to start (see the story list).")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(3)
  );

export async function execute(interaction: any) {
  const storyNumber = interaction.options.getInteger("story");

  if (storyNumber) {
    switch (storyNumber) {
      case 1:
        await interaction.reply({
          embeds: [storyBeg],
          components: [spStartButtons],
        });
        break;

      case 2:
        await interaction.reply({
          embeds: [storyBeg],
          components: [spStartButtons],
        });
        break;

      case 3:
        await interaction.reply({
          embeds: [storyBeg],
          components: [spStartButtons],
        });
        break;

      default:
        await interaction.reply({
          content: "That story number is not available yet.",
          ephemeral: true,
        });
    }

    return;
  }

  const storiesEmbed = new EmbedBuilder()
    .setColor(0x00b3b3)
    .setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .setTitle("Single‑Player Stories")
    .setDescription(
      "All currently available single‑player campaigns are listed below.\n"
    )
    .addFields(
      {
        name: "Story 1",
        value:
          "Spiritbound Academy\nA curse saturates an elite academy where memories fracture and corridors shift.",
      },
      {
        name: "Story 2",
        value:
          "Ashen Blade Chronicles\nA realm‑walking swordsman hunts a forbidden name across fractured realms.",
      },
      {
        name: "Story 3",
        value:
          "Iron Pulse Rebellion\nA techno‑city powered by divine engines edges toward collapse and open revolt.",
      },
      {
        name: "Info",
        value:
          "Run `/startsingleplayer <story_number>` to begin a campaign.\nExample: `/startsingleplayer 2`",
      },
      {
        name: "Page",
        value: "Page 1 | Stories: 3",
      }
    )
    .setThumbnail("https://your.cdn/path/to/logo.png");

  await interaction.reply({
    embeds: [storiesEmbed],
  });
}
