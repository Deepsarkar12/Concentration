import { useState } from "react";
import { useVideos, useAddVideo, useDeleteVideo } from "@/hooks/use-videos";
import { useFocusStats } from "@/hooks/use-focus";
import { Link } from "wouter";
import { Play, Plus, Trash2, Clock, CheckCircle, Video as VideoIcon } from "lucide-react";
import { format } from "date-fns";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { data: videos, isLoading: videosLoading } = useVideos();
  const { data: stats } = useFocusStats();
  const addVideo = useAddVideo();
  const deleteVideo = useDeleteVideo();
  
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    addVideo.mutate({ youtubeUrl: url, title }, {
      onSuccess: () => {
        setDialogOpen(false);
        setUrl("");
        setTitle("");
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Your Learning Hub</h1>
        <p className="text-muted-foreground mt-2">Pick up where you left off or start something new.</p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-6 rounded-2xl hover-elevate">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Focus Time</p>
              <h3 className="text-2xl font-bold">{stats?.totalTime || 0} min</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border p-6 rounded-2xl hover-elevate">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Focus Sessions</p>
              <h3 className="text-2xl font-bold">{stats?.completedSessions || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl hover-elevate">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <VideoIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Saved Videos</p>
              <h3 className="text-2xl font-bold">{videos?.length || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Library Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold">Video Library</h2>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
                <Plus className="w-4 h-4" />
                Add Video
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-display">Add YouTube Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVideo} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Course Title</label>
                  <input 
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-background border-2 border-border focus:border-primary/50 px-4 py-3 rounded-xl outline-none"
                    placeholder="e.g. Next.js Full Course"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">YouTube URL</label>
                  <input 
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-background border-2 border-border focus:border-primary/50 px-4 py-3 rounded-xl outline-none"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <button 
                  type="submit"
                  disabled={addVideo.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl mt-4"
                >
                  {addVideo.isPending ? "Adding..." : "Add to Library"}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {videosLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-card animate-pulse rounded-2xl border border-border" />
            ))}
          </div>
        ) : videos?.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <VideoIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No videos yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">Build your library by adding your favorite educational YouTube playlists or videos.</p>
            <button 
              onClick={() => setDialogOpen(true)}
              className="text-primary hover:underline font-medium"
            >
              Add your first video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos?.map((video) => (
              <div key={video.id} className="group relative bg-card border border-border rounded-2xl overflow-hidden hover-elevate flex flex-col">
                <div className="aspect-video bg-secondary relative">
                  <img 
                    src={`https://img.youtube.com/vi/${video.youtubeVideoId}/maxresdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/40 transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 ml-1" />
                    </div>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg line-clamp-2 mb-2">{video.title}</h3>
                  <p className="text-xs text-muted-foreground mt-auto">
                    Added {format(new Date(video.createdAt!), 'MMM d, yyyy')}
                  </p>
                </div>
                
                <Link href={`/watch/${video.id}`} className="absolute inset-0 z-10">
                  <span className="sr-only">Watch {video.title}</span>
                </Link>

                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    if(confirm("Delete this video?")) deleteVideo.mutate(video.id);
                  }}
                  className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-destructive text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
