import { client } from '../index.js';
import { Events } from 'discord.js';
client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});
