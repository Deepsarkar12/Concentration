import { db } from "./db";
import {
  users, videos, progress, focusSessions, stories, userStoryProgress, notes, quizResults
} from "@shared/schema";
import type { User, InsertUser, Video, Progress, FocusSession, Story, UserStoryProgress, Note, QuizResult } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<boolean>;

  // Videos
  getVideos(userId: number): Promise<Video[]>;
  addVideo(userId: number, youtubeUrl: string, youtubeVideoId: string, title: string, thumbnailUrl?: string, duration?: number): Promise<Video>;
  deleteVideo(id: number, userId: number): Promise<boolean>;

  // Progress
  getProgress(userId: number, videoId: number): Promise<Progress | undefined>;
  updateProgress(userId: number, videoId: number, lastWatchedTimestamp: number, completedEpisodes: number[], totalWatchTime: number): Promise<Progress>;
  completeDynamicEpisode(userId: number, videoId: number, episodeNumber: number): Promise<Progress | undefined>;

  // Focus
  startFocusSession(userId: number, duration: number): Promise<FocusSession>;
  completeFocusSession(id: number): Promise<FocusSession>;
  getFocusStats(userId: number): Promise<{ totalTime: number; completedSessions: number }>;

  // Streak
  getStreak(userId: number): Promise<number>;

  // Story
  getUnlockedStories(userId: number): Promise<Story[]>;
  unlockNextChapter(userId: number): Promise<void>;

  // Notes
  getNotes(userId: number, videoId: number): Promise<Note[]>;
  addNote(userId: number, videoId: number, timestamp: number, text: string): Promise<Note>;

  // Quizzes
  getQuizResult(userId: number, videoId: number, episodeIndex: number): Promise<QuizResult | undefined>;
  addQuizResult(userId: number, videoId: number, episodeIndex: number, score: number, passed: boolean): Promise<QuizResult>;

  // Analytics
  getAnalytics(userId: number): Promise<{
    totalHours: number,
    totalSessions: number,
    videosCompleted: number,
    avgFocusDuration: number,
    activeCourses: Array<{
      id: number,
      title: string,
      completion: number,
      episodesCompleted: number,
      totalEpisodes: number
    }>
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Manually cascade since sqlite doesn't always enforce it at ORM level cleanly without setup
    await db.delete(progress).where(eq(progress.userId, id));
    await db.delete(focusSessions).where(eq(focusSessions.userId, id));
    await db.delete(userStoryProgress).where(eq(userStoryProgress.userId, id));
    await db.delete(notes).where(eq(notes.userId, id));
    await db.delete(quizResults).where(eq(quizResults.userId, id));

    // Find all videos to delete them
    await db.delete(videos).where(eq(videos.userId, id));

    // Finally delete user
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getVideos(userId: number): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.userId, userId));
  }

  async addVideo(userId: number, youtubeUrl: string, youtubeVideoId: string, title: string, thumbnailUrl?: string, duration?: number): Promise<Video> {
    const [video] = await db.insert(videos).values({ userId, youtubeUrl, youtubeVideoId, title, thumbnailUrl, duration }).returning();

    // Also initialize progress array to empty
    await db.insert(progress).values({
      userId,
      videoId: video.id,
      completedEpisodes: []
    });

    return video;
  }

  async deleteVideo(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(videos).where(and(eq(videos.id, id), eq(videos.userId, userId))).returning();
    return result.length > 0;
  }

  async getProgress(userId: number, videoId: number): Promise<Progress | undefined> {
    const [prog] = await db.select().from(progress).where(and(eq(progress.userId, userId), eq(progress.videoId, videoId)));
    return prog;
  }

  async updateProgress(userId: number, videoId: number, lastWatchedTimestamp: number, completedEpisodes: number[], totalWatchTime: number): Promise<Progress> {
    const existing = await this.getProgress(userId, videoId);
    if (existing) {
      const [updated] = await db.update(progress)
        .set({ lastWatchedTimestamp, completedEpisodes, totalWatchTime })
        .where(eq(progress.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newProg] = await db.insert(progress)
        .values({ userId, videoId, lastWatchedTimestamp, completedEpisodes, totalWatchTime })
        .returning();
      return newProg;
    }
  }

  async completeDynamicEpisode(userId: number, videoId: number, episodeNumber: number): Promise<Progress | undefined> {
    let prog = await this.getProgress(userId, videoId);

    // Create progress if it doesn't exist
    if (!prog) {
      const [newProg] = await db.insert(progress)
        .values({ userId, videoId, completedEpisodes: [] })
        .returning();
      prog = newProg;
    }

    // Only update and award XP if it's the first time
    if (!prog.completedEpisodes.includes(episodeNumber)) {
      const newCompleted = [...prog.completedEpisodes, episodeNumber];
      const [updatedProg] = await db.update(progress)
        .set({ completedEpisodes: newCompleted })
        .where(eq(progress.id, prog.id))
        .returning();

      // Give XP
      const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
      if (video) {
        const totalEpisodes = video.duration ? Math.ceil(video.duration / 480) : 0;
        const allCompleted = totalEpisodes > 0 && newCompleted.length >= totalEpisodes;

        const xpGain = allCompleted ? 55 : 5; // Big bonus if the entire video is finished

        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (user) {
          const newXp = user.xp + xpGain;
          const newLevel = Math.floor(newXp / 400) + 1;
          await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, user.id));
        }
      }

      return updatedProg;
    }

    return prog;
  }

  async startFocusSession(userId: number, duration: number): Promise<FocusSession> {
    const [session] = await db.insert(focusSessions).values({ userId, duration }).returning();
    return session;
  }

  async completeFocusSession(id: number): Promise<FocusSession> {
    const [session] = await db.update(focusSessions).set({ completed: true }).where(eq(focusSessions.id, id)).returning();

    // Update streak and XP
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let newStreak = user.currentStreak;
      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      if (lastActive) lastActive.setHours(0, 0, 0, 0);

      const diffDays = lastActive ? Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)) : null;

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays === null || diffDays > 1) {
        newStreak = 1;
      }

      const newXp = user.xp + 10;
      const newLevel = Math.floor(newXp / 400) + 1;

      await db.update(users).set({
        xp: newXp,
        level: newLevel,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
        lastActiveDate: new Date()
      }).where(eq(users.id, user.id));

      // Calculate today's total focus time
      const todaysSessions = await db.select().from(focusSessions)
        .where(and(
          eq(focusSessions.userId, user.id),
          eq(focusSessions.completed, true)
        ));

      const totalFocusToday = todaysSessions
        .filter(s => s.date && s.date >= today)
        .reduce((acc, curr) => acc + curr.duration, 0);

      const [userProgress] = await db.select().from(userStoryProgress).where(eq(userStoryProgress.userId, user.id));
      const currentChapter = userProgress ? userProgress.chapterUnlocked : 0;

      // Story Unlock Rules: 10 mins -> Chap 1, 30 mins -> Chap 2, 60 mins -> Chap 3
      let newChapter = currentChapter;
      const totalFocusMins = Math.floor(totalFocusToday / 60);

      if (totalFocusMins >= 60 && currentChapter < 3) newChapter = 3;
      else if (totalFocusMins >= 30 && currentChapter < 2) newChapter = 2;
      else if (totalFocusMins >= 10 && currentChapter < 1) newChapter = 1;

      if (newChapter > currentChapter) {
        if (userProgress) {
          await db.update(userStoryProgress)
            .set({ chapterUnlocked: newChapter })
            .where(eq(userStoryProgress.id, userProgress.id));
        } else {
          await db.insert(userStoryProgress).values({ userId: user.id, chapterUnlocked: newChapter });
        }
      }
    }

    return session;
  }

  async getFocusStats(userId: number): Promise<{ totalTime: number; completedSessions: number }> {
    const sessions = await db.select().from(focusSessions).where(and(eq(focusSessions.userId, userId), eq(focusSessions.completed, true)));
    const totalTime = sessions.reduce((acc, curr) => acc + curr.duration, 0);
    return { totalTime, completedSessions: sessions.length };
  }

  async getStreak(userId: number): Promise<number> {
    const sessions = await db.select().from(focusSessions)
      .where(and(eq(focusSessions.userId, userId), eq(focusSessions.completed, true)))
      .orderBy(focusSessions.date);
    return sessions.length > 0 ? 1 : 0;
  }

  async getUnlockedStories(userId: number): Promise<Story[]> {
    const [userProgress] = await db.select().from(userStoryProgress).where(eq(userStoryProgress.userId, userId));
    const maxChapter = userProgress ? userProgress.chapterUnlocked : 0;

    const allStories = await db.select().from(stories);
    return allStories.filter(s => s.chapterNumber <= maxChapter);
  }

  async unlockNextChapter(userId: number): Promise<void> {
    const [userProgress] = await db.select().from(userStoryProgress).where(eq(userStoryProgress.userId, userId));
    if (userProgress) {
      await db.update(userStoryProgress)
        .set({ chapterUnlocked: userProgress.chapterUnlocked + 1 })
        .where(eq(userStoryProgress.id, userProgress.id));
    } else {
      await db.insert(userStoryProgress).values({ userId, chapterUnlocked: 1 });
    }
  }

  async getNotes(userId: number, videoId: number): Promise<Note[]> {
    return await db.select().from(notes).where(and(eq(notes.userId, userId), eq(notes.videoId, videoId))).orderBy(notes.timestamp);
  }

  async addNote(userId: number, videoId: number, timestamp: number, text: string): Promise<Note> {
    const [note] = await db.insert(notes).values({ userId, videoId, timestamp, text }).returning();
    return note;
  }

  async getQuizResult(userId: number, videoId: number, episodeIndex: number): Promise<QuizResult | undefined> {
    const [result] = await db.select().from(quizResults).where(and(
      eq(quizResults.userId, userId),
      eq(quizResults.videoId, videoId),
      eq(quizResults.episodeIndex, episodeIndex)
    ));
    return result;
  }

  async addQuizResult(userId: number, videoId: number, episodeIndex: number, score: number, passed: boolean): Promise<QuizResult> {
    // Delete existing attempt if exists (allow retry logic)
    await db.delete(quizResults).where(and(
      eq(quizResults.userId, userId),
      eq(quizResults.videoId, videoId),
      eq(quizResults.episodeIndex, episodeIndex)
    ));

    const [result] = await db.insert(quizResults).values({ userId, videoId, episodeIndex, score, passed }).returning();
    return result;
  }

  async getAnalytics(userId: number): Promise<{
    totalHours: number,
    totalSessions: number,
    videosCompleted: number,
    avgFocusDuration: number,
    activeCourses: Array<{
      id: number,
      title: string,
      completion: number,
      episodesCompleted: number,
      totalEpisodes: number
    }>
  }> {
    const sessions = await db.select().from(focusSessions).where(and(eq(focusSessions.userId, userId), eq(focusSessions.completed, true)));
    const totalTimeMins = sessions.reduce((acc, curr) => acc + curr.duration, 0);
    const totalHours = Math.round((totalTimeMins / 60) * 10) / 10;
    const totalSessions = sessions.length;
    const avgFocusDuration = totalSessions > 0 ? Math.round(totalTimeMins / totalSessions) : 0;

    const userVideos = await db.select().from(videos).where(eq(videos.userId, userId));

    let videosCompletedCount = 0;
    const activeCourses = [];

    for (const video of userVideos) {
      const vidProg = await db.select().from(progress).where(eq(progress.videoId, video.id));
      const userVidProg = vidProg.find(p => p.userId === userId);

      const totalEpisodes = video.duration ? Math.ceil(video.duration / 480) : 0;
      const episodesCompleted = userVidProg ? userVidProg.completedEpisodes.length : 0;

      const completion = totalEpisodes > 0 ? Math.round((episodesCompleted / totalEpisodes) * 100) : 0;

      if (totalEpisodes > 0 && episodesCompleted >= totalEpisodes) {
        videosCompletedCount++;
      } else if (episodesCompleted > 0) {
        activeCourses.push({
          id: video.id,
          title: video.title,
          completion,
          episodesCompleted,
          totalEpisodes
        });
      }
    }

    return {
      totalHours,
      totalSessions,
      videosCompleted: videosCompletedCount,
      avgFocusDuration,
      activeCourses
    };
  }
}

export const storage = new DatabaseStorage();
