import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { authFetch, parseResponse } from "@/lib/auth-fetch";

interface FocusContextType {
    isActive: boolean;
    timeLeft: number;
    initialDuration: number;
    distractions: number;
    showWarning: boolean;
    startFocus: (durationMinutes: number) => void;
    stopFocus: () => void;
    setShowWarning: (show: boolean) => void;
}

const FocusContext = createContext<FocusContextType | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [initialDuration, setInitialDuration] = useState(0);
    const [sessionId, setSessionId] = useState<number | null>(null);

    // Distraction tracking
    const [distractions, setDistractions] = useState(0);
    const [showWarning, setShowWarning] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const startSessionMutation = useMutation({
        mutationFn: async (duration: number) => {
            const res = await authFetch(api.focus.start.path, {
                method: "POST",
                body: JSON.stringify({ duration }),
            });
            return parseResponse(res, api.focus.start.responses[200]);
        },
        onSuccess: (data) => {
            setSessionId(data.id);
        },
    });

    const completeSessionMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await authFetch(api.focus.complete.path, {
                method: "POST",
                body: JSON.stringify({ sessionId: id }),
            });
            return parseResponse(res, api.focus.complete.responses[200]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.focus.stats.path] });
            queryClient.invalidateQueries({ queryKey: [api.streak.get.path] });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

            toast({
                title: "Session Completed! 🎉",
                description: "Great job maintaining your focus. XP and Streak updated!",
            });

            resetState();
        },
    });

    const resetState = useCallback(() => {
        setIsActive(false);
        setTimeLeft(0);
        setInitialDuration(0);
        setSessionId(null);
        setDistractions(0);
        setShowWarning(false);
    }, []);

    const startFocus = useCallback((durationMinutes: number) => {
        const durationSeconds = durationMinutes * 60;
        setInitialDuration(durationMinutes);
        setTimeLeft(durationSeconds);
        setIsActive(true);
        setDistractions(0);
        setShowWarning(false);
        startSessionMutation.mutate(durationMinutes);

        toast({
            title: "Focus Session Started",
            description: "Stay focused. We'll track your distractions if you leave this tab!",
        });
    }, [startSessionMutation, toast]);

    const stopFocus = useCallback(() => {
        resetState();
        toast({
            title: "Focus Session Stopped",
            description: "Your session was ended early.",
            variant: "destructive",
        });
    }, [resetState, toast]);

    const handleDistraction = useCallback(() => {
        if (!isActive) return;

        setDistractions((prev) => {
            const newCount = prev + 1;

            if (newCount >= 3) {
                toast({
                    title: "Session Failed",
                    description: "You've been distracted too many times. Session ended.",
                    variant: "destructive"
                });
                resetState();
            } else {
                setShowWarning(true);
                toast({
                    title: "Distraction Detected!",
                    description: `Warning ${newCount}/3. Stay focused!`,
                    variant: "destructive"
                });
            }

            return newCount;
        });
    }, [isActive, resetState, toast]);

    // Timer Hook
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0 && !showWarning) {
            interval = setInterval(() => {
                setTimeLeft((time) => {
                    if (time <= 1) {
                        clearInterval(interval);
                        if (sessionId) {
                            completeSessionMutation.mutate(sessionId);
                        } else {
                            resetState();
                        }
                        return 0;
                    }
                    return time - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, showWarning, sessionId, completeSessionMutation, resetState]);

    // Distraction Listener Hook
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden && isActive) {
                handleDistraction();
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [isActive, handleDistraction]);

    return (
        <FocusContext.Provider value={{
            isActive,
            timeLeft,
            initialDuration,
            distractions,
            showWarning,
            startFocus,
            stopFocus,
            setShowWarning
        }}>
            {children}
        </FocusContext.Provider>
    );
}

export function useFocus() {
    const context = useContext(FocusContext);
    if (!context) {
        throw new Error("useFocus must be used within a FocusProvider");
    }
    return context;
}
