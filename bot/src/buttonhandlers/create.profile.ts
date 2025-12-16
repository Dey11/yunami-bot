import { storySceneBuilder } from "../quickstart/embed.builder.js";
import data from "../quickstart/story.json" with { type: "json" };

const nodeKeys = Object.keys(data.nodes);
const choices: string[] = Object.values(data.nodes).flatMap((node: any) =>
  node.choices.map((choice: any) => choice.id)
);
const allNextNodeIds: string[] = Object.values(data.nodes)
  .flatMap((node: any) => node.choices.map((choice: any) => choice.nextNodeId))
  .filter((id: string | null) => id != null);

export const handler = {
  id: ["createProfile"].concat(nodeKeys).concat(choices),
  async execute(interaction: any) {
    console.log(nodeKeys);
    console.log(choices);

    try {
      if (interaction.customId === "createProfile") {
        await interaction.deferUpdate();
        const [cutsceneEmbed, choicesButton, cutsceneImage] =
          await storySceneBuilder("intro_gate");
        await interaction.editReply(
          cutsceneImage
            ? {
                embeds: [cutsceneEmbed],
                files: [cutsceneImage],
                components: [choicesButton],
              }
            : {
                embeds: [cutsceneEmbed],
                components: [choicesButton],
              }
        );
      }

      for (const node of Object.values(data.nodes)) {
        const matchedChoice = node.choices.find(
          (choice: any) => choice.id === interaction.customId
        );

        if (matchedChoice && matchedChoice.nextNodeId) {
          await interaction.deferUpdate();
          const [cutsceneEmbed, choicesButton, cutsceneImage] =
            await storySceneBuilder(
              matchedChoice.nextNodeId as keyof typeof data.nodes
            );
          await interaction.editReply({
            embeds: [cutsceneEmbed],
            files: [],
            components: [choicesButton],
          });
          return;
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
};
