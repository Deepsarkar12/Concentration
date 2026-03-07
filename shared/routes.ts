import { z } from 'zod';
import { 
  insertUserSchema, users,
  insertVideoSchema, videos,
  insertProgressSchema, progress,
  insertEpisodeSchema, episodes,
  insertFocusSessionSchema, focusSessions,
  stories, userStoryProgress
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup' as const,
      input: insertUserSchema,
      responses: {
        201: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string(), password: z.string() }),
      responses: {
        200: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  videos: {
    add: {
      method: 'POST' as const,
      path: '/api/videos/add' as const,
      input: z.object({ youtubeUrl: z.string(), title: z.string() }),
      responses: {
        201: z.custom<typeof videos.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    list: {
      method: 'GET' as const,
      path: '/api/videos' as const,
      responses: {
        200: z.array(z.custom<typeof videos.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/videos/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      }
    }
  },
  progress: {
    update: {
      method: 'POST' as const,
      path: '/api/progress/update' as const,
      input: z.object({ 
        videoId: z.coerce.number(), 
        lastWatchedTimestamp: z.coerce.number(), 
        completedEpisodes: z.coerce.number(), 
        totalWatchTime: z.coerce.number() 
      }),
      responses: {
        200: z.custom<typeof progress.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/progress/:videoId' as const,
      responses: {
        200: z.custom<typeof progress.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      }
    }
  },
  episodes: {
    list: {
      method: 'GET' as const,
      path: '/api/episodes/:videoId' as const,
      responses: {
        200: z.array(z.custom<typeof episodes.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    complete: {
      method: 'POST' as const,
      path: '/api/episodes/complete' as const,
      input: z.object({ episodeId: z.coerce.number() }),
      responses: {
        200: z.custom<typeof episodes.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  focus: {
    start: {
      method: 'POST' as const,
      path: '/api/focus/start' as const,
      input: z.object({ duration: z.coerce.number() }),
      responses: {
        200: z.custom<typeof focusSessions.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    complete: {
      method: 'POST' as const,
      path: '/api/focus/complete' as const,
      input: z.object({ sessionId: z.coerce.number() }),
      responses: {
        200: z.custom<typeof focusSessions.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    stats: {
      method: 'GET' as const,
      path: '/api/focus/stats' as const,
      responses: {
        200: z.object({ totalTime: z.number(), completedSessions: z.number() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  streak: {
    get: {
      method: 'GET' as const,
      path: '/api/streak' as const,
      responses: {
        200: z.object({ currentStreak: z.number() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  story: {
    unlocked: {
      method: 'GET' as const,
      path: '/api/story/unlocked' as const,
      responses: {
        200: z.array(z.custom<typeof stories.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
