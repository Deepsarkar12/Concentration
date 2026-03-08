import { CheckCircle2, Lock, Circle } from "lucide-react";

export function KnowledgeMap({ episodes }: { episodes: any[] }) {
    return (
        <div className="flex flex-col items-center py-8 space-y-0 h-full overflow-y-auto">
            {episodes.map((episode, index) => {
                const isCompleted = episode.completed;
                const isUnlocked = episode.unlocked;
                const isLast = index === episodes.length - 1;

                return (
                    <div key={episode.episodeNumber} className="flex flex-col items-center">
                        {/* The Node */}
                        <div
                            className={`
                relative flex items-center justify-center w-48 p-4 rounded-xl border-2 text-center transition-all duration-300
                ${isCompleted
                                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                    : isUnlocked
                                        ? "bg-card border-primary/50 text-foreground"
                                        : "bg-muted/30 border-muted text-muted-foreground opacity-60"}
              `}
                        >
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-background rounded-full">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-6 h-6 text-primary bg-background rounded-full" />
                                ) : !isUnlocked ? (
                                    <Lock className="w-5 h-5 text-muted-foreground bg-background rounded-full" />
                                ) : (
                                    <Circle className="w-5 h-5 text-primary/50 bg-background rounded-full fill-background" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                                    Episode {episode.episodeNumber}
                                </span>
                                <span className="font-medium text-sm line-clamp-2">
                                    {episode.title}
                                </span>
                            </div>
                        </div>

                        {/* The Connecting Line */}
                        {!isLast && (
                            <div
                                className={`w-1 h-8 ${isCompleted ? "bg-primary" : "bg-muted"} transition-colors duration-300`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
