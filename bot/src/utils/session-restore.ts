import * as api from '../api/client.js';
import { initSession, getSessionsMap } from '../quickstart/runtime-graph.js';
import { logger } from './logger.js';
export async function restoreSessionsFromServer(): Promise<number> {
  try {
    const result = await api.getAllSessions();
    if (result.error || !result.data?.sessions) {
      logger.info('No sessions to restore');
      return 0;
    }
    const sessions = result.data.sessions;
    let restored = 0;
    for (const dbSession of sessions) {
      try {
        const storyResponse = await api.getStory(dbSession.odId, dbSession.storyId);
        if (storyResponse.data?.story) {
          initSession(
            dbSession.odId,
            dbSession.storyId,
            dbSession.currentNodeId,
            storyResponse.data.story
          );
          const localSession = getSessionsMap().get(dbSession.odId);
          if (localSession) {
            localSession.choices = dbSession.choices || [];
            localSession.flags = dbSession.flags || {};
            localSession.inventory = dbSession.inventory || [];
            localSession.resources = dbSession.resources || {};
            localSession.checkpoints = dbSession.checkpoints || [];
            localSession.partyRole = dbSession.partyRole || undefined;
          }
          restored++;
          logger.debug(`Restored session for ${dbSession.odId}`);
        }
      } catch (err) {
        logger.error(`Failed to restore session for ${dbSession.odId}:`, err);
      }
    }
    logger.info(`Restored ${restored} active sessions from database`);
    return restored;
  } catch (error) {
    logger.error('Failed to restore sessions:', error);
    return 0;
  }
}
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
