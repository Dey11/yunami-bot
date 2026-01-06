import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import * as arcService from "../services/arc.service.js";
const router = Router();
router.use(authMiddleware);
router.get("/:partyId", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }
    const arcState = await arcService.getArcState(partyId);
    if (!arcState) {
      res.status(404).json({ error: "No arc state found for this party" });
      return;
    }
    res.json({ arcState });
  } catch (error) {
    console.error("Error fetching arc state:", error);
    res.status(500).json({ error: "Failed to fetch arc state" });
  }
});
router.post("/split", async (req: Request, res: Response) => {
  try {
    const { partyId, splitNodeId, config, players } = req.body;
    if (!partyId || !splitNodeId || !config || !players) {
      res.status(400).json({
        error: "partyId, splitNodeId, config, and players are required",
      });
      return;
    }
    const arcState = await arcService.initArcSplit(
      partyId,
      splitNodeId,
      config,
      players
    );
    res.status(201).json({ message: "Arc split initialized", arcState });
  } catch (error) {
    console.error("Error initializing arc split:", error);
    res.status(500).json({ error: "Failed to initialize arc split" });
  }
});
router.get("/:partyId/player/:odId", async (req: Request, res: Response) => {
  try {
    const { partyId, odId } = req.params;
    if (!partyId || !odId) {
      res.status(400).json({ error: "partyId and odId are required" });
      return;
    }
    const arc = await arcService.getPlayerArc(partyId, odId);
    if (!arc) {
      res.status(404).json({ error: "Player not assigned to any arc" });
      return;
    }
    res.json({ arc });
  } catch (error) {
    console.error("Error fetching player arc:", error);
    res.status(500).json({ error: "Failed to fetch player arc" });
  }
});
router.get("/:partyId/solo/:odId", async (req: Request, res: Response) => {
  try {
    const { partyId, odId } = req.params;
    if (!partyId || !odId) {
      res.status(400).json({ error: "partyId and odId are required" });
      return;
    }
    const isSolo = await arcService.isPlayerInSoloArc(partyId, odId);
    res.json({ isSolo });
  } catch (error) {
    console.error("Error checking solo arc:", error);
    res.status(500).json({ error: "Failed to check solo arc" });
  }
});
router.patch("/:partyId/node", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }
    const { arcId, nodeId } = req.body;
    if (!arcId || !nodeId) {
      res.status(400).json({ error: "arcId and nodeId are required" });
      return;
    }
    await arcService.updateArcNode(partyId, arcId, nodeId);
    res.json({ message: "Arc node updated" });
  } catch (error) {
    console.error("Error updating arc node:", error);
    res.status(500).json({ error: "Failed to update arc node" });
  }
});
router.post("/:partyId/merge-ready", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }
    const { arcId } = req.body;
    if (!arcId) {
      res.status(400).json({ error: "arcId is required" });
      return;
    }
    await arcService.markArcAtMerge(partyId, arcId);
    res.json({ message: "Arc marked as at merge point" });
  } catch (error) {
    console.error("Error marking arc at merge:", error);
    res.status(500).json({ error: "Failed to mark arc at merge" });
  }
});
router.get("/:partyId/merge-status", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }
    const allReady = await arcService.areAllArcsAtMerge(partyId);
    const arcsNotReady = await arcService.getArcsNotAtMerge(partyId);
    res.json({ allReady, arcsNotReady });
  } catch (error) {
    console.error("Error checking merge status:", error);
    res.status(500).json({ error: "Failed to check merge status" });
  }
});
router.post("/:partyId/merge", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }
    const result = await arcService.mergeArcs(partyId);
    res.json({ message: "Arcs merged", arcState: result });
  } catch (error) {
    console.error("Error merging arcs:", error);
    res.status(500).json({ error: "Failed to merge arcs" });
  }
});
router.delete("/:partyId", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }
    await arcService.clearArcState(partyId);
    res.json({ message: "Arc state cleared" });
  } catch (error) {
    console.error("Error clearing arc state:", error);
    res.status(500).json({ error: "Failed to clear arc state" });
  }
});
export default router;
