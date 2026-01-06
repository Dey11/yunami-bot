/**
 * Arc Continue Handler
 * 
 * Handles button clicks for arc_continue (after arc split)
 * and arc_merge_refresh (checking merge status).
 */

import {
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getSession, recordChoice } from '../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../quickstart/party-session.js';
import { loadAndRenderNode } from '../engine/dispatcher.js';
import {
  getPlayerArc,
  getActiveArc,
  updateArcNode,
  areAllArcsAtMerge,
  getArcsNotAtMerge,
  mergeArcs,
  getPartyArcState,
} from '../engine/arc-manager.js';

export default {
  name: 'arc_continue',
  pattern: /^arc_continue:/,

  async execute(interaction: ButtonInteraction) {
    const customId = interaction.customId;
    const discordId = interaction.user.id;

    // Handle arc_merge_refresh button
    if (customId.startsWith('arc_merge_refresh:')) {
      return handleMergeRefresh(interaction);
    }

    // Handle arc_continue button (after split)
    const splitNodeId = customId.replace('arc_continue:', '');
    
    const session = getSession(discordId);
    if (!session) {
      await interaction.reply({
        content: '❌ No active session found. Please start a story first.',
        ephemeral: true,
      });
      return;
    }

    const party = getPartyByPlayer(discordId);
    const partyId = party?.id;

    if (!partyId) {
      await interaction.reply({
        content: '❌ No party found.',
        ephemeral: true,
      });
      return;
    }

    // Get the player's arc
    const arcId = getPlayerArc(partyId, discordId);
    if (!arcId) {
      await interaction.reply({
        content: '❌ You are not assigned to any arc.',
        ephemeral: true,
      });
      return;
    }

    const arc = getActiveArc(partyId, arcId);
    if (!arc) {
      await interaction.reply({
        content: '❌ Arc not found.',
        ephemeral: true,
      });
      return;
    }

    // Get the entry node for this player's arc
    const entryNodeId = arc.arcDefinition.entry_node_id;
    const storyData = session.storyData;
    const entryNode = storyData.nodes?.[entryNodeId];

    if (!entryNode) {
      await interaction.reply({
        content: `❌ Entry node "${entryNodeId}" not found in story.`,
        ephemeral: true,
      });
      return;
    }

    // Update session to track current arc node
    recordChoice(discordId, `arc_enter:${arcId}`, entryNodeId);
    updateArcNode(partyId, arcId, entryNodeId);

    // Load and render the entry node
    const loadResult = await loadAndRenderNode(entryNode, discordId, undefined, party);

    if (!loadResult.allowed) {
      await interaction.reply({
        content: `❌ Cannot enter arc: ${loadResult.reason}`,
        ephemeral: true,
      });
      return;
    }

    const { embed, components, attachment } = loadResult.result!;

    // Add arc indicator to embed footer
    const arcLabel = arc.arcDefinition.label;
    if (embed.data.footer?.text) {
      embed.setFooter({ text: `${arcLabel} | ${embed.data.footer.text}` });
    } else {
      embed.setFooter({ text: arcLabel });
    }

    // Send arc content as ephemeral reply - only this player sees their arc content
    await interaction.reply({
      embeds: [embed],
      components: components ?? [],
      files: attachment ? [attachment] : [],
      ephemeral: true,
    });
  },
};

/**
 * Handle the arc_merge_refresh button - check if all arcs are ready to merge.
 */
async function handleMergeRefresh(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  const mergeNodeId = customId.replace('arc_merge_refresh:', '');
  const discordId = interaction.user.id;

  const session = getSession(discordId);
  if (!session) {
    await interaction.reply({
      content: '❌ No active session found.',
      ephemeral: true,
    });
    return;
  }

  const party = getPartyByPlayer(discordId);
  const partyId = party?.id;

  if (!partyId) {
    await interaction.reply({
      content: '❌ No party found.',
      ephemeral: true,
    });
    return;
  }

  // Check if all arcs are at merge
  if (areAllArcsAtMerge(partyId)) {
    // All arcs ready - complete the merge
    mergeArcs(partyId);

    // Get the merge node and render it
    const storyData = session.storyData;
    const mergeNode = storyData.nodes?.[mergeNodeId];

    if (!mergeNode) {
      await interaction.reply({
        content: '❌ Merge node not found.',
        ephemeral: true,
      });
      return;
    }

    const nextNodeId = mergeNode.type_specific?.extra_data?.nextNodeId;

    const embed = new EmbedBuilder()
      .setColor(mergeNode.public_embed?.color ?? 0x2ecc71)
      .setTitle(mergeNode.public_embed?.title || '🤝 The Group Reunites')
      .setDescription(
        mergeNode.public_embed?.description ||
          'All teams have returned. Your journey continues together.'
      );

    let components: any[] = [];
    if (nextNodeId) {
      components = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`engine:continue:${nextNodeId}`)
            .setLabel('Continue Together')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
        ),
      ];
    }

    await interaction.update({
      embeds: [embed],
      components,
    });
  } else {
    // Not all arcs ready - show updated waiting status
    const arcsNotAtMerge = getArcsNotAtMerge(partyId);
    const arcState = getPartyArcState(partyId);

    let description = 'Your team is still waiting...\n\n';
    description += '**Teams still in progress:**\n';

    for (const arcId of arcsNotAtMerge) {
      const arc = getActiveArc(partyId, arcId);
      if (arc) {
        description += `• ${arc.arcDefinition.label}\n`;
      }
    }

    description += '\n*Waiting for all teams to reach the reunion point...*';

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('⏳ Still Waiting')
      .setDescription(description);

    await interaction.update({
      embeds: [embed],
    });
  }
}
