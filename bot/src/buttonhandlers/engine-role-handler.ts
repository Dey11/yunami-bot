import { MessageFlags } from "discord.js";
import { getSession, recordChoice, getPartyRole } from "../quickstart/runtime-graph.js";
import { getPartyByPlayer } from "../quickstart/party-session.js";

export const handler = {
    id: /^role:(.+):(.+)$/,
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

        const [, nodeId, actionId] = interaction.customId.match(/^role:(.+):(.+)$/) || [];

        if (!nodeId || !actionId) {
            await interaction.reply({
                content: "Invalid action format.",
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

        const roleAction = currentNode.type_specific?.role_reserved_action;
        if (!roleAction || roleAction.id !== actionId) {
            await interaction.reply({
                content: "Action not found.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const party = getPartyByPlayer(odId);
        const requiredRole = roleAction.requires_team_role;

        let hasRequiredRole = false;
        if (party && party.status === "active") {
            for (const player of party.players) {
                if (getPartyRole(player.odId) === requiredRole) {
                    hasRequiredRole = true;
                    break;
                }
            }
        }

        if (!hasRequiredRole) {
            await interaction.reply({
                content: `This action requires a **${requiredRole}** in the party.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        recordChoice(odId, `role:${actionId}`, null);

        await interaction.reply({
            content: `**${roleAction.label}** has been activated!`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
