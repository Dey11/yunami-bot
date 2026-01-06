import prisma from "../lib/prisma";
import type { UserProgress } from "../../generated/prisma/client.ts";
import * as storyService from "./story.service";

export interface UpsertProgressInput {
  userId: string;
  storyId: string;
  currentNodeId: string;
  state?: Record<string, any>;
  status?: string;
}

/**
 * Get or create a progress record for a user in a story.
 * Auto-heals invalid node IDs by resetting to the story's entry node.
 */
export async function getOrCreateProgress(
  userId: string,
  storyId: string,
  startNodeId: string
): Promise<UserProgress> {
  const existing = await prisma.userProgress.findUnique({
    where: {
      userId_storyId: { userId, storyId },
    },
  });

  if (existing) {
    const story = storyService.getStory(storyId);
    if (story && !story.nodes[existing.currentNodeId]) {
      const validNodeId = startNodeId || storyService.getEntryNodeId(storyId) || existing.currentNodeId;
      return prisma.userProgress.update({
        where: { userId_storyId: { userId, storyId } },
        data: { currentNodeId: validNodeId },
      });
    }
    return existing;
  }

  return prisma.userProgress.create({
    data: {
      userId,
      storyId,
      currentNodeId: startNodeId,
      state: {},
      status: "active",
    },
  });
}

/**
 * Get active progress for a user in a story.
 */
export async function getProgress(
  userId: string,
  storyId: string
): Promise<UserProgress | null> {
  return prisma.userProgress.findUnique({
    where: {
      userId_storyId: { userId, storyId },
    },
  });
}

/**
 * Update progress (node, state, status).
 */
export async function updateProgress(
  input: UpsertProgressInput
): Promise<UserProgress> {
  return prisma.userProgress.upsert({
    where: {
      userId_storyId: { userId: input.userId, storyId: input.storyId },
    },
    update: {
      currentNodeId: input.currentNodeId,
      state: input.state ?? {},
      status: input.status ?? "active",
    },
    create: {
      userId: input.userId,
      storyId: input.storyId,
      currentNodeId: input.currentNodeId,
      state: input.state ?? {},
      status: input.status ?? "active",
    },
  });
}

/**
 * Mark a story as completed for a user.
 */
export async function completeProgress(
  userId: string,
  storyId: string
): Promise<UserProgress | null> {
  return prisma.userProgress.update({
    where: {
      userId_storyId: { userId, storyId },
    },
    data: {
      status: "completed",
    },
  });
}

/**
 * Get all progress for a user (all stories).
 */
export async function getAllProgressForUser(
  userId: string
): Promise<UserProgress[]> {
  return prisma.userProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}
