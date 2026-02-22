import { useState, useRef, useCallback, useEffect } from "react";
import { X, Type, MapPin, Sun, Check, Search, Pen } from "lucide-react";
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

type Tab = "text" | "mood" | "venue" | "light" | "draw";

interface DrawPoint {
  x: number;
  y: number;
}

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

  // Draw state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPaths, setDrawPaths] = useState<DrawPoint[][]>([]);
  const [currentPath, setCurrentPath] = useState<DrawPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawContainerRef = useRef<HTMLDivElement>(null);

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

  // Redraw canvas when paths change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const allPaths = [...drawPaths, ...(currentPath.length > 0 ? [currentPath] : [])];
    for (const path of allPaths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }
  }, [drawPaths, currentPath]);

  // Draw handlers
  const getDrawPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = "touches" in e ? e.touches[0] : e;
    return {
      x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
      y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const handleDrawStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (activeTab !== "draw") return;
    e.preventDefault();
    setIsDrawing(true);
    setCurrentPath([getDrawPos(e)]);
  }, [activeTab, getDrawPos]);

  const handleDrawMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || activeTab !== "draw") return;
    e.preventDefault();
    setCurrentPath(prev => [...prev, getDrawPos(e)]);
  }, [isDrawing, activeTab, getDrawPos]);

  const handleDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      setDrawPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath([]);
  }, [isDrawing, currentPath]);

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

  const tools = [
    { id: "text" as Tab, icon: <Type className="w-5 h-5" />, show: true },
    { id: "draw" as Tab, icon: <Pen className="w-5 h-5" />, show: true },
    { id: "mood" as Tab, icon: <span className="text-sm">☾</span>, show: true },
    { id: "venue" as Tab, icon: <MapPin className="w-5 h-5" />, show: !!activeCheckinVenue },
    { id: "light" as Tab, icon: <Sun className="w-5 h-5" />, show: true },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Preview */}
      <div className="relative flex-1 overflow-hidden" ref={drawContainerRef}>
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/25 pointer-events-none" />

        {/* Draw canvas */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: activeTab === "draw" ? "none" : "auto", zIndex: activeTab === "draw" ? 5 : 1 }}
          onTouchStart={handleDrawStart}
          onTouchMove={handleDrawMove}
          onTouchEnd={handleDrawEnd}
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
        />

        {/* Text overlay */}
        {textOverlay && (
          <div className="absolute inset-0 flex items-center justify-center px-8 pointer-events-none z-10">
            <p className={`text-center text-xl leading-snug px-4 py-2 rounded-xl bg-black/20 backdrop-blur-[2px] ${currentStyle.className}`}>
              {textOverlay}
            </p>
          </div>
        )}

        {/* Mood tag */}
        {moodTag && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-10">
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

        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
          <span className="text-white/70 font-medium text-sm">New Story</span>
          <div className="w-9" />
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bg-black/95 border-t border-white/6 pb-safe">
        {/* Tool icons */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex gap-3">
            {tools.filter(t => t.show).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(activeTab === t.id ? null : t.id)}
                className={`p-2.5 rounded-full transition-all duration-200 ${
                  activeTab === t.id ? "text-white bg-white/10" : "text-white/35 hover:text-white/60"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-full disabled:opacity-40 transition-all duration-200 active:scale-95"
          >
            {isPublishing ? "..." : "Share"}
          </button>
        </div>

        {/* Expanded panels */}
        {activeTab && activeTab !== "draw" && (
          <div className="px-5 pb-4" style={{ animation: "slideUp 250ms ease-out" }}>
            {activeTab === "text" && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Add text..."
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value.slice(0, 80))}
                  className="w-full bg-white/6 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                  autoFocus
                />
                <div className="flex gap-2">
                  {TEXT_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTextStyle(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                        textStyle === s.id ? "border-white/25 bg-white/8 text-white" : "border-white/6 text-white/35"
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
                        ? "border-white/25 bg-white/8 text-white"
                        : "border-white/6 text-white/35 hover:text-white/60"
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
                        ? "bg-white/6 border-white/15"
                        : "bg-transparent border-white/6"
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sm text-white/70 font-medium flex-1 text-left truncate">{activeCheckinVenue.name}</span>
                    {selectedVenueId === activeCheckinVenue.id && venueTagged && (
                      <Check className="w-4 h-4 text-white/50 flex-shrink-0" />
                    )}
                  </button>
                )}

                {!activeCheckinVenue && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                      <input
                        type="text"
                        placeholder="Search venue..."
                        value={venueSearch}
                        onChange={(e) => setVenueSearch(e.target.value)}
                        className="w-full bg-white/6 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {filteredVenues.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVenueId(v.id); setVenueTagged(true); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                            selectedVenueId === v.id ? "bg-white/6" : "hover:bg-white/4"
                          }`}
                        >
                          <span className="text-xs text-white/60 truncate">{v.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "light" && (
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-white/25" />
                <Slider
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  min={50}
                  max={150}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs text-white/30 w-8 text-right">{brightness}%</span>
              </div>
            )}
          </div>
        )}

        {/* Draw mode info */}
        {activeTab === "draw" && (
          <div className="px-5 pb-3 flex items-center justify-between">
            <span className="text-[11px] text-white/30">Draw on photo</span>
            {drawPaths.length > 0 && (
              <button
                onClick={() => setDrawPaths(prev => prev.slice(0, -1))}
                className="text-[11px] text-white/40 hover:text-white/60 transition-colors"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StoryEditor;
