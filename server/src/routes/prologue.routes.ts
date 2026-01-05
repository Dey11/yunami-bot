import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as progressService from "../services/progress.service";
import * as userService from "../services/user.service";

const router = Router();

// All prologue routes require authentication
router.use(authMiddleware);

// The starting node for prologue - this should match your bot's prologue.json
const PROLOGUE_STORY_ID = "prologue";
const PROLOGUE_START_NODE = "prologue-start"; // Adjust based on actual data

/**
 * POST /prologue/start
 * Initialize a prologue story run for the user.
 */
router.post("/start", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user already has a prologue in progress or completed
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

      // Resume existing progress
      res.json({
        message: "Resuming prologue",
        progress: existing,
      });
      return;
    }

    // Create new progress
    const progress = await progressService.getOrCreateProgress(
      user.id,
      PROLOGUE_STORY_ID,
      PROLOGUE_START_NODE
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

/**
 * POST /prologue/choice
 * Submit a choice for the current prologue scene.
 * Body: { nodeId: string, choiceId: string, nextNodeId: string }
 */
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

    // Update state with the choice made
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

/**
 * POST /prologue/complete
 * Finalize prologue and assign role based on choices.
 * Body: { role: string } - The calculated role from the bot's engine
 */
router.post("/complete", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({ error: "role is required" });
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
      res.status(400).json({
        error: "Prologue already completed",
        role: user.role,
      });
      return;
    }

    // Mark prologue as completed
    await progressService.completeProgress(user.id, PROLOGUE_STORY_ID);

    // Assign role to user
    const updatedUser = await userService.updateUserRole(user.id, role);

    res.json({
      message: "Prologue completed",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error completing prologue:", error);
    res.status(500).json({ error: "Failed to complete prologue" });
  }
});

export default router;
