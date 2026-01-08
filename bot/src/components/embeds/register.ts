import { EmbedBuilder } from 'discord.js';
export const registerEmbed = new EmbedBuilder()
  .setColor(0x5865f2)
  .setTitle('Yunami Registration')
  .setDescription(
    'Welcome to **Yunami** – a co-op, turn-based anime adventure for up to **4 players**.\n' +
      'Use this panel to understand how to register and start your journey.'
  )
  .addFields(
    {
      name: 'How to Register',
      value:
        '1. Click on "Create Profile" to create your character.\n' +
        '2. Use `/party create` to start a party.\n' +
        '3. Invite friends with `/party invite @user`.\n' +
        '4. Once 2–4 players join, start a run with `/story start`.',
    },
    {
      name: 'Requirements',
      value:
        '• You must have a registered profile.\n' +
        '• You must be in a party to start a multiplayer run.\n' +
        '• Only the party leader can start or end runs.',
    },
    {
      name: '❓ Need Help?',
      value:
        'Use `/help` for command details or ping a moderator if you’re stuck.',
    }
  )
  .setFooter({
    text: 'Yunami • Co-op Anime Adventures',
  })
  .setTimestamp();
