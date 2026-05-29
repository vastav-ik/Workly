import { Router, Response } from "express";
import prisma from "../utils/prisma";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { upload, compressAndSave } from "../middleware/upload.middleware";
import { enqueueDocumentProcessing } from "../utils/ocr-worker";
import { sanitizeInput } from "../middleware/security.middleware";

const router = Router();

// ─── Upload Document ─────────────────────────────────────────────
router.post(
  "/documents",
  authMiddleware,
  upload.single("file"),
  compressAndSave,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const { title, description, subjectCode, semester, branch } = req.body;
      const savedPaths = (req as any).savedFilePaths as string[];

      if (!savedPaths || savedPaths.length === 0) {
        res.status(400).json({ error: "File is required" });
        return;
      }

      const doc = await prisma.document.create({
        data: {
          userId,
          title: sanitizeInput(title),
          description: description ? sanitizeInput(description) : "",
          fileUrl: savedPaths[0],
          subjectCode,
          semester: parseInt(semester),
          branch,
        },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });

      // Queue async AI summary generation
      enqueueDocumentProcessing(doc.id);

      res.status(202).json({
        message: "Document uploaded! AI summary is being generated.",
        document: doc,
      });
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Browse Documents (with college/branch/semester filter) ──────
router.get("/documents", async (req, res: Response) => {
  try {
    const { branch, semester, subjectCode, page = "1", limit = "20" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (branch) where.branch = branch as string;
    if (semester) where.semester = parseInt(semester as string);
    if (subjectCode) where.subjectCode = { contains: subjectCode as string, mode: "insensitive" };

    const docs = await prisma.document.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true, college: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    });

    const total = await prisma.document.count({ where });

    res.json({
      documents: docs,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, totalPages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (error) {
    console.error("Browse documents error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Upvote Document ─────────────────────────────────────────────
router.post("/documents/:id/upvote", authMiddleware, async (req, res: Response) => {
  try {
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { upvotes: { increment: 1 } },
    });
    res.json({ upvotes: doc.upvotes });
  } catch (error) {
    console.error("Upvote error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Flag Document ───────────────────────────────────────────────
router.post("/documents/:id/flag", authMiddleware, async (req, res: Response) => {
  try {
    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { flags: { increment: 1 } },
    });
    res.json({ flags: doc.flags });
  } catch (error) {
    console.error("Flag error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Colleges List ───────────────────────────────────────────
router.get("/colleges", async (_req, res: Response) => {
  try {
    const colleges = await prisma.college.findMany({ orderBy: { name: "asc" } });
    res.json(colleges);
  } catch (error) {
    console.error("Get colleges error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
