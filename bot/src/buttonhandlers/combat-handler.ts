import { MessageFlags } from 'discord.js';
import {
  getSession,
  recordChoice,
  setActiveMessage,
  getCombatState,
  setCombatState,
  clearCombatState,
} from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { renderNodeWithContext } from '../engine/dispatcher.js';
import {
  buildCombatNode,
  rollDamage,
  initCombatState,
  areAllEnemiesDead,
  isPlayerDead,
} from '../engine/builders/combat-builder.js';
import type {
  CombatAction,
  CombatEnemy,
  CombatState,
} from '../engine/types.js';

export const handler = {
  id: /^combat:(.+):(.+)$/,
  async execute(interaction: any) {
    const odId = interaction.user.id;
    const session = getSession(odId);

    if (!session) {
      await interaction.reply({
        content: 'No active session. Please start a new story.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const match = interaction.customId.match(/^combat:(.+):(.+)$/);
    if (!match) {
      await interaction.reply({
        content: 'Invalid combat action.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [, nodeId, actionId] = match;

    const currentNode = session.storyData.nodes?.[nodeId];
    if (!currentNode || currentNode.type !== 'combat') {
      await interaction.reply({
        content: 'Combat node not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const combat = currentNode.type_specific?.combat;
    if (!combat) {
      await interaction.reply({
        content: 'Invalid combat configuration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const action = combat.actions.find((a: CombatAction) => a.id === actionId);
    if (!action && actionId !== 'flee') {
      await interaction.reply({
        content: 'Action not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    let state = getCombatState(odId, nodeId);
    if (!state) {
      state = initCombatState(combat);
      setCombatState(odId, nodeId, state);
    }

    state.defending = false;

    let combatLog: string[] = [];

    if (actionId === 'flee' || action?.id === 'flee') {
      if (combat.on_flee) {
        clearCombatState(odId, nodeId);
        await transitionToNode(
          interaction,
          session,
          odId,
          nodeId,
          combat.on_flee,
          'You fled from combat!'
        );
        return;
      }
      combatLog.push("You attempted to flee but there's no escape!");
    } else if (action?.damage_range) {
      const targetEnemy = state.enemies.find((e) => e.hp > 0);
      if (targetEnemy) {
        const damage = rollDamage(action.damage_range);
        targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
        const enemyConfig = combat.enemies.find(
          (e: CombatEnemy) => e.id === targetEnemy.id
        );
        combatLog.push(
          `You dealt **${damage}** damage to **${enemyConfig?.name || targetEnemy.id}**!`
        );
      }
    } else if (action?.defense_bonus) {
      state.defending = true;
      combatLog.push(
        `You take a defensive stance! (Defense +${action.defense_bonus})`
      );
    } else if (action?.dodge_chance) {
      combatLog.push(
        `You prepare to dodge the next attack! (${action.dodge_chance}% chance)`
      );
    }

    if (areAllEnemiesDead(state)) {
      clearCombatState(odId, nodeId);
      if (combat.on_victory) {
        await transitionToNode(
          interaction,
          session,
          odId,
          nodeId,
          combat.on_victory,
          combatLog.join('\n') + '\n\nVictory! All enemies defeated!'
        );
        return;
      }
      combatLog.push('\n**Victory!** All enemies defeated!');
    } else if (!areAllEnemiesDead(state)) {
      const enemyTurnLog = processEnemyTurn(state, combat, action);
      combatLog.push(...enemyTurnLog);
    }

    if (isPlayerDead(state)) {
      clearCombatState(odId, nodeId);
      if (combat.on_defeat) {
        await transitionToNode(
          interaction,
          session,
          odId,
          nodeId,
          combat.on_defeat,
          combatLog.join('\n') + '\n\nYou have been defeated!'
        );
        return;
      }
      combatLog.push('\n**Defeated!** You have fallen in combat.');
    }

    state.turn += 1;
    setCombatState(odId, nodeId, state);

    const party = getPartyByPlayer(odId);
    const result = await buildCombatNode(currentNode, {
      playerId: odId,
      nodeId: nodeId,
    });

    const payload: any = {
      content: combatLog.join('\n'),
      embeds: [result.embed],
      components: result.components ?? [],
    };

    if (result.attachment) {
      payload.files = [result.attachment];
    }

    await interaction.editReply(payload);
    setActiveMessage(
      odId,
      interaction.message.channelId,
      interaction.message.id
    );
  },
};

function processEnemyTurn(
  state: CombatState,
  combat: { enemies: CombatEnemy[]; actions: CombatAction[] },
  playerAction?: CombatAction
): string[] {
  const log: string[] = [];

  for (const enemyState of state.enemies) {
    if (enemyState.hp <= 0) continue;

    const enemyConfig = combat.enemies.find((e) => e.id === enemyState.id);
    if (!enemyConfig) continue;

    let damage = rollDamage(enemyConfig.damage_range);
    const enemyName = enemyConfig.name;

    if (playerAction?.dodge_chance) {
      const dodgeRoll = Math.random() * 100;
      if (dodgeRoll < playerAction.dodge_chance) {
        log.push(`**${enemyName}** attacked but you dodged!`);
        continue;
      }
    }

    if (state.defending && playerAction?.defense_bonus) {
      damage = Math.max(1, damage - playerAction.defense_bonus);
    }

    state.player_hp = Math.max(0, state.player_hp - damage);
    log.push(`**${enemyName}** dealt **${damage}** damage to you!`);
  }

  return log;
}

async function transitionToNode(
  interaction: any,
  session: any,
  odId: string,
  currentNodeId: string,
  nextNodeId: string,
  message: string
): Promise<void> {
  const nextNode = session.storyData.nodes?.[nextNodeId];
  if (!nextNode) {
    await interaction.editReply({ content: message });
    return;
  }

  recordChoice(odId, `combat:${currentNodeId}:transition`, nextNodeId);

  const party = getPartyByPlayer(odId);
  const result = await renderNodeWithContext(nextNode, {
    playerId: odId,
    nodeId: nextNode.id,
    party,
  });

  const payload: any = {
    content: message,
    embeds: [result.embed],
    components: result.components ?? [],
  };

  if (result.attachment) {
    payload.files = [result.attachment];
  }

  await interaction.editReply(payload);
  setActiveMessage(odId, interaction.message.channelId, interaction.message.id);
}
