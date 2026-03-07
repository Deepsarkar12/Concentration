import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
      
      const video = await storage.addVideo(req.user.id, input.youtubeUrl, youtubeVideoId, input.title);
      res.status(201).json(video);
    } catch (err) {
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

  // -- EPISODES --
  app.get(api.episodes.list.path, authenticateToken, async (req: any, res) => {
    const eps = await storage.getEpisodes(Number(req.params.videoId));
    res.status(200).json(eps);
  });

  app.post(api.episodes.complete.path, authenticateToken, async (req: any, res) => {
    try {
      const input = api.episodes.complete.input.parse(req.body);
      const ep = await storage.completeEpisode(input.episodeId);
      res.status(200).json(ep);
    } catch(err) {
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

  return httpServer;
}
