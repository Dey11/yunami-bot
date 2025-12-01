import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export const PERSONALITY_QUESTIONS: string[] = [
  "In tense situations, you prefer acting quickly rather than waiting for more information.",
  "You naturally observe others carefully and adjust your strategy based on their behavior.",
  "You’re comfortable taking risks if the reward could change the entire outcome.",
  "You often feel responsible for protecting your team, even if it puts you in danger.",
  "You remain calm under pressure and avoid making emotional decisions in combat.",
  "You enjoy mastering powerful abilities, even if they require focus and discipline.",
  "You’re willing to push yourself beyond your limits if it means achieving victory.",
  "You prefer to support or guide your teammates rather than compete with them.",
  "You adapt quickly when plans fall apart and can improvise effectively.",
  "You naturally try to understand an enemy’s motives rather than seeing them as obstacles.",
];

export function buildProfileQuestionEmbed(options: {
  userTag: string;
  avatarURL?: string | null;
  questionIndex: number;
}): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const { userTag, avatarURL, questionIndex } = options;

  const total = PERSONALITY_QUESTIONS.length;
  const current = Math.min(Math.max(questionIndex, 0), total - 1);

  const filled = "█".repeat(current + 1);
  const empty = "▁".repeat(total - current - 1);
  const progressBar = `${filled}${empty}  (${current + 1}/${total})`;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${userTag}'s Character Sync`,
      iconURL: avatarURL ?? undefined,
    })
    .setTitle("🧬 Character Alignment Scan")
    .setDescription(
      [
        "Answer instinctively. We’ll tune your **stats, traits, and combat role** based on your choices.",
        "",
        `> **Q${current + 1}.** ${PERSONALITY_QUESTIONS[current]}`,
      ].join("\n")
    )
    .addFields(
      {
        name: "Progress",
        value: progressBar,
      },
      {
        name: "How to Answer",
        value:
          "Use the buttons below to choose how much this feels like **you** in a party.",
      }
    )
    .setFooter({
      text: "Your answers will shape your HP, damage profile, passives, and story flavor.",
    })
    .setColor(0x5865f2);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("charquiz_yes")
      .setLabel("Yes")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("charquiz_no")
      .setLabel("No")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("charquiz_most_likely")
      .setLabel("Most Likely")
      .setEmoji("🌟")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("charquiz_less_likely")
      .setLabel("Less Likely")
      .setEmoji("🌫️")
      .setStyle(ButtonStyle.Secondary)
  );
  return {
    embeds: [embed],
    components: [row],
  };
}
