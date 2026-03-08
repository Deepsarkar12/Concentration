import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import YouTube from "react-youtube";
import { useVideos } from "@/hooks/use-videos";
import { useProgress, useUpdateProgress } from "@/hooks/use-progress";
import { useEpisodes, useNotes, useAddNote } from "@/hooks/use-episodes";
import { ArrowLeft, CheckCircle2, Circle, Lock, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QuizPanel } from "@/components/QuizPanel";
import { KnowledgeMap } from "@/components/KnowledgeMap";

export default function WatchVideo() {
  const { id } = useParams();
  const videoId = Number(id);

  const { data: videos } = useVideos();
  const video = videos?.find(v => v.id === videoId);

  // Fetch episodes from API
  const { data: episodesData } = useEpisodes(videoId);
  const episodes = episodesData || [];

  const { data: progressData } = useProgress(videoId);
  const updateProgress = useUpdateProgress();

  const { data: notesData } = useNotes(videoId);
  const addNote = useAddNote();

  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [activeTab, setActiveTab] = useState<'episodes' | 'notes' | 'quiz' | 'map'>('episodes');
  const [notesText, setNotesText] = useState('');
  const [activeQuizEpisode, setActiveQuizEpisode] = useState<number | null>(null);

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

        // Check for episode completion to trigger quiz
        if (episodes.length > 0) {
          const currentEpisode = episodes.find(e => time >= e.startTime && time < e.endTime);

          if (currentEpisode) {
            // Check if we reached the last 10 seconds of the episode
            if (time >= currentEpisode.endTime - 10 && !currentEpisode.completed && activeQuizEpisode !== currentEpisode.episodeNumber) {
              setActiveQuizEpisode(currentEpisode.episodeNumber);
              setActiveTab('quiz');
              playerRef.current.pauseVideo();
            }
          }
        }
      } catch (err) {
        console.error("Error polling player time:", err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [isPlaying, videoId, progressData, episodes, activeQuizEpisode]);

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
              opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, rel: 0 } }}
              className="absolute inset-0 w-full h-full"
              onReady={onReady}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnd={() => setIsPlaying(false)}
            />
            {/* Render Note Markers on Timeline (visual approximation at bottom) */}
            {notesData && notesData.length > 0 && video.duration && (
              <div className="absolute bottom-1 left-0 right-0 h-1 bg-white/20 z-10 pointer-events-none">
                {notesData.map(note => {
                  const leftPos = (note.timestamp / video.duration!) * 100;
                  return (
                    <div
                      key={note.id}
                      className="absolute top-0 bottom-0 w-1.5 bg-primary rounded-full transform -translate-x-1/2"
                      style={{ left: `${leftPos}%` }}
                      title={`Note at ${formatTime(note.timestamp)}: ${note.text}`}
                    />
                  );
                })}
              </div>
            )}
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
              {activeQuizEpisode && (
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'quiz' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                >
                  Quiz
                </button>
              )}
              <button
                onClick={() => setActiveTab('map')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'map' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
              >
                Map
              </button>
            </div>

            <div className="overflow-y-auto p-2 space-y-1 flex-1">
              {activeTab === 'episodes' ? (
                <>
                  {episodes.length ? episodes.map((episode) => {
                    const isCurrent = currentTime >= episode.startTime && currentTime < episode.endTime;
                    const isCompleted = episode.completed;
                    const isUnlocked = episode.unlocked;

                    return (
                      <button
                        key={episode.episodeNumber}
                        onClick={() => {
                          if (isUnlocked && playerRef.current) {
                            playerRef.current.seekTo(episode.startTime);
                          }
                        }}
                        disabled={!isUnlocked}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isCurrent
                          ? "bg-primary/20 border border-primary/50 text-foreground ring-1 ring-primary/30"
                          : isCompleted
                            ? "bg-primary/5 text-foreground/80"
                            : !isUnlocked
                              ? "opacity-60 bg-muted/30 cursor-not-allowed"
                              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : !isUnlocked ? (
                          <Lock className="w-5 h-5 flex-shrink-0 opacity-50" />
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
              ) : activeTab === 'quiz' && activeQuizEpisode ? (
                <div className="p-4 h-full">
                  <QuizPanel
                    videoId={videoId}
                    episodeIndex={activeQuizEpisode}
                    onComplete={() => {
                      setActiveTab('episodes');
                      setActiveQuizEpisode(null);
                      if (playerRef.current) {
                        playerRef.current.playVideo();
                      }
                    }}
                  />
                </div>
              ) : activeTab === 'map' ? (
                <KnowledgeMap episodes={episodes} />
              ) : (
                <div className="p-4 h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                    {notesData?.map(note => (
                      <div key={note.id} className="bg-secondary/40 p-3 rounded-lg text-sm group" onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.seekTo(note.timestamp);
                          playerRef.current.playVideo();
                        }
                      }}>
                        <span className="text-primary font-mono mr-2 cursor-pointer">{formatTime(note.timestamp)}</span>
                        <span className="text-foreground">{note.text}</span>
                      </div>
                    ))}
                    {(!notesData || notesData.length === 0) && (
                      <p className="text-center text-muted-foreground text-sm mt-8">No notes yet.</p>
                    )}
                  </div>
                  <div className="relative isolate group mt-auto">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (notesText.trim() && playerRef.current) {
                            addNote.mutate({
                              videoId,
                              timestamp: Math.floor(currentTime),
                              text: notesText.trim()
                            });
                            setNotesText('');
                          }
                        }
                      }}
                      placeholder="Take notes at current time... (Press Enter to save)"
                      className="w-full bg-secondary/20 p-3 rounded-xl resize-none outline-none text-sm transition-all focus:bg-secondary/40 border border-transparent focus:border-border"
                      rows={3}
                    />
                    <div className="absolute top-2 right-2 text-xs font-mono text-muted-foreground bg-background/80 px-1 py-0.5 rounded pointer-events-none group-focus-within:opacity-100 opacity-50 transition-opacity">
                      {formatTime(currentTime)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
