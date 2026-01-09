import {
  getSession,
  isTimerExpired,
  clearTimer,
  recordChoice,
  getSessionsMap,
  getActiveMessage,
  setActiveMessage,
  type PlayerSession,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer, getPartyMessage } from '../quickstart/party-session.js';
import {
  markTimedOut,
  getNodeInputs,
  evaluateOutcome,
  clearNodeInputs,
} from './outcome-engine.js';
import { renderNodeWithContext } from './dispatcher.js';
import { client } from '../index.js';
import { TextChannel } from 'discord.js';
type TimerCallback = (
  session: PlayerSession,
  nodeId: string,
  timerId: string
) => Promise<void>;
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
      const expired = isTimerExpired(session.odId, timerId);
      const elapsed = Date.now() - timer.startTime;
      console.log(`[Timer] Checking ${timerId} for ${session.odId}: elapsed=${Math.floor(elapsed/1000)}s, duration=${Math.floor(timer.duration/1000)}s, expired=${expired}`);
      if (expired) {
        console.log(`[Timer] EXPIRED: ${timerId} - triggering handler`);
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
  
  // Use shared party message if in multiplayer, otherwise per-player message
  let activeMessage: { channelId: string; messageId: string } | undefined;
  if (party && party.status === 'active') {
    activeMessage = getPartyMessage(party.id);
  }
  if (!activeMessage) {
    activeMessage = getActiveMessage(session.odId);
  }
  
  if (!activeMessage) {
    recordChoice(session.odId, `timeout:${nodeId}`, null);
    return;
  }
  let nextNodeId: string | null = null;
  let message = "⏱️ **Time's up!** No decision was made.";
  if (currentNode) {
    const inputs = getNodeInputs(nodeId, partyId);
    if (inputs && inputs.playerInputs.size > 0) {
      const result = evaluateOutcome(currentNode, inputs, party);
      nextNodeId = result.nextNodeId;
      message = result.message
        ? `⏱️ **Time's up!** ${result.message}`
        : "⏱️ **Time's up!**";
      clearNodeInputs(nodeId, partyId);
    }
  }
  recordChoice(session.odId, `timeout:${nodeId}`, nextNodeId);
  try {
    const channel = await client.channels.fetch(activeMessage.channelId);
    if (!channel || !channel.isTextBased()) return;
    const msg = await (channel as TextChannel).messages.fetch(
      activeMessage.messageId
    );
    if (!msg) return;
    if (nextNodeId) {
      const nextNode = session.storyData?.nodes?.[nextNodeId];
      if (nextNode) {
        const context = {
          playerId: session.odId,
          nodeId: nextNode.id,
          party,
        };
        const renderResult = await renderNodeWithContext(nextNode, context);
        const payload: any = {
          content: message,
          embeds: [renderResult.embed],
          components: renderResult.components ?? [],
        };
        if (renderResult.attachment) {
          payload.files = [renderResult.attachment];
        }
        await msg.edit(payload);
        
        // Update all players' active message for backwards compatibility
        if (party && party.status === 'active') {
          for (const p of party.players) {
            setActiveMessage(p.odId, activeMessage.channelId, activeMessage.messageId);
          }
        }
        return;
      }
    }
    await msg.edit({
      content: message,
      components: [],
    });
  } catch (error) {
    console.error(`Failed to update message on timer expiry:`, error);
  }
}

