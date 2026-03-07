import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch, parseResponse } from "@/lib/auth-fetch";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const res = await authFetch(api.auth.me.path);
      if (!res.ok) return null;

      return parseResponse(res, api.auth.me.responses[200]);
    },
    retry: false,
    staleTime: Infinity,
  });

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.setQueryData([api.auth.me.path], null);
    queryClient.clear();
    setLocation("/login");
  };

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    isError: meQuery.isError,
    logout,
  };
}

export function useLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: typeof api.auth.login.input._type) => {
      const res = await authFetch(api.auth.login.path, {
        method: api.auth.login.method,
        body: JSON.stringify(data),
      });
      return parseResponse(res, api.auth.login.responses[200]);
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      setLocation("/");
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

export function useSignup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: typeof api.auth.signup.input._type) => {
      const res = await authFetch(api.auth.signup.path, {
        method: api.auth.signup.method,
        body: JSON.stringify(data),
      });
      return parseResponse(res, api.auth.signup.responses[201]);
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      setLocation("/");
      toast({ title: "Account created!", description: "Welcome to CodeFlix." });
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

export function useDeleteAccount() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await authFetch(api.auth.delete.path, {
        method: api.auth.delete.method,
      });
      return parseResponse(res, api.auth.delete.responses[200]);
    },
    onSuccess: () => {
      localStorage.removeItem("token");
      queryClient.clear();
      setLocation("/login");
      toast({ title: "Account Deleted", description: "Your data has been permanently removed." });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}
