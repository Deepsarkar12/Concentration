import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlaySquare, Timer, BookOpen, LogOut, Flame, BarChart3, Trash2 } from "lucide-react";
import { useAuth, useDeleteAccount } from "@/hooks/use-auth";
import { useStreak } from "@/hooks/use-gamification";
import { useFocus } from "@/contexts/FocusContext";

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const deleteAccount = useDeleteAccount();
  const { data: streakData } = useStreak();
  const { isActive: isFocusing, timeLeft: focusTimeLeft } = useFocus();

  const focusMinutes = Math.floor(focusTimeLeft / 60);
  const focusSeconds = focusTimeLeft % 60;

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/focus", label: "Focus Room", icon: Timer },
    { href: "/story", label: "Story Journey", icon: BookOpen },
    { href: "/analytics", label: "Analytics", icon: BarChart3 }
  ];

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to permanently delete your CodeFlix account and all your focus data? This cannot be undone.")) {
      deleteAccount.mutate();
    }
  };

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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive
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

        {isFocusing && (
          <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Active Focus</span>
            </div>
            <div className="text-2xl font-mono font-bold text-foreground">
              {String(focusMinutes).padStart(2, '0')}:{String(focusSeconds).padStart(2, '0')}
            </div>
          </div>
        )}
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

        <div className="flex gap-2">
          <div className="bg-secondary rounded-xl p-4 flex items-center gap-3 flex-1 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => logout()}
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 transition-colors rounded-xl flex-1 flex items-center justify-center"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
              className="p-2 text-destructive hover:text-destructive-foreground hover:bg-destructive transition-colors rounded-xl flex-1 flex items-center justify-center border border-destructive/20"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
