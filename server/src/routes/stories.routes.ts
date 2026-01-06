import { Router, type Request, type Response } from "express";
import * as storyService from "../services/story.service";
const router = Router();
router.get("/", (req: Request, res: Response) => {
  try {
    const stories = storyService.listStories();
    res.json({ stories });
  } catch (error) {
    console.error("Error listing stories:", error);
    res.status(500).json({ error: "Failed to list stories" });
  }
});
router.get("/:storyId", (req: Request, res: Response) => {
  try {
    const storyId = req.params.storyId;
    if (!storyId) {
      res.status(400).json({ error: "storyId is required" });
      return;
    }
    const story = storyService.getStory(storyId);
    if (!story) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    res.json({ story });
  } catch (error) {
    console.error("Error getting story:", error);
    res.status(500).json({ error: "Failed to get story" });
  }
});
router.get("/:storyId/node/:nodeId", (req: Request, res: Response) => {
  try {
    const storyId = req.params.storyId;
    const nodeId = req.params.nodeId;
    if (!storyId || !nodeId) {
      res.status(400).json({ error: "storyId and nodeId are required" });
      return;
    }
    const node = storyService.getNode(storyId, nodeId);
    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }
    res.json({ node });
  } catch (error) {
    console.error("Error getting node:", error);
    res.status(500).json({ error: "Failed to get node" });
  }
});
export default router;
