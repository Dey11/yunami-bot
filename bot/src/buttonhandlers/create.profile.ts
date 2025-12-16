import { storySceneBuilder } from "../quickstart/embed.builder.js";
import { storyGraph } from "../quickstart/story.graph.js";

const episodes = storyGraph.listEpisodes();
const startIds = episodes.map((episode) => `start:${episode.id}`);
const choiceIds = episodes.flatMap((episode) =>
  storyGraph.getAllChoiceIds(episode.id).map((choiceId) => `choice:${episode.id}:${choiceId}`)
);

function parseChoiceId(customId: string) {
  if (!customId.startsWith("choice:")) return null;
  const [, episodeId, choiceId] = customId.split(":");
  if (!episodeId || !choiceId) return null;
  return { episodeId, choiceId };
}

function parseStartId(customId: string) {
  if (!customId.startsWith("start:")) return null;
  const [, episodeId] = customId.split(":");
  if (!episodeId) return null;
  return { episodeId };
}

export const handler = {
  id: ["createProfile", ...startIds, ...choiceIds],
  async execute(interaction: any) {
    try {
      if (interaction.customId === "createProfile") {
        const fallbackEpisode = episodes[0];
        if (!fallbackEpisode) return;
        const [cutsceneEmbed, choicesButton] = storySceneBuilder(
          fallbackEpisode.id,
          fallbackEpisode.entryNodeId
        );
        if (!cutsceneEmbed) return;
        await interaction.update({
          embeds: [cutsceneEmbed],
          components: choicesButton.components.length ? [choicesButton] : [],
        });
        return;
      }

      const startMatch = parseStartId(interaction.customId);
      if (startMatch) {
        const episode = storyGraph.getEpisode(startMatch.episodeId);
        if (!episode) return;
        const [cutsceneEmbed, choicesButton] = storySceneBuilder(
          episode.id,
          episode.entryNodeId
        );
        if (!cutsceneEmbed) return;
        await interaction.update({
          embeds: [cutsceneEmbed],
          components: choicesButton.components.length ? [choicesButton] : [],
        });
        return;
      }

      const choiceMatch = parseChoiceId(interaction.customId);
      if (!choiceMatch) return;

      const nextNodeId = storyGraph.getNextNodeId(choiceMatch.episodeId, choiceMatch.choiceId);
      if (!nextNodeId) return;

      const [cutsceneEmbed, choicesButton] = storySceneBuilder(
        choiceMatch.episodeId,
        nextNodeId
      );
      if (!cutsceneEmbed) return;
      await interaction.update({
        embeds: [cutsceneEmbed],
        components: choicesButton.components.length ? [choicesButton] : [],
      });
    } catch (error) {
      console.error(error);
    }
  },
};
