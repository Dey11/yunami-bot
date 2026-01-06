import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
export const storyBeg = new EmbedBuilder()
  .setColor(0x0e1015)
  .setTitle('Spiritbound Academy')
  .setDescription(
    'A set of dark‑fantasy campaigns designed for replayable runs.\n' +
      'Each story is self‑contained, branching, and tied to unique character unlocks.\n'
  )
  .setFooter({
    text: 'Your roster and outcomes will persist across future modes.',
  })
  .setImage(
    'https://www.superherotoystore.com/cdn/shop/articles/Website_Blog_creatives_29_1600x.jpg?v=1713945144'
  )
  .setThumbnail(
    'https://a.storyblok.com/f/178900/960x540/9a75be9716/solo-leveling-episode-23.jpg/m/filters:quality(95)format(webp)/https://a.storyblok.com/f/178900/960x540/9a75be9716/solo-leveling-episode-23.jpg'
  );
export const spStartButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger),
  new ButtonBuilder()
    .setCustomId('confirm')
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Success)
);
