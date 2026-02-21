import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DiscoveryBannerProps {
  type: "go-live" | "nearby-active";
}

const DiscoveryBanner = ({ type }: DiscoveryBannerProps) => {
  const navigate = useNavigate();

  if (type === "nearby-active") {
    return (
      <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
        <span className="text-xs text-muted-foreground">Connections nearby are active.</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate("/explore")}
      className="w-full glass rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-full border border-border/30 flex items-center justify-center flex-shrink-0">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs font-medium text-foreground">Go Live. Get noticed nearby.</p>
        <p className="text-[10px] text-muted-foreground">Check in to boost your visibility</p>
      </div>
    </button>
  );
};

export default DiscoveryBanner;
