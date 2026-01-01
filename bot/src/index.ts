import { Client, GatewayIntentBits, Collection } from "discord.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { startTimerManager } from "./engine/timer.manager.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(process.env.DISCORD_TOKEN);
export const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.buttonHandlers = new Collection();

async function loadCommands() {
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    await import(`file://${filePath}`);
  }
}

async function loadButtonHandlers() {
  const buttonHandlersPath = path.join(__dirname, "buttonhandlers");

  function loadHandlersRecursive(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        loadHandlersRecursive(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        (async () => {
          const { handler } = await import(`file://${fullPath}`);
          const ids = Array.isArray(handler.id) ? handler.id : [handler.id];
          for (const id of ids) {
            client.buttonHandlers.set(id, handler);
          }
        })();
      }
    }
  }

  loadHandlersRecursive(buttonHandlersPath);
}

async function initializeBot() {
  await loadCommands();
  await loadEvents();
  await loadButtonHandlers();
  await client.login(process.env.DISCORD_TOKEN);
  startTimerManager();
}

initializeBot();

