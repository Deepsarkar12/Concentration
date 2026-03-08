import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key";

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // -- AUTH --
  app.post(api.auth.signup.path, async (req, res) => {
    try {
      const input = api.auth.signup.input.parse(req.body);
      const existingUser = await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      res.status(201).json({ token, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      } else {
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(input.email);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      res.status(200).json({ token, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      } else {
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.status(200).json(user);
  });

  app.delete(api.auth.delete.path, authenticateToken, async (req: any, res) => {
    try {
      const success = await storage.deleteUser(req.user.id);
      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // -- VIDEOS --
  app.post(api.videos.add.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.videos.add.input.parse(req.body);

      let youtubeVideoId = "";
      const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = input.youtubeUrl.match(urlPattern);

      if (match && match[1]) {
        youtubeVideoId = match[1];
      } else {
        return res.status(400).json({ message: "Invalid YouTube URL" });
      }

      let duration = 3600; // Default to 60 minutes
      let finalTitle = input.title;
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;

      // Try fetching from YouTube Data API if key available
      let fetchedSuccessfully = false;
      try {
        if (process.env.YOUTUBE_API_KEY) {
          const axios = require('axios');
          const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${youtubeVideoId}&part=contentDetails,snippet&key=${process.env.YOUTUBE_API_KEY}`);

          if (response.data.items && response.data.items.length > 0) {
            const item = response.data.items[0];

            // Override title with actual YouTube title if not manually provided
            if (!input.title || input.title.trim() === '') {
              finalTitle = item.snippet.title;
            }

            // Parse ISO 8601 duration (e.g., PT1H2M10S, PT15M, etc.)
            const durationIso = item.contentDetails.duration;
            const hoursMatch = durationIso.match(/(\d+)H/);
            const minsMatch = durationIso.match(/(\d+)M/);
            const secsMatch = durationIso.match(/(\d+)S/);

            duration = 0;
            if (hoursMatch) duration += parseInt(hoursMatch[1]) * 3600;
            if (minsMatch) duration += parseInt(minsMatch[1]) * 60;
            if (secsMatch) duration += parseInt(secsMatch[1]);

            fetchedSuccessfully = true;
          }
        }
      } catch (apiError) {
        console.warn("YouTube API fetch failed, trying fallback HTML scraper");
      }

      // Fallback: Scrape the YouTube video page HTML
      if (!fetchedSuccessfully) {
        try {
          const response = await axios.get(`https://www.youtube.com/watch?v=${youtubeVideoId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
          });
          const html = response.data;

          // Try multiple regex patterns for duration
          const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
          const durationMsMatch = html.match(/"approxDurationMs":"(\d+)"/);

          if (lengthMatch && lengthMatch[1]) {
            duration = parseInt(lengthMatch[1]);
          } else if (durationMsMatch && durationMsMatch[1]) {
            duration = Math.floor(parseInt(durationMsMatch[1]) / 1000);
          }

          // Try to extract exact title
          const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
          if (titleMatch && titleMatch[1]) {
            if (!input.title || input.title.trim() === '') {
              finalTitle = titleMatch[1];
            }
          }
        } catch (fallbackError) {
          console.error("YouTube fallback scraper failed:", fallbackError);
        }
      }

      const video = await storage.addVideo(req.user.id, input.youtubeUrl, youtubeVideoId, finalTitle, thumbnailUrl, duration);
      res.status(201).json(video);
    } catch (err) {
      console.error("Video add error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.videos.list.path, authenticateToken, async (req: any, res) => {
    const videos = await storage.getVideos(req.user.id);
    res.status(200).json(videos);
  });

  app.delete(api.videos.delete.path, authenticateToken, async (req: any, res) => {
    const success = await storage.deleteVideo(Number(req.params.id), req.user.id);
    if (success) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: "Video not found" });
    }
  });

  // -- PROGRESS --
  app.post(api.progress.update.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.progress.update.input.parse(req.body);
      const prog = await storage.updateProgress(
        req.user.id,
        input.videoId,
        input.lastWatchedTimestamp,
        input.completedEpisodes,
        input.totalWatchTime
      );
      res.status(200).json(prog);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.progress.get.path, authenticateToken, async (req: any, res) => {
    const prog = await storage.getProgress(req.user.id, Number(req.params.videoId));
    if (prog) {
      res.status(200).json(prog);
    } else {
      res.status(404).json({ message: "Progress not found" });
    }
  });

  app.post(api.progress.completeEpisode.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.progress.completeEpisode.input.parse(req.body);
      const prog = await storage.completeDynamicEpisode(req.user.id, input.videoId, input.episodeNumber);
      res.status(200).json(prog);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // -- FOCUS --
  app.post(api.focus.start.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.focus.start.input.parse(req.body);
      const session = await storage.startFocusSession(req.user.id, input.duration);
      res.status(200).json(session);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.focus.complete.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.focus.complete.input.parse(req.body);
      const session = await storage.completeFocusSession(input.sessionId);
      res.status(200).json(session);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.focus.stats.path, authenticateToken, async (req: any, res) => {
    const stats = await storage.getFocusStats(req.user.id);
    res.status(200).json(stats);
  });

  // -- STREAK --
  app.get(api.streak.get.path, authenticateToken, async (req: any, res) => {
    const currentStreak = await storage.getStreak(req.user.id);
    res.status(200).json({ currentStreak });
  });

  // -- STORY --
  app.get(api.story.unlocked.path, authenticateToken, async (req: any, res) => {
    const unlocked = await storage.getUnlockedStories(req.user.id);
    res.status(200).json(unlocked);
  });

  // -- ANALYTICS --
  app.get(api.analytics.get.path, authenticateToken, async (req: any, res) => {
    try {
      const analytics = await storage.getAnalytics(req.user.id);
      res.status(200).json(analytics);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // -- EPISODES (Dynamic) --
  app.get(api.episodes.list.path, authenticateToken, async (req: any, res) => {
    try {
      const videoId = Number(req.params.id);
      const video = await storage.getVideos(req.user.id).then(videos => videos.find(v => v.id === videoId));

      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const prog = await storage.getProgress(req.user.id, videoId);
      const completedEpisodes = prog?.completedEpisodes || [];

      let episodes = [];
      let fetchedSuccessfully = false;

      // 1. Try to fetch from YouTube API for chapters in description
      try {
        if (process.env.YOUTUBE_API_KEY) {
          const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${video.youtubeVideoId}&part=snippet&key=${process.env.YOUTUBE_API_KEY}`);
          if (response.data.items && response.data.items.length > 0) {
            const desc = response.data.items[0].snippet.description;
            // Simple regex to parse timestamps like "00:00 Intro"
            const timestampRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)/g;
            let match;
            let chapters = [];
            while ((match = timestampRegex.exec(desc)) !== null) {
              const hours = match[1] ? parseInt(match[1]) : 0;
              const mins = parseInt(match[2]);
              const secs = parseInt(match[3]);
              const totalSecs = hours * 3600 + mins * 60 + secs;
              chapters.push({ time: totalSecs, title: match[4].trim() });
            }

            if (chapters.length > 0) {
              // Ensure first chapter starts at 0 if not present
              if (chapters[0].time > 0) {
                chapters.unshift({ time: 0, title: "Intro" });
              }

              for (let i = 0; i < chapters.length; i++) {
                const startTime = chapters[i].time;
                const endTime = chapters[i + 1] ? chapters[i + 1].time : (video.duration || startTime + 480);
                episodes.push({
                  episodeNumber: i + 1,
                  title: chapters[i].title,
                  startTime,
                  endTime
                });
              }
              fetchedSuccessfully = true;
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch YouTube chapters:", err);
      }

      // 2. Fallback: Generate sequential 8-minute metadata
      if (!fetchedSuccessfully) {
        const episodeLength = 480; // 8 minutes
        const duration = video.duration || 3600;
        const totalEpisodes = Math.ceil(duration / episodeLength);

        for (let i = 1; i <= totalEpisodes; i++) {
          episodes.push({
            episodeNumber: i,
            title: `Part ${i}`,
            startTime: (i - 1) * episodeLength,
            endTime: Math.min(i * episodeLength, duration)
          });
        }
      }

      // Prepare UI state for each episode
      const result = episodes.map(ep => {
        const isCompleted = completedEpisodes.includes(ep.episodeNumber);
        // Episode 1 always unlocked. Others unlocked if previous is completed.
        const isUnlocked = ep.episodeNumber === 1 || completedEpisodes.includes(ep.episodeNumber - 1);
        return {
          ...ep,
          completed: isCompleted,
          unlocked: isUnlocked
        };
      });

      res.status(200).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // -- QUIZZES --
  app.get(api.quizzes.get.path, authenticateToken, async (req: any, res) => {
    try {
      const episodeIndex = Number(req.params.episodeIndex);
      // MOCK: Since we don't have an OpenAI key hooked up yet, return mock AI questions
      const mockQuestions = [
        {
          id: "q1",
          question: "What is the primary topic discussed in this chapter?",
          options: ["Introduction to concepts", "Advanced syntax", "Database optimization", "Server deployment"],
          correctAnswer: 0,
          explanation: "The chapter mainly introduces the core concepts."
        },
        {
          id: "q2",
          question: "Which of the following is true based on the episode?",
          options: ["A is true", "B is false", "C is true", "Nothing is true"],
          correctAnswer: 0
        },
        {
          id: "q3",
          question: "How do you apply the technique shown?",
          options: ["Using method X", "Using method Y", "Using method Z", "Not applicable"],
          correctAnswer: 1
        },
        {
          id: "q4",
          question: "Conceptual focus: Why is this important?",
          options: ["For performance", "For security", "For scalability", "All of the above"],
          correctAnswer: 3
        },
        {
          id: "q5",
          question: "What should you avoid doing?",
          options: ["Best practice A", "Anti-pattern B", "Best practice C", "None"],
          correctAnswer: 1,
          explanation: "Anti-pattern B can cause memory leaks."
        }
      ];

      res.status(200).json({
        episodeId: episodeIndex,
        questions: mockQuestions
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  app.post(api.quizzes.submit.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.quizzes.submit.input.parse(req.body);
      const videoId = Number(req.params.id);
      const episodeIndex = Number(req.params.episodeIndex);

      const result = await storage.addQuizResult(req.user.id, videoId, episodeIndex, input.score, input.passed);

      let xpEarned = 0;
      if (input.passed) {
        // Award XP
        xpEarned = 12;
        const [user] = await storage.getUser(req.user.id).then(u => [u]); // Helper to bump XP directly if not exposed, or do raw DB update
        if (user) {
          const newXp = user.xp + xpEarned;
          const newLevel = Math.floor(newXp / 400) + 1;
          const { db } = require("./db");
          const { users } = require("@shared/schema");
          const { eq } = require("drizzle-orm");
          await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, user.id));
        }
      }

      res.status(200).json({ xpEarned, passed: input.passed, result });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // -- NOTES --
  app.get(api.notes.list.path, authenticateToken, async (req: any, res) => {
    try {
      const videoId = Number(req.params.id);
      const notes = await storage.getNotes(req.user.id, videoId);
      res.status(200).json(notes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post(api.notes.add.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.notes.add.input.parse(req.body);
      const videoId = Number(req.params.id);
      const note = await storage.addNote(req.user.id, videoId, input.timestamp, input.text);
      res.status(201).json(note);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  return httpServer;
}
