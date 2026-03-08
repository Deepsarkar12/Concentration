import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActiveDate: timestamp("last_active_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  youtubeVideoId: text("youtube_video_id").notNull(),
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  lastWatchedTimestamp: integer("last_watched_timestamp").default(0).notNull(),
  maxWatchedTime: integer("max_watched_time").default(0).notNull(),
  completedEpisodes: integer("completed_episodes").array().default([]).notNull(),
  unlockedEpisodes: integer("unlocked_episodes").array().default([1]).notNull(),
  totalWatchTime: integer("total_watch_time").default(0).notNull(),
});



export const focusSessions = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  duration: integer("duration").notNull(), // in minutes
  date: timestamp("date").defaultNow(),
  completed: boolean("completed").default(false),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  timestamp: integer("timestamp").notNull(), // in seconds
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  episodeIndex: integer("episode_index").notNull(),
  score: integer("score").default(0).notNull(),
  passed: boolean("passed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, youtubeVideoId: true, userId: true });
export const insertProgressSchema = createInsertSchema(progress).omit({ id: true, userId: true });

export const insertFocusSessionSchema = createInsertSchema(focusSessions).omit({ id: true, date: true, userId: true });
export const insertStorySchema = createInsertSchema(stories).omit({ id: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, userId: true, createdAt: true });
export const insertQuizResultSchema = createInsertSchema(quizResults).omit({ id: true, userId: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Progress = typeof progress.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type QuizResult = typeof quizResults.$inferSelect;

export type FocusSession = typeof focusSessions.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type UserStoryProgress = typeof userStoryProgress.$inferSelect;
