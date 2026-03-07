import { useFocus } from "@/contexts/FocusContext";
import { Play, Square, Timer as TimerIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function FocusRoom() {
  const {
    isActive,
    timeLeft,
    initialDuration,
    distractions,
    showWarning,
    startFocus,
    stopFocus
  } = useFocus();

  const toggleTimer = () => {
    if (!isActive) {
      startFocus(25); // Start 25 minute session
    } else {
      stopFocus();
    }
  };

  const resetTimer = () => {
    stopFocus();
  };

  const displayTimeLeft = isActive ? timeLeft : 25 * 60;
  const minutes = Math.floor(displayTimeLeft / 60);
  const seconds = displayTimeLeft % 60;

  const totalSeconds = initialDuration > 0 ? initialDuration * 60 : 25 * 60;
  const progress = ((totalSeconds - displayTimeLeft) / totalSeconds) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-display font-bold mb-4">Deep Work Zone</h1>
        <p className="text-muted-foreground">Eliminate distractions. Build your streak.</p>

        {showWarning && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/50 text-destructive rounded-xl animate-bounce">
            <p className="font-bold">Distraction Detected! ({distractions}/3 strikes)</p>
            <p className="text-sm">Stay on this tab to maintain focus. Timer paused.</p>
          </div>
        )}
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
