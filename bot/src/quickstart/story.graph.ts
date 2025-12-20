import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storiesPath = path.resolve(__dirname, "../stories");
const storyFiles = fs.readdirSync(storiesPath).filter(file => file.endsWith(".json"));

const stories = storyFiles.map(file => {
  const filePath = path.join(storiesPath, file);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
});

export const storyGraph = {
  listEpisodes() {
    return stories;
  },
  getStory(id: string) {
    return stories.find((s: any) => s.id === id);
  },
};
