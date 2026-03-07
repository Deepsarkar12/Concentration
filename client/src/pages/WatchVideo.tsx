import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import YouTube from "react-youtube";
import { useVideos } from "@/hooks/use-videos";
import { useProgress, useUpdateProgress } from "@/hooks/use-progress";
import { useCompleteEpisode } from "@/hooks/use-episodes";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Pure function to generate episodes
const generateEpisodes = (video: any, episodeLength = 480) => {
  if (!video || !video.duration) return [];
  const totalEpisodes = Math.ceil(video.duration / episodeLength);
  const eps = [];
  for (let i = 1; i <= totalEpisodes; i++) {
    const startTime = (i - 1) * episodeLength;
    const endTime = Math.min(startTime + episodeLength, video.duration);
    eps.push({
      episodeNumber: i,
      title: `Episode ${i}`,
      startTime,
      endTime
    });
  }
  return eps;
};

export default function WatchVideo() {
  const { id } = useParams();
  const videoId = Number(id);

  const { data: videos } = useVideos();
  const video = videos?.find(v => v.id === videoId);

  // Generate episodes dynamically based on video duration
  const episodes = useMemo(() => generateEpisodes(video), [video?.duration]);

  const { data: progressData } = useProgress(videoId);
  const updateProgress = useUpdateProgress();
  const completeEpisode = useCompleteEpisode();

  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [activeTab, setActiveTab] = useState<'episodes' | 'notes'>('episodes');
  const [notes, setNotes] = useState('');

  // Sync progress and auto-complete episodes
  useEffect(() => {
    if (!playerRef.current) return;

    const interval = setInterval(async () => {
      try {
        const time = await playerRef.current.getCurrentTime();
        setCurrentTime(time);

        // Auto-save progress every 10 seconds
        if (isPlaying && Math.floor(time) % 10 === 0) {
          updateProgress.mutate({
            videoId,
            lastWatchedTimestamp: Math.floor(time),
            completedEpisodes: progressData?.completedEpisodes || [],
            totalWatchTime: (progressData?.totalWatchTime || 0) + 10
          });
        }

        // Auto-complete logic based on dynamic episodes
        if (episodes.length > 0) {
          const completedKeys = progressData?.completedEpisodes || [];

          // If we passed the end of an episode and it's not completed, mark it
          const passedEpisode = episodes.find(e => time >= e.endTime && !completedKeys.includes(e.episodeNumber));

          if (passedEpisode) {
            completeEpisode.mutate({ videoId, episodeNumber: passedEpisode.episodeNumber });
          }
        }
      } catch (err) {
        console.error("Error polling player time:", err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [isPlaying, videoId, progressData, episodes, completeEpisode]);

  const onReady = (event: any) => {
    playerRef.current = event.target;
    // Removed automatic seek based on new requirements
  };

  const handleResume = () => {
    if (playerRef.current && progressData?.lastWatchedTimestamp) {
      playerRef.current.seekTo(progressData.lastWatchedTimestamp);
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!video) return <div className="p-8">Loading video...</div>;

  const totalEpisodes = episodes.length || 0;
  const completedCount = progressData?.completedEpisodes?.length || 0;
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
            {/* @ts-ignore - react-youtube class component lacks props definition for React 18 in some IDE contexts */}
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold font-display">{video.title}</h1>
              <p className="text-muted-foreground mt-1">Keep learning and save your progress.</p>
            </div>

            {progressData?.lastWatchedTimestamp ? (
              <button
                onClick={handleResume}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Resume from {formatTime(progressData.lastWatchedTimestamp)}
              </button>
            ) : null}
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
            <div className="flex border-b border-border bg-secondary/30">
              <button
                onClick={() => setActiveTab('episodes')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'episodes' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
              >
                Episodes
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'notes' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
              >
                My Notes
              </button>
            </div>

            <div className="overflow-y-auto p-2 space-y-1 flex-1">
              {activeTab === 'episodes' ? (
                <>
                  {episodes.length ? episodes.map((episode) => {
                    const isCurrent = currentTime >= episode.startTime && currentTime < episode.endTime;
                    const isCompleted = (progressData?.completedEpisodes || []).includes(episode.episodeNumber);

                    return (
                      <button
                        key={episode.episodeNumber}
                        onClick={() => {
                          if (playerRef.current) playerRef.current.seekTo(episode.startTime);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isCurrent
                          ? "bg-primary/20 border border-primary/50 text-foreground ring-1 ring-primary/30"
                          : isCompleted
                            ? "bg-primary/5 text-foreground/80"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : isCurrent ? (
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 flex-shrink-0 opacity-50" />
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className={`font-medium text-sm truncate ${isCurrent ? "text-primary" : ""}`}>
                            {episode.episodeNumber}. {episode.title}
                          </p>
                          <p className="text-xs opacity-70">
                            {formatTime(episode.startTime)} — {formatTime(episode.endTime)}
                          </p>
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No episodes tracked for this video yet.
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 h-full flex flex-col">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take notes while you watch..."
                    className="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-4 text-center">Notes are saved automatically to your device.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
