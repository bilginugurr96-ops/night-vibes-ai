import { MapPin, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  venueId: string;
  venueName: string;
  venueImage?: string;
  isMine: boolean;
}

const VenueShareCard = ({ venueId, venueName, venueImage, isMine }: Props) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/venue/${venueId}`)}
      className={`w-full rounded-xl overflow-hidden border ${
        isMine ? "border-primary/20" : "border-border/50"
      } text-left`}
    >
      {venueImage && (
        <img src={venueImage} alt={venueName} className="w-full h-24 object-cover" />
      )}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{venueName}</p>
          <p className="text-[10px] text-muted-foreground">Mekana git →</p>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
};

export default VenueShareCard;
