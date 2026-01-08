import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as progressService from "../services/progress.service";
import * as partyService from "../services/party.service";
import * as storyService from "../services/story.service";
import prisma from "../lib/prisma";
const router = Router();
router.use(authMiddleware);
router.post("/start", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId, partyId, startNodeId } = req.body;
    if (!storyId) {
      res.status(400).json({ error: "storyId is required" });
      return;
    }
    if (partyId) {
      const party = await partyService.getPartyById(partyId);
      if (!party) {
        res.status(404).json({ error: "Party not found" });
        return;
      }
      if (party.leaderId !== user.id) {
        res
          .status(403)
          .json({ error: "Only the party leader can start the story" });
        return;
      }
      const allReady = (party as any).members.every((m: any) => m.isReady);
      if (!allReady) {
        res.status(400).json({ error: "Not all party members are ready" });
        return;
      }
      await partyService.updatePartyStatus(partyId, "active", storyId);
      for (const member of (party as any).members) {
        await progressService.getOrCreateProgress(
          member.userId,
          storyId,
          startNodeId || storyService.getEntryNodeId(storyId) || "start"
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
    const progress = await progressService.getOrCreateProgress(
      user.id,
      storyId,
      startNodeId || storyService.getEntryNodeId(storyId) || "start"
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
    const XP_REWARD = 100;
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: XP_REWARD },
        lastActive: new Date(),
      },
    });
    const newLevel = Math.floor(updatedUser.xp / 1000) + 1;
    if (newLevel > (updatedUser.level || 1)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { level: newLevel },
      });
    }
    res.json({
      message: "Story completed",
      progress,
      xpGained: XP_REWARD,
      newXp: updatedUser.xp,
      level: newLevel,
    });
  } catch (error) {
    console.error("Error ending story:", error);
    res.status(500).json({ error: "Failed to end story" });
  }
});
export default router;
