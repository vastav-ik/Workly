import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { upload, compressAndSave } from "../middleware/upload.middleware";
import { moderateText } from "../utils/moderation";
import { sanitizeInput } from "../middleware/security.middleware";

const router = Router();

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

      const mediaUrls = (req as any).savedFilePaths || [];
      const parsedTags = tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [];

      const post = await prisma.post.create({
        data: {
          userId,
          content: sanitizeInput(content),
          mediaUrls,
          tags: parsedTags,
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

    const where = collegeId
      ? { user: { collegeId: collegeId as string } }
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

    res.json({
      posts,
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
