import express, { type Request, type Response } from "express";
import {
  authRoutes,
  userRoutes,
  partyRoutes,
  prologueRoutes,
  storyRoutes,
  storiesRoutes,
  minigameRoutes,
  sessionRoutes,
  arcRoutes,
} from "./routes";
import { errorHandler } from "./middleware/error";
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/party", partyRoutes);
app.use("/prologue", prologueRoutes);
app.use("/story", storyRoutes);
app.use("/stories", storiesRoutes);
app.use("/minigame", minigameRoutes);
app.use("/session", sessionRoutes);
app.use("/arc", arcRoutes);
app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`🚀 Yunami server running on http://localhost:${PORT}`);
});
export default app;
