import { memo } from "react";
import { Link } from "wouter";
import { Play, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Video } from "@shared/schema";

interface VideoCardProps {
    video: Video & { progress?: any };
    onDelete: (id: number) => void;
}

export const VideoCard = memo(({ video, onDelete }: VideoCardProps) => {
    return (
        <div className="group relative bg-card border border-border rounded-2xl overflow-hidden hover-elevate flex flex-col h-full">
            <div className="aspect-video bg-secondary relative">
                <img
                    src={`https://img.youtube.com/vi/${video.youtubeVideoId}/maxresdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
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
                    e.stopPropagation();
                    onDelete(video.id);
                }}
                className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-destructive text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
});

VideoCard.displayName = "VideoCard";
