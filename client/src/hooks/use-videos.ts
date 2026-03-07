import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

export function useVideos() {
  return useQuery({
    queryKey: [api.videos.list.path],
    queryFn: async () => {
      const res = await authFetch(api.videos.list.path);
      return parseResponse(res, api.videos.list.responses[200]);
    },
  });
}

export function useAddVideo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: typeof api.videos.add.input._type) => {
      const res = await authFetch(api.videos.add.path, {
        method: api.videos.add.method,
        body: JSON.stringify(data),
      });
      return parseResponse(res, api.videos.add.responses[201]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
      toast({ title: "Video added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add video", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.videos.delete.path, { id });
      const res = await authFetch(url, { method: api.videos.delete.method });
      return parseResponse(res, api.videos.delete.responses[200]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
      toast({ title: "Video deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete video", description: error.message, variant: "destructive" });
    }
  });
}
