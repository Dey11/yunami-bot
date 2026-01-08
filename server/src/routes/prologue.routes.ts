import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as progressService from "../services/progress.service";
import * as userService from "../services/user.service";
import * as storyService from "../services/story.service";
const router = Router();
router.use(authMiddleware);
const PROLOGUE_STORY_ID = "prologue_1"; 
router.post("/start", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const existing = await progressService.getProgress(
      user.id,
      PROLOGUE_STORY_ID
    );
    if (existing) {
      if (existing.status === "completed") {
        res.status(400).json({
          error: "Prologue already completed",
          role: user.role,
        });
        return;
      }
      const story = storyService.getStory(PROLOGUE_STORY_ID);
      if (story && !story.nodes[existing.currentNodeId]) {
        const validNodeId = storyService.getEntryNodeId(PROLOGUE_STORY_ID) || existing.currentNodeId;
        const healedProgress = await progressService.updateProgress({
          userId: user.id,
          storyId: PROLOGUE_STORY_ID,
          currentNodeId: validNodeId,
          state: existing.state as Record<string, any>,
        });
        res.json({
          message: "Resuming prologue (healed)",
          progress: healedProgress,
        });
        return;
      }
      res.json({
        message: "Resuming prologue",
        progress: existing,
      });
      return;
    }
    const startNodeId = storyService.getEntryNodeId(PROLOGUE_STORY_ID);
    if (!startNodeId) {
      res.status(500).json({ error: "Prologue story not found" });
      return;
    }
    const progress = await progressService.getOrCreateProgress(
      user.id,
      PROLOGUE_STORY_ID,
      startNodeId
    );
    res.status(201).json({
      message: "Prologue started",
      progress,
    });
  } catch (error) {
    console.error("Error starting prologue:", error);
    res.status(500).json({ error: "Failed to start prologue" });
  }
});
router.post("/choice", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { nodeId, choiceId, nextNodeId } = req.body;
    if (!nodeId || !choiceId || !nextNodeId) {
      res.status(400).json({
        error: "nodeId, choiceId, and nextNodeId are required",
      });
      return;
    }
    const existing = await progressService.getProgress(
      user.id,
      PROLOGUE_STORY_ID
    );
    if (!existing) {
      res.status(400).json({ error: "Prologue not started" });
      return;
    }
    if (existing.status === "completed") {
      res.status(400).json({ error: "Prologue already completed" });
      return;
    }
    const currentState = (existing.state as Record<string, any>) || {};
    const choices = currentState.choices || [];
    choices.push({ nodeId, choiceId, timestamp: new Date().toISOString() });
    const progress = await progressService.updateProgress({
      userId: user.id,
      storyId: PROLOGUE_STORY_ID,
      currentNodeId: nextNodeId,
      state: { ...currentState, choices },
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
router.post("/complete", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const existing = await progressService.getProgress(
      user.id,
      PROLOGUE_STORY_ID
    );
    if (!existing) {
      res.status(400).json({ error: "Prologue not started" });
      return;
    }
    if (existing.status === "completed") {
      res.status(400).json({
        error: "Prologue already completed",
        role: user.role,
      });
      return;
    }
    const { baseStats, personalityType, startingInventory, personalityDescription } = req.body;
    if (!baseStats || !personalityType) {
      res.status(400).json({ error: "Missing prologue result data" });
      return;
    }
    await progressService.completeProgress(user.id, PROLOGUE_STORY_ID);
    const updatedUser = await userService.updateUserProfile(
      user.id,
      personalityType,
      baseStats,
      startingInventory
    );
    res.json({
      message: "Prologue completed",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        stats: updatedUser.stats,
      },
      roleDescription: personalityDescription || "Your journey begins.",
    });
  } catch (error) {
    console.error("Error completing prologue:", error);
    res.status(500).json({ error: "Failed to complete prologue" });
  }
});
export default router;
