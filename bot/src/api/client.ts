/**
 * Yunami API Client
 *
 * This client is used by the Discord bot to communicate with the backend server.
 * All game logic is handled server-side; the bot is just the UI layer.
 */

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

// ============ Auth ============

export async function register(discordId: string, username: string) {
  return request<{ message: string; user: any }>("POST", "/auth/register", discordId, {
    discordId,
    username,
  });
}

// ============ User ============

export async function getUser(discordId: string) {
  return request<{ user: any; progress: any[] }>("GET", "/user/me", discordId);
}

// ============ Prologue ============

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

export async function completePrologue(discordId: string) {
  return request<{ message: string; user: any; roleDescription: string }>(
    "POST",
    "/prologue/complete",
    discordId
  );
}

// ============ Stories ============

export async function listStories(discordId: string) {
  return request<{ stories: any[] }>("GET", "/stories", discordId);
}

export async function getStory(discordId: string, storyId: string) {
  return request<{ story: any }>("GET", `/stories/${storyId}`, discordId);
}

export async function getNode(discordId: string, storyId: string, nodeId: string) {
  return request<{ node: any }>("GET", `/stories/${storyId}/node/${nodeId}`, discordId);
}

// ============ Party ============

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

// ============ Story Session ============

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

// ============ Minigame ============

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
