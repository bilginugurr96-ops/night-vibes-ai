import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ProfilePage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const queryUserId = searchParams.get("uid")?.trim();
  const targetUserId = queryUserId && UUID_REGEX.test(queryUserId) ? queryUserId : user.id;

  return <Navigate to={`/user/${targetUserId}`} replace />;
};

export default ProfilePage;

