import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  youtubeVideoId: text("youtube_video_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  lastWatchedTimestamp: integer("last_watched_timestamp").default(0),
  completedEpisodes: integer("completed_episodes").default(0),
  totalWatchTime: integer("total_watch_time").default(0),
});

export const episodes = pgTable("episodes", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  title: text("title").notNull(),
  duration: integer("duration").notNull(),
  completed: boolean("completed").default(false),
});

export const focusSessions = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  duration: integer("duration").notNull(), // in minutes
  date: timestamp("date").defaultNow(),
  completed: boolean("completed").default(false),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  chapterNumber: integer("chapter_number").notNull(),
  text: text("text").notNull(),
});

export const userStoryProgress = pgTable("user_story_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  chapterUnlocked: integer("chapter_unlocked").notNull().default(0),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, youtubeVideoId: true, userId: true });
export const insertProgressSchema = createInsertSchema(progress).omit({ id: true, userId: true });
export const insertEpisodeSchema = createInsertSchema(episodes).omit({ id: true });
export const insertFocusSessionSchema = createInsertSchema(focusSessions).omit({ id: true, date: true, userId: true });
export const insertStorySchema = createInsertSchema(stories).omit({ id: true });

export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Progress = typeof progress.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type UserStoryProgress = typeof userStoryProgress.$inferSelect;
