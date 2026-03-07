import { useAnalytics } from "@/hooks/use-analytics";
import { BarChart, Clock, PlaySquare, TimerReset } from "lucide-react";

export default function Analytics() {
    const { data: analytics, isLoading } = useAnalytics();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground font-medium">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in space-y-8 duration-500">
            <header>
                <h1 className="text-3xl md:text-4xl font-display font-bold">Your Analytics</h1>
                <p className="text-muted-foreground mt-2">Deep dive into your learning habits and focus sessions.</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Hours */}
                <div className="bg-card border border-border p-6 rounded-2xl hover-elevate transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                            <Clock className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium mb-1">Total Focus Hours</p>
                            <h3 className="text-3xl font-display font-bold">{analytics?.totalHours || 0}</h3>
                        </div>
                    </div>
                </div>

                {/* Sessions Completed */}
                <div className="bg-card border border-border p-6 rounded-2xl hover-elevate transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-green-500/10 rounded-2xl text-green-500">
                            <BarChart className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium mb-1">Sessions Completed</p>
                            <h3 className="text-3xl font-display font-bold">{analytics?.totalSessions || 0}</h3>
                        </div>
                    </div>
                </div>

                {/* Videos Completed */}
                <div className="bg-card border border-border p-6 rounded-2xl hover-elevate transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                            <PlaySquare className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium mb-1">Courses Completed</p>
                            <h3 className="text-3xl font-display font-bold">{analytics?.videosCompleted || 0}</h3>
                        </div>
                    </div>
                </div>

                {/* Avg Focus */}
                <div className="bg-card border border-border p-6 rounded-2xl hover-elevate transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500">
                            <TimerReset className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium mb-1">Avg. Session (min)</p>
                            <h3 className="text-3xl font-display font-bold">{analytics?.avgFocusDuration || 0}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {analytics && analytics.activeCourses.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-display font-bold">Currently Learning</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analytics.activeCourses.map((course) => (
                            <div key={course.id} className="bg-card border border-border p-6 rounded-2xl flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg line-clamp-1">{course.title}</h3>
                                    <span className="text-primary font-bold">{course.completion}%</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${course.completion}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {course.episodesCompleted} / {course.totalEpisodes} episodes completed
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!isLoading && analytics?.activeCourses.length === 0 && (
                <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
                    <h3 className="text-xl font-bold mb-2">Ready to start?</h3>
                    <p className="max-w-md mx-auto">Add a new YouTube video or resume one from your dashboard to see your course progress here.</p>
                </div>
            )}
        </div>
    );
}
