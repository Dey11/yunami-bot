import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as progressService from "../services/progress.service";
import * as partyService from "../services/party.service";

const router = Router();

// All story routes require authentication
router.use(authMiddleware);

/**
 * POST /story/start
 * Start a story for a party or solo.
 * Body: { storyId: string, partyId?: string }
 */
router.post("/start", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId, partyId, startNodeId } = req.body;

    if (!storyId) {
      res.status(400).json({ error: "storyId is required" });
      return;
    }

    // If partyId is provided, verify user is in party and party is ready
    if (partyId) {
      const party = await partyService.getPartyById(partyId);

      if (!party) {
        res.status(404).json({ error: "Party not found" });
        return;
      }

      // Check if user is the leader
      if (party.leaderId !== user.id) {
        res
          .status(403)
          .json({ error: "Only the party leader can start the story" });
        return;
      }

      // Check if all members are ready
      const allReady = (party as any).members.every((m: any) => m.isReady);
      if (!allReady) {
        res.status(400).json({ error: "Not all party members are ready" });
        return;
      }

      // Update party status
      await partyService.updatePartyStatus(partyId, "active", storyId);

      // Initialize progress for all party members
      for (const member of (party as any).members) {
        await progressService.getOrCreateProgress(
          member.userId,
          storyId,
          startNodeId || "start"
        );
      }

      const updatedParty = await partyService.getPartyById(partyId);

      res.status(201).json({
        message: "Story started for party",
        party: updatedParty,
        storyId,
      });
      return;
    }

    // Solo play
    const progress = await progressService.getOrCreateProgress(
      user.id,
      storyId,
      startNodeId || "start"
    );

    res.status(201).json({
      message: "Story started (solo)",
      progress,
    });
  } catch (error) {
    console.error("Error starting story:", error);
    res.status(500).json({ error: "Failed to start story" });
  }
});

/**
 * GET /story/state
 * Get current story state for the user.
 * Query: { storyId: string }
 */
router.get("/state", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const storyId = req.query.storyId as string;

    if (!storyId) {
      res.status(400).json({ error: "storyId query param is required" });
      return;
    }

    const progress = await progressService.getProgress(user.id, storyId);

    if (!progress) {
      res.status(404).json({ error: "No progress found for this story" });
      return;
    }

    res.json({ progress });
  } catch (error) {
    console.error("Error fetching story state:", error);
    res.status(500).json({ error: "Failed to fetch story state" });
  }
});

/**
 * POST /story/choice
 * Submit a choice for the current story scene.
 * Body: { storyId: string, nodeId: string, choiceId: string, nextNodeId: string, stateUpdates?: object }
 */
router.post("/choice", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId, nodeId, choiceId, nextNodeId, stateUpdates } = req.body;

    if (!storyId || !nodeId || !choiceId || !nextNodeId) {
      res.status(400).json({
        error: "storyId, nodeId, choiceId, and nextNodeId are required",
      });
      return;
    }

    const existing = await progressService.getProgress(user.id, storyId);

    if (!existing) {
      res.status(400).json({ error: "Story not started" });
      return;
    }

    if (existing.status === "completed") {
      res.status(400).json({ error: "Story already completed" });
      return;
    }

    // Update state with the choice made
    const currentState = (existing.state as Record<string, any>) || {};
    const choices = currentState.choices || [];
    choices.push({ nodeId, choiceId, timestamp: new Date().toISOString() });

    const newState = {
      ...currentState,
      ...stateUpdates,
      choices,
    };

    const progress = await progressService.updateProgress({
      userId: user.id,
      storyId,
      currentNodeId: nextNodeId,
      state: newState,
    });

    res.json({
      message: "Choice recorded",
      progress,
    });
  } catch (error) {
    console.error("Error recording choice:", error);
    res.status(500).json({ error: "Failed to record choice" });
  }
});

/**
 * POST /story/end
 * Mark the story as completed.
 * Body: { storyId: string }
 */
router.post("/end", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId } = req.body;

    if (!storyId) {
      res.status(400).json({ error: "storyId is required" });
      return;
    }

    const progress = await progressService.completeProgress(user.id, storyId);

    if (!progress) {
      res.status(404).json({ error: "No progress found for this story" });
      return;
    }

    res.json({
      message: "Story completed",
      progress,
    });
  } catch (error) {
    console.error("Error ending story:", error);
    res.status(500).json({ error: "Failed to end story" });
  }
});

export default router;
