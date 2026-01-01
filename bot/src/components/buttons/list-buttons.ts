import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const listButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("previous")
    .setLabel("Previous")
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Secondary),

  new ButtonBuilder()
    .setCustomId("next")
    .setLabel("Next")
    .setEmoji("▶️")
    .setStyle(ButtonStyle.Secondary),

  new ButtonBuilder()
    .setCustomId("exit")
    .setLabel("Exit")
    .setEmoji("🗑️")
    .setStyle(ButtonStyle.Danger)
);
