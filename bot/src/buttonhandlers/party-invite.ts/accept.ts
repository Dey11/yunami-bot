import {
  getPartyByOwner,
  invitePlayerToParty,
} from "../../quickstart/party.session.js";

export const handler = {
  id: /^accept_party_invite:/,
  async execute(interaction: any) {
    const user = interaction.user.id;
    if (!user) return;
    const leaderId = interaction.customId.split(":")[1];
    if (!leaderId) {
      await interaction.reply({
        content: "Something went wrong",
      });
      return;
    }
    const party = await getPartyByOwner(leaderId);

    if (!party) {
      await interaction.reply({
        content: `You don't have a party yet`,
      });
      return;
    }

    const invitedPlayer = await invitePlayerToParty(
      party.id,
      interaction.user.id,
      interaction.user.username
    );
    if (!invitedPlayer.success) {
      await interaction.reply({
        content: invitedPlayer.message,
      });
      return;
    }
    await interaction.reply({
      content: `${interaction.user} accepted your party invite`,
    });
  },
};
