import { storySceneBuilder } from "../quickstart/embed.builder";
import data from "../quickstart/story.json";

const nodeKeys = Object.keys(data.nodes);
const choices: string[] = Object.values(data.nodes).flatMap((node: any) =>
  node.choices.map((choice: any) => choice.id)
);
const allNextNodeIds: string[] = Object.values(data.nodes)
  .flatMap((node: any) => node.choices.map((choice: any) => choice.nextNodeId))
  .filter((id: string | null) => id != null);

module.exports = {
  id: ["createProfile"].concat(nodeKeys).concat(choices),
  async execute(interaction: any) {
    console.log(nodeKeys);
    console.log(choices);
    try {
      if (interaction.customId === "createProfile") {
        const [cutsceneEmbed, choicesButton] = await storySceneBuilder(
          "intro_gate"
        );
        await interaction.update({
          embeds: [cutsceneEmbed],
          components: [choicesButton],
        });
      }

      for (const node of Object.values(data.nodes)) {
        const matchedChoice = node.choices.find(
          (choice: any) => choice.id === interaction.customId
        );
        if (matchedChoice && matchedChoice.nextNodeId) {
          const [cutsceneEmbed, choicesButton] = await storySceneBuilder(
            matchedChoice.nextNodeId as keyof typeof data.nodes
          );
          await interaction.update({
            embeds: [cutsceneEmbed],
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
