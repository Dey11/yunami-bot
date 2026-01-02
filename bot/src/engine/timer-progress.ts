import { client } from '../index.js';
import { TextChannel, EmbedBuilder } from 'discord.js';
import {
  getSessionsMap,
  getActiveMessage,
  getTimer,
  getTimerRemaining,
} from '../quickstart/runtime-graph.js';

const PROGRESS_UPDATE_INTERVAL_MS = 3000;
const PROGRESS_BAR_LENGTH = 10;
const DEBOUNCE_MS = 2000;

let progressInterval: NodeJS.Timeout | null = null;

export function startProgressUpdater(): void {
  if (progressInterval) {
    return;
  }

  progressInterval = setInterval(() => {
    updateAllProgressBars();
  }, PROGRESS_UPDATE_INTERVAL_MS);
}

export function stopProgressUpdater(): void {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

async function updateAllProgressBars(): Promise<void> {
  const sessions = getSessionsMap();

  for (const session of sessions.values()) {
    for (const [timerId, timer] of session.activeTimers.entries()) {
      if (timer.nodeId !== session.currentNodeId) {
        continue;
      }

      const activeMessage = getActiveMessage(session.odId);
      if (!activeMessage) continue;

      const timeSinceLastUpdate = Date.now() - activeMessage.lastUpdated;
      if (timeSinceLastUpdate < DEBOUNCE_MS) {
        continue;
      }

      const remaining = getTimerRemaining(session.odId, timerId);
      if (remaining <= 0) continue;

      const totalSeconds = timer.duration / 1000;
      const progressBar = buildProgressBar(remaining, totalSeconds);

      try {
        await updateMessageProgress(
          activeMessage.channelId,
          activeMessage.messageId,
          progressBar,
          remaining
        );
      } catch (error) {}
    }
  }
}

async function updateMessageProgress(
  channelId: string,
  messageId: string,
  progressBar: string,
  remainingSeconds: number
): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) return;

  const message = await (channel as TextChannel).messages.fetch(messageId);
  if (!message) return;

  const existingEmbed = message.embeds[0];
  if (!existingEmbed) return;

  const timerText = `⏱️ ${progressBar} ${remainingSeconds}s`;
  const currentFooter = existingEmbed.footer?.text ?? '';

  if (
    currentFooter.startsWith('⏱️') &&
    currentFooter.includes(`${remainingSeconds}s`)
  ) {
    return;
  }

  const embed = EmbedBuilder.from(existingEmbed);
  embed.setFooter({ text: timerText });

  await message.edit({ embeds: [embed] });
}

export function buildProgressBar(remaining: number, total: number): string {
  const ratio = Math.max(0, Math.min(1, remaining / total));
  const filled = Math.round(ratio * PROGRESS_BAR_LENGTH);
  const empty = PROGRESS_BAR_LENGTH - filled;

  let filledEmoji: string;
  if (ratio > 0.5) {
    filledEmoji = '🟩';
  } else if (ratio > 0.2) {
    filledEmoji = '🟨';
  } else {
    filledEmoji = '🟥';
  }

  return filledEmoji.repeat(filled) + '⬛'.repeat(empty);
}
