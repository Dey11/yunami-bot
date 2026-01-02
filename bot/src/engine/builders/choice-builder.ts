import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';
import { buildCanvas } from '../../quickstart/canvas-builder.js';
import {
  getResource,
  getPartyRole,
  isChoiceLocked,
} from '../../quickstart/runtime-graph.js';
import { getPartyByPlayer } from '../../quickstart/party-session.js';
import type {
  StoryNode,
  BuilderResult,
  Choice,
  SelectMenu,
  RoleReservedAction,
} from '../types.js';
import type { MultiplayerSession } from '../../types/party.js';

export interface ChoiceBuilderContext {
  playerId: string;
  nodeId: string;
  party?: MultiplayerSession | null;
}

export async function buildChoiceNode(
  node: StoryNode,
  context: ChoiceBuilderContext
): Promise<BuilderResult> {
  const publicEmbed = node.public_embed;
  const typeSpecific = node.type_specific;
  const uiHints = node.ui_hints;

  const embed = new EmbedBuilder().setColor(publicEmbed?.color ?? 0x0e1015);

  if (publicEmbed?.title) embed.setTitle(publicEmbed.title);
  else if (node.title) embed.setTitle(node.title);

  if (publicEmbed?.description) embed.setDescription(publicEmbed.description);
  if (publicEmbed?.footer) embed.setFooter({ text: publicEmbed.footer });

  if (publicEmbed?.fields?.length) {
    for (const field of publicEmbed.fields) {
      embed.addFields({
        name: field.name,
        value: field.value,
        inline: field.inline ?? false,
      });
    }
  }

  let attachment = null;
  if (publicEmbed?.image) {
    attachment = await buildCanvas(publicEmbed.image);
    embed.setImage(`attachment://${attachment.name}`);
  }

  const components: ActionRowBuilder<
    ButtonBuilder | StringSelectMenuBuilder
  >[] = [];

  if (typeSpecific?.choices?.length) {
    const buttonRows = buildChoiceButtons(
      typeSpecific.choices,
      context,
      uiHints?.disable_after_click ?? false
    );
    components.push(...buttonRows);
  }

  if (typeSpecific?.selects?.length) {
    const selectRows = buildSelectMenus(typeSpecific.selects, node.id);
    components.push(...selectRows);
  }

  if (typeSpecific?.role_reserved_action) {
    const roleButton = buildRoleReservedAction(
      typeSpecific.role_reserved_action,
      context,
      node.id
    );
    if (roleButton) {
      components.push(roleButton);
    }
  }

  return {
    embed,
    components: components.length > 0 ? components : null,
    attachment: attachment ?? undefined,
    timer: typeSpecific?.timers,
  };
}

function buildChoiceButtons(
  choices: Choice[],
  context: ChoiceBuilderContext,
  disableAfterClick: boolean
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();
  let buttonCount = 0;

  for (const choice of choices) {
    if (buttonCount >= 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
      buttonCount = 0;
    }

    const isLocked =
      disableAfterClick &&
      isChoiceLocked(context.playerId, context.nodeId, choice.id);
    const canAfford = checkCost(choice.cost, context.playerId);

    const button = new ButtonBuilder()
      .setCustomId(`choice:${context.nodeId}:${choice.id}`)
      .setLabel(choice.label)
      .setStyle(mapButtonStyle(choice.style))
      .setDisabled(isLocked || !canAfford);

    if (choice.emoji) {
      button.setEmoji(choice.emoji);
    }

    currentRow.addComponents(button);
    buttonCount++;
  }

  if (buttonCount > 0) {
    rows.push(currentRow);
  }

  return rows;
}

function buildSelectMenus(
  selects: SelectMenu[],
  nodeId: string
): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

  for (const select of selects) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`select:${nodeId}:${select.id}`)
      .setMinValues(select.min ?? 1)
      .setMaxValues(select.max ?? 1);

    if (select.placeholder) {
      menu.setPlaceholder(select.placeholder);
    }

    const options = select.options.map((opt) => ({
      label: opt.label,
      value: opt.id,
      emoji: opt.emoji,
    }));

    menu.addOptions(options);

    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
    );
  }

  return rows;
}

function buildRoleReservedAction(
  action: RoleReservedAction,
  context: ChoiceBuilderContext,
  nodeId: string
): ActionRowBuilder<ButtonBuilder> | null {
  const party = context.party ?? getPartyByPlayer(context.playerId);

  if (!partyHasRole(party, action.requires_team_role)) {
    return null;
  }

  const button = new ButtonBuilder()
    .setCustomId(`role:${nodeId}:${action.id}`)
    .setLabel(action.label)
    .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

function partyHasRole(
  party: MultiplayerSession | null | undefined,
  role: string
): boolean {
  if (!party || party.status !== 'active') {
    return false;
  }

  for (const player of party.players) {
    const playerRole = getPartyRole(player.odId);
    if (playerRole === role) {
      return true;
    }
  }

  return false;
}

function checkCost(
  cost: Record<string, number> | undefined,
  playerId: string
): boolean {
  if (!cost) return true;

  for (const [resource, amount] of Object.entries(cost)) {
    if (getResource(playerId, resource) < amount) {
      return false;
    }
  }

  return true;
}

function mapButtonStyle(style?: number): ButtonStyle {
  switch (style) {
    case 1:
      return ButtonStyle.Primary;
    case 2:
      return ButtonStyle.Secondary;
    case 3:
      return ButtonStyle.Success;
    case 4:
      return ButtonStyle.Danger;
    default:
      return ButtonStyle.Primary;
  }
}
