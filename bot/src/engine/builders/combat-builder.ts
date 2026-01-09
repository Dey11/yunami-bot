import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from '../../quickstart/canvas-builder.js';
import { getCombatState, getPartyRole } from '../../quickstart/runtime-graph.js';
import type {
  StoryNode,
  BuilderResult,
  CombatAction,
  CombatEnemy,
  CombatState,
} from '../types.js';
export interface CombatBuilderContext {
  playerId: string;
  nodeId: string;
}
export async function buildCombatNode(
  node: StoryNode,
  context: CombatBuilderContext
): Promise<BuilderResult> {
  const publicEmbed = node.public_embed;
  const combat = node.type_specific?.combat;
  const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0xe74c3c);
  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);
  else embed.setTitle('Combat');
  if (publicEmbed?.description) embed.setDescription(publicEmbed.description);
  const state = getCombatState(context.playerId, context.nodeId);
  const playerHp = state?.player_hp ?? combat?.player_hp ?? 100;
  const playerMaxHp = combat?.player_max_hp ?? 100;
  embed.addFields({
    name: 'Your HP',
    value: formatHpBar(playerHp, playerMaxHp),
    inline: true,
  });
  if (combat?.threat_level !== undefined) {
    embed.addFields({
      name: 'Threat Level',
      value: formatThreatLevel(combat.threat_level),
      inline: true,
    });
  }
  if (state?.defending) {
    embed.addFields({
      name: 'Status',
      value: 'Defending',
      inline: true,
    });
  }
  if (combat?.enemies?.length) {
    const enemyLines = combat.enemies.map((enemy) => {
      const currentHp =
        state?.enemies.find((e) => e.id === enemy.id)?.hp ?? enemy.hp;
      return `**${enemy.name}**\n${formatHpBar(currentHp, enemy.max_hp)}`;
    });
    embed.addFields({
      name: combat.enemies.length === 1 ? 'Enemy' : 'Enemies',
      value: enemyLines.join('\n\n'),
      inline: false,
    });
  }
  if (publicEmbed?.fields?.length) {
    for (const field of publicEmbed.fields) {
      embed.addFields({
        name: field.name,
        value: field.value,
        inline: field.inline ?? false,
      });
    }
  }
  let attachment = null;
  const imagePath = publicEmbed?.image || combat?.enemies?.[0]?.image;
  if (imagePath) {
    const subtitle = publicEmbed?.caption || publicEmbed?.title || node.title;
    attachment = await buildCanvas(imagePath, subtitle);
    embed.setImage(`attachment://${attachment.name}`);
  }
  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  if (combat?.actions?.length) {
    const actionRows = buildActionButtons(combat.actions, context);
    components.push(...actionRows);
  }
  return {
    embed,
    components: components.length > 0 ? components : null,
    attachment: attachment ?? undefined,
  };
}
function buildActionButtons(
  actions: CombatAction[],
  context: CombatBuilderContext
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();
  let buttonCount = 0;

  // Get player's role for filtering
  const playerRole = getPartyRole(context.playerId);

  for (const action of actions) {
    // If allowed_roles is specified, skip if player's role is not in the list
    if (action.allowed_roles && action.allowed_roles.length > 0) {
      if (!playerRole || !action.allowed_roles.includes(playerRole)) {
        continue; // Hide button for this player
      }
    }

    if (buttonCount >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
      buttonCount = 0;
    }
    const button = new ButtonBuilder()
      .setCustomId(`combat:${context.nodeId}:${action.id}`)
      .setLabel(action.label)
      .setStyle(mapButtonStyle(action.style));
    if (action.emoji) {
      button.setEmoji(action.emoji);
    }
    currentRow.addComponents(button);
    buttonCount++;
  }
  if (buttonCount > 0) {
    rows.push(currentRow);
  }
  return rows;
}
function formatHpBar(current: number, max: number): string {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  let color: string;
  if (percentage >= 60) color = 'green';
  else if (percentage >= 30) color = 'yellow';
  else color = 'red';
  const filledChar =
    color === 'green' ? '🟢' : color === 'yellow' ? '🟡' : '🔴';
  const emptyChar = '⚫';
  return `${filledChar.repeat(filled)}${emptyChar.repeat(empty)} ${current}/${max}`;
}
function formatThreatLevel(level: number): string {
  const normalized = Math.max(0, Math.min(10, level));
  const indicators = ['Low', 'Moderate', 'High', 'Critical', 'Deadly'];
  const index = Math.min(Math.floor(normalized / 2.5), indicators.length - 1);
  return `${'🔺'.repeat(Math.ceil(normalized / 2))} ${indicators[index]}`;
}
function mapButtonStyle(style?: number): ButtonStyle {
  switch (style) {
    case 1:
      return ButtonStyle.Primary;
    case 2:
      return ButtonStyle.Secondary;
    case 3:
      return ButtonStyle.Success;
    case 4:
      return ButtonStyle.Danger;
    default:
      return ButtonStyle.Primary;
  }
}
export function rollDamage(range: [number, number]): number {
  const [min, max] = range;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function initCombatState(combat: {
  player_hp: number;
  enemies: CombatEnemy[];
}): CombatState {
  return {
    player_hp: combat.player_hp,
    enemies: combat.enemies.map((e) => ({ id: e.id, hp: e.hp })),
    defending: false,
    turn: 1,
  };
}
export function areAllEnemiesDead(state: CombatState): boolean {
  return state.enemies.every((e) => e.hp <= 0);
}
export function isPlayerDead(state: CombatState): boolean {
  return state.player_hp <= 0;
}
