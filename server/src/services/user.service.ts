import prisma from "../lib/prisma";
import type { User } from "../../generated/prisma/client.ts";

export interface CreateUserInput {
  discordId: string;
  username: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      discordId: input.discordId,
      username: input.username,
    },
  });
}

export async function getUserByDiscordId(
  discordId: string
): Promise<User | null> {
  return prisma.user.findUnique({
    where: { discordId },
  });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { role },
  });
}

export async function updateUserProfile(
  userId: string,
  role: string,
  stats: any,
  inventory: string[]
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      role,
      stats,
      inventory,
    },
  });
}

export async function getUserWithRank(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  // Calculate rank: count users with more XP
  const higherRankedUsers = await prisma.user.count({
    where: {
      xp: {
        gt: user.xp,
      },
    },
  });

  return {
    ...user,
    serverRank: higherRankedUsers + 1,
  };
}
