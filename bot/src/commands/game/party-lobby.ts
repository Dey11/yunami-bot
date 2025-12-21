import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import { getPartyByPlayer } from "../../quickstart/party.session.js";

export const data = new SlashCommandBuilder()
    .setName("party-lobby")
    .setDescription("View party lobby and ready up");

export async function execute(interaction: any) {
    if (!interaction.isChatInputCommand()) return;
    const party = getPartyByPlayer(interaction.user.id);

    if (!party) {
        await interaction.reply({
            content: "You are not in a party.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`Party Lobby: ${party.name}`)
        .setDescription("Waiting for all players to be ready...")
        .setColor(0x00b3b3)
        .addFields(
            party.players.map((p) => ({
                name: p.username,
                value: p.isReady ? "✅ Ready" : "⬜ Not Ready",
                inline: true,
            }))
        )
        .setFooter({ text: `Players: ${party.players.length}/${party.maxSize}` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("party_toggle_ready:true")
            .setLabel("Ready Up")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("party_toggle_ready:false")
            .setLabel("Not Ready")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("refresh_lobby")
            .setLabel("Refresh")
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
        embeds: [embed],
        components: [row],
    });
}
