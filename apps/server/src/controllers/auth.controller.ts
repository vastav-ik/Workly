import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../utils/prisma";
import { AuthenticatedRequest, authMiddleware, generateToken } from "../middleware/auth.middleware";
import { upload, compressAndSave } from "../middleware/upload.middleware";
import { enqueueOcrJob, dropUserSockets } from "../utils/ocr-worker";

const router = Router();

// ─── Validation Schemas ──────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  collegeId: z.string().uuid(),
  stream: z.string(),
  branch: z.string(),
  semester: z.number().int().min(1).max(10),
  skills: z.array(z.string()).optional(),
  bio: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ─── Register ────────────────────────────────────────────────────
router.post("/register", async (req, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    // Verify college exists
    const college = await prisma.college.findUnique({ where: { id: data.collegeId } });
    if (!college) {
      res.status(404).json({ error: "College not found" });
      return;
    }

    // Domain-based auto-verification
    const emailDomain = data.email.split("@")[1];
    const isDomainVerified = emailDomain === college.domain;

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        collegeId: data.collegeId,
        stream: data.stream,
        branch: data.branch,
        semester: data.semester,
        skills: data.skills || [],
        passwordHash: hashedPassword,
        verified: isDomainVerified,
        verificationType: isDomainVerified ? "DOMAIN" : "NONE",
        portfolioLinks: [],
      },
    });

    // Create default consent records
    const consentTypes = ["PROFILE_SHARING", "MARKETING", "GEOLOCATION", "CHAT"];
    await prisma.consentRecord.createMany({
      data: consentTypes.map((ct) => ({
        userId: user.id,
        consentType: ct,
        granted: ct === "PROFILE_SHARING" || ct === "CHAT", // Default consents
      })),
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: isDomainVerified
        ? "Registered and verified via college domain!"
        : "Registered! Please verify via ID card upload.",
      user: { id: user.id, name: user.name, email: user.email, verified: user.verified },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Login ───────────────────────────────────────────────────────
router.post("/login", async (req, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { college: true },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        college: user.college.name,
        branch: user.branch,
        semester: user.semester,
        isPremium: user.isPremium,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Upload ID Card for Verification ─────────────────────────────
router.post(
  "/verify-id",
  authMiddleware,
  upload.single("idCard"),
  compressAndSave,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const savedPaths = (req as any).savedFilePaths as string[];

      if (!savedPaths || savedPaths.length === 0) {
        res.status(400).json({ error: "No ID card image uploaded" });
        return;
      }

      const imageUrl = savedPaths[0];

      // Store ID card URL
      await prisma.user.update({
        where: { id: userId },
        data: { idCardUrl: imageUrl },
      });

      // Queue OCR verification job (returns immediately)
      enqueueOcrJob(userId, imageUrl);

      res.status(202).json({
        message: "ID card uploaded! Verification in progress — you'll be notified via the app.",
        imageUrl,
      });
    } catch (error) {
      console.error("ID verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Simulated OTP Send ──────────────────────────────────────────
router.post("/send-otp", async (req, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: "Phone number required" });
      return;
    }

    // In production: call Twilio / Msg91 API
    // For dev: always use OTP "123456"
    console.log(`📱 OTP sent to ${phone}: 123456`);

    res.json({ message: "OTP sent successfully", hint: "Dev OTP is 123456" });
  } catch (error) {
    console.error("OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Verify OTP ──────────────────────────────────────────────────
router.post("/verify-otp", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { otp } = req.body;
    const userId = req.userId!;

    // Dev mode: accept "123456"
    if (otp === "123456") {
      await prisma.user.update({
        where: { id: userId },
        data: { verified: true, verificationType: "DOMAIN" },
      });
      res.json({ message: "Phone verified successfully!" });
    } else {
      res.status(400).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.error("OTP verify error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Current User Profile ────────────────────────────────────
router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: { college: true, consents: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      verified: user.verified,
      verificationType: user.verificationType,
      college: user.college,
      stream: user.stream,
      branch: user.branch,
      semester: user.semester,
      skills: user.skills,
      avatar: user.avatar,
      portfolioLinks: user.portfolioLinks,
      walletBalance: user.walletBalance,
      isPremium: user.isPremium,
      consents: user.consents,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DPDP: Update Consents ───────────────────────────────────────
router.put("/consents", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { consents } = req.body as {
      consents: { consentType: string; granted: boolean }[];
    };
    const userId = req.userId!;

    for (const c of consents) {
      await prisma.consentRecord.updateMany({
        where: { userId, consentType: c.consentType },
        data: { granted: c.granted, timestamp: new Date() },
      });
    }

    res.json({ message: "Consents updated successfully" });
  } catch (error) {
    console.error("Consent update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/account", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    await dropUserSockets(userId);

    await prisma.$transaction(async (tx) => {
      await tx.post.updateMany({
        where: { userId },
        data: { content: "[Deleted by user under DPDP Act]" },
      });

      await tx.comment.updateMany({
        where: { userId },
        data: { content: "[Removed — Anonymous Student]" },
      });

      await tx.chatMessage.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });

      await tx.document.deleteMany({ where: { userId } });
      await tx.matchmakingTicket.deleteMany({ where: { userId } });
      await tx.consentRecord.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          name: "Anonymous Student",
          email: `erased_${userId.slice(0, 8)}@deleted.campusconnect`,
          phone: null,
          passwordHash: "",
          bio: null,
          avatar: null,
          skills: [],
          portfolioLinks: [],
          idCardUrl: null,
          verified: false,
          walletBalance: 0,
        },
      });
    });

    res.json({ message: "Account scrubbed and anonymized per DPDP Act. All PII erased." });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DPDP: Download Personal Data ───────────────────────────────
router.get("/data-export", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: true,
        comments: true,
        documents: true,
        tickets: true,
        sentMessages: true,
        receivedMessages: true,
        consents: true,
        college: true,
      },
    });

    if (!userData) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      message: "Personal data export (DPDP compliance)",
      data: userData,
    });
  } catch (error) {
    console.error("Data export error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
