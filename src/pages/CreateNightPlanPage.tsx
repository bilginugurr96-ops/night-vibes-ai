import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Clock, MapPin, Trash2, GripVertical } from "lucide-react";
import { useCreateNightPlan } from "@/hooks/useNightPlans";
import { useVenues, VenueDB } from "@/hooks/useVenues";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useDayNight } from "@/contexts/DayNightContext";

interface StopDraft {
  venue_id: string;
  venue_name: string;
  planned_time: string;
}

const CreateNightPlanPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isNight } = useDayNight();
  const createPlan = useCreateNightPlan();
  const { data: venues = [] } = useVenues(undefined, isNight ? "night" : "day");

  const [title, setTitle] = useState("Gece Planım");
  const [planDate, setPlanDate] = useState(new Date().toISOString().split("T")[0]);
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");

  const addStop = (venue: VenueDB) => {
    const lastTime = stops.length > 0 ? stops[stops.length - 1].planned_time : "20:00";
    const [h, m] = lastTime.split(":").map(Number);
    const nextH = (h + 2) % 24;
    const nextTime = `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    setStops([...stops, { venue_id: venue.id, venue_name: venue.name, planned_time: nextTime }]);
    setShowVenuePicker(false);
    setVenueSearch("");
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, time: string) => {
    const updated = [...stops];
    updated[index].planned_time = time;
    setStops(updated);
  };

  const handleCreate = async () => {
    if (stops.length === 0) {
      toast({ title: "En az bir durak ekle", variant: "destructive" });
      return;
    }
    try {
      await createPlan.mutateAsync({
        title,
        plan_date: planDate,
        stops: stops.map((s) => ({ venue_id: s.venue_id, planned_time: s.planned_time })),
      });
      toast({ title: "Plan oluşturuldu! 🎉" });
      navigate("/night-plan");
    } catch {
      toast({ title: "Oluşturma başarısız", variant: "destructive" });
    }
  };

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(venueSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Yeni Gece Planı</h1>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground font-semibold mb-1 block">Plan Adı</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cuma Gecesi Planı"
            className="glass border-border/30"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-muted-foreground font-semibold mb-1 block">Tarih</label>
          <Input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="glass border-border/30"
          />
        </div>

        {/* Stops */}
        <div>
          <label className="text-xs text-muted-foreground font-semibold mb-2 block">Duraklar</label>
          <div className="space-y-2">
            {stops.map((stop, i) => (
              <div key={i} className="glass rounded-xl p-3 flex items-center gap-3 animate-fade-in-up">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  {i < stops.length - 1 && <div className="w-0.5 h-6 bg-primary/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-foreground truncate">{stop.venue_name}</span>
                  </div>
                </div>
                <Input
                  type="time"
                  value={stop.planned_time}
                  onChange={(e) => updateTime(i, e.target.value)}
                  className="w-24 text-xs glass border-border/30"
                />
                <button onClick={() => removeStop(i)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Stop */}
          {!showVenuePicker ? (
            <button
              onClick={() => setShowVenuePicker(true)}
              className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:border-primary/30 hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Durak Ekle
            </button>
          ) : (
            <div className="mt-2 glass rounded-xl p-3 space-y-2">
              <Input
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                placeholder="Mekan ara…"
                className="glass border-border/30"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredVenues.slice(0, 10).map((venue) => (
                  <button
                    key={venue.id}
                    onClick={() => addStop(venue)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">{venue.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{venue.type}</span>
                  </button>
                ))}
                {filteredVenues.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">Mekan bulunamadı</div>
                )}
              </div>
              <button
                onClick={() => { setShowVenuePicker(false); setVenueSearch(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                İptal
              </button>
            </div>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={createPlan.isPending || stops.length === 0}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 transition-opacity"
        >
          {createPlan.isPending ? "Oluşturuluyor…" : "Planı Oluştur 🌙"}
        </button>
      </div>
    </div>
  );
};

export default CreateNightPlanPage;
