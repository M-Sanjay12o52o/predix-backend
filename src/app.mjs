import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import marketRoutes from "./routes/market.mjs";
import tradeRoutes from "./routes/trade.mjs";
import portfolioRoutes from "./routes/portfolio.mjs";
import categoryRoutes from "./routes/category.mjs";
import commentRoutes from "./routes/comment.mjs";
import { wsManager } from "./websocket/index.mjs";
import authRoutes from "./routes/auth.mjs";
import userRoutes from "./routes/user.mjs";
import reputationRoutes from "./routes/reputation.mjs";
import resolutionRoutes from "./routes/resolution.mjs";
import analyticsRoutes from "./routes/analytics.mjs";
import notificationRoutes from "./routes/notification.mjs";
import discoveryRoutes from "./routes/discovery.mjs";
import socialRoutes from "./routes/social.mjs";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = createServer(app);

// Initialize WebSocket server
wsManager.initialize(server);

// CORS configuration
const corsOptions = {
  origin: "http://localhost:8080",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Basic JWT authentication middleware (optional for all routes, but useful for context)
// If you have a dedicated `protect` middleware, you might not need this here for all routes
app.use((req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach user information to the request object
    } catch (error) {
      console.error("JWT verification failed:", error.message);
      // Optionally clear invalid token cookie
      res.clearCookie("token");
    }
  }
  next();
});

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/markets", marketRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/reputation", reputationRoutes);
app.use("/api/resolution", resolutionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/social", socialRoutes);

// Basic error handling (add more sophisticated handling as needed)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

export { app, server };

