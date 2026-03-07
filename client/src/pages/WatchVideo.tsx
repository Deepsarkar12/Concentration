import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import YouTube from "react-youtube";
import { useVideos } from "@/hooks/use-videos";
import { useProgress, useUpdateProgress } from "@/hooks/use-progress";
import { useEpisodes, useCompleteEpisode } from "@/hooks/use-episodes";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function WatchVideo() {
  const { id } = useParams();
  const videoId = Number(id);
  
  const { data: videos } = useVideos();
  const video = videos?.find(v => v.id === videoId);
  
  const { data: progressData } = useProgress(videoId);
  const updateProgress = useUpdateProgress();
  
  const { data: episodes } = useEpisodes(videoId);
  const completeEpisode = useCompleteEpisode();

  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Sync progress periodically
  useEffect(() => {
    if (!isPlaying || !playerRef.current) return;
    
    const interval = setInterval(async () => {
      const time = await playerRef.current.getCurrentTime();
      setCurrentTime(time);
      
      updateProgress.mutate({
        videoId,
        lastWatchedTimestamp: Math.floor(time),
        completedEpisodes: progressData?.completedEpisodes || 0,
        totalWatchTime: (progressData?.totalWatchTime || 0) + 10 // rough approximation
      });
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [isPlaying, videoId, progressData]);

  const onReady = (event: any) => {
    playerRef.current = event.target;
    if (progressData?.lastWatchedTimestamp) {
      event.target.seekTo(progressData.lastWatchedTimestamp);
    }
  };

  if (!video) return <div className="p-8">Loading video...</div>;

  const totalEpisodes = episodes?.length || 1;
  const completedCount = episodes?.filter(e => e.completed).length || 0;
  const progressPercent = totalEpisodes > 0 ? (completedCount / totalEpisodes) * 100 : 0;

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] -m-4 md:-m-8 p-4 md:p-8 flex flex-col animate-in fade-in">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Main Player Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl relative">
            <YouTube
              videoId={video.youtubeVideoId}
              opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0 } }}
              className="absolute inset-0 w-full h-full"
              onReady={onReady}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnd={() => setIsPlaying(false)}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">{video.title}</h1>
            <p className="text-muted-foreground mt-1">Keep learning and save your progress.</p>
          </div>
        </div>

        {/* Sidebar / Episodes List */}
        <div className="w-full lg:w-96 flex flex-col gap-4 h-full">
          <div className="bg-card border border-border rounded-2xl p-5 flex-shrink-0">
            <h3 className="font-bold text-lg mb-2">Course Progress</h3>
            <Progress value={progressPercent} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground text-right">{completedCount} of {totalEpisodes} completed</p>
          </div>

          <div className="bg-card border border-border rounded-2xl flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-secondary/50">
              <h3 className="font-bold">Episodes</h3>
            </div>
            
            <div className="overflow-y-auto p-2 space-y-1 flex-1">
              {episodes?.length ? episodes.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => {
                    if (!episode.completed) {
                      completeEpisode.mutate({ episodeId: episode.id });
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    episode.completed 
                      ? "bg-primary/5 text-foreground" 
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {episode.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 flex-shrink-0 opacity-50" />
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className={`font-medium text-sm truncate ${episode.completed ? "" : ""}`}>
                      {episode.episodeNumber}. {episode.title}
                    </p>
                    <p className="text-xs opacity-70">{Math.floor(episode.duration / 60)} min</p>
                  </div>
                </button>
              )) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No episodes tracked for this video yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
