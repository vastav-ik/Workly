import { Router, Response } from "express";
import prisma from "../utils/prisma";
import { AuthenticatedRequest, authMiddleware } from "../middleware/auth.middleware";

const router = Router();

const SERVICE_CHARGE_RATE = 0.10;

router.post("/premium/toggle", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isPremium: !user.isPremium },
    });

    res.json({
      message: updated.isPremium ? "Premium activated! 🎉" : "Premium deactivated.",
      isPremium: updated.isPremium,
    });
  } catch (error) {
    console.error("Premium toggle error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/wallet/add", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: "Valid positive amount required" }); return; }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
    });

    res.json({ walletBalance: user.walletBalance, message: `₹${amount} added to wallet` });
  } catch (error) {
    console.error("Wallet add error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/wallet", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { walletBalance: true, isPremium: true } });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (error) {
    console.error("Wallet fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Notes marketplace purchase with 10% platform service charge
router.post("/notes/purchase", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const buyerId = req.userId!;
    const { documentId, price } = req.body;

    if (!documentId || !price || price <= 0) {
      res.status(400).json({ error: "documentId and positive price required" });
      return;
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { user: true } });
    if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

    const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }
    if (buyer.walletBalance < price) { res.status(402).json({ error: "Insufficient wallet balance" }); return; }
    if (doc.userId === buyerId) { res.status(400).json({ error: "Cannot purchase your own document" }); return; }

    const serviceCharge = Math.round(price * SERVICE_CHARGE_RATE * 100) / 100;
    const sellerCredit = price - serviceCharge;

    await prisma.$transaction([
      prisma.user.update({ where: { id: buyerId }, data: { walletBalance: { decrement: price } } }),
      prisma.user.update({ where: { id: doc.userId }, data: { walletBalance: { increment: sellerCredit } } }),
    ]);

    res.json({
      message: "Purchase successful",
      transaction: {
        documentId,
        documentTitle: doc.title,
        buyerCharged: price,
        sellerCredited: sellerCredit,
        platformFee: serviceCharge,
        feeRate: `${SERVICE_CHARGE_RATE * 100}%`,
      },
    });
  } catch (error) {
    console.error("Notes purchase error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Localized ad-banner targeting based on college demographics
router.get("/ads/targeted", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { college: true },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.isPremium) { res.json({ ads: [], message: "Premium users see no ads" }); return; }

    const localStudentCount = await prisma.user.count({ where: { collegeId: user.collegeId } });

    const ads = [
      {
        id: "ad_internship_local",
        type: "banner",
        title: `Internships near ${user.college.location}`,
        description: `Top companies hiring ${user.branch} students from ${user.college.state || user.college.location}`,
        targetSegment: { state: user.college.state, branch: user.branch, semester: user.semester },
        campusReach: localStudentCount,
      },
      {
        id: "ad_course_branch",
        type: "banner",
        title: `Master ${user.branch} with NPTEL`,
        description: `Free certified courses for Semester ${user.semester} students`,
        targetSegment: { branch: user.branch, semester: user.semester },
      },
      {
        id: "ad_premium_upsell",
        type: "inline",
        title: "Go Premium — No Ads + Priority Matching",
        description: "₹99/month for an ad-free experience and priority hackathon matching",
        targetSegment: { isPremium: false },
      },
    ];

    res.json({ ads });
  } catch (error) {
    console.error("Ad targeting error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
