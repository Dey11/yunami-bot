import { MessageFlags } from "discord.js";
import { getPartyByOwner, getPartyByPlayer } from "../../quickstart/party.session.js";

export const handler = {
  id: /^reject_party_invite:/,
  async execute(interaction: any) {
    const parts = interaction.customId.split(":");
    const leaderId = parts[1];
    const invitedUserId = parts[2];

    if (!leaderId || !invitedUserId) {
      await interaction.reply({ content: "Invalid invite data.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.user.id !== invitedUserId) {
      await interaction.reply({
        content: "This invite is not for you.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const party = await getPartyByOwner(leaderId);
    const existingParty = getPartyByPlayer(invitedUserId);

    if (party && existingParty && existingParty.id === party.id) {
      await interaction.reply({
        content: "You are already in this party.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.reply({
      content: `${interaction.user} rejected your party invite`,
    });
  },
};
