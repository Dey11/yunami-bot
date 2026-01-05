import express, { type Request, type Response } from "express";
import {
  authRoutes,
  userRoutes,
  partyRoutes,
  prologueRoutes,
  storyRoutes,
} from "./routes";
import { errorHandler } from "./middleware/error";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/party", partyRoutes);
app.use("/prologue", prologueRoutes);
app.use("/story", storyRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Yunami server running on http://localhost:${PORT}`);
});

export default app;
