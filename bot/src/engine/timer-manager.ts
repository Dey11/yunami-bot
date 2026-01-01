import {
    getSession,
    isTimerExpired,
    clearTimer,
    recordChoice,
    getSessionsMap,
    getActiveMessage,
    type PlayerSession,
} from "../quickstart/runtime-graph.js";
import { getPartyByPlayer } from "../quickstart/party-session.js";
import {
    markTimedOut,
    getNodeInputs,
    evaluateOutcome,
    clearNodeInputs,
} from "./outcome-engine.js";
import { renderNodeWithContext } from "./dispatcher.js";
import { client } from "../index.js";
import { TextChannel } from "discord.js";

type TimerCallback = (session: PlayerSession, nodeId: string, timerId: string) => Promise<void>;

let timerInterval: NodeJS.Timeout | null = null;
let onTimerExpiredCallback: TimerCallback | null = null;

const CHECK_INTERVAL_MS = 1000;

export function startTimerManager(onExpired?: TimerCallback): void {
    if (timerInterval) {
        return;
    }

    onTimerExpiredCallback = onExpired ?? defaultExpiryHandler;

    timerInterval = setInterval(() => {
        checkAllTimers();
    }, CHECK_INTERVAL_MS);
}

export function stopTimerManager(): void {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    onTimerExpiredCallback = null;
}

function checkAllTimers(): void {
    const sessions = getSessionsMap();

    for (const session of sessions.values()) {
        for (const [timerId, timer] of session.activeTimers.entries()) {
            if (isTimerExpired(session.odId, timerId)) {
                handleExpiredTimer(session, timer.nodeId, timerId);
            }
        }
    }
}

async function handleExpiredTimer(
    session: PlayerSession,
    nodeId: string,
    timerId: string
): Promise<void> {
    clearTimer(session.odId, timerId);

    if (onTimerExpiredCallback) {
        try {
            await onTimerExpiredCallback(session, nodeId, timerId);
        } catch (error) {
            console.error(`Timer expiry handler error for ${session.odId}:`, error);
        }
    }
}

async function defaultExpiryHandler(
    session: PlayerSession,
    nodeId: string,
    timerId: string
): Promise<void> {
    const party = getPartyByPlayer(session.odId);
    const partyId = party?.id;

    markTimedOut(nodeId, partyId);

    const currentNode = session.storyData?.nodes?.[nodeId];
    if (!currentNode) {
        recordChoice(session.odId, `timeout:${nodeId}`, null);
        return;
    }

    const inputs = getNodeInputs(nodeId, partyId);
    if (!inputs) {
        recordChoice(session.odId, `timeout:${nodeId}`, null);
        return;
    }

    const result = evaluateOutcome(currentNode, inputs, party);
    recordChoice(session.odId, `timeout:${nodeId}`, result.nextNodeId);
    clearNodeInputs(nodeId, partyId);

    if (!result.nextNodeId) {
        return;
    }

    const nextNode = session.storyData?.nodes?.[result.nextNodeId];
    if (!nextNode) {
        return;
    }

    const activeMessage = getActiveMessage(session.odId);
    if (!activeMessage) {
        return;
    }

    try {
        const channel = await client.channels.fetch(activeMessage.channelId);
        if (!channel || !channel.isTextBased()) {
            return;
        }

        const message = await (channel as TextChannel).messages.fetch(activeMessage.messageId);
        if (!message) {
            return;
        }

        const context = {
            playerId: session.odId,
            nodeId: nextNode.id,
            party,
        };

        const renderResult = await renderNodeWithContext(nextNode, context);

        const payload: any = {
            content: result.message ? `⏱️ **Time's up!** ${result.message}` : "⏱️ **Time's up!**",
            embeds: [renderResult.embed],
            components: renderResult.components ?? [],
        };

        if (renderResult.attachment) {
            payload.files = [renderResult.attachment];
        }

        await message.edit(payload);
    } catch (error) {
        console.error(`Failed to update message on timer expiry:`, error);
    }
}



