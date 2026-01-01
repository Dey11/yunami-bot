import { MessageFlags } from "discord.js";
import { getSession, recordChoice } from "../quickstart/runtime-graph.js";

export const handler = {
    id: /^select:(.+):(.+)$/,
    async execute(interaction: any) {
        const odId = interaction.user.id;
        const session = getSession(odId);

        if (!session) {
            await interaction.reply({
                content: "No active session. Please start a new story.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const [, nodeId, selectId] = interaction.customId.match(/^select:(.+):(.+)$/) || [];
        const selectedValues = interaction.values;

        if (!nodeId || !selectId || !selectedValues?.length) {
            await interaction.reply({
                content: "Invalid selection.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const currentNode = session.storyData.nodes?.[nodeId];
        if (!currentNode) {
            await interaction.reply({
                content: "Node not found.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const selects = currentNode.type_specific?.selects || [];
        const selectMenu = selects.find((s: any) => s.id === selectId);

        if (!selectMenu) {
            await interaction.reply({
                content: "Select menu not found.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const selectedLabels = selectedValues
            .map((val: string) => {
                const option = selectMenu.options.find((o: any) => o.id === val);
                return option?.label || val;
            })
            .join(", ");

        recordChoice(odId, `${selectId}:${selectedValues.join(",")}`, null);

        await interaction.reply({
            content: `Selection recorded: **${selectedLabels}**`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
