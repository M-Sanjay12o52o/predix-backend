import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import authRoutes from "./routes/auth.mjs";
import profileRoutes from "./routes/profile.mjs";
import { verifyToken } from "./middleware/auth.mjs";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();
const saltrounds = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const corsOptions = {
  origin: "http://localhost:8080",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from the backend!");
});

// POST /api/auth/signup
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;
  console.log("hello from backend");
  console.log("username: ", username, "email: ", email, "password: ", password);

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide name, email and password." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, saltrounds);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({ message: "User created successfully.", token });
  } catch (error) {
    console.error("Error during signup: ", error);
    res.status(500).json({ message: "Could not create user." });
  }
});

// POST /api/auth/signin
app.post("/api/auth/signin", async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide email and password." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const expiresIn = rememberMe ? "30d" : "1h";
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn,
    });

    res.status(200).json({
      message: "Sign in successful.",
      token,
      expiresIn,
    });
  } catch (error) {
    console.error("Error during signin:", error);
    res.status(500).json({ message: "counld not sign in." });
  }
});

// example for protected route
app.get("/api/protected", verifyToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

async function main() {}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
