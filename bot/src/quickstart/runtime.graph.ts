export type PlayerSession = {
  odId: string;
  storyId: string;
  storyData: any;
  currentNodeId: string;
  choices: string[];
  flags: Record<string, boolean>;
  checkpoints: string[];
  inventory: string[];
  resources: Record<string, number>;
  lockedChoices: Map<string, Set<string>>;
  activeVotes: Map<string, string>;
  activeTimers: Map<
    string,
    { startTime: number; duration: number; nodeId: string }
  >;
  partyRole?: string;
};

const sessions = new Map<string, PlayerSession>();

export function getSessionsMap(): Map<string, PlayerSession> {
  return sessions;
}

export function initSession(
  odId: string,
  storyId: string,
  entryNodeId: string,
  storyData: any
): PlayerSession {
  const session: PlayerSession = {
    odId,
    storyId,
    storyData,
    currentNodeId: entryNodeId,
    choices: [],
    flags: {},
    checkpoints: [],
    inventory: [],
    resources: { credits: 0 },
    lockedChoices: new Map(),
    activeVotes: new Map(),
    activeTimers: new Map(),
    partyRole: undefined,
  };
  sessions.set(odId, session);
  return session;
}

export function getSession(odId: string): PlayerSession | undefined {
  return sessions.get(odId);
}

export function recordChoice(
  odId: string,
  choiceId: string,
  nextNodeId: string | null
): void {
  const session = sessions.get(odId);
  if (!session) return;
  session.choices.push(choiceId);
  if (nextNodeId) session.currentNodeId = nextNodeId;
}

export function setFlag(odId: string, flag: string, value = true): void {
  const session = sessions.get(odId);
  if (session) session.flags[flag] = value;
}

export function addCheckpoint(odId: string, nodeId: string): void {
  const session = sessions.get(odId);
  if (session && !session.checkpoints.includes(nodeId)) {
    session.checkpoints.push(nodeId);
  }
}

export function addItem(odId: string, itemId: string): void {
  const session = sessions.get(odId);
  if (session && !session.inventory.includes(itemId)) {
    session.inventory.push(itemId);
  }
}

export function endSession(odId: string): PlayerSession | undefined {
  const session = sessions.get(odId);
  sessions.delete(odId);
  return session;
}

export function getResource(odId: string, resourceName: string): number {
  const session = sessions.get(odId);
  return session?.resources[resourceName] ?? 0;
}

export function setResource(
  odId: string,
  resourceName: string,
  value: number
): void {
  const session = sessions.get(odId);
  if (session) {
    session.resources[resourceName] = value;
  }
}

export function modifyResource(
  odId: string,
  resourceName: string,
  delta: number
): void {
  const session = sessions.get(odId);
  if (session) {
    const current = session.resources[resourceName] ?? 0;
    session.resources[resourceName] = Math.max(0, current + delta);
  }
}

export function isChoiceLocked(
  odId: string,
  nodeId: string,
  choiceId: string
): boolean {
  const session = sessions.get(odId);
  if (!session) return false;
  const lockedSet = session.lockedChoices.get(nodeId);
  return lockedSet?.has(choiceId) ?? false;
}

export function lockChoice(
  odId: string,
  nodeId: string,
  choiceId: string
): void {
  const session = sessions.get(odId);
  if (!session) return;
  if (!session.lockedChoices.has(nodeId)) {
    session.lockedChoices.set(nodeId, new Set());
  }
  session.lockedChoices.get(nodeId)!.add(choiceId);
}

export function getLockedChoices(odId: string, nodeId: string): Set<string> {
  const session = sessions.get(odId);
  if (!session) return new Set();
  return session.lockedChoices.get(nodeId) ?? new Set();
}

export function clearLockedChoices(odId: string, nodeId: string): void {
  const session = sessions.get(odId);
  if (session) {
    session.lockedChoices.delete(nodeId);
  }
}

export function recordVote(
  odId: string,
  nodeId: string,
  choiceId: string
): void {
  const session = sessions.get(odId);
  if (session) {
    session.activeVotes.set(nodeId, choiceId);
  }
}

export function getVote(odId: string, nodeId: string): string | undefined {
  const session = sessions.get(odId);
  return session?.activeVotes.get(nodeId);
}

export function clearVote(odId: string, nodeId: string): void {
  const session = sessions.get(odId);
  if (session) {
    session.activeVotes.delete(nodeId);
  }
}

export function startTimer(
  odId: string,
  timerId: string,
  nodeId: string,
  durationSeconds: number
): void {
  const session = sessions.get(odId);
  if (session) {
    session.activeTimers.set(timerId, {
      startTime: Date.now(),
      duration: durationSeconds * 1000,
      nodeId,
    });
  }
}

export function getTimer(
  odId: string,
  timerId: string
): { startTime: number; duration: number; nodeId: string } | undefined {
  const session = sessions.get(odId);
  return session?.activeTimers.get(timerId);
}

export function isTimerExpired(odId: string, timerId: string): boolean {
  const timer = getTimer(odId, timerId);
  if (!timer) return true;
  const elapsed = Date.now() - timer.startTime;
  return elapsed >= timer.duration;
}

export function getTimerRemaining(odId: string, timerId: string): number {
  const timer = getTimer(odId, timerId);
  if (!timer) return 0;
  const elapsed = Date.now() - timer.startTime;
  const remaining = timer.duration - elapsed;
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function clearTimer(odId: string, timerId: string): void {
  const session = sessions.get(odId);
  if (session) {
    session.activeTimers.delete(timerId);
  }
}

export function clearTimersForNode(odId: string, nodeId: string): void {
  const session = sessions.get(odId);
  if (!session) return;
  for (const [timerId, timer] of session.activeTimers.entries()) {
    if (timer.nodeId === nodeId) {
      session.activeTimers.delete(timerId);
    }
  }
}

export function setPartyRole(odId: string, role: string): void {
  const session = sessions.get(odId);
  if (session) {
    session.partyRole = role;
  }
}

export function getPartyRole(odId: string): string | undefined {
  const session = sessions.get(odId);
  return session?.partyRole;
}
