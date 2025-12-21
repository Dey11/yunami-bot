import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import { getPartyByPlayer, setPlayerReady } from "../quickstart/party.session.js";

export const handler = {
    id: [/^party_toggle_ready:(true|false)$/, "refresh_lobby"],
    async execute(interaction: any) {
        const party = getPartyByPlayer(interaction.user.id);

        if (!party) {
            await interaction.reply({
                content: "You are not in a party.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (interaction.customId !== "refresh_lobby") {
            const isReady = interaction.customId.split(":")[1] === "true";
            const player = party.players.find((p) => p.odId === interaction.user.id);

            if (player && player.isReady === isReady) {
                // If status is unchanged, just acknowledge and do nothing to save rate limits
                await interaction.deferUpdate();
                return;
            }

            setPlayerReady(party.id, interaction.user.id, isReady);
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

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    },
};
