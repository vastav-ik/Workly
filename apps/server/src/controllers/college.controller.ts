import { Router, Response } from "express";
import prisma from "../utils/prisma";

const router = Router();

router.get("/search", async (req, res: Response) => {
  try {
    const { q, state, managementType, limit = "15" } = req.query;

    if (!q || (q as string).trim().length < 2) {
      res.status(400).json({ error: "Search query must be at least 2 characters" });
      return;
    }

    const searchTerm = (q as string).trim();
    const resultLimit = Math.min(parseInt(limit as string) || 15, 50);

    const whereClause = state || managementType
      ? `AND ${state ? `state = '${(state as string).replace(/'/g, "''")}'` : "TRUE"} AND ${managementType ? `"managementType" = '${(managementType as string).replace(/'/g, "''")}'` : "TRUE"}`
      : "";

    const colleges = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, location, domain, "aisheCode", state, district, "managementType",
              similarity(name, $1) AS rank
       FROM "College"
       WHERE similarity(name, $1) > 0.1 OR name ILIKE $2
       ${whereClause}
       ORDER BY rank DESC, name ASC
       LIMIT $3`,
      searchTerm,
      `%${searchTerm}%`,
      resultLimit
    );

    res.json(colleges);
  } catch (error: any) {
    if (error.message?.includes("similarity")) {
      const { q, limit = "15" } = req.query;
      const fallback = await prisma.college.findMany({
        where: { name: { contains: q as string, mode: "insensitive" } },
        select: { id: true, name: true, location: true, domain: true, aisheCode: true, state: true, district: true, managementType: true },
        take: parseInt(limit as string),
        orderBy: { name: "asc" },
      });
      res.json(fallback);
      return;
    }
    console.error("College search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/states", async (_req, res: Response) => {
  try {
    const states = await prisma.college.findMany({
      where: { state: { not: null } },
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    });
    res.json(states.map((s) => s.state).filter(Boolean));
  } catch (error) {
    console.error("Get states error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res: Response) => {
  try {
    const college = await prisma.college.findUnique({
      where: { id: req.params.id },
      include: { spaces: true, _count: { select: { users: true } } },
    });
    if (!college) { res.status(404).json({ error: "College not found" }); return; }
    res.json(college);
  } catch (error) {
    console.error("Get college error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
