import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as partyService from "../services/party.service";

const router = Router();

// All party routes require authentication
router.use(authMiddleware);

/**
 * POST /party/create
 * Creates a new party with the current user as leader.
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check if user is already in a party
    const existingParty = await partyService.getPartyForUser(user.id);
    if (existingParty) {
      res.status(400).json({
        error: "You are already in a party. Leave first.",
        party: existingParty,
      });
      return;
    }

    const party = await partyService.createParty({ leaderId: user.id });
    res.status(201).json({ message: "Party created", party });
  } catch (error) {
    console.error("Error creating party:", error);
    res.status(500).json({ error: "Failed to create party" });
  }
});

/**
 * GET /party/:partyId
 * Get party details by ID.
 */
router.get("/:partyId", async (req: Request, res: Response) => {
  try {
    const { partyId } = req.params;
    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }
    const party = await partyService.getPartyById(partyId);

    if (!party) {
      res.status(404).json({ error: "Party not found" });
      return;
    }

    res.json({ party });
  } catch (error) {
    console.error("Error fetching party:", error);
    res.status(500).json({ error: "Failed to fetch party" });
  }
});

/**
 * POST /party/join
 * Join a party using invite code.
 * Body: { code: string }
 */
router.post("/join", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: "Invite code is required" });
      return;
    }

    // Check if user is already in a party
    const existingParty = await partyService.getPartyForUser(user.id);
    if (existingParty) {
      res.status(400).json({
        error: "You are already in a party. Leave first.",
        party: existingParty,
      });
      return;
    }

    const party = await partyService.getPartyByCode(code.toUpperCase());
    if (!party) {
      res.status(404).json({ error: "Invalid invite code" });
      return;
    }

    if (party.status !== "forming") {
      res.status(400).json({ error: "Party is no longer accepting members" });
      return;
    }

    if ((party as any).members.length >= 4) {
      res.status(400).json({ error: "Party is full (max 4 members)" });
      return;
    }

    const membership = await partyService.joinParty(party.id, user.id);
    const updatedParty = await partyService.getPartyById(party.id);

    res.json({ message: "Joined party", party: updatedParty });
  } catch (error) {
    console.error("Error joining party:", error);
    res.status(500).json({ error: "Failed to join party" });
  }
});

/**
 * POST /party/:partyId/ready
 * Toggle ready status.
 * Body: { isReady: boolean }
 */
router.post("/:partyId/ready", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { partyId } = req.params;
    const { isReady } = req.body;

    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }

    if (typeof isReady !== "boolean") {
      res.status(400).json({ error: "isReady must be a boolean" });
      return;
    }

    await partyService.setReady(partyId, user.id, isReady);
    const party = await partyService.getPartyById(partyId);

    res.json({ message: "Ready status updated", party });
  } catch (error) {
    console.error("Error setting ready:", error);
    res.status(500).json({ error: "Failed to update ready status" });
  }
});

/**
 * DELETE /party/:partyId/leave
 * Leave the current party.
 */
router.delete("/:partyId/leave", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { partyId } = req.params;

    if (!partyId) {
      res.status(400).json({ error: "partyId is required" });
      return;
    }

    const party = await partyService.getPartyById(partyId);
    if (!party) {
      res.status(404).json({ error: "Party not found" });
      return;
    }

    // If leader leaves, delete the party
    if (party.leaderId === user.id) {
      await partyService.deleteParty(partyId);
      res.json({ message: "Party disbanded (leader left)" });
      return;
    }

    await partyService.leaveParty(partyId, user.id);
    res.json({ message: "Left party successfully" });
  } catch (error) {
    console.error("Error leaving party:", error);
    res.status(500).json({ error: "Failed to leave party" });
  }
});

/**
 * GET /party/by-code/:code
 * Get party by invite code (for preview before joining).
 */
router.get("/by-code/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }
    const party = await partyService.getPartyByCode(code.toUpperCase());

    if (!party) {
      res.status(404).json({ error: "Party not found" });
      return;
    }

    res.json({ party });
  } catch (error) {
    console.error("Error fetching party by code:", error);
    res.status(500).json({ error: "Failed to fetch party" });
  }
});

export default router;
