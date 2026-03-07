import { db } from "./db";
import {
  users, type User, type InsertUser,
  videos, type Video,
  progress, type Progress,
  episodes, type Episode,
  focusSessions, type FocusSession,
  stories, type Story,
  userStoryProgress, type UserStoryProgress
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Videos
  getVideos(userId: number): Promise<Video[]>;
  addVideo(userId: number, youtubeUrl: string, youtubeVideoId: string, title: string, thumbnailUrl?: string, duration?: number): Promise<Video>;
  deleteVideo(id: number, userId: number): Promise<boolean>;

  // Progress
  getProgress(userId: number, videoId: number): Promise<Progress | undefined>;
  updateProgress(userId: number, videoId: number, lastWatchedTimestamp: number, completedEpisodes: number, totalWatchTime: number): Promise<Progress>;

  // Episodes
  getEpisodes(videoId: number): Promise<Episode[]>;
  completeEpisode(id: number): Promise<Episode>;

  // Focus
  startFocusSession(userId: number, duration: number): Promise<FocusSession>;
  completeFocusSession(id: number): Promise<FocusSession>;
  getFocusStats(userId: number): Promise<{ totalTime: number; completedSessions: number }>;

  // Streak
  getStreak(userId: number): Promise<number>;

  // Story
  getUnlockedStories(userId: number): Promise<Story[]>;
  unlockNextChapter(userId: number): Promise<void>;
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

  async getVideos(userId: number): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.userId, userId));
  }

  async addVideo(userId: number, youtubeUrl: string, youtubeVideoId: string, title: string, thumbnailUrl?: string, duration?: number): Promise<Video> {
    const [video] = await db.insert(videos).values({ userId, youtubeUrl, youtubeVideoId, title, thumbnailUrl, duration }).returning();
    
    // Auto-generate episodes if duration exists
    if (duration && duration > 0) {
      const episodeDuration = 480; // 8 minutes in seconds
      const numEpisodes = Math.ceil(duration / episodeDuration);
      for (let i = 0; i < numEpisodes; i++) {
        await db.insert(episodes).values({
          videoId: video.id,
          episodeNumber: i + 1,
          title: `Episode ${i + 1}`,
          startTime: i * episodeDuration,
          endTime: Math.min((i + 1) * episodeDuration, duration),
          completed: false
        });
      }
    }
    
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

  async updateProgress(userId: number, videoId: number, lastWatchedTimestamp: number, completedEpisodes: number, totalWatchTime: number): Promise<Progress> {
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

  async getEpisodes(videoId: number): Promise<Episode[]> {
    return await db.select().from(episodes).where(eq(episodes.videoId, videoId)).orderBy(episodes.episodeNumber);
  }

  async completeEpisode(id: number): Promise<Episode> {
    const [episode] = await db.update(episodes).set({ completed: true }).where(eq(episodes.id, id)).returning();
    
    // Add XP for episode completion
    const [video] = await db.select().from(videos).where(eq(videos.id, episode.videoId));
    if (video) {
      const [user] = await db.select().from(users).where(eq(users.id, video.userId));
      if (user) {
        const newXp = user.xp + 5;
        const newLevel = Math.floor(newXp / 100) + 1;
        await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, user.id));
      }
    }
    
    return episode;
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
      const newLevel = Math.floor(newXp / 100) + 1;
      
      await db.update(users).set({ 
        xp: newXp, 
        level: newLevel,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
        lastActiveDate: new Date()
      }).where(eq(users.id, user.id));
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
}

export const storage = new DatabaseStorage();
