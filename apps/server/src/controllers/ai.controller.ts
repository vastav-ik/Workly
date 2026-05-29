import { Router, Response } from "express";
import prisma from "../utils/prisma";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { findCachedResponse, cacheResponse } from "../utils/ai-cache";

const router = Router();

// ─── AI Academic Q&A ─────────────────────────────────────────────
router.post("/ask", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) { res.status(400).json({ error: "Question is required" }); return; }

    // Check semantic cache first
    const cached = await findCachedResponse(question);
    if (cached) {
      res.json({ answer: cached, source: "cache" });
      return;
    }

    // Try Gemini API if key is available
    const apiKey = process.env.GEMINI_API_KEY;
    let answer: string;

    if (apiKey) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(
          `You are an AI academic assistant for Indian college students. Answer concisely:\n\n${question}`
        );
        answer = result.response.text();
      } catch (e) {
        console.warn("Gemini API error, using fallback:", (e as Error).message);
        answer = generateFallbackAnswer(question);
      }
    } else {
      answer = generateFallbackAnswer(question);
    }

    // Cache the response
    await cacheResponse(question, answer);
    res.json({ answer, source: apiKey ? "gemini" : "fallback" });
  } catch (error) {
    console.error("AI ask error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Document AI Summary ─────────────────────────────────────
router.get("/summary/:documentId", async (req, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.documentId },
      select: { id: true, title: true, summary: true, subjectCode: true },
    });
    if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
    if (!doc.summary) { res.json({ ...doc, status: "processing" }); return; }
    res.json({ ...doc, status: "ready" });
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Matchmaking: Create Ticket ──────────────────────────────────
router.post("/matchmaking/tickets", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { projectTitle, description, requiredSkills, lookingFor } = req.body;
    const ticket = await prisma.matchmakingTicket.create({
      data: { userId, projectTitle, description, requiredSkills: requiredSkills || [], lookingFor },
      include: { user: { select: { id: true, name: true, skills: true, branch: true } } },
    });
    res.status(201).json(ticket);
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Matchmaking: Browse Tickets ─────────────────────────────────
router.get("/matchmaking/tickets", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const tickets = await prisma.matchmakingTicket.findMany({
      where: { status: "OPEN", userId: { not: userId } },
      include: { user: { select: { id: true, name: true, skills: true, branch: true, avatar: true, college: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(tickets);
  } catch (error) {
    console.error("Browse tickets error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Matchmaking: Skill Match ────────────────────────────────────
router.get("/matchmaking/match", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { skills: true } });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const tickets = await prisma.matchmakingTicket.findMany({
      where: { status: "OPEN", userId: { not: userId } },
      include: { user: { select: { id: true, name: true, skills: true, branch: true, avatar: true, college: { select: { name: true } } } } },
    });

    // Score by skill overlap
    const scored = tickets.map((t) => {
      const overlap = t.requiredSkills.filter((s) => user.skills.includes(s)).length;
      const score = t.requiredSkills.length > 0 ? overlap / t.requiredSkills.length : 0;
      return { ...t, matchScore: Math.round(score * 100) };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json(scored);
  } catch (error) {
    console.error("Match error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function generateFallbackAnswer(question: string): string {
  return `📚 **AI Academic Assistant**\n\nGreat question! Here's what I can share about "${question.substring(0, 50)}...":\n\n• This topic is commonly covered in undergraduate courses across Indian universities\n• Key concepts relate to foundational principles and their practical applications\n• For detailed answers, consider consulting your course textbook or NPTEL lectures\n• Connect with peers in your campus Space channels for collaborative learning\n\n_Note: Connect a Gemini API key for more detailed, personalised answers._`;
}

export default router;
