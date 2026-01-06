import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import * as progressService from "../services/progress.service";
import * as userService from "../services/user.service";

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
    const userWithRank = await userService.getUserWithRank(user.id);

    if (!userWithRank) {
         res.status(404).json({ error: "User not found" });
         return;
    }

    const progress = await progressService.getAllProgressForUser(user.id);

    res.json({
      user: {
        id: userWithRank.id,
        discordId: userWithRank.discordId,
        username: userWithRank.username,
        role: userWithRank.role,
        stats: userWithRank.stats,
        xp: userWithRank.xp,
        level: userWithRank.level,
        serverRank: userWithRank.serverRank,
        lastActive: userWithRank.lastActive,
        createdAt: userWithRank.createdAt,
      },
      progress,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
