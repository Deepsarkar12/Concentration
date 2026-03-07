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

  return httpServer;
}
