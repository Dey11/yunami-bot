import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
export const registerButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('register')
    .setLabel('Register')
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId('exit')
    .setLabel('Exit')
    .setStyle(ButtonStyle.Danger)
);
