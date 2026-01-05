import fs from "fs";
import path from "path";

const STORIES_DIR = path.join(process.cwd(), "stories");

export interface StoryNode {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  choices?: {
    id: string;
    label: string;
    emoji?: string;
    style?: number;
    nextNodeId: string | null;
  }[];
  type?: string;
  type_specific?: any;
  preconditions?: any;
  side_effects_on_enter?: any;
  ui_hints?: any;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  firstNodeId: string;
  entryNodeId?: string;
  nodes: Record<string, StoryNode>;
}

export interface StoryListItem {
  id: string;
  title: string;
  description: string;
}

/**
 * Get list of all available stories.
 */
export function listStories(): StoryListItem[] {
  try {
    const files = fs.readdirSync(STORIES_DIR);
    const stories: StoryListItem[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(STORIES_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const story = JSON.parse(content) as Story;

      stories.push({
        id: story.id,
        title: story.title,
        description: story.description,
      });
    }

    return stories;
  } catch (error) {
    console.error("Error listing stories:", error);
    return [];
  }
}

/**
 * Get a story by ID.
 */
export function getStory(storyId: string): Story | null {
  try {
    const files = fs.readdirSync(STORIES_DIR);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(STORIES_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const story = JSON.parse(content) as Story;

      if (story.id === storyId) {
        return story;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting story:", error);
    return null;
  }
}

/**
 * Get a specific node from a story.
 */
export function getNode(storyId: string, nodeId: string): StoryNode | null {
  const story = getStory(storyId);
  if (!story) return null;

  return story.nodes[nodeId] || null;
}

/**
 * Get the first/entry node ID for a story.
 */
export function getEntryNodeId(storyId: string): string | null {
  const story = getStory(storyId);
  if (!story) return null;

  return story.firstNodeId || story.entryNodeId || null;
}
