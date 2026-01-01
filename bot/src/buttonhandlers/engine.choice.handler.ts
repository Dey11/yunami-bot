import { MessageFlags } from "discord.js";
import {
    getSession,
    recordChoice,
    lockChoice,
    isChoiceLocked,
    getResource,
    modifyResource,
} from "../quickstart/runtime.graph.js";
import { getPartyByPlayer } from "../quickstart/party.session.js";
import { renderNodeWithContext } from "../engine/dispatcher.js";
import type { Choice } from "../engine/types.js";

export const handler = {
    id: /^choice:(.+):(.+)$/,
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

        const [, nodeId, choiceId] = interaction.customId.match(/^choice:(.+):(.+)$/) || [];

        if (!nodeId || !choiceId) {
            await interaction.reply({
                content: "Invalid choice format.",
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

        const choices: Choice[] = currentNode.type_specific?.choices || [];
        const choice = choices.find((c: Choice) => c.id === choiceId);

        if (!choice) {
            await interaction.reply({
                content: "Choice not found.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (isChoiceLocked(odId, nodeId, choiceId)) {
            await interaction.reply({
                content: "You have already made this choice.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (choice.cost) {
            for (const [resource, amount] of Object.entries(choice.cost)) {
                if (getResource(odId, resource) < amount) {
                    await interaction.reply({
                        content: `Not enough ${resource}. Required: ${amount}, available: ${getResource(odId, resource)}.`,
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
            }
        }

        if (choice.ephemeral_confirmation) {
            await interaction.reply({
                content: `You chose: **${choice.label}**. Your choice has been recorded.`,
                flags: MessageFlags.Ephemeral,
            });
        } else {
            await interaction.deferUpdate();
        }

        if (choice.cost) {
            for (const [resource, amount] of Object.entries(choice.cost)) {
                modifyResource(odId, resource, -amount);
            }
        }

        lockChoice(odId, nodeId, choiceId);
        recordChoice(odId, choiceId, choice.nextNodeId ?? null);

        if (choice.nextNodeId) {
            const nextNode = session.storyData.nodes?.[choice.nextNodeId];
            if (nextNode) {
                const party = getPartyByPlayer(odId);
                const context = {
                    playerId: odId,
                    nodeId: nextNode.id,
                    party,
                };
                const result = await renderNodeWithContext(nextNode, context);
                const payload: any = { embeds: [result.embed], components: result.components ?? [] };
                if (result.attachment) payload.files = [result.attachment];

                if (choice.ephemeral_confirmation) {
                    await interaction.message.edit(payload);
                } else {
                    await interaction.editReply(payload);
                }
            }
        }
    },
};

