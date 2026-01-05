import prisma from "../lib/prisma";
import type { Party, PartyMember } from "../../generated/prisma";

/**
 * Generate a short invite code.
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface CreatePartyInput {
  leaderId: string;
}

export async function createParty(input: CreatePartyInput): Promise<Party> {
  const code = generateInviteCode();

  return prisma.party.create({
    data: {
      code,
      leaderId: input.leaderId,
      status: "forming",
      members: {
        create: {
          userId: input.leaderId,
          isReady: true, // Leader is ready by default
        },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
}

export async function getPartyById(id: string): Promise<Party | null> {
  return prisma.party.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
}

export async function getPartyByCode(code: string): Promise<Party | null> {
  return prisma.party.findUnique({
    where: { code },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
}

export async function joinParty(
  partyId: string,
  userId: string
): Promise<PartyMember> {
  return prisma.partyMember.create({
    data: {
      partyId,
      userId,
      isReady: false,
    },
    include: { user: true },
  });
}

export async function leaveParty(
  partyId: string,
  userId: string
): Promise<void> {
  await prisma.partyMember.delete({
    where: {
      partyId_userId: { partyId, userId },
    },
  });
}

export async function setReady(
  partyId: string,
  userId: string,
  isReady: boolean
): Promise<PartyMember> {
  return prisma.partyMember.update({
    where: {
      partyId_userId: { partyId, userId },
    },
    data: { isReady },
  });
}

export async function updatePartyStatus(
  partyId: string,
  status: string,
  storyId?: string
): Promise<Party> {
  return prisma.party.update({
    where: { id: partyId },
    data: {
      status,
      ...(storyId && { storyId }),
    },
    include: {
      members: {
        include: { user: true },
      },
    },
  });
}

export async function getPartyForUser(userId: string): Promise<Party | null> {
  const membership = await prisma.partyMember.findFirst({
    where: { userId },
    include: {
      party: {
        include: {
          members: {
            include: { user: true },
          },
        },
      },
    },
  });

  return membership?.party ?? null;
}

export async function deleteParty(partyId: string): Promise<void> {
  await prisma.party.delete({
    where: { id: partyId },
  });
}
