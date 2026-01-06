import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
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
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
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
