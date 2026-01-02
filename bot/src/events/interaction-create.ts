import { Events, MessageFlags } from 'discord.js';
import { client } from '../index.js';

async function findHandler(customId: string) {
  let handler = client.buttonHandlers.get(customId);
  if (!handler) {
    for (const [key, value] of client.buttonHandlers.entries()) {
      if (value instanceof RegExp && value.test(customId)) {
        handler = client.buttonHandlers.get(key);
        break;
      }
    }
    for (const [key, h] of client.buttonHandlers.entries()) {
      if ((key as any) instanceof RegExp && (key as any).test(customId)) {
        handler = h;
        break;
      }
    }
  }
  return handler;
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    const handler = await findHandler(interaction.customId);

    if (!handler) {
      console.error('No handler found for customId ' + interaction.customId);
      return;
    }
    try {
      await handler.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  }

  if (interaction.isModalSubmit()) {
    const handler = await findHandler(interaction.customId);

    if (!handler) {
      console.error(
        'No modal handler found for customId ' + interaction.customId
      );
      return;
    }
    try {
      await handler.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {}
  }
});
