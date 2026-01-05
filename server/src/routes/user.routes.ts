import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as progressService from "../services/progress.service";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * GET /user/me
 * Returns the current user's profile, role, and story progress.
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const progress = await progressService.getAllProgressForUser(user.id);

    res.json({
      user: {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      progress,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
