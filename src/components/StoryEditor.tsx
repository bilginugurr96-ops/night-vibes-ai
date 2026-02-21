import { useState } from "react";
import {
  X, Type, Smile, MapPin,
  Zap, Check, ChevronRight, Crown, Search,
} from "lucide-react";
import { VenueDB } from "@/hooks/useVenues";
import { HeatVenue, HEAT_TIERS } from "@/hooks/useHeatMap";

export type Sticker = { id: string; emoji: string; label: string; premiumOnly?: boolean };
export type VibeOption = { id: string; emoji: string; label: string };
export type TextStyle = { id: string; label: string; className: string };

const STICKERS: Sticker[] = [
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "music", emoji: "🎧", label: "Müzik" },
  { id: "dance", emoji: "💃", label: "Dans" },
  { id: "party", emoji: "🎉", label: "Parti" },
  { id: "cocktail", emoji: "🍸", label: "İçki" },
  { id: "night", emoji: "🌙", label: "Gece" },
  { id: "star", emoji: "⭐", label: "Yıldız" },
  { id: "crown", emoji: "👑", label: "Taç", premiumOnly: true },
  { id: "diamond", emoji: "💎", label: "Elmas", premiumOnly: true },
];

const VIBE_OPTIONS: VibeOption[] = [
  { id: "hot", emoji: "🔥", label: "Hot" },
  { id: "chill", emoji: "🎧", label: "Chill" },
  { id: "wild", emoji: "💃", label: "Wild" },
  { id: "vip", emoji: "👑", label: "VIP" },
];

const TEXT_STYLES: TextStyle[] = [
  { id: "neon", label: "Neon", className: "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)] font-bold" },
  { id: "electric", label: "Elektrik", className: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)] font-bold" },
  { id: "fire", label: "Ateş", className: "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.9)] font-bold" },
  { id: "white", label: "Beyaz", className: "text-white font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" },
  { id: "gold", label: "Altın", className: "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)] font-bold" },
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
  }) => void;
  isPublishing: boolean;
}

type Tab = "text" | "stickers" | "vibe" | "venue";

const StoryEditor = ({
  photoBlob,
  photoPreview,
  activeCheckinVenue,
  allVenues,
  isPremium,
  onClose,
  onPublish,
  isPublishing,
}: StoryEditorProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [textOverlay, setTextOverlay] = useState("");
  const [textStyle, setTextStyle] = useState<string>("neon");
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [vibeVote, setVibeVote] = useState<string | null>(null);

  // Smart venue state: auto-attach if active check-in exists
  const [venueTagged, setVenueTagged] = useState(!!activeCheckinVenue);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(
    activeCheckinVenue?.id ?? null
  );
  const [showVenueSearch, setShowVenueSearch] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");

  const currentStyle = TEXT_STYLES.find((s) => s.id === textStyle) ?? TEXT_STYLES[0];

  const toggleSticker = (id: string) => {
    setSelectedStickers((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Find the currently selected venue for display
  const selectedVenue: VenueDB | null = selectedVenueId
    ? (activeCheckinVenue?.id === selectedVenueId ? activeCheckinVenue : allVenues.find((v) => v.id === selectedVenueId) ?? null)
    : null;

  const heatTier = selectedVenue && "heatTier" in selectedVenue ? (selectedVenue as unknown as HeatVenue).heatTier : null;
  const tierInfo = heatTier ? HEAT_TIERS[heatTier] : null;

  // Filtered venue list for manual search
  const filteredVenues = venueSearch.trim()
    ? allVenues.filter((v) => v.name.toLowerCase().includes(venueSearch.toLowerCase())).slice(0, 6)
    : allVenues.filter((v) => v.is_open).slice(0, 6);

  const handleSelectManualVenue = (venue: VenueDB) => {
    setSelectedVenueId(venue.id);
    setVenueTagged(true);
    setShowVenueSearch(false);
    setVenueSearch("");
  };

  const handleRemoveVenue = () => {
    setVenueTagged(false);
    setSelectedVenueId(null);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Preview area */}
      <div className="relative flex-1 overflow-hidden">
        {photoPreview ? (
          <img src={photoPreview} alt="Story preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950 to-black flex items-center justify-center">
            <span className="text-8xl">🌙</span>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

        {/* Text overlay preview */}
        {textOverlay && (
          <div className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none">
            <p className={`text-center text-2xl leading-snug px-4 py-2 rounded-xl bg-black/30 backdrop-blur-sm ${currentStyle.className}`}>
              {textOverlay}
            </p>
          </div>
        )}

        {/* Selected stickers preview */}
        {selectedStickers.length > 0 && (
          <div className="absolute top-24 right-4 flex flex-col gap-2 pointer-events-none">
            {selectedStickers.map((s) => {
              const sticker = STICKERS.find((st) => st.id === s);
              return sticker ? (
                <span key={s} className="text-4xl drop-shadow-lg">{sticker.emoji}</span>
              ) : null;
            })}
          </div>
        )}

        {/* Vibe vote preview */}
        {vibeVote && (
          <div className="absolute bottom-40 left-4 right-4 pointer-events-none">
            <div className="glass rounded-2xl px-4 py-3 backdrop-blur-md border border-white/10">
              <p className="text-white text-xs font-semibold text-center mb-2">Bu vibe nasıl?</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {VIBE_OPTIONS.map((v) => (
                  <span
                    key={v.id}
                    className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                      vibeVote === v.id
                        ? "bg-primary text-white"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {v.emoji} {v.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Venue tag preview */}
        {selectedVenue && venueTagged && (
          <div className="absolute top-16 left-4">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 backdrop-blur-md border border-white/20"
              style={{ background: tierInfo ? `${tierInfo.color}22` : "rgba(255,255,255,0.1)" }}
            >
              <MapPin className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-bold">{selectedVenue.name}</span>
              {tierInfo && <span className="text-xs">{tierInfo.emoji}</span>}
              {activeCheckinVenue?.id === selectedVenueId && (
                <span className="text-[9px] bg-green-400/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">✓ Check-in</span>
              )}
            </div>
          </div>
        )}

        {/* Top controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="w-9 h-9 glass rounded-full flex items-center justify-center border border-white/20"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <span className="text-white font-bold text-sm">Hikaye Düzenle</span>
          <button
            onClick={() => onPublish({ textOverlay, textStyle, selectedStickers, vibeVote, venueTagged, selectedVenueId })}
            disabled={isPublishing}
            className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-2 rounded-full disabled:opacity-50"
          >
            {isPublishing ? "Paylaşılıyor…" : <>Paylaş <ChevronRight className="w-3 h-3" /></>}
          </button>
        </div>
      </div>

      {/* Bottom editor panel */}
      <div className="bg-black border-t border-white/10 pb-safe">
        {/* Tab selector */}
        <div className="flex border-b border-white/10">
          {[
            { id: "text" as Tab, icon: <Type className="w-4 h-4" />, label: "Metin" },
            { id: "stickers" as Tab, icon: <Smile className="w-4 h-4" />, label: "Etiket" },
            { id: "vibe" as Tab, icon: <Zap className="w-4 h-4" />, label: "Vibe" },
            { id: "venue" as Tab, icon: <MapPin className="w-4 h-4" />, label: "Mekan" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${
                activeTab === t.id ? "text-primary border-b-2 border-primary" : "text-white/40"
              }`}
            >
              {t.icon}
              <span className="text-[9px] font-semibold">{t.label}</span>
              {t.id === "venue" && venueTagged && (
                <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-green-400" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 min-h-[140px]">
          {activeTab === "text" && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Bir şeyler yaz... 🌙"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value.slice(0, 80))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-primary/60"
              />
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {TEXT_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTextStyle(s.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      textStyle === s.id ? "border-white bg-white/20" : "border-white/20 bg-transparent"
                    } ${s.className}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "stickers" && (
            <div className="grid grid-cols-5 gap-3">
              {STICKERS.map((s) => {
                const locked = s.premiumOnly && !isPremium;
                const active = selectedStickers.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => !locked && toggleSticker(s.id)}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      active ? "bg-primary/30 border border-primary/60" : "bg-white/5 border border-white/10"
                    } ${locked ? "opacity-40" : ""}`}
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-[9px] text-white/60 font-medium">{s.label}</span>
                    {locked && (
                      <div className="absolute top-0.5 right-0.5">
                        <Crown className="w-2.5 h-2.5 text-amber-400" />
                      </div>
                    )}
                    {active && (
                      <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "vibe" && (
            <div className="space-y-3">
              <p className="text-white/60 text-xs font-medium text-center">Takipçilerinin oy vermesini sağla</p>
              <div className="grid grid-cols-2 gap-2">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVibeVote(vibeVote === v.id ? null : v.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${
                      vibeVote === v.id
                        ? "bg-primary/30 border-primary text-white"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}
                  >
                    <span className="text-xl">{v.emoji}</span>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "venue" && (
            <div className="space-y-3">
              {/* Active check-in auto-suggest */}
              {activeCheckinVenue && (
                <div className="space-y-2">
                  <p className="text-green-400 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3 h-3" /> Aktif Check-in Mekanın
                  </p>
                  <button
                    onClick={() => {
                      if (selectedVenueId === activeCheckinVenue.id && venueTagged) {
                        handleRemoveVenue();
                      } else {
                        setSelectedVenueId(activeCheckinVenue.id);
                        setVenueTagged(true);
                      }
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all border ${
                      selectedVenueId === activeCheckinVenue.id && venueTagged
                        ? "bg-green-400/15 border-green-400/40"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <MapPin className={`w-4 h-4 flex-shrink-0 ${selectedVenueId === activeCheckinVenue.id && venueTagged ? "text-green-400" : "text-white/40"}`} />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm text-white font-bold truncate">{activeCheckinVenue.name}</p>
                      <p className="text-[10px] text-white/40">Varsayılan olarak eklenir</p>
                    </div>
                    {selectedVenueId === activeCheckinVenue.id && venueTagged && (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </button>
                </div>
              )}

              {/* Divider */}
              {activeCheckinVenue && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] text-white/30 font-medium">veya</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}

              {/* Manual venue search */}
              <div>
                <button
                  onClick={() => setShowVenueSearch(!showVenueSearch)}
                  className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{showVenueSearch ? "Aramayı kapat" : "+ Mekanı manuel ekle"}</span>
                </button>

                {showVenueSearch && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Mekan ara..."
                      value={venueSearch}
                      onChange={(e) => setVenueSearch(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/40 text-xs focus:outline-none focus:border-primary/60"
                      autoFocus
                    />
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {filteredVenues.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => handleSelectManualVenue(v)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                            selectedVenueId === v.id ? "bg-primary/20 border border-primary/40" : "bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <MapPin className="w-3 h-3 text-white/40 flex-shrink-0" />
                          <span className="text-xs text-white truncate">{v.name}</span>
                          <span className="text-[10px] text-white/30 ml-auto flex-shrink-0">{v.type}</span>
                        </button>
                      ))}
                      {filteredVenues.length === 0 && (
                        <p className="text-[10px] text-white/30 text-center py-2">Mekan bulunamadı</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Remove venue */}
              {venueTagged && selectedVenue && (
                <button
                  onClick={handleRemoveVenue}
                  className="flex items-center gap-1.5 text-xs text-destructive/70 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Mekanı kaldır</span>
                </button>
              )}

              {/* No venue state */}
              {!venueTagged && !activeCheckinVenue && !showVenueSearch && (
                <div className="text-center py-2">
                  <p className="text-[11px] text-white/30">Aktif check-in yok</p>
                  <p className="text-[10px] text-white/20">Check-in yaparak mekanı otomatik ekleyebilirsin</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryEditor;
