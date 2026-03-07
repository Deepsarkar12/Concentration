import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

export function useEpisodes(videoId: number) {
  return useQuery({
    queryKey: [api.episodes.list.path, videoId],
    queryFn: async () => {
      const url = buildUrl(api.episodes.list.path, { videoId });
      const res = await authFetch(url);
      return parseResponse(res, api.episodes.list.responses[200]);
    },
    enabled: !!videoId,
  });
}

export function useCompleteEpisode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: typeof api.episodes.complete.input._type) => {
      const res = await authFetch(api.episodes.complete.path, {
        method: api.episodes.complete.method,
        body: JSON.stringify(data),
      });
      return parseResponse(res, api.episodes.complete.responses[200]);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.episodes.list.path, data.videoId] });
      toast({ title: "Episode marked as complete!" });
    }
  });
}
