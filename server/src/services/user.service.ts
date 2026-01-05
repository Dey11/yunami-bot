import prisma from "../lib/prisma";
import type { User } from "../../generated/prisma";

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
