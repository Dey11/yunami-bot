import { prisma } from "../lib/prisma.js";
export async function getSession(odId: string) {
  return prisma.gameSession.findUnique({
    where: { odId },
    include: {
      choiceLocks: true,
      votes: true,
      timers: true,
    },
  });
}
export async function createSession(
  odId: string,
  storyId: string,
  currentNodeId: string
) {
  return prisma.gameSession.upsert({
    where: { odId },
    update: {
      storyId,
      currentNodeId,
      choices: [],
      flags: {},
      checkpoints: [],
      inventory: [],
      resources: {},
      partyRole: null,
      activeChannelId: null,
      activeMessageId: null,
      activeMessageAt: null,
    },
    create: {
      odId,
      storyId,
      currentNodeId,
      choices: [],
      flags: {},
      checkpoints: [],
      inventory: [],
      resources: {},
    },
  });
}
export async function updateSession(
  odId: string,
  updates: {
    currentNodeId?: string;
    choices?: string[];
    flags?: Record<string, boolean>;
    checkpoints?: string[];
    inventory?: string[];
    resources?: Record<string, number>;
    partyRole?: string | null;
    activeChannelId?: string | null;
    activeMessageId?: string | null;
    activeMessageAt?: Date | null;
  }
) {
  return prisma.gameSession.update({
    where: { odId },
    data: updates,
  });
}
export async function deleteSession(odId: string) {
  return prisma.gameSession.delete({
    where: { odId },
  });
}
export async function getAllActiveSessions() {
  return prisma.gameSession.findMany({
    include: {
      choiceLocks: true,
      votes: true,
      timers: true,
    },
  });
}
export async function lockChoice(
  odId: string,
  nodeId: string,
  choiceId: string
) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return null;
  return prisma.choiceLock.upsert({
    where: {
      sessionId_nodeId_choiceId: {
        sessionId: session.id,
        nodeId,
        choiceId,
      },
    },
    update: {},
    create: {
      sessionId: session.id,
      nodeId,
      choiceId,
    },
  });
}
export async function isChoiceLocked(
  odId: string,
  nodeId: string,
  choiceId: string
): Promise<boolean> {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return false;
  const lock = await prisma.choiceLock.findUnique({
    where: {
      sessionId_nodeId_choiceId: {
        sessionId: session.id,
        nodeId,
        choiceId,
      },
    },
  });
  return !!lock;
}
export async function getLockedChoices(
  odId: string,
  nodeId: string
): Promise<string[]> {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return [];
  const locks = await prisma.choiceLock.findMany({
    where: { sessionId: session.id, nodeId },
  });
  return locks.map((l) => l.choiceId);
}
export async function clearLockedChoices(odId: string, nodeId: string) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return;
  await prisma.choiceLock.deleteMany({
    where: { sessionId: session.id, nodeId },
  });
}
export async function recordVote(
  odId: string,
  nodeId: string,
  choiceId: string
) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return null;
  return prisma.vote.upsert({
    where: {
      sessionId_nodeId: {
        sessionId: session.id,
        nodeId,
      },
    },
    update: { choiceId },
    create: {
      sessionId: session.id,
      nodeId,
      choiceId,
    },
  });
}
export async function getVote(
  odId: string,
  nodeId: string
): Promise<string | null> {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return null;
  const vote = await prisma.vote.findUnique({
    where: {
      sessionId_nodeId: {
        sessionId: session.id,
        nodeId,
      },
    },
  });
  return vote?.choiceId ?? null;
}
export async function clearVote(odId: string, nodeId: string) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return;
  await prisma.vote.deleteMany({
    where: { sessionId: session.id, nodeId },
  });
}
export async function startTimer(
  odId: string,
  timerId: string,
  nodeId: string,
  durationSeconds: number
) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return null;
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);
  return prisma.timer.upsert({
    where: {
      sessionId_timerId: {
        sessionId: session.id,
        timerId,
      },
    },
    update: {
      nodeId,
      duration: durationSeconds,
      startedAt: new Date(),
      expiresAt,
    },
    create: {
      sessionId: session.id,
      timerId,
      nodeId,
      duration: durationSeconds,
      expiresAt,
    },
  });
}
export async function getTimer(odId: string, timerId: string) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return null;
  return prisma.timer.findUnique({
    where: {
      sessionId_timerId: {
        sessionId: session.id,
        timerId,
      },
    },
  });
}
export async function isTimerExpired(
  odId: string,
  timerId: string
): Promise<boolean> {
  const timer = await getTimer(odId, timerId);
  if (!timer) return true;
  return new Date() > timer.expiresAt;
}
export async function getTimerRemaining(
  odId: string,
  timerId: string
): Promise<number> {
  const timer = await getTimer(odId, timerId);
  if (!timer) return 0;
  const remaining = Math.max(
    0,
    Math.ceil((timer.expiresAt.getTime() - Date.now()) / 1000)
  );
  return remaining;
}
export async function clearTimer(odId: string, timerId: string) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return;
  await prisma.timer.deleteMany({
    where: { sessionId: session.id, timerId },
  });
}
export async function clearTimersForNode(odId: string, nodeId: string) {
  const session = await prisma.gameSession.findUnique({ where: { odId } });
  if (!session) return;
  await prisma.timer.deleteMany({
    where: { sessionId: session.id, nodeId },
  });
}
