import { client } from "../index.js";
client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});
