import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as minigameService from "../services/minigame.service";
const router = Router();
router.use(authMiddleware);
router.get("/state", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const storyId = req.query.storyId as string;
    const nodeId = req.query.nodeId as string;
    if (!storyId || !nodeId) {
      res.status(400).json({ error: "storyId and nodeId are required" });
      return;
    }
    const state = await minigameService.getMinigameState(
      user.id,
      storyId,
      nodeId
    );
    if (!state) {
      res.status(404).json({ error: "Minigame state not found" });
      return;
    }
    res.json({ minigameState: state });
  } catch (error) {
    console.error("Error fetching minigame state:", error);
    res.status(500).json({ error: "Failed to fetch minigame state" });
  }
});
router.post("/init", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId, nodeId, type, initialState } = req.body;
    if (!storyId || !nodeId || !type) {
      res.status(400).json({ error: "storyId, nodeId, and type are required" });
      return;
    }
    const state = await minigameService.getOrCreateMinigameState({
      userId: user.id,
      storyId,
      nodeId,
      type,
      state: initialState || {},
    });
    res.json({ minigameState: state });
  } catch (error) {
    console.error("Error initializing minigame:", error);
    res.status(500).json({ error: "Failed to initialize minigame" });
  }
});
router.post("/update", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId, nodeId, state, status } = req.body;
    if (!storyId || !nodeId || !state) {
      res
        .status(400)
        .json({ error: "storyId, nodeId, and state are required" });
      return;
    }
    const updated = await minigameService.updateMinigameState(
      user.id,
      storyId,
      nodeId,
      state,
      status
    );
    res.json({ minigameState: updated });
  } catch (error) {
    console.error("Error updating minigame:", error);
    res.status(500).json({ error: "Failed to update minigame" });
  }
});
router.post("/complete", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId, nodeId, status } = req.body;
    if (!storyId || !nodeId || !status) {
      res
        .status(400)
        .json({ error: "storyId, nodeId, and status are required" });
      return;
    }
    if (status !== "completed" && status !== "failed") {
      res.status(400).json({ error: "status must be 'completed' or 'failed'" });
      return;
    }
    const updated = await minigameService.completeMinigame(
      user.id,
      storyId,
      nodeId,
      status
    );
    res.json({ minigameState: updated });
  } catch (error) {
    console.error("Error completing minigame:", error);
    res.status(500).json({ error: "Failed to complete minigame" });
  }
});
export default router;
