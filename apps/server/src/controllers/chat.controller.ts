import { Router, Response } from "express";
import prisma from "../utils/prisma";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";
import { moderateText } from "../utils/moderation";
import { sanitizeInput } from "../middleware/security.middleware";

const router = Router();

router.get("/conversations", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const sent = await prisma.chatMessage.findMany({ where: { senderId: userId }, select: { receiverId: true }, distinct: ["receiverId"] });
    const recv = await prisma.chatMessage.findMany({ where: { receiverId: userId }, select: { senderId: true }, distinct: ["senderId"] });
    const ids = new Set<string>();
    sent.forEach(m => ids.add(m.receiverId));
    recv.forEach(m => ids.add(m.senderId));
    const convos = [];
    for (const pid of ids) {
      const last = await prisma.chatMessage.findFirst({ where: { OR: [{ senderId: userId, receiverId: pid }, { senderId: pid, receiverId: userId }] }, orderBy: { createdAt: "desc" } });
      const partner = await prisma.user.findUnique({ where: { id: pid }, select: { id: true, name: true, avatar: true, branch: true } });
      if (partner && last) convos.push({ partner, lastMessage: { content: last.content, createdAt: last.createdAt, fromMe: last.senderId === userId } });
    }
    convos.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
    res.json(convos);
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/messages/:partnerId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { partnerId } = req.params;
    const { page = "1", limit = "50" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const msgs = await prisma.chatMessage.findMany({
      where: { OR: [{ senderId: userId, receiverId: partnerId }, { senderId: partnerId, receiverId: userId }] },
      orderBy: { createdAt: "desc" }, skip, take: parseInt(limit as string),
      include: { sender: { select: { id: true, name: true, avatar: true } }, receiver: { select: { id: true, name: true, avatar: true } } },
    });
    res.json(msgs.reverse());
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/messages", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { receiverId, content, mediaUrl } = req.body;
    if (!receiverId || !content) { res.status(400).json({ error: "receiverId and content required" }); return; }
    const mod = moderateText(content);
    if (mod.flagged) { res.status(400).json({ error: "Inappropriate language", flaggedWords: mod.matchedWords }); return; }
    const msg = await prisma.chatMessage.create({ data: { senderId: userId, receiverId, content: sanitizeInput(content), mediaUrl }, include: { sender: { select: { id: true, name: true, avatar: true } }, receiver: { select: { id: true, name: true, avatar: true } } } });
    res.status(201).json(msg);
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/search-users", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || (q as string).length < 2) { res.status(400).json({ error: "Query min 2 chars" }); return; }
    const users = await prisma.user.findMany({
      where: { AND: [{ id: { not: req.userId! } }, { OR: [{ name: { contains: q as string, mode: "insensitive" } }, { email: { contains: q as string, mode: "insensitive" } }] }] },
      select: { id: true, name: true, avatar: true, branch: true, college: { select: { name: true } } }, take: 10,
    });
    res.json(users);
  } catch (e) { console.error(e); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
