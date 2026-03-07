import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";

export function useStreak() {
  return useQuery({
    queryKey: [api.streak.get.path],
    queryFn: async () => {
      const res = await authFetch(api.streak.get.path);
      return parseResponse(res, api.streak.get.responses[200]);
    },
  });
}

export function useUnlockedStories() {
  return useQuery({
    queryKey: [api.story.unlocked.path],
    queryFn: async () => {
      const res = await authFetch(api.story.unlocked.path);
      return parseResponse(res, api.story.unlocked.responses[200]);
    },
  });
}
