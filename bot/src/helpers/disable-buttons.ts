import { ActionRowBuilder, ButtonBuilder, type AnyComponentBuilder } from 'discord.js';

/**
 * Disables all buttons in the current message components.
 * Use this to prevent duplicate clicks during async processing.
 */
export function disableAllButtons(components: any[]): ActionRowBuilder<ButtonBuilder>[] {
  if (!components || !Array.isArray(components)) return [];
  
  return components.map((row: any) => {
    if (!row.components) return row;
    
    const newRow = new ActionRowBuilder<ButtonBuilder>();
    for (const component of row.components) {
      if (component.type === 2) { // Button type
        const button = ButtonBuilder.from(component);
        button.setDisabled(true);
        newRow.addComponents(button);
      }
    }
    return newRow;
  });
}
