import { Router, Response } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { upload, compressAndSave } from "../middleware/upload.middleware";
import { moderateText } from "../utils/moderation";
import { sanitizeInput } from "../middleware/security.middleware";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "campusconnect_secret_token_123!";

const MOCK_ADS = [
  {
    id: "ad-hostel-1",
    title: "Saraswati PG & Hostels",
    description: "Affordable luxury hostels for out-of-station students. Near key college campuses, high-speed Wi-Fi, 3 meals/day.",
    imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://example.com/hostels",
    target: { semester: [1, 2], branch: [] }, // 1st year targeting
  },
  {
    id: "ad-internship-1",
    title: "Directi Software Engineering Summer Internships",
    description: "Join high-performance teams at Directi. Looking for 3rd-year CS/IT engineering students for backend & mobile engineering.",
    imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://careers.directi.com",
    target: { semester: [5, 6], branch: ["CSE", "ECE"] }, // 3rd year engineering targeting
  },
  {
    id: "ad-gate-coaching-1",
    title: "MADE EASY GATE 2027 Course",
    description: "Comprehensive study material, weekly testing & doubt clearing for final year students. Flat 20% early bird off.",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://example.com/madeeasy",
    target: { semester: [7, 8], branch: ["ME", "EE", "CE", "CSE", "ECE"] }, // 4th year targeting
  },
  {
    id: "ad-general-1",
    title: "CampusConnect Premium Study Notes",
    description: "Get curated subject notes, previous year papers, and study templates from top rankers. Buy now!",
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://example.com/notes",
    target: { semester: [], branch: [] }, // general targeting
  },
];

// ─── Create Post ─────────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  upload.array("media", 5),
  compressAndSave,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content, tags } = req.body;
      const userId = req.userId!;

      if (!content || content.trim().length === 0) {
        res.status(400).json({ error: "Post content is required" });
        return;
      }

      // Run moderation check
      const modResult = moderateText(content);
      if (modResult.flagged) {
        res.status(400).json({
          error: "Content contains inappropriate language",
          flaggedWords: modResult.matchedWords,
        });
        return;
      }

      // Extract hashtags from content dynamically
      const hashtagRegex = /#(\w+)/g;
      const contentHashtags: string[] = [];
      let match;
      while ((match = hashtagRegex.exec(content)) !== null) {
        contentHashtags.push(match[1].toLowerCase());
      }

      const mediaUrls = (req as any).savedFilePaths && (req as any).savedFilePaths.length > 0
        ? (req as any).savedFilePaths
        : (req.body.mediaUrls || req.body.media || []);
      const parsedTags = tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [];
      const combinedTags = Array.from(new Set([...parsedTags, ...contentHashtags]));

      const post = await prisma.post.create({
        data: {
          userId,
          content: sanitizeInput(content),
          mediaUrls,
          tags: combinedTags,
        },
        include: {
          user: { select: { id: true, name: true, avatar: true, branch: true } },
          comments: true,
        },
      });

      res.status(201).json(post);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Get Feed (Global + Campus) ──────────────────────────────────
router.get("/", async (req, res: Response) => {
  try {
    const { collegeId, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // 1. Optional Auth check to resolve user profile dimensions for ad targeting
    let userProfile = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userProfile = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { semester: true, branch: true, collegeId: true },
        });
      } catch {
        // Ignore invalid token
      }
    }

    // 2. Campus Scoping: restrict lookup to verified peers attending same college
    // Utilizing User index @@index([collegeId, branch, semester])
    const where = collegeId
      ? { user: { collegeId: collegeId as string, verified: true } }
      : {};

    const posts = await prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true, branch: true, college: { select: { name: true } } } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "asc" },
          take: 3,
        },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    });

    const total = await prisma.post.count({ where });

    // 3. Demographic Ad Filtering
    let targetedAds = MOCK_ADS.filter((ad) => {
      // General ads are served to everyone
      if (ad.target.semester.length === 0 && ad.target.branch.length === 0) return true;
      if (!userProfile) return false;

      // Filter by semester if specified
      if (ad.target.semester.length > 0 && !ad.target.semester.includes(userProfile.semester)) {
        return false;
      }
      // Filter by branch if specified
      if (ad.target.branch.length > 0 && !ad.target.branch.includes(userProfile.branch)) {
        return false;
      }
      return true;
    });

    // Fallback to general ads if no targeted ads are found
    if (targetedAds.length === 0) {
      targetedAds = MOCK_ADS.filter((ad) => ad.target.semester.length === 0 && ad.target.branch.length === 0);
    }

    res.json({
      posts,
      ads: targetedAds,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Get feed error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Single Post ─────────────────────────────────────────────
router.get("/:id", async (req, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatar: true, branch: true, college: { select: { name: true } } } },
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json(post);
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Like / Unlike Post ──────────────────────────────────────────
router.post("/:id/like", authMiddleware, async (req, res: Response) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: { likesCount: { increment: 1 } },
    });
    res.json({ likesCount: post.likesCount });
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Add Comment ─────────────────────────────────────────────────
router.post("/:id/comments", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;
    const userId = req.userId!;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: "Comment content is required" });
      return;
    }

    // Moderation check
    const modResult = moderateText(content);
    if (modResult.flagged) {
      res.status(400).json({
        error: "Comment contains inappropriate language",
        flaggedWords: modResult.matchedWords,
      });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        postId: req.params.id,
        userId,
        content: sanitizeInput(content),
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Delete Post (Owner only) ────────────────────────────────────
router.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    if (post.userId !== req.userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Spaces for a College ────────────────────────────────────
router.get("/spaces/:collegeId", async (req, res: Response) => {
  try {
    const spaces = await prisma.space.findMany({
      where: { collegeId: req.params.collegeId },
      orderBy: { category: "asc" },
    });
    res.json(spaces);
  } catch (error) {
    console.error("Get spaces error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
