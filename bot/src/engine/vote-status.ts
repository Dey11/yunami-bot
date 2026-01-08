import { EmbedBuilder } from 'discord.js';
import { getVoteSummary, type VoteSummary } from './outcome-engine.js';
import type { Choice, StoryNode } from './types.js';
export function buildVoteStatusField(
  nodeId: string,
  choices: Choice[],
  partyId?: string
): { name: string; value: string } | null {
  const summary = getVoteSummary(nodeId, partyId);
  if (!summary || summary.totalVotes === 0) {
    return null;
  }
  const lines: string[] = [];
  for (const choice of choices) {
    const count = summary.voteCounts.get(choice.id) || 0;
    const voters = summary.voters.get(choice.id) || [];
    const voterMentions = voters.map((id) => `<@${id}>`).join(', ');
    if (count > 0) {
      lines.push(
        `${choice.emoji || '•'} **${choice.label}**: ${count} vote${count !== 1 ? 's' : ''} (${voterMentions})`
      );
    }
  }
  if (lines.length === 0) {
    return null;
  }
  return {
    name: '📊 Current Votes',
    value: lines.join('\n'),
  };
}
export function addVoteStatusToEmbed(
  embed: EmbedBuilder,
  nodeId: string,
  choices: Choice[],
  partyId?: string
): void {
  const field = buildVoteStatusField(nodeId, choices, partyId);
  if (field) {
    const existingFields = embed.data.fields || [];
    const voteFieldIndex = existingFields.findIndex(
      (f) => f.name === '📊 Current Votes'
    );
    if (voteFieldIndex >= 0) {
      existingFields[voteFieldIndex] = field;
    } else {
      embed.addFields(field);
    }
  }
}
export function formatVoteSummaryText(
  summary: VoteSummary,
  choices: Choice[]
): string {
  if (summary.totalVotes === 0) {
    return 'No votes yet';
  }
  const lines: string[] = [];
  for (const choice of choices) {
    const count = summary.voteCounts.get(choice.id) || 0;
    if (count > 0) {
      lines.push(`${choice.emoji || '•'} ${choice.label}: ${count}`);
    }
  }
  return lines.join(' | ');
}
