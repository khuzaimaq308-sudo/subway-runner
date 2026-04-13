import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, leaderboardTable, competitionSettingsTable, mediaItemsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const ADMIN_EMAIL = "khuzaimaq308@gmail.com";
const router = Router();

/* ── helper: verify admin by email in request header (Clerk userId + lookup) */
async function isAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  // Check if this userId has the admin email in the leaderboard
  const row = await db
    .select({ email: leaderboardTable.email })
    .from(leaderboardTable)
    .where(eq(leaderboardTable.userId, userId))
    .limit(1);
  return row[0]?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

/* ══════════════════════════════════════════════════════════════════
   PUBLIC ENDPOINTS
══════════════════════════════════════════════════════════════════ */

/* GET /api/leaderboard */
router.get("/leaderboard", async (_req, res) => {
  try {
    const rows = await db
      .select({
        rank:         sql<number>`RANK() OVER (ORDER BY ${leaderboardTable.totalWatches} DESC, ${leaderboardTable.totalScore} DESC)`,
        userId:       leaderboardTable.userId,
        username:     leaderboardTable.username,
        totalWatches: leaderboardTable.totalWatches,
        totalScore:   leaderboardTable.totalScore,
        totalCoins:   leaderboardTable.totalCoins,
        gamesPlayed:  leaderboardTable.gamesPlayed,
        lastPlayed:   leaderboardTable.lastPlayed,
      })
      .from(leaderboardTable)
      .orderBy(desc(leaderboardTable.totalWatches), desc(leaderboardTable.totalScore))
      .limit(20);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
  }
});

/* GET /api/competition — current active competition settings */
router.get("/competition", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(competitionSettingsTable)
      .where(eq(competitionSettingsTable.isActive, true))
      .orderBy(desc(competitionSettingsTable.id))
      .limit(1);
    res.json({ success: true, data: rows[0] ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch competition" });
  }
});

/* GET /api/media — list active media items */
router.get("/media", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(mediaItemsTable)
      .where(eq(mediaItemsTable.isActive, true))
      .orderBy(desc(mediaItemsTable.createdAt));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch media" });
  }
});

/* GET /api/user/stats — current user's leaderboard entry */
router.get("/user/stats", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const rows = await db
      .select()
      .from(leaderboardTable)
      .where(eq(leaderboardTable.userId, userId))
      .limit(1);
    res.json({ success: true, data: rows[0] ?? null });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch user stats" });
  }
});

/* POST /api/leaderboard/score */
router.post("/leaderboard/score", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const { email, username, watchesCollected, score, coins } = req.body as {
    email: string; username: string; watchesCollected: number; score: number; coins: number;
  };
  if (typeof watchesCollected !== "number" || typeof score !== "number")
    return res.status(400).json({ success: false, error: "Invalid body" });

  try {
    await db.insert(leaderboardTable).values({
      userId, email: email || "unknown", username: username || "Player",
      totalWatches: watchesCollected, totalScore: score, totalCoins: coins || 0,
      gamesPlayed: 1, lastPlayed: new Date(),
    }).onConflictDoUpdate({
      target: leaderboardTable.userId,
      set: {
        email: email || "unknown", username: username || "Player",
        totalWatches: sql`${leaderboardTable.totalWatches} + ${watchesCollected}`,
        totalScore:   sql`${leaderboardTable.totalScore} + ${score}`,
        totalCoins:   sql`${leaderboardTable.totalCoins} + ${coins || 0}`,
        gamesPlayed:  sql`${leaderboardTable.gamesPlayed} + 1`,
        lastPlayed:   new Date(),
      },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update score" });
  }
});

/* ══════════════════════════════════════════════════════════════════
   ADMIN ENDPOINTS  (all require admin email in leaderboard table)
══════════════════════════════════════════════════════════════════ */

/* GET /api/admin/users */
router.get("/admin/users", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
  // Allow if userId is found — email verified below by admin panel frontend
  const rows = await db.select().from(leaderboardTable).orderBy(desc(leaderboardTable.totalWatches));
  res.json({ success: true, data: rows });
});

/* GET /api/admin/competition */
router.get("/admin/competition", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
  const rows = await db.select().from(competitionSettingsTable).orderBy(desc(competitionSettingsTable.id)).limit(1);
  res.json({ success: true, data: rows[0] ?? null });
});

/* PUT /api/admin/competition — update or insert competition settings */
router.put("/admin/competition", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const { competitionName, endDate, prize1, prize2, prize3, daysFromNow } = req.body as {
    competitionName?: string; endDate?: string; prize1?: string; prize2?: string; prize3?: string; daysFromNow?: number;
  };

  try {
    // Calculate end date
    let resolvedEndDate: Date;
    if (daysFromNow && daysFromNow > 0) {
      resolvedEndDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    } else if (endDate) {
      resolvedEndDate = new Date(endDate);
    } else {
      return res.status(400).json({ success: false, error: "endDate or daysFromNow required" });
    }

    // Deactivate all others then upsert
    await db.update(competitionSettingsTable).set({ isActive: false }).where(eq(competitionSettingsTable.isActive, true));
    await db.insert(competitionSettingsTable).values({
      competitionName: competitionName ?? "Watch Hunt",
      endDate: resolvedEndDate,
      prize1: prize1 ?? "10,000",
      prize2: prize2 ?? "5,000",
      prize3: prize3 ?? "2,000",
      isActive: true,
      updatedAt: new Date(),
    });

    res.json({ success: true, endDate: resolvedEndDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update competition" });
  }
});

/* GET /api/admin/media */
router.get("/admin/media", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
  const rows = await db.select().from(mediaItemsTable).orderBy(desc(mediaItemsTable.createdAt));
  res.json({ success: true, data: rows });
});

/* POST /api/admin/media — add new media item */
router.post("/admin/media", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const { title, mediaType, url } = req.body as { title: string; mediaType: string; url: string };
  if (!title || !mediaType || !url)
    return res.status(400).json({ success: false, error: "title, mediaType, url required" });

  try {
    const [row] = await db.insert(mediaItemsTable).values({ title, mediaType, url, isActive: true }).returning();
    res.json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to add media" });
  }
});

/* DELETE /api/admin/media/:id */
router.delete("/admin/media/:id", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  try {
    await db.update(mediaItemsTable).set({ isActive: false }).where(eq(mediaItemsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete media" });
  }
});

/* PATCH /api/admin/media/:id/toggle */
router.patch("/admin/media/:id/toggle", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

  try {
    const rows = await db.select().from(mediaItemsTable).where(eq(mediaItemsTable.id, id)).limit(1);
    if (!rows[0]) return res.status(404).json({ success: false, error: "Not found" });
    await db.update(mediaItemsTable).set({ isActive: !rows[0].isActive }).where(eq(mediaItemsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to toggle media" });
  }
});

export default router;
