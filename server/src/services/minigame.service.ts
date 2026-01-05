import prisma from "../lib/prisma";

export interface MinigameStateData {
  userId: string;
  storyId: string;
  nodeId: string;
  type: "combat" | "memory" | "sequence" | "social";
  state: Record<string, any>;
  status?: string;
}

/**
 * Get or create minigame state for a user at a specific node.
 */
export async function getOrCreateMinigameState(
  data: MinigameStateData
): Promise<any> {
  const existing = await prisma.minigameState.findUnique({
    where: {
      userId_storyId_nodeId: {
        userId: data.userId,
        storyId: data.storyId,
        nodeId: data.nodeId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.minigameState.create({
    data: {
      userId: data.userId,
      storyId: data.storyId,
      nodeId: data.nodeId,
      type: data.type,
      state: data.state,
      status: data.status || "active",
    },
  });
}

/**
 * Get minigame state.
 */
export async function getMinigameState(
  userId: string,
  storyId: string,
  nodeId: string
): Promise<any | null> {
  return prisma.minigameState.findUnique({
    where: {
      userId_storyId_nodeId: { userId, storyId, nodeId },
    },
  });
}

/**
 * Update minigame state.
 */
export async function updateMinigameState(
  userId: string,
  storyId: string,
  nodeId: string,
  state: Record<string, any>,
  status?: string
): Promise<any> {
  return prisma.minigameState.update({
    where: {
      userId_storyId_nodeId: { userId, storyId, nodeId },
    },
    data: {
      state,
      ...(status && { status }),
    },
  });
}

/**
 * Complete or fail a minigame.
 */
export async function completeMinigame(
  userId: string,
  storyId: string,
  nodeId: string,
  status: "completed" | "failed"
): Promise<any> {
  return prisma.minigameState.update({
    where: {
      userId_storyId_nodeId: { userId, storyId, nodeId },
    },
    data: { status },
  });
}

/**
 * Get all minigame states for a user in a story.
 */
export async function getMinigameStatesForStory(
  userId: string,
  storyId: string
): Promise<any[]> {
  return prisma.minigameState.findMany({
    where: { userId, storyId },
    orderBy: { createdAt: "asc" },
  });
}
