import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import * as sessionService from "../services/session.service.js";
const router = Router();
router.get("/all", async (req: Request, res: Response) => {
  try {
    const sessions = await sessionService.getAllActiveSessions();
    res.json({ sessions });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});
router.use(authMiddleware);
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const session = await sessionService.getSession(user.discordId);
    if (!session) {
      res.status(404).json({ error: "No active session" });
      return;
    }
    res.json({ session });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});
router.post("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { storyId, currentNodeId } = req.body;
    if (!storyId || !currentNodeId) {
      res.status(400).json({ error: "storyId and currentNodeId are required" });
      return;
    }
    const session = await sessionService.createSession(
      user.discordId,
      storyId,
      currentNodeId
    );
    res.status(201).json({ message: "Session created", session });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});
router.patch("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const updates = req.body;
    const session = await sessionService.updateSession(user.discordId, updates);
    res.json({ message: "Session updated", session });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});
router.delete("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await sessionService.deleteSession(user.discordId);
    res.json({ message: "Session deleted" });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});
router.post("/lock", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { nodeId, choiceId } = req.body;
    if (!nodeId || !choiceId) {
      res.status(400).json({ error: "nodeId and choiceId are required" });
      return;
    }
    await sessionService.lockChoice(user.discordId, nodeId, choiceId);
    res.json({ message: "Choice locked" });
  } catch (error) {
    console.error("Error locking choice:", error);
    res.status(500).json({ error: "Failed to lock choice" });
  }
});
router.get("/lock/:nodeId/:choiceId", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { nodeId, choiceId } = req.params;
    if (!nodeId || !choiceId) {
      res.status(400).json({ error: "nodeId and choiceId are required" });
      return;
    }
    const isLocked = await sessionService.isChoiceLocked(
      user.discordId,
      nodeId,
      choiceId
    );
    res.json({ isLocked });
  } catch (error) {
    console.error("Error checking choice lock:", error);
    res.status(500).json({ error: "Failed to check choice lock" });
  }
});
router.post("/vote", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { nodeId, choiceId } = req.body;
    if (!nodeId || !choiceId) {
      res.status(400).json({ error: "nodeId and choiceId are required" });
      return;
    }
    await sessionService.recordVote(user.discordId, nodeId, choiceId);
    res.json({ message: "Vote recorded" });
  } catch (error) {
    console.error("Error recording vote:", error);
    res.status(500).json({ error: "Failed to record vote" });
  }
});
router.get("/vote/:nodeId", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { nodeId } = req.params;
    if (!nodeId) {
      res.status(400).json({ error: "nodeId is required" });
      return;
    }
    const choiceId = await sessionService.getVote(user.discordId, nodeId);
    res.json({ choiceId });
  } catch (error) {
    console.error("Error getting vote:", error);
    res.status(500).json({ error: "Failed to get vote" });
  }
});
router.post("/timer", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { timerId, nodeId, durationSeconds } = req.body;
    if (!timerId || !nodeId || !durationSeconds) {
      res.status(400).json({
        error: "timerId, nodeId, and durationSeconds are required",
      });
      return;
    }
    const timer = await sessionService.startTimer(
      user.discordId,
      timerId,
      nodeId,
      durationSeconds
    );
    res.json({ message: "Timer started", timer });
  } catch (error) {
    console.error("Error starting timer:", error);
    res.status(500).json({ error: "Failed to start timer" });
  }
});
router.get("/timer/:timerId", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { timerId } = req.params;
    if (!timerId) {
      res.status(400).json({ error: "timerId is required" });
      return;
    }
    const timer = await sessionService.getTimer(user.discordId, timerId);
    const isExpired = await sessionService.isTimerExpired(
      user.discordId,
      timerId
    );
    const remaining = await sessionService.getTimerRemaining(
      user.discordId,
      timerId
    );
    res.json({ timer, isExpired, remainingSeconds: remaining });
  } catch (error) {
    console.error("Error getting timer:", error);
    res.status(500).json({ error: "Failed to get timer" });
  }
});
export default router;
