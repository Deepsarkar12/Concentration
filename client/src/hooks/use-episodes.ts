import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

export function useCompleteEpisode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: typeof api.progress.completeEpisode.input._type) => {
      const res = await authFetch(api.progress.completeEpisode.path, {
        method: api.progress.completeEpisode.method,
        body: JSON.stringify(data),
      });
      return parseResponse(res, api.progress.completeEpisode.responses[200]);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.progress.get.path, data.videoId] });
      toast({ title: "Episode marked as complete!" });
    }
  });
}

export function useEpisodes(videoId: number) {
  return useQuery({
    queryKey: [api.episodes.list.path, videoId],
    queryFn: async () => {
      const url = buildUrl(api.episodes.list.path, { id: videoId });
      const res = await authFetch(url);
      return parseResponse(res, api.episodes.list.responses[200]);
    },
    enabled: !!videoId
  });
}

export function useQuiz(videoId: number, episodeIndex: number) {
  return useQuery({
    queryKey: [api.quizzes.get.path, videoId, episodeIndex],
    queryFn: async () => {
      const url = buildUrl(api.quizzes.get.path, { id: videoId, episodeIndex });
      const res = await authFetch(url);
      return parseResponse(res, api.quizzes.get.responses[200]);
    },
    enabled: !!videoId && !!episodeIndex
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { videoId: number, episodeIndex: number, score: number, passed: boolean }) => {
      const url = buildUrl(api.quizzes.submit.path, { id: data.videoId, episodeIndex: data.episodeIndex });
      const res = await authFetch(url, {
        method: api.quizzes.submit.method,
        body: JSON.stringify({ score: data.score, passed: data.passed }),
      });
      return parseResponse(res, api.quizzes.submit.responses[200]);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.episodes.list.path, variables.videoId] });
      queryClient.invalidateQueries({ queryKey: [api.progress.get.path, variables.videoId] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }); // To update XP
      if (data.passed) {
        toast({ title: `Quiz passed! You earned ${data.xpEarned} XP.` });
      }
    }
  });
}

export function useNotes(videoId: number) {
  return useQuery({
    queryKey: [api.notes.list.path, videoId],
    queryFn: async () => {
      const url = buildUrl(api.notes.list.path, { id: videoId });
      const res = await authFetch(url);
      return parseResponse(res, api.notes.list.responses[200]);
    },
    enabled: !!videoId
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { videoId: number, timestamp: number, text: string }) => {
      const url = buildUrl(api.notes.add.path, { id: data.videoId });
      const res = await authFetch(url, {
        method: api.notes.add.method,
        body: JSON.stringify({ timestamp: data.timestamp, text: data.text }),
      });
      return parseResponse(res, api.notes.add.responses[201]);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.notes.list.path, variables.videoId] });
      toast({ title: "Note saved." });
    }
  });
}
