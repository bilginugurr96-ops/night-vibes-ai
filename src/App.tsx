import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DayNightProvider } from "@/contexts/DayNightContext";
import { useAutoCity } from "@/hooks/useAutoCity";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import VenueDetail from "./pages/VenueDetail";
import EventDetail from "./pages/EventDetail";
import MapPage from "./pages/MapPage";
import FeedPage from "./pages/FeedPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import ChatListPage from "./pages/ChatListPage";
import ChatConversationPage from "./pages/ChatConversationPage";
import NotificationsPage from "./pages/NotificationsPage";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import BlockedUsersPage from "./pages/BlockedUsersPage";
import OnboardingPage from "./pages/OnboardingPage";
import EditProfilePage from "./pages/EditProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AutoCityDetector = () => {
  useAutoCity();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DayNightProvider>
            <AutoCityDetector />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/venue/:id" element={<ProtectedRoute><VenueDetail /></ProtectedRoute>} />
              <Route path="/event/:id" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><ChatListPage /></ProtectedRoute>} />
              <Route path="/chat/:partnerId" element={<ProtectedRoute><ChatConversationPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/edit-profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><HelpSupportPage /></ProtectedRoute>} />
              <Route path="/blocked-users" element={<ProtectedRoute><BlockedUsersPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DayNightProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
