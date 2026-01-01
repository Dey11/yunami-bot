import type { StoryNode } from "./types.js";
import type { MultiplayerSession } from "../types/party.js";
import { getSession, getPartyRole } from "../quickstart/runtime.graph.js";
import { getPartyByPlayer } from "../quickstart/party.session.js";
import { client } from "../index.js";

export async function executeSideEffects(
    node: StoryNode,
    playerId: string,
    party?: MultiplayerSession | null
): Promise<void> {
    const sideEffects = node.side_effects_on_enter;
    if (!sideEffects) {
        return;
    }

    if (sideEffects.spawn_dm_jobs && node.type_specific?.dm_deliveries) {
        await sendDMDeliveries(node, playerId, party);
    }

    if (sideEffects.run_script) {
        await runScript(sideEffects.run_script, node, playerId, party);
    }
}

async function sendDMDeliveries(
    node: StoryNode,
    playerId: string,
    party?: MultiplayerSession | null
): Promise<void> {
    const dmDeliveries = node.type_specific?.dm_deliveries;
    if (!dmDeliveries || dmDeliveries.length === 0) {
        return;
    }

    if (!party) {
        party = getPartyByPlayer(playerId);
    }

    const session = getSession(playerId);
    if (!session) {
        return;
    }

    for (const delivery of dmDeliveries) {
        const recipientRole = delivery.recipient_role;
        const recipients = findPlayersWithRole(recipientRole, playerId, party);

        for (const recipientId of recipients) {
            try {
                const user = await client.users.fetch(recipientId);
                await user.send(delivery.content.text);
            } catch (error) {
                console.error(`Failed to send DM to ${recipientId}:`, error);
            }
        }
    }
}

function findPlayersWithRole(
    role: string,
    currentPlayerId: string,
    party?: MultiplayerSession | null
): string[] {
    const recipients: string[] = [];

    if (!party || party.status !== "active") {
        const session = getSession(currentPlayerId);
        if (session && getPartyRole(currentPlayerId) === role) {
            recipients.push(currentPlayerId);
        }
        return recipients;
    }

    for (const player of party.players) {
        const playerRole = getPartyRole(player.odId);
        if (playerRole === role) {
            recipients.push(player.odId);
        }
    }

    return recipients;
}

async function runScript(
    scriptName: string,
    node: StoryNode,
    playerId: string,
    party?: MultiplayerSession | null
): Promise<void> {
    const session = getSession(playerId);
    if (!session) {
        return;
    }

    switch (scriptName) {
        default:
            console.warn(`Unknown script: ${scriptName}`);
            break;
    }
}

