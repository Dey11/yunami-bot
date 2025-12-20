import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { storyBeg } from "../../components/design/story1.js";
import { listButtons } from "../../components/buttons/list.buttons.js";
import { storyGraph } from "../../quickstart/story.graph.js";
import { buildStartButtons } from "../../components/buttons/start.buttons.js";

const episodes = storyGraph.listEpisodes().filter((ep: any) => ep.id !== "prologue_1");
const storyThumbnail = storyBeg.toJSON().thumbnail?.url;

export const data = new SlashCommandBuilder()
  .setName("startsingleplayer")
  .setDescription("View or start a single‑player story.")
  .addIntegerOption((option) =>
    option
      .setName("story")
      .setDescription("Story number to start (see the story list).")
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(Math.max(1, episodes.length))
  );

export async function execute(interaction: any) {
  const storyNumber = interaction.options.getInteger("story");

  if (storyNumber) {
    const selectedEpisode = episodes[storyNumber - 1];
    if (!selectedEpisode) {
      await interaction.reply({
        content: "That story number is not available yet.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const heroEmbed = EmbedBuilder.from(storyBeg)
      .setTitle(selectedEpisode.title)
      .setDescription(selectedEpisode.description || "No description available.");

    const startButtons = buildStartButtons(selectedEpisode.id);

    await interaction.reply({
      embeds: [heroEmbed],
      components: [startButtons],
    });
    return;
  }

  const storyFields = episodes.map((episode, index) => ({
    name: `Story ${index + 1}: ${episode.title}`,
    value: episode.description || "No description available.",
  }));

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
      ...storyFields,
      {
        name: "Info",
        value:
          "Run `/startsingleplayer <story_number>` to begin a campaign.\nExample: `/startsingleplayer 2`",
      },
      {
        name: "Page",
        value: `Page 1 | Stories: ${episodes.length}`,
      }
    );

  if (storyThumbnail) {
    storiesEmbed.setThumbnail(storyThumbnail);
  }

  await interaction.reply({
    embeds: [storiesEmbed],
    components: [listButtons],
  });
}
