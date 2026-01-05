import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

/**
 * Extracts discordId from `x-discord-id` header and attaches user to request.
 * If user is not found, responds with 401.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const discordId = req.headers["x-discord-id"] as string | undefined;

  if (!discordId) {
    res.status(401).json({ error: "Missing x-discord-id header" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found. Please register first." });
      return;
    }

    // Attach user to request for downstream handlers
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Optional auth: attaches user if present, but doesn't block if not.
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const discordId = req.headers["x-discord-id"] as string | undefined;

  if (discordId) {
    try {
      const user = await prisma.user.findUnique({
        where: { discordId },
      });
      if (user) {
        (req as any).user = user;
      }
    } catch (error) {
      console.error("Optional auth middleware error:", error);
    }
  }

  next();
}
