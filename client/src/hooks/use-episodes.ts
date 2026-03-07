import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
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
