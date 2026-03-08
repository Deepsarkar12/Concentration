import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
        res.status(400).json({ message: "Invalid input" });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(input.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      res.status(200).json({ token, user });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  });


  // -- VIDEOS --
  app.get(api.videos.list.path, authenticateToken, async (req: any, res) => {
    const videos = await storage.getVideos(req.user.id);
    res.status(200).json(videos);
  });

  app.post(api.videos.add.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.videos.add.input.parse(req.body);

      // Basic check for existing video by youtube ID for this user
      const existing = await storage.getVideos(req.user.id);
      if (existing.some(v => v.youtubeVideoId === input.youtubeVideoId)) {
        return res.status(400).json({ message: "Video already added" });
      }

      const video = await storage.addVideo(
        req.user.id,
        input.youtubeUrl,
        input.youtubeVideoId,
        input.title,
        input.thumbnailUrl || undefined,
        input.duration || undefined
      );
      res.status(201).json(video);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
      } else {
        res.status(500).json({ message: "An unexpected error occurred" });
      }
    }
  });

  app.delete(api.videos.delete.path, authenticateToken, async (req: any, res) => {
    const videoId = Number(req.params.id);
    await storage.deleteVideo(req.user.id, videoId);
    res.status(200).json({ success: true });
  });


  // -- PROGRESS --
  app.get(api.progress.get.path, authenticateToken, async (req: any, res) => {
    const videoId = Number(req.params.id);
    const progress = await storage.getProgress(req.user.id, videoId);
    if (!progress) {
      // Create initial progress if none exists
      const newProgress = await storage.createProgress(req.user.id, videoId);
      return res.status(200).json(newProgress);
    }
    res.status(200).json(progress);
  });

  app.put(api.progress.update.path, authenticateToken, async (req: any, res) => {
    try {
      const videoId = Number(req.params.id);
      const input = api.progress.update.input.parse(req.body);

      const success = await storage.updateProgress(
        req.user.id,
        videoId,
        input.lastWatchedTimestamp,
        input.maxWatchedTime,
        input.completedEpisodes || [],
        input.unlockedEpisodes || [1],
        input.totalWatchTime || 0
      );

      if (!success) {
        // If update failed (likely because record doesn't exist), create it
        await storage.createProgress(req.user.id, videoId);
        const newProgress = await storage.updateProgress(
          req.user.id,
          videoId,
          input.lastWatchedTimestamp,
          input.maxWatchedTime,
          input.completedEpisodes || [],
          input.unlockedEpisodes || [1],
          input.totalWatchTime || 0
        );
        return res.status(200).json(newProgress);
      }

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.progress.completeEpisode.path, authenticateToken, async (req: any, res) => {
    try {
      const videoId = Number(req.params.id);
      const { episodeIndex } = req.body;

      const currentProg = await storage.getProgress(req.user.id, videoId);
      if (!currentProg) return res.status(404).json({ message: "Progress not found" });

      const updatedCompleted = Array.from(new Set([...currentProg.completedEpisodes, episodeIndex]));

      await storage.updateProgress(
        req.user.id,
        videoId,
        currentProg.lastWatchedTimestamp,
        currentProg.maxWatchedTime,
        updatedCompleted,
        currentProg.unlockedEpisodes,
        currentProg.totalWatchTime
      );

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // -- QUIZZES --
  app.get(api.quizzes.get.path, authenticateToken, async (req: any, res) => {
    const videoId = Number(req.params.id);
    const episodeIndex = Number(req.params.episodeIndex);

    console.log(`[Quiz] Starting generation for Video ${videoId}, Episode ${episodeIndex}...`);

    try {
      // TASK 4: Validate API Key
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const video = await storage.getVideos(req.user.id).then(videos => videos.find(v => v.id === videoId));
      if (!video) return res.status(404).json({ message: "Video not found" });

      const episodeLength = 480;
      const startTime = (episodeIndex - 1) * episodeLength;
      const endTime = episodeIndex * episodeLength;

      let transcriptText = "";
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(video.youtubeVideoId);
        transcriptText = transcript
          .filter(t => t.offset / 1000 >= startTime && t.offset / 1000 <= endTime)
          .map(t => t.text)
          .join(" ");
      } catch (err) {
        console.warn("[Quiz] Failed to fetch transcript, using fallback description", err);
        const ytRes = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${video.youtubeVideoId}&part=snippet&key=${process.env.YOUTUBE_API_KEY}`);
        transcriptText = ytRes.data.items[0]?.snippet?.description || "No content available";
      }

      // Use gemini-flash-latest (gemini-1.5-flash showed as missing in diagnostics)
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      // TASK 5: Improve Prompt for structured JSON
      const prompt = `
        You are a helpful educational assistant. 
        Analyze the lesson transcript and return ONLY valid JSON for a 5-question quiz.
        Do not wrap it in markdown block quotes. Do not include conversational text.
        Use exactly this structure:
        {
          "questions": [
            {
              "id": "q1",
              "question": "question text",
              "options": ["opt1", "opt2", "opt3", "opt4"],
              "correctAnswer": 0,
              "explanation": "brief explanation"
            }
          ]
        }

        Transcript:
        "${transcriptText.substring(0, 8000)}"
      `;

      // TASK 2 & 6: Try/Catch with Logging
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      console.log(`[Quiz] Gemini Response received.`);

      // THE MAGIC FIX: The Regex Sanitizer
      // LLMs often ignore instructions and wrap JSON in \`\`\`json { ... } \`\`\`
      // This regex grabs ONLY the object, ignoring the markdown wrapping.
      let quizJson;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : responseText;
        quizJson = JSON.parse(jsonText);
      } catch (parseError) {
        console.error("[Quiz] Failed to parse JSON:", responseText);
        // Fallback so the app doesn't crash
        quizJson = { questions: [] };
      }

      return res.status(200).json({
        episodeId: episodeIndex,
        questions: quizJson.questions || []
      });

    } catch (err: any) {
      // TASK 3: Fallback Response
      console.error("[Quiz] Error during generation:", err.message);

      return res.status(200).json({
        episodeId: episodeIndex,
        questions: [],
        message: "Quiz generation temporarily unavailable",
        error: err.message
      });
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
        xpEarned = 12;
        const user = await storage.getUser(req.user.id);
        if (user) {
          const { db } = await import("./db.js");
          const { users } = await import("../shared/schema.js");
          const { eq } = await import("drizzle-orm");

          const newXp = user.xp + xpEarned;
          const newLevel = Math.floor(newXp / 400) + 1;
          await db.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, user.id));

          const currentProg = await storage.getProgress(req.user.id, videoId);
          if (currentProg) {
            const nextEp = episodeIndex + 1;
            const updatedUnlocked = Array.from(new Set([...currentProg.unlockedEpisodes, nextEp]));

            await storage.updateProgress(
              req.user.id,
              videoId,
              currentProg.lastWatchedTimestamp,
              currentProg.maxWatchedTime,
              currentProg.completedEpisodes,
              updatedUnlocked,
              currentProg.totalWatchTime
            );
          }
        }
      }

      res.status(200).json({ xpEarned, passed: input.passed, result });
    } catch (err) {
      console.error("Quiz Submit Error:", err);
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

  // -- ANALYTICS --
  app.get(api.analytics.get.path, authenticateToken, async (req: any, res) => {
    const stats = await storage.getAnalytics(req.user.id);
    res.status(200).json(stats);
  });

  // -- STREAK --
  app.get(api.streak.get.path, authenticateToken, async (req: any, res) => {
    const currentStreak = await storage.getStreak(req.user.id);
    res.status(200).json({ currentStreak });
  });

  // -- STORY --
  app.get(api.story.unlocked.path, authenticateToken, async (req: any, res) => {
    const stories = await storage.getUnlockedStories(req.user.id);
    res.status(200).json(stories);
  });

  // -- EPISODES --
  // Note: These are dynamically generated on-the-fly based on video duration
  app.get(api.episodes.list.path, authenticateToken, async (req: any, res) => {
    const videoId = Number(req.params.id);
    const video = await storage.getVideos(req.user.id).then(videos => videos.find(v => v.id === videoId));
    if (!video) return res.status(404).json({ message: "Video not found" });

    const totalSeconds = video.duration || 0;
    const episodeLength = 480; // 8 minutes
    const episodeCount = Math.ceil(totalSeconds / episodeLength);

    const progress = await storage.getProgress(req.user.id, videoId);
    const completedIndices = progress?.completedEpisodes || [];

    const episodes = Array.from({ length: episodeCount }, (_, i) => {
      const index = i + 1;
      return {
        episodeNumber: index,
        title: `Episode ${index}`,
        startTime: i * episodeLength,
        endTime: Math.min((i + 1) * episodeLength, totalSeconds),
        unlocked: true, // For now all are unlocked
        completed: completedIndices.includes(index)
      };
    });

    res.status(200).json(episodes);
  });

  return httpServer;
}
