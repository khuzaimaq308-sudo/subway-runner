import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, leaderboardTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

/* ── GET /api/leaderboard — top 20 players by total watches ── */
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

/* ── POST /api/leaderboard/score — upsert player stats after a game ── */
router.post("/leaderboard/score", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const { email, username, watchesCollected, score, coins } = req.body as {
    email: string;
    username: string;
    watchesCollected: number;
    score: number;
    coins: number;
  };

  if (typeof watchesCollected !== "number" || typeof score !== "number") {
    return res.status(400).json({ success: false, error: "Invalid body" });
  }

  try {
    await db
      .insert(leaderboardTable)
      .values({
        userId,
        email:        email || "unknown",
        username:     username || "Player",
        totalWatches: watchesCollected,
        totalScore:   score,
        totalCoins:   coins || 0,
        gamesPlayed:  1,
        lastPlayed:   new Date(),
      })
      .onConflictDoUpdate({
        target: leaderboardTable.userId,
        set: {
          email:        email || "unknown",
          username:     username || "Player",
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

/* ── GET /api/admin/users — admin only: full user list ── */
router.get("/admin/users", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

  const rows = await db
    .select()
    .from(leaderboardTable)
    .orderBy(desc(leaderboardTable.totalWatches));

  res.json({ success: true, data: rows });
});

export default router;
