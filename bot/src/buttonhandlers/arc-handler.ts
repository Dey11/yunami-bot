import {
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
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
  isPartyInArcSplit,
} from '../engine/arc-manager.js';
import * as api from '../api/client.js';
import { broadcastMergeUpdate } from '../helpers/party-broadcast.js';

export const handler = {
  id: /^arc_(continue|merge_refresh):/,
  async execute(interaction: ButtonInteraction) {
    const customId = interaction.customId;
    const discordId = interaction.user.id;
    if (customId.startsWith('arc_merge_refresh:')) {
      return handleMergeRefresh(interaction);
    }
    const splitNodeId = customId.replace('arc_continue:', '');
    
    // Recovery Logic
    const { restoreSession } = await import('../quickstart/runtime-graph.js');
    const { mapRemotePartyToLocal, restorePartySession } = await import('../quickstart/party-session.js');

    let session = getSession(discordId);
    if (!session) {
      try {
        const sessionRes = await api.getSession(discordId);
        if (sessionRes.data?.session) {
            session = restoreSession(sessionRes.data.session);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
    
    if (!session) {
      await interaction.reply({
        content: '❌ No active session found. Please start a story first.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // Ensure Party is also restored
    let party = getPartyByPlayer(discordId);
    if (!party) {
         try {
             const partyRes = await api.getMyParty(discordId);
             if (partyRes.data?.party) {
                 const restoredParty = mapRemotePartyToLocal(partyRes.data.party);
                 restorePartySession(restoredParty);
                 party = restoredParty as any;
             }
         } catch (e) {
             console.error("Failed to restore party", e);
         }
    }
    const partyId = party?.id;
    if (!partyId) {
      await interaction.reply({
        content: '❌ No party found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const arcId = getPlayerArc(partyId, discordId);
    if (!arcId) {
      // Check if arcs have already merged (no arc state means merge completed)
      if (!isPartyInArcSplit(partyId)) {
        // Arcs already merged - get the merge node from story
        const arcSplitNode = session.storyData.nodes?.[splitNodeId];
        const mergeNodeId = arcSplitNode?.type_specific?.arc_split?.merge_node_id;
        if (mergeNodeId) {
          const mergeNode = session.storyData.nodes?.[mergeNodeId];
          if (mergeNode) {
            await interaction.deferUpdate();
            const context = { playerId: discordId, nodeId: mergeNode.id, party };
            const result = await loadAndRenderNode(mergeNode, discordId, undefined, party);
            if (result.allowed && result.result) {
              await interaction.editReply({
                embeds: [result.result.embed],
                components: result.result.components ?? [],
                files: result.result.attachment ? [result.result.attachment] : [],
              });
              return;
            }
          }
        }
      }
      await interaction.reply({
        content: '❌ You are not assigned to any arc.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const arc = getActiveArc(partyId, arcId);
    if (!arc) {
      await interaction.reply({
        content: '❌ Arc not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const entryNodeId = arc.arcDefinition.entry_node_id;
    const storyData = session.storyData;
    const entryNode = storyData.nodes?.[entryNodeId];
    if (!entryNode) {
      await interaction.reply({
        content: `❌ Entry node "${entryNodeId}" not found in story.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    // Defer BEFORE loading/rendering (which may send DMs and take time)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    recordChoice(discordId, `arc_enter:${arcId}`, entryNodeId);
    updateArcNode(partyId, arcId, entryNodeId);
    const loadResult = await loadAndRenderNode(entryNode, discordId, undefined, party);
    if (!loadResult.allowed) {
      await interaction.editReply({
        content: `❌ Cannot enter arc: ${loadResult.reason}`,
      });
      return;
    }
    const { embed, components, attachment } = loadResult.result!;
    const arcLabel = arc.arcDefinition.label;
    if (embed.data.footer?.text) {
      embed.setFooter({ text: `${arcLabel} | ${embed.data.footer.text}` });
    } else {
      embed.setFooter({ text: arcLabel });
    }
    await interaction.editReply({
      embeds: [embed],
      components: components ?? [],
      files: attachment ? [attachment] : [],
    });
  },
};
async function handleMergeRefresh(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  const mergeNodeId = customId.replace('arc_merge_refresh:', '');
  const discordId = interaction.user.id;
  const session = getSession(discordId);
  if (!session) {
    await interaction.reply({
      content: '❌ No active session found.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const party = getPartyByPlayer(discordId);
  const partyId = party?.id;
  if (!partyId) {
    await interaction.reply({
      content: '❌ No party found.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const isMerged = areAllArcsAtMerge(partyId) || !isPartyInArcSplit(partyId);

  if (isMerged) {
    if (isPartyInArcSplit(partyId)) {
       mergeArcs(partyId);
    }

    const storyData = session.storyData;
    const mergeNode = storyData.nodes?.[mergeNodeId];
    if (!mergeNode) {
      await interaction.reply({
        content: '❌ Merge node not found.',
        flags: MessageFlags.Ephemeral,
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
    const payload = {
        embeds: [embed],
        components,
    };
    await interaction.update(payload);
    
    await broadcastMergeUpdate(interaction.client, party, payload, discordId);

  } else {
    const arcsNotAtMerge = getArcsNotAtMerge(partyId);
    const arcState = getPartyArcState(partyId);
    let description = 'Your team is still waiting...\n\n';
    description += '**Teams still in progress:**\n';
    if (arcsNotAtMerge.length === 0) {
        description += 'Waiting for synchronization...';
    } else {
        for (const arcId of arcsNotAtMerge) {
            const arc = getActiveArc(partyId, arcId);
            if (arc) {
                description += `• ${arc.arcDefinition.label}\n`;
            }
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