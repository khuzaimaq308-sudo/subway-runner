import { pgTable, serial, text, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderboardTable = pgTable("leaderboard", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull().unique(),
  email:        text("email").notNull(),
  username:     text("username").notNull(),
  totalWatches: integer("total_watches").notNull().default(0),
  totalScore:   bigint("total_score", { mode: "number" }).notNull().default(0),
  totalCoins:   integer("total_coins").notNull().default(0),
  gamesPlayed:  integer("games_played").notNull().default(0),
  lastPlayed:   timestamp("last_played").defaultNow(),
  createdAt:    timestamp("created_at").defaultNow(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({ id: true, createdAt: true });
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardEntry = typeof leaderboardTable.$inferSelect;
