import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";

export function useProgress(videoId: number) {
  return useQuery({
    queryKey: [api.progress.get.path, videoId],
    queryFn: async () => {
      const url = buildUrl(api.progress.get.path, { videoId });
      const res = await authFetch(url);
      if (res.status === 404) return null;
      return parseResponse(res, api.progress.get.responses[200]);
    },
    enabled: !!videoId,
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: typeof api.progress.update.input._type) => {
      const res = await authFetch(api.progress.update.path, {
        method: api.progress.update.method,
        body: JSON.stringify(data),
      });
      return parseResponse(res, api.progress.update.responses[200]);
    },
    // We intentionally don't invalidate queries here to avoid rapid refetching during playback.
    // The component maintains local state and syncs to backend.
  });
}
