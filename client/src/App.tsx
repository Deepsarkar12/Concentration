import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import WatchVideo from "./pages/WatchVideo";
import FocusRoom from "./pages/FocusRoom";
import StoryJourney from "./pages/StoryJourney";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/not-found";

// Layout & Guards
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Protected Routes wrapped in Layout */}
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/watch/:id">
        <ProtectedRoute>
          <AppLayout>
            <WatchVideo />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/focus">
        <ProtectedRoute>
          <AppLayout>
            <FocusRoom />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/story">
        <ProtectedRoute>
          <AppLayout>
            <StoryJourney />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/analytics">
        <ProtectedRoute>
          <AppLayout>
            <Analytics />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { FocusProvider } from "./contexts/FocusContext";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FocusProvider>
          <Toaster />
          <Router />
        </FocusProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
