import { storyCollectionSchema, StoryCollection, StoryEpisode, StoryNode } from "../types/story.js";
import story1 from "../stories/story1.json" with { type: "json" };
import story2 from "../stories/story2.json" with { type: "json" };
import story3 from "../stories/story3.json" with { type: "json" };

export type CompiledEpisode = {
  id: string;
  title: string;
  description: string;
  entryNodeId: string;
  nodes: Record<string, StoryNode>;
  choiceIndex: Map<string, { choiceId: string; nextNodeId: string; parentNodeId: string }>;
  allCustomIds: string[];
};

function mergeNodes(episode: StoryEpisode): Record<string, StoryNode> {
  const merged: Record<string, StoryNode> = { ...episode.nodes };
  if (episode.sharedScenes) {
    for (const [key, node] of Object.entries(episode.sharedScenes)) {
      if (!merged[key]) merged[key] = node;
    }
  }
  return merged;
}

function buildChoiceIndex(nodes: Record<string, StoryNode>): Map<string, { choiceId: string; nextNodeId: string; parentNodeId: string }> {
  const index = new Map<string, { choiceId: string; nextNodeId: string; parentNodeId: string }>();
  for (const node of Object.values(nodes)) {
    for (const choice of node.choices) {
      index.set(choice.id, {choiceId: choice.id, nextNodeId: choice.nextNodeId, parentNodeId: node.id});
    }
  }
  return index;
}

function compileEpisode(episode: StoryEpisode): CompiledEpisode {
  const nodes = mergeNodes(episode);
  const choiceIndex = buildChoiceIndex(nodes);
  const allCustomIds = Array.from(choiceIndex.keys());
  return {
    id: episode.id,
    title: episode.title,
    description: episode.description,
    entryNodeId: episode.entryNodeId,
    nodes,
    choiceIndex,
    allCustomIds,
  };
}

function compileCollection(data: StoryCollection): Map<string, CompiledEpisode> {
  const episodes = new Map<string, CompiledEpisode>();
  for (const episode of data.episodes) {
    episodes.set(episode.id, compileEpisode(episode));
  }
  return episodes;
}

const parsedStories = storyCollectionSchema.parse({episodes: [...story1.episodes, ...story2.episodes, ...story3.episodes]});
const compiledEpisodes = compileCollection(parsedStories);

export const storyGraph = {
  getEpisode(id: string) {return compiledEpisodes.get(id);},
  listEpisodes() {return Array.from(compiledEpisodes.values());},
  getNode(episodeId: string, nodeId: string): StoryNode | undefined {return compiledEpisodes.get(episodeId)?.nodes[nodeId];},
  isEnding(episodeId: string, nodeId: string): boolean {
    const node = compiledEpisodes.get(episodeId)?.nodes[nodeId];
    if (!node) return true;
    if (node.ending === true) return true;
    return node.choices.length === 0;
  },
  getNextNodeId(episodeId: string, choiceId: string): string | undefined {return compiledEpisodes.get(episodeId)?.choiceIndex.get(choiceId)?.nextNodeId;},
  getChoiceParentNodeId(episodeId: string, choiceId: string): string | undefined {return compiledEpisodes.get(episodeId)?.choiceIndex.get(choiceId)?.parentNodeId;},
  getAllChoiceIds(episodeId: string): string[] {return compiledEpisodes.get(episodeId)?.allCustomIds ?? [];},
};
