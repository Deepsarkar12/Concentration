import { useState, useEffect } from "react";
import { useStartFocusSession, useCompleteFocusSession } from "@/hooks/use-focus";
import { Play, Square, Timer as TimerIcon } from "lucide-react";
import { motion } from "framer-motion";

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds

export default function FocusRoom() {
  const startSession = useStartFocusSession();
  const completeSession = useCompleteFocusSession();

  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      if (sessionId) {
        completeSession.mutate(sessionId);
        setSessionId(null);
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionId, completeSession]);

  const toggleTimer = () => {
    if (!isActive) {
      if (timeLeft === FOCUS_DURATION) {
        // Start new session in DB
        startSession.mutate(25, {
          onSuccess: (data) => {
            setSessionId(data.id);
            setIsActive(true);
          }
        });
      } else {
        // Just resume
        setIsActive(true);
      }
    } else {
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(FOCUS_DURATION);
    setSessionId(null);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const progress = ((FOCUS_DURATION - timeLeft) / FOCUS_DURATION) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-display font-bold mb-4">Deep Work Zone</h1>
        <p className="text-muted-foreground">Eliminate distractions. Build your streak.</p>
      </div>

      <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-12">
        {/* Animated Glow when active */}
        {isActive && (
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-[60px] animate-pulse-glow" />
        )}

        {/* Progress Circle */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="48%"
            className="stroke-secondary fill-none stroke-[8px]"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r="48%"
            className="stroke-primary fill-none stroke-[8px]"
            strokeLinecap="round"
            initial={{ strokeDasharray: "0 1000" }}
            animate={{ strokeDasharray: `${progress * 3.14 * 0.96} 1000` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </svg>

        {/* Timer Display */}
        <div className="relative z-10 flex flex-col items-center">
          <TimerIcon className={`w-8 h-8 mb-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-6xl md:text-7xl font-display font-bold font-mono tracking-tighter">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-muted-foreground mt-2 uppercase tracking-widest text-sm font-semibold">
            {isActive ? "Focusing..." : "Ready"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTimer}
          disabled={startSession.isPending}
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform disabled:opacity-50"
        >
          {isActive ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-7 h-7 ml-1 fill-current" />}
        </button>
        
        <button
          onClick={resetTimer}
          className="px-6 py-3 rounded-xl font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
