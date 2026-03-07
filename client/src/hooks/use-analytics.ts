import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";

export function useAnalytics() {
    return useQuery({
        queryKey: [api.analytics.get.path],
        queryFn: async () => {
            const res = await authFetch(api.analytics.get.path);
            return parseResponse(res, api.analytics.get.responses[200]);
        },
    });
}
