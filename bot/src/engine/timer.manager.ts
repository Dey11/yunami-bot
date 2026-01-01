import {
    getSession,
    isTimerExpired,
    clearTimer,
    recordChoice,
    getSessionsMap,
    type PlayerSession,
} from "../quickstart/runtime.graph.js";

type TimerCallback = (session: PlayerSession, nodeId: string, timerId: string) => Promise<void>;

let timerInterval: NodeJS.Timeout | null = null;
let onTimerExpiredCallback: TimerCallback | null = null;

const CHECK_INTERVAL_MS = 1000;

export function startTimerManager(onExpired?: TimerCallback): void {
    if (timerInterval) {
        return;
    }

    onTimerExpiredCallback = onExpired ?? defaultExpiryHandler;

    timerInterval = setInterval(() => {
        checkAllTimers();
    }, CHECK_INTERVAL_MS);
}

export function stopTimerManager(): void {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    onTimerExpiredCallback = null;
}

function checkAllTimers(): void {
    const sessions = getSessionsMap();

    for (const session of sessions.values()) {
        for (const [timerId, timer] of session.activeTimers.entries()) {
            if (isTimerExpired(session.odId, timerId)) {
                handleExpiredTimer(session, timer.nodeId, timerId);
            }
        }
    }
}

async function handleExpiredTimer(
    session: PlayerSession,
    nodeId: string,
    timerId: string
): Promise<void> {
    clearTimer(session.odId, timerId);

    if (onTimerExpiredCallback) {
        try {
            await onTimerExpiredCallback(session, nodeId, timerId);
        } catch (error) {
            console.error(`Timer expiry handler error for ${session.odId}:`, error);
        }
    }
}

async function defaultExpiryHandler(
    session: PlayerSession,
    nodeId: string,
    timerId: string
): Promise<void> {
    recordChoice(session.odId, `timeout:${nodeId}`, null);
}

