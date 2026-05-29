import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { initSocket } from "./utils/socket";

// Controllers
import authRouter from "./controllers/auth.controller";
import feedRouter from "./controllers/feed.controller";
import chatRouter from "./controllers/chat.controller";
import marketRouter from "./controllers/market.controller";
import aiRouter from "./controllers/ai.controller";
import billingRouter from "./controllers/billing.controller";
import collegeRouter from "./controllers/college.controller";

const app = express();
const server = http.createServer(app);

import { rateLimiter } from "./middleware/security.middleware";

// ─── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter(60, 60000)); // 60 requests per minute per IP

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Routes ─────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/feed", feedRouter);
app.use("/api/chat", chatRouter);
app.use("/api/market", marketRouter);
app.use("/api/ai", aiRouter);
app.use("/api/billing", billingRouter);
app.use("/api/colleges", collegeRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "CampusConnect API",
    timestamp: new Date().toISOString(),
  });
});

// ─── Start ──────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "5000", 10);

async function bootstrap() {
  // Initialise Socket.io with optional Redis adapter
  await initSocket(server);
  console.log("🔌 Socket.io initialised");

  server.listen(PORT, () => {
    console.log(`\n🚀 CampusConnect server running on http://localhost:${PORT}`);
    console.log(`📡 API base: http://localhost:${PORT}/api`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
