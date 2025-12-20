type PlayerSession = {
    odId: string;
    storyId: string;
    storyData: any;
    currentNodeId: string;
    choices: string[];
    flags: Record<string, boolean>;
    checkpoints: string[];
    inventory: string[];
};

const sessions = new Map<string, PlayerSession>();

export function initSession(odId: string, storyId: string, entryNodeId: string, storyData: any): PlayerSession {
    const session: PlayerSession = {
        odId,
        storyId,
        storyData,
        currentNodeId: entryNodeId,
        choices: [],
        flags: {},
        checkpoints: [],
        inventory: [],
    };
    sessions.set(odId, session);
    return session;
}

export function getSession(odId: string): PlayerSession | undefined {
    return sessions.get(odId);
}

export function recordChoice(odId: string, choiceId: string, nextNodeId: string | null): void {
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
