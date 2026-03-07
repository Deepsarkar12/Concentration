import { useUnlockedStories } from "@/hooks/use-gamification";
import { BookOpen, Lock } from "lucide-react";

export default function StoryJourney() {
  const { data: stories, isLoading } = useUnlockedStories();

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in py-8">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">The Developer's Journey</h1>
        <p className="text-muted-foreground text-lg">
          Complete focus sessions and episodes to unlock the ongoing saga.
        </p>
      </div>

      <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-8 before:w-0.5 before:bg-border">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="pl-20 animate-pulse">
                <div className="h-32 bg-card rounded-2xl" />
              </div>
            ))}
          </div>
        ) : stories?.length ? (
          stories.map((story) => (
            <div key={story.id} className="relative pl-20 group">
              <div className="absolute left-[26px] top-6 w-4 h-4 bg-background border-4 border-primary rounded-full z-10 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(234,88,12,0.5)]" />
              
              <div className="bg-card border border-border p-6 rounded-2xl hover-elevate">
                <h3 className="text-primary font-bold text-sm uppercase tracking-wider mb-2">
                  Chapter {story.chapterNumber}
                </h3>
                <p className="text-foreground leading-relaxed">
                  {story.text}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="pl-20">
            <div className="bg-card border border-border border-dashed p-8 rounded-2xl text-center text-muted-foreground flex flex-col items-center">
              <Lock className="w-8 h-8 mb-4 opacity-50" />
              <p>Your journey hasn't begun.</p>
              <p className="text-sm mt-2">Start a focus session to unlock chapter 1.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
