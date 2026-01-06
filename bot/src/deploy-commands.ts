import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config();
const token: string | undefined = process.env.DISCORD_TOKEN;
const clientId: string | undefined = process.env.CLIENT_ID;
const guildId: string | undefined = process.env.GUILD_ID;
console.log(token, clientId, guildId);
if (!token || !clientId || !guildId) {
  throw new Error('Missing required environment variables');
}
const commandsPath: string = join(process.cwd(), 'dist', 'commands');
const commands: unknown[] = [];
function getCommandFiles(dir: string): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const itemPath = join(dir, item);
    const stat = statSync(itemPath);
    if (stat.isDirectory()) {
      files.push(...getCommandFiles(itemPath));
    } else if (item.endsWith('.js')) {
      files.push(itemPath);
    }
  }
  return files;
}
const commandFiles: string[] = getCommandFiles(commandsPath);
const rest = new REST().setToken(token);
(async () => {
  try {
    for (const filePath of commandFiles) {
      try {
        const command = await import(filePath);
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
        }
      } catch (error) {
        console.error(`[ERROR] Failed to load command at ${filePath}:`, error);
      }
    }
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    const data = (await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    )) as Array<{ id: string; name: string }>;
    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error: unknown) {
    console.error('Failed to deploy commands:', error);
  }
})();
