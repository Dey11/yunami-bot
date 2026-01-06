import { Router, type Request, type Response } from "express";
import * as userService from "../services/user.service";
const router = Router();
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { discordId, username } = req.body;
    if (!discordId || !username) {
      res.status(400).json({ error: "discordId and username are required" });
      return;
    }
    const existing = await userService.getUserByDiscordId(discordId);
    if (existing) {
      res.status(409).json({ error: "User already exists", user: existing });
      return;
    }
    const user = await userService.createUser({ discordId, username });
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});
export default router;
