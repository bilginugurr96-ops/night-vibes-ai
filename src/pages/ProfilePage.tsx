import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProfilePage = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <Navigate to={`/user/${user.id}`} replace />;
};

export default ProfilePage;
