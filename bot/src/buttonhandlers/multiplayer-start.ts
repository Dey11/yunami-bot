import {
  startPartyStory,
  getPartyByOwner,
  getPartyByPlayer,
  mapRemotePartyToLocal,
  restorePartySession,
  setPartyMessage,
} from '../quickstart/party-session.js';
import { storyGraph } from '../quickstart/story-graph.js';
import { loadAndRenderNode } from '../engine/dispatcher.js';
import { setActiveMessage, setResource } from '../quickstart/runtime-graph.js';
import { MessageFlags } from 'discord.js';
import * as api from '../api/client.js';

export const handler = {
  id: /^mp_select_story_(.+)$/,
  execute: async (interaction: any) => {
    const match = interaction.customId.match(/^mp_select_story_(.+)$/);
    if (!match) return;
    
    await interaction.deferUpdate();
    
    const storyId = match[1];
    const discordId = interaction.user.id;
    
    // Try local party first, then API
    let party = await getPartyByOwner(discordId);
    let isOwner = !!party;
    
    if (!party) {
      const partyRes = await api.getMyParty(discordId);
      const remoteParty = partyRes.data?.party;
      
      if (remoteParty) {
        const userMember = remoteParty.members.find((m: any) => m.user.discordId === discordId);
        if (userMember) {
          isOwner = remoteParty.leaderId === userMember.userId;
          party = mapRemotePartyToLocal(remoteParty) as any;
          if (party) {
             restorePartySession(party);
          }
        }
      }
    }
    
    if (!party || !isOwner) {
      await interaction.followUp({
        content: 'Unable to start story. Ensure you are the party owner.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    const result = startPartyStory(party.id, storyId);
    if (!result.success) {
      await interaction.followUp({
        content: result.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    const storyData = storyGraph.getStory(storyId);
    if (!storyData) {
      await interaction.followUp({
        content: 'Story data not found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    const firstNodeId = result.party?.currentNodeId;
    if (!firstNodeId) {
      await interaction.followUp({
        content: 'Error: Story has no entry node.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    
    const firstNode = storyData.nodes[firstNodeId];
    if (!firstNode) {
      await interaction.editReply({ content: 'Error: First node not found.' });
      return;
    }
    
    for (const player of party.players) {
      setResource(player.odId, 'credits', 10);
    }
    
    const renderResult = await loadAndRenderNode(
      firstNode,
      interaction.user.id,
      undefined,
      party
    );
    
    if (!renderResult.allowed) {
      await interaction.editReply({
        content: `Cannot start: ${renderResult.reason}`,
      });
      return;
    }
    
    const payload: any = {
      content: `Multiplayer Story Started: ${storyData.title}`,
      embeds: [renderResult.result!.embed],
      components: renderResult.result!.components ?? [],
    };
    
    if (renderResult.result!.attachment) {
      payload.files = [renderResult.result!.attachment];
    }
    
    // Send to channel so everyone can see - this is THE SHARED MESSAGE
    const response = await interaction.channel.send(payload);
    
    await interaction.editReply({ content: 'Story started!', components: [] });
    
    // Use shared party message instead of per-player messages
    setPartyMessage(party.id, interaction.channelId, response.id, discordId);
    
    // Also set active message for each player for backwards compatibility
    for (const player of party.players) {
      setActiveMessage(player.odId, interaction.channelId, response.id);
    }
  },
};
