import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";
import { useToast } from "@/hooks/use-toast";

export function useFocusStats() {
  return useQuery({
    queryKey: [api.focus.stats.path],
    queryFn: async () => {
      const res = await authFetch(api.focus.stats.path);
      return parseResponse(res, api.focus.stats.responses[200]);
    },
  });
}

export function useStartFocusSession() {
  return useMutation({
    mutationFn: async (duration: number) => {
      const res = await authFetch(api.focus.start.path, {
        method: api.focus.start.method,
        body: JSON.stringify({ duration }),
      });
      return parseResponse(res, api.focus.start.responses[200]);
    }
  });
}

export function useCompleteFocusSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await authFetch(api.focus.complete.path, {
        method: api.focus.complete.method,
        body: JSON.stringify({ sessionId }),
      });
      return parseResponse(res, api.focus.complete.responses[200]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.focus.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.streak.get.path] });
      toast({ 
        title: "Focus session completed!", 
        description: "Great job staying focused.",
        variant: "default",
      });
    }
  });
}
