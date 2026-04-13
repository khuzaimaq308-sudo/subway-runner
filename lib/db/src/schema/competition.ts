import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const competitionSettingsTable = pgTable("competition_settings", {
  id:              serial("id").primaryKey(),
  competitionName: text("competition_name").notNull().default("Monthly Watch Hunt"),
  endDate:         timestamp("end_date").notNull(),
  prize1:          text("prize_1").notNull().default("10,000"),
  prize2:          text("prize_2").notNull().default("5,000"),
  prize3:          text("prize_3").notNull().default("2,000"),
  isActive:        boolean("is_active").notNull().default(true),
  createdAt:       timestamp("created_at").defaultNow(),
  updatedAt:       timestamp("updated_at").defaultNow(),
});

export const mediaItemsTable = pgTable("media_items", {
  id:        serial("id").primaryKey(),
  title:     text("title").notNull(),
  mediaType: text("media_type").notNull(), // 'image' | 'video' | 'link'
  url:       text("url").notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CompetitionSettings = typeof competitionSettingsTable.$inferSelect;
export type MediaItem = typeof mediaItemsTable.$inferSelect;
