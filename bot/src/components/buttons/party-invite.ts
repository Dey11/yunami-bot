import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
export function partyInviteButton(leaderId: string, invitedUserId: string) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_party_invite:${leaderId}:${invitedUserId}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`reject_party_invite:${leaderId}:${invitedUserId}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
  );
}
