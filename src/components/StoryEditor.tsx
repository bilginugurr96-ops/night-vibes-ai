import { useState } from "react";
import { X, Type, MapPin, Sun, Check, Search } from "lucide-react";
import { VenueDB } from "@/hooks/useVenues";
import { Slider } from "@/components/ui/slider";

export type TextStyle = { id: string; label: string; className: string };

const MOOD_TAGS = [
  { id: "chill", label: "Chill" },
  { id: "lit", label: "Lit" },
  { id: "vip", label: "VIP" },
  { id: "romantic", label: "Romantic" },
];

const TEXT_STYLES: TextStyle[] = [
  { id: "clean", label: "Clean", className: "text-white font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" },
  { id: "neon", label: "Neon", className: "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)] font-bold" },
  { id: "gold", label: "Gold", className: "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] font-bold" },
];

export interface StoryEditorProps {
  photoBlob: Blob | null;
  photoPreview: string | null;
  activeCheckinVenue?: VenueDB | null;
  allVenues: VenueDB[];
  isPremium: boolean;
  onClose: () => void;
  onPublish: (payload: {
    textOverlay: string;
    textStyle: string;
    selectedStickers: string[];
    vibeVote: string | null;
    venueTagged: boolean;
    selectedVenueId: string | null;
    moodTag: string | null;
    brightness: number;
  }) => void;
  isPublishing: boolean;
}

type Tab = "text" | "mood" | "venue" | "light";

const StoryEditor = ({
  photoPreview,
  activeCheckinVenue,
  allVenues,
  onClose,
  onPublish,
  isPublishing,
}: StoryEditorProps) => {
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [textStyle, setTextStyle] = useState("clean");
  const [moodTag, setMoodTag] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);

  // Venue state
  const [venueTagged, setVenueTagged] = useState(!!activeCheckinVenue);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(
    activeCheckinVenue?.id ?? null
  );
  const [venueSearch, setVenueSearch] = useState("");

  const currentStyle = TEXT_STYLES.find((s) => s.id === textStyle) ?? TEXT_STYLES[0];

  const selectedVenue: VenueDB | null = selectedVenueId
    ? (activeCheckinVenue?.id === selectedVenueId ? activeCheckinVenue : allVenues.find((v) => v.id === selectedVenueId) ?? null)
    : null;

  const filteredVenues = venueSearch.trim()
    ? allVenues.filter((v) => v.name.toLowerCase().includes(venueSearch.toLowerCase())).slice(0, 5)
    : allVenues.filter((v) => v.is_open).slice(0, 5);

  const handlePublish = () => {
    onPublish({
      textOverlay,
      textStyle,
      selectedStickers: [],
      vibeVote: moodTag,
      venueTagged,
      selectedVenueId,
      moodTag,
      brightness,
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* ── Preview ── */}
      <div className="relative flex-1 overflow-hidden">
        {photoPreview ? (
          <img
            src={photoPreview}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: `brightness(${brightness / 100})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-card flex items-center justify-center">
            <span className="text-6xl opacity-20">🌙</span>
          </div>
        )}

        {/* Subtle gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

        {/* Text overlay */}
        {textOverlay && (
          <div className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none">
            <p className={`text-center text-xl leading-snug px-4 py-2 rounded-xl bg-black/20 backdrop-blur-[2px] ${currentStyle.className}`}>
              {textOverlay}
            </p>
          </div>
        )}

        {/* Mood tag pill */}
        {moodTag && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-xs font-semibold text-white/90 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5">
              {MOOD_TAGS.find(m => m.id === moodTag)?.label}
            </span>
          </div>
        )}

        {/* Venue chip */}
        {selectedVenue && venueTagged && (
          <div className="absolute top-16 left-4 z-10">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/15">
              <MapPin className="w-3 h-3 text-white/70" />
              <span className="text-[11px] text-white/90 font-medium">{selectedVenue.name}</span>
              {activeCheckinVenue?.id === selectedVenueId && (
                <span className="text-[9px] text-green-400/90 font-medium ml-0.5">Active</span>
              )}
              <button
                onClick={() => { setVenueTagged(false); setSelectedVenueId(null); }}
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-white/10"
              >
                <X className="w-2.5 h-2.5 text-white/60" />
              </button>
            </div>
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
          <span className="text-white/80 font-semibold text-sm tracking-wide">New Story</span>
          <div className="w-9" /> {/* spacer */}
        </div>
      </div>

      {/* ── Bottom panel ── */}
      <div className="bg-black/95 border-t border-white/8 pb-safe">
        {/* Tool icons */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex gap-4">
        {([
              { id: "text" as Tab, icon: <Type className="w-5 h-5" />, label: "Text", show: true },
              { id: "mood" as Tab, icon: <span className="text-sm">☾</span>, label: "Mood", show: true },
              { id: "venue" as Tab, icon: <MapPin className="w-5 h-5" />, label: "Venue", show: !!activeCheckinVenue },
              { id: "light" as Tab, icon: <Sun className="w-5 h-5" />, label: "Light", show: true },
            ]).filter(t => t.show).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(activeTab === t.id ? null : t.id)}
                className={`p-2 rounded-full transition-all duration-200 ${
                  activeTab === t.id ? "text-white bg-white/10" : "text-white/40 hover:text-white/60"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* Share button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-full disabled:opacity-40 transition-opacity duration-200"
          >
            {isPublishing ? "..." : "Share"}
          </button>
        </div>

        {/* Expanded tool panels */}
        {activeTab && (
          <div className="px-6 pb-4 animate-slide-up" style={{ animationDuration: "250ms" }}>
            {activeTab === "text" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Add text..."
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value.slice(0, 80))}
                  className="w-full bg-white/8 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors duration-200"
                  autoFocus
                />
                <div className="flex gap-2">
                  {TEXT_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTextStyle(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                        textStyle === s.id ? "border-white/30 bg-white/10 text-white" : "border-white/8 text-white/40"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "mood" && (
              <div className="flex gap-2">
                {MOOD_TAGS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMoodTag(moodTag === m.id ? null : m.id)}
                    className={`px-4 py-2 rounded-full text-xs font-medium border transition-all duration-200 ${
                      moodTag === m.id
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/8 text-white/40 hover:text-white/60"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "venue" && (
              <div className="space-y-2">
                {activeCheckinVenue && (
                  <button
                    onClick={() => {
                      if (selectedVenueId === activeCheckinVenue.id && venueTagged) {
                        setVenueTagged(false);
                        setSelectedVenueId(null);
                      } else {
                        setSelectedVenueId(activeCheckinVenue.id);
                        setVenueTagged(true);
                      }
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 border ${
                      selectedVenueId === activeCheckinVenue.id && venueTagged
                        ? "bg-white/8 border-white/20"
                        : "bg-transparent border-white/8"
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <span className="text-sm text-white/80 font-medium flex-1 text-left truncate">{activeCheckinVenue.name}</span>
                    {selectedVenueId === activeCheckinVenue.id && venueTagged && (
                      <Check className="w-4 h-4 text-white/60 flex-shrink-0" />
                    )}
                  </button>
                )}

                {!activeCheckinVenue && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        placeholder="Search venue..."
                        value={venueSearch}
                        onChange={(e) => setVenueSearch(e.target.value)}
                        className="w-full bg-white/8 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {filteredVenues.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVenueId(v.id); setVenueTagged(true); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                            selectedVenueId === v.id ? "bg-white/8" : "hover:bg-white/5"
                          }`}
                        >
                          <span className="text-xs text-white/70 truncate">{v.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "light" && (
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-white/30" />
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={50}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs text-white/40 w-8 text-right">{brightness}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryEditor;
