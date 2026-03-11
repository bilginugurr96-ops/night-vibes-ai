import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to onboarding if not complete (skip if already on onboarding)
  if (profile && !profile.onboarding_complete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect to app guide if onboarding done but guide not seen
  if (
    profile &&
    profile.onboarding_complete &&
    !(profile as any).guide_complete &&
    location.pathname !== "/app-guide"
  ) {
    return <Navigate to="/app-guide" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
