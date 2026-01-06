const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
interface ApiResponse<T> {
  data?: T;
  error?: string;
}
async function request<T>(
  method: string,
  path: string,
  discordId: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-discord-id": discordId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error || "Request failed" };
    }
    return { data };
  } catch (error) {
    console.error(`API request failed: ${method} ${path}`, error);
    return { error: "Network error" };
  }
}
export async function register(discordId: string, username: string) {
  return request<{ message: string; user: any }>("POST", "/auth/register", discordId, {
    discordId,
    username,
  });
}
export async function getUser(discordId: string) {
  return request<{ user: any; progress: any[] }>("GET", "/user/me", discordId);
}
export async function startPrologue(discordId: string) {
  return request<{ message: string; progress: any }>("POST", "/prologue/start", discordId);
}
export async function submitPrologueChoice(
  discordId: string,
  nodeId: string,
  choiceId: string,
  nextNodeId: string
) {
  return request<{ message: string; progress: any }>("POST", "/prologue/choice", discordId, {
    nodeId,
    choiceId,
    nextNodeId,
  });
}
export async function completePrologue(
  discordId: string,
  result: {
    baseStats: any;
    personalityType: string; 
    startingInventory: string[];
    dominantTraits: string[];
    personalityDescription: string;
  }
) {
  return request<{ message: string; user: any; roleDescription: string }>(
    "POST",
    "/prologue/complete",
    discordId,
    result
  );
}
export async function listStories(discordId: string) {
  return request<{ stories: any[] }>("GET", "/stories", discordId);
}
export async function getStory(discordId: string, storyId: string) {
  return request<{ story: any }>("GET", `/stories/${storyId}`, discordId);
}
export async function getNode(discordId: string, storyId: string, nodeId: string) {
  return request<{ node: any }>("GET", `/stories/${storyId}/node/${nodeId}`, discordId);
}
export async function createParty(discordId: string) {
  return request<{ message: string; party: any }>("POST", "/party/create", discordId);
}
export async function joinParty(discordId: string, code: string) {
  return request<{ message: string; party: any }>("POST", "/party/join", discordId, { code });
}
export async function getParty(discordId: string, partyId: string) {
  return request<{ party: any }>("GET", `/party/${partyId}`, discordId);
}
export async function setReady(discordId: string, partyId: string, isReady: boolean) {
  return request<{ message: string; party: any }>("POST", `/party/${partyId}/ready`, discordId, {
    isReady,
  });
}
export async function leaveParty(discordId: string, partyId: string) {
  return request<{ message: string }>("DELETE", `/party/${partyId}/leave`, discordId);
}
export async function startStory(
  discordId: string,
  storyId: string,
  partyId?: string,
  startNodeId?: string
) {
  return request<{ message: string; progress?: any; party?: any }>(
    "POST",
    "/story/start",
    discordId,
    { storyId, partyId, startNodeId }
  );
}
export async function getStoryState(discordId: string, storyId: string) {
  return request<{ progress: any }>("GET", `/story/state?storyId=${storyId}`, discordId);
}
export async function submitChoice(
  discordId: string,
  storyId: string,
  nodeId: string,
  choiceId: string,
  nextNodeId: string,
  stateUpdates?: any
) {
  return request<{ message: string; progress: any }>("POST", "/story/choice", discordId, {
    storyId,
    nodeId,
    choiceId,
    nextNodeId,
    stateUpdates,
  });
}
export async function endStory(discordId: string, storyId: string) {
  return request<{ message: string; progress: any }>("POST", "/story/end", discordId, { storyId });
}
export async function initMinigame(
  discordId: string,
  storyId: string,
  nodeId: string,
  type: "combat" | "memory" | "sequence" | "social",
  initialState: any = {}
) {
  return request<{ minigameState: any }>("POST", "/minigame/init", discordId, {
    storyId,
    nodeId,
    type,
    initialState,
  });
}
export async function getMinigameState(
  discordId: string,
  storyId: string,
  nodeId: string
) {
  return request<{ minigameState: any }>(
    "GET",
    `/minigame/state?storyId=${storyId}&nodeId=${nodeId}`,
    discordId
  );
}
export async function updateMinigameState(
  discordId: string,
  storyId: string,
  nodeId: string,
  state: any,
  status?: string
) {
  return request<{ minigameState: any }>("POST", "/minigame/update", discordId, {
    storyId,
    nodeId,
    state,
    status,
  });
}
export async function completeMinigame(
  discordId: string,
  storyId: string,
  nodeId: string,
  status: "completed" | "failed"
) {
  return request<{ minigameState: any }>("POST", "/minigame/complete", discordId, {
    storyId,
    nodeId,
    status,
  });
}
export async function getSession(discordId: string) {
  return request<{ session: any }>("GET", "/session", discordId);
}
export async function getAllSessions() {
  const response = await fetch(`${API_BASE_URL}/session/all`);
  if (!response.ok) {
    return { error: "Failed to fetch sessions" };
  }
  const data = await response.json();
  return { data };
}
export async function createSession(
  discordId: string,
  storyId: string,
  currentNodeId: string
) {
  return request<{ message: string; session: any }>("POST", "/session", discordId, {
    storyId,
    currentNodeId,
  });
}
export async function updateSession(
  discordId: string,
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
  }
) {
  return request<{ message: string; session: any }>("PATCH", "/session", discordId, updates);
}
export async function deleteSession(discordId: string) {
  return request<{ message: string }>("DELETE", "/session", discordId);
}
export async function lockChoice(discordId: string, nodeId: string, choiceId: string) {
  return request<{ message: string }>("POST", "/session/lock", discordId, {
    nodeId,
    choiceId,
  });
}
export async function isChoiceLocked(
  discordId: string,
  nodeId: string,
  choiceId: string
): Promise<boolean> {
  const result = await request<{ isLocked: boolean }>(
    "GET",
    `/session/lock/${nodeId}/${choiceId}`,
    discordId
  );
  return result.data?.isLocked ?? false;
}
export async function recordVote(discordId: string, nodeId: string, choiceId: string) {
  return request<{ message: string }>("POST", "/session/vote", discordId, {
    nodeId,
    choiceId,
  });
}
export async function getVote(discordId: string, nodeId: string) {
  return request<{ choiceId: string | null }>("GET", `/session/vote/${nodeId}`, discordId);
}
export async function startTimer(
  discordId: string,
  timerId: string,
  nodeId: string,
  durationSeconds: number
) {
  return request<{ message: string; timer: any }>("POST", "/session/timer", discordId, {
    timerId,
    nodeId,
    durationSeconds,
  });
}
export async function getTimerStatus(discordId: string, timerId: string) {
  return request<{ timer: any; isExpired: boolean; remainingSeconds: number }>(
    "GET",
    `/session/timer/${timerId}`,
    discordId
  );
}
export async function getArcState(discordId: string, partyId: string) {
  return request<{ arcState: any }>("GET", `/arc/${partyId}`, discordId);
}
export async function initArcSplit(
  discordId: string,
  partyId: string,
  splitNodeId: string,
  config: any,
  players: { odId: string; role?: string }[]
) {
  return request<{ message: string; arcState: any }>("POST", "/arc/split", discordId, {
    partyId,
    splitNodeId,
    config,
    players,
  });
}
export async function getPlayerArc(discordId: string, partyId: string, odId: string) {
  return request<{ arc: any }>("GET", `/arc/${partyId}/player/${odId}`, discordId);
}
export async function isPlayerInSoloArc(
  discordId: string,
  partyId: string,
  odId: string
): Promise<boolean> {
  const result = await request<{ isSolo: boolean }>(
    "GET",
    `/arc/${partyId}/solo/${odId}`,
    discordId
  );
  return result.data?.isSolo ?? false;
}
export async function updateArcNode(
  discordId: string,
  partyId: string,
  arcId: string,
  nodeId: string
) {
  return request<{ message: string }>("PATCH", `/arc/${partyId}/node`, discordId, {
    arcId,
    nodeId,
  });
}
export async function markArcAtMerge(discordId: string, partyId: string, arcId: string) {
  return request<{ message: string }>("POST", `/arc/${partyId}/merge-ready`, discordId, {
    arcId,
  });
}
export async function checkMergeStatus(discordId: string, partyId: string) {
  return request<{ allReady: boolean; arcsNotReady: string[] }>(
    "GET",
    `/arc/${partyId}/merge-status`,
    discordId
  );
}
export async function completeArcMerge(discordId: string, partyId: string) {
  return request<{ message: string; arcState: any }>("POST", `/arc/${partyId}/merge`, discordId);
}
export async function clearArcState(discordId: string, partyId: string) {
  return request<{ message: string }>("DELETE", `/arc/${partyId}`, discordId);
}
