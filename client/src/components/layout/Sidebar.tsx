import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlaySquare, Timer, BookOpen, LogOut, Flame } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useStreak } from "@/hooks/use-gamification";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { data: streakData } = useStreak();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/focus", label: "Focus Room", icon: Timer },
    { href: "/story", label: "Story Journey", icon: BookOpen },
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border hidden md:flex flex-col flex-shrink-0 sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/20">
            <PlaySquare className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-display font-bold text-gradient">CodeFlix</h1>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        {streakData && streakData.currentStreak > 0 && (
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
              <span className="font-bold text-orange-400">{streakData.currentStreak} Day Streak</span>
            </div>
          </div>
        )}

        <div className="bg-secondary rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button 
            onClick={() => logout()} 
            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
