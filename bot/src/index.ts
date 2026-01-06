import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { startTimerManager } from './engine/timer-manager.js';
import { logger } from './utils/logger.js';
import { restoreSessionsFromServer, checkServerHealth } from './utils/session-restore.js';
dotenv.config();
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.buttonHandlers = new Collection();
async function loadCommands() {
  const foldersPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(foldersPath);
  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = await import(`file://${filePath}`);
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
        } else {
          logger.warn(`Command at ${filePath} missing data or execute property`);
        }
      } catch (err) {
        logger.error(`Failed to load command ${filePath}:`, err);
      }
    }
  }
}
async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      await import(`file://${filePath}`);
    } catch (err) {
      logger.error(`Failed to load event ${filePath}:`, err);
    }
  }
}
async function loadButtonHandlers() {
  const buttonHandlersPath = path.join(__dirname, 'buttonhandlers');
  async function loadHandlersRecursive(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await loadHandlersRecursive(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        try {
          const module = await import(`file://${fullPath}`);
          if (module.handler) {
            const handler = module.handler;
            const ids = Array.isArray(handler.id) ? handler.id : [handler.id];
            for (const id of ids) {
              client.buttonHandlers.set(id, handler);
            }
          }
          if (module.modalHandler) {
            const modalHandler = module.modalHandler;
            const ids = Array.isArray(modalHandler.id)
              ? modalHandler.id
              : [modalHandler.id];
            for (const id of ids) {
              client.buttonHandlers.set(id, modalHandler);
            }
          }
        } catch (err) {
          logger.error(`Failed to load handler ${fullPath}:`, err);
        }
      }
    }
  }
  await loadHandlersRecursive(buttonHandlersPath);
}
async function initializeBot() {
  logger.info('Starting Yunami bot...');
  await loadCommands();
  logger.info('Commands loaded');
  await loadEvents();
  logger.info('Events loaded');
  await loadButtonHandlers();
  logger.info('Button handlers loaded');
  await client.login(process.env.DISCORD_TOKEN);
  logger.info('Logged in to Discord');
  const serverHealthy = await checkServerHealth();
  if (serverHealthy) {
    logger.info('Server is healthy, restoring sessions...');
    await restoreSessionsFromServer();
  } else {
    logger.warn('Server unavailable, skipping session restore');
  }
  startTimerManager();
  logger.info('Timer manager started');
  logger.info('Bot initialization complete');
}
initializeBot().catch((err) => {
  logger.error('Failed to initialize bot:', err);
  process.exit(1);
});

