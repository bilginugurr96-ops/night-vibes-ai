import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

import ModeToggle from "@/components/ModeToggle";
import ActiveCheckinChip from "@/components/ActiveCheckinChip";
import { useHeatMap, HEAT_TIERS, HeatVenue, HeatTier } from "@/hooks/useHeatMap";
import { useAuth } from "@/contexts/AuthContext";
import { useDayNight } from "@/contexts/DayNightContext";
import { Flame, Users, Zap, RefreshCw, Crown, Eye, Map, List, MapPin, Star } from "lucide-react";

// ── constants ─────────────────────────────────────────────────────────────────
const NIGHT_TYPE_LABELS: Record<string, string> = {
  all: "Tümü",
  club: "Kulüp",
  bar: "Bar",
  concert: "Konser",
  lounge: "Lounge",
};

const DAY_TYPE_LABELS: Record<string, string> = {
  all: "Tümü",
  cafe: "Kafe",
  restaurant: "Restoran",
  brunch: "Brunch",
  coworking: "Çalışma",
  beach: "Plaj",
  workshop: "Atölye",
};

// ── heat marker HTML ─────────────────────────────────────────────────────────
function buildMarkerHtml(venue: HeatVenue): string {
  const tier = HEAT_TIERS[venue.heatTier];
  const isOnFire = venue.heatTier === "on_fire";
  const isHot = venue.heatTier === "hot";
  const isTrending = venue.isTrending;

  const baseSize = 36 + Math.round((venue.heatScore / 100) * 20); // 36–56px
  const glowSize = isOnFire ? 24 : isHot ? 16 : 8;
  const emoji = isTrending ? "🔥" : tier.emoji;

  const pulseRing = isTrending
    ? `<div class="heat-ring" style="
        position:absolute;inset:0;border-radius:50% 50% 50% 0;
        border:2px solid ${tier.color};pointer-events:none;
        transform-origin:50% 50%;"></div>`
    : "";

  const trendingBadge = isTrending
    ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);
        background:${tier.color};color:white;font-size:9px;font-weight:700;
        padding:1px 5px;border-radius:8px;white-space:nowrap;
        box-shadow:0 0 8px ${tier.glowColor};">🔥 Trend</div>`
    : "";

  return `
    <div style="position:relative;width:${baseSize}px;height:${baseSize}px;">
      ${pulseRing}
      <div style="
        width:${baseSize}px;height:${baseSize}px;
        background:${tier.color};
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:2px solid rgba(255,255,255,0.85);
        box-shadow:0 0 ${glowSize}px ${tier.glowColor},0 0 ${glowSize * 2}px ${tier.glowColor};
        display:flex;align-items:center;justify-content:center;
        ${isOnFire ? `animation:on-fire-glow 1.2s ease-in-out infinite;` : ""}
      ">
        <span style="transform:rotate(45deg);font-size:${Math.round(baseSize * 0.38)}px;line-height:1;">
          ${emoji}
        </span>
      </div>
      ${trendingBadge}
    </div>
  `;
}

// ── heat tier bar ─────────────────────────────────────────────────────────────
function HeatScoreBar({ score }: { score: number }) {
  const tier = score >= 80 ? "on_fire" : score >= 60 ? "hot" : score >= 40 ? "active" : score >= 20 ? "warm" : "cold";
  const { color } = HEAT_TIERS[tier as HeatTier];
  return (
    <div style={{ background: "#ffffff10", borderRadius: 4, height: 4, overflow: "hidden", width: "100%" }}>
      <div style={{ background: color, height: "100%", width: `${score}%`, borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

// ── popup content ─────────────────────────────────────────────────────────────
function buildPopupContent(venue: HeatVenue, isPremium: boolean): string {
  const tier = HEAT_TIERS[venue.heatTier];
  const typeLabel = { ...NIGHT_TYPE_LABELS, ...DAY_TYPE_LABELS }[venue.type] ?? venue.type;

  const premiumSection = isPremium
    ? `<div style="margin-top:6px;padding:5px 8px;background:rgba(245,158,11,0.12);border-radius:6px;border:1px solid rgba(245,158,11,0.25);">
        <div style="font-size:10px;color:#f59e0b;font-weight:700;margin-bottom:2px;">👑 Premium Görünüm</div>
        <div style="font-size:11px;color:#aaa;">Anlık aktif: <strong style="color:${tier.color}">${venue.live_checkin_count ?? 0} kişi</strong></div>
        <div style="font-size:11px;color:#aaa;">Son 3 saat: <strong style="color:${tier.color}">${venue.recentCheckinCount} check-in</strong></div>
        <div style="font-size:11px;color:#aaa;">Story: <strong style="color:${tier.color}">${venue.recentStoryCount}</strong></div>
      </div>`
    : `<div style="margin-top:6px;padding:5px 8px;background:rgba(255,255,255,0.04);border-radius:6px;border:1px solid rgba(255,255,255,0.08);cursor:pointer;" onclick="window.__openPremiumPrompt && window.__openPremiumPrompt()">
        <div style="font-size:10px;color:#888;text-align:center;">🔒 <span style="color:#a855f7;font-weight:600;">Premium ile</span> tam detayları gör</div>
      </div>`;

  return `
    <div style="min-width:190px;padding:4px;font-family:'Space Grotesk',sans-serif;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <div style="font-weight:700;font-size:14px;color:#f0f0f0;flex:1;">${venue.name}</div>
        ${venue.isTrending ? `<span style="background:${tier.color};color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px;">🔥 TREND</span>` : ""}
      </div>

      <div style="font-size:11px;color:#666;margin-bottom:6px;">${venue.address ?? ""}</div>

      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <span style="background:${tier.color}22;color:${tier.color};padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">
          ${tier.emoji} ${tier.label}
        </span>
        <span style="background:rgba(255,255,255,0.06);color:#aaa;padding:2px 8px;border-radius:999px;font-size:11px;">
          ${typeLabel}
        </span>
        <span style="background:${venue.is_open ? "#22c55e22" : "#ef444422"};color:${venue.is_open ? "#22c55e" : "#ef4444"};padding:2px 8px;border-radius:999px;font-size:11px;">
          ${venue.is_open ? "Açık" : "Kapalı"}
        </span>
      </div>

      <div style="margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span style="font-size:11px;color:#888;">🌡 Isı Skoru</span>
          <span style="font-size:13px;font-weight:700;color:${tier.color};">${venue.heatScore}/100</span>
        </div>
        <div style="background:#ffffff12;border-radius:4px;height:5px;overflow:hidden;">
          <div style="background:linear-gradient(90deg,${tier.color},${tier.glowColor});height:100%;width:${venue.heatScore}%;border-radius:4px;"></div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin:8px 0;font-size:11px;color:#888;">
        <span>🔥 ${venue.live_checkin_count ?? 0} burada</span>
        <span>📊 Doluluk ${venue.crowd_level ?? 0}%</span>
      </div>

      ${premiumSection}

      <button onclick="window.__goToVenue && window.__goToVenue('${venue.id}')"
        style="width:100%;margin-top:8px;background:${tier.color};color:white;border:none;border-radius:8px;
        padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;
        box-shadow:0 0 12px ${tier.glowColor};">
        Vibeına Katıl →
      </button>
    </div>
  `;
}

// ── main component ────────────────────────────────────────────────────────────
const MapPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isNight } = useDayNight();
  const isPremium = profile?.is_premium ?? false;

  const currentTypeLabels = isNight ? NIGHT_TYPE_LABELS : DAY_TYPE_LABELS;
  const { data: heatVenues = [], isLoading, refetch } = useHeatMap(isNight ? "night" : "day");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const [filter, setFilter] = useState("all");
  const [heatFilter, setHeatFilter] = useState<HeatTier | "all">("all");
  const [mapReady, setMapReady] = useState(false);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Haversine distance in km
  const getDistanceKm = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const filteredVenues = heatVenues
    .filter((v) => {
      if (filter !== "all" && v.type !== filter) return false;
      if (heatFilter !== "all" && v.heatTier !== heatFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!userLocation) return 0;
      const distA = getDistanceKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = getDistanceKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    });

  const topTrending = heatVenues.filter((v) => v.isTrending).slice(0, 3);

  // Init map
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapContainerRef.current, {
      center: [41.0082, 28.9784],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    // Show user's current location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log("[LYNE] User location:", latitude, longitude);
        setUserLocation({ lat: latitude, lng: longitude });
        const userIcon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(var(--primary));border:3px solid hsl(var(--primary-foreground));box-shadow:0 0 12px hsl(var(--primary)/0.6),0 0 24px hsl(var(--primary)/0.2);"></div>
                 <div style="position:absolute;top:-4px;left:-4px;width:24px;height:24px;border-radius:50%;border:2px solid hsl(var(--primary)/0.3);animation:heat-ring 2s ease-out infinite;"></div>`,
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup('<div style="font-family:inherit;font-size:12px;color:#f0f0f0;font-weight:600;text-align:center;">📍 Konumun</div>');
        map.setView([latitude, longitude], 14);
      },
      () => { /* GPS unavailable, keep default Istanbul center */ },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    mapRef.current = map;
    setMapReady(true);
  }, []);

  // Load Leaflet
  useEffect(() => {
    if (document.getElementById("leaflet-script")) {
      initMap();
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-script";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = initMap;
    document.head.appendChild(script);
  }, [initMap]);

  // Re-init map if container ready but map not yet
  useEffect(() => {
    if (mapReady) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L && mapContainerRef.current && !mapRef.current) {
      initMap();
    }
  }, [mapReady, initMap]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapReady || filteredVenues.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredVenues.forEach((venue: HeatVenue) => {
      const tier = HEAT_TIERS[venue.heatTier];
      const size = 36 + Math.round((venue.heatScore / 100) * 20);

      const icon = L.divIcon({
        html: buildMarkerHtml(venue),
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size - 4],
      });

      const popup = L.popup({ maxWidth: 240 }).setContent(buildPopupContent(venue, isPremium));
      const marker = L.marker([venue.latitude, venue.longitude], { icon })
        .bindPopup(popup)
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });

    if (filteredVenues.length > 0) {
      const bounds = L.latLngBounds(filteredVenues.map((v: HeatVenue) => [v.latitude, v.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredVenues, mapReady, isPremium]);

  // Expose helpers
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__goToVenue = (id: string) => navigate(`/venue/${id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__openPremiumPrompt = () => setShowPremiumPrompt(true);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__goToVenue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__openPremiumPrompt;
    };
  }, [navigate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const hour = new Date().getHours();
  const isPeakHour = hour >= 20 || hour <= 3;

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-[1001] glass px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-gradient">
              {isNight ? "Isı Haritası" : "Mekan Haritası"}
            </h1>
            {isPeakHour && isNight && (
              <span className="text-xs bg-destructive/20 text-destructive border border-destructive/30 px-2 py-0.5 rounded-full font-semibold animate-pulse-neon">
                🌙 Peak
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            {/* View mode toggle */}
            <div className="flex items-center glass rounded-full p-0.5 mr-1">
              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-full transition-all ${viewMode === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Harita"
              >
                <Map className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-full transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Liste"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => refetch()}
              className="p-1.5 glass rounded-full hover:bg-white/10 transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
            </button>
            
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {Object.entries(currentTypeLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === key
                  ? "bg-primary text-primary-foreground neon-glow"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {label as string}
            </button>
          ))}
        </div>
      </header>

      {/* Heat Tier Legend */}
      <div className="px-4 py-2 z-[1001] relative bg-background/80 border-b border-border/30">
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-2">
          {(["all", "cold", "warm", "active", "hot", "on_fire"] as const).map((key) => {
            const isAll = key === "all";
            const tierInfo = isAll ? null : HEAT_TIERS[key];
            return (
              <button
                key={key}
                onClick={() => setHeatFilter(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  heatFilter === key
                    ? "border-transparent text-white"
                    : "glass border-border/30 text-muted-foreground hover:text-foreground"
                }`}
                style={
                  heatFilter === key && !isAll
                    ? { background: tierInfo!.color, boxShadow: `0 0 10px ${tierInfo!.glowColor}` }
                    : heatFilter === key && isAll
                    ? { background: "hsl(var(--primary))" }
                    : {}
                }
              >
                {isAll ? "🌍 Tümü" : `${tierInfo!.emoji} ${tierInfo!.label}`}
              </button>
            );
          })}
        </div>

        {/* Trending strip */}
        {topTrending.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {topTrending.map((v, i) => {
              const tier = HEAT_TIERS[v.heatTier];
              return (
                <button
                  key={v.id}
                  onClick={() => navigate(`/venue/${v.id}`)}
                  className="flex items-center gap-1.5 glass rounded-xl px-3 py-1.5 flex-shrink-0 border border-white/5 hover:border-white/20 transition-all"
                  style={{ boxShadow: `0 0 8px ${tier.glowColor}` }}
                >
                  <span className="text-sm font-bold" style={{ color: tier.color }}>#{i + 1}</span>
                  <Flame className="w-3 h-3" style={{ color: tier.color }} />
                  <span className="text-xs font-semibold text-foreground/90 max-w-[80px] truncate">{v.name}</span>
                  <span className="text-xs font-bold" style={{ color: tier.color }}>{v.heatScore}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <div className="relative flex-1" style={{ minHeight: "calc(100vh - 280px)" }}>
          <div ref={mapContainerRef} className="absolute inset-0" />

          {isLoading && (
            <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="glass rounded-2xl px-6 py-4 flex items-center gap-3">
                <Flame className="w-5 h-5 text-destructive animate-pulse" />
                <span className="text-sm font-semibold">Isı verileri yükleniyor…</span>
              </div>
            </div>
          )}

          {showPremiumPrompt && (
            <div className="absolute inset-0 z-[1005] flex items-end justify-center pb-12 px-4">
              <div className="glass rounded-2xl p-5 w-full max-w-sm border border-amber-500/30"
                style={{ boxShadow: "0 0 32px rgba(245,158,11,0.25)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-amber-400">Premium Özellik</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Mekandaki aktif kullanıcı sayısını, top profilleri ve anlık ısı verilerini görmek için Premium'a geçin.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPremiumPrompt(false)}
                    className="flex-1 glass rounded-xl py-2 text-sm text-muted-foreground"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => { setShowPremiumPrompt(false); navigate("/profile"); }}
                    className="flex-1 rounded-xl py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-destructive"
                  >
                    Premium'a Geç 👑
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active check-in chip */}
          <div className="absolute bottom-[100px] left-4 right-4 z-[1000] flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <ActiveCheckinChip />
            </div>
          </div>

          {/* Bottom info bar */}
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <div className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{filteredVenues.length}</span> mekan
                  </span>
                </div>
                {!isPremium && (
                  <button
                    onClick={() => navigate("/profile")}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Crown className="w-3 h-3" />
                    Premium'a Geç
                  </button>
                )}
                {isPremium && (
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <Crown className="w-3 h-3" />
                    Premium Aktif
                  </div>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {(Object.entries(HEAT_TIERS) as [HeatTier, typeof HEAT_TIERS[HeatTier]][]).map(([key, tier]) => {
                  const count = heatVenues.filter((v) => v.heatTier === key).length;
                  if (count === 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ background: tier.color }} />
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
                {isPeakHour && (
                  <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-amber-400 font-semibold">Peak Saat</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Flame className="w-5 h-5 text-destructive animate-pulse mr-2" />
              <span className="text-sm font-semibold text-muted-foreground">Yükleniyor…</span>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Mekan bulunamadı</div>
          ) : (
            filteredVenues.map((venue, index) => {
              const tier = HEAT_TIERS[venue.heatTier];
              const crowdColor = (venue.crowd_level ?? 50) >= 70 ? "text-primary" : (venue.crowd_level ?? 50) >= 40 ? "text-secondary" : "text-muted-foreground";
              return (
                <div
                  key={venue.id}
                  onClick={() => navigate(`/venue/${venue.id}`)}
                  className="glass rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.01] animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-3 p-3">
                    {/* Image */}
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={venue.image_url ?? "/placeholder.svg"}
                        alt={venue.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                      {venue.is_open && (
                        <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      )}
                      {venue.isTrending && (
                        <span
                          className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: tier.color }}
                        >
                          🔥
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display text-sm font-bold text-foreground truncate">{venue.name}</h3>
                          {venue.has_vip && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-neon text-primary-foreground">VIP</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {userLocation
                              ? `${getDistanceKm(userLocation.lat, userLocation.lng, venue.latitude, venue.longitude).toFixed(1)} km · `
                              : ""}
                            {venue.address}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                          <span className="text-xs font-semibold text-foreground">{venue.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Flame className={`w-3.5 h-3.5 ${crowdColor}`} />
                          <span className={`text-xs font-medium ${crowdColor}`}>%{venue.crowd_level}</span>
                        </div>
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: `${tier.color}22`, color: tier.color }}
                        >
                          {tier.emoji} {venue.heatScore}
                        </div>
                        {(venue.live_checkin_count ?? 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-secondary" />
                            <span className="text-xs font-medium text-secondary">{venue.live_checkin_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tags row */}
                  {(venue.tags ?? []).length > 0 && (
                    <div className="px-3 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
                      {(venue.tags ?? []).slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {showPremiumPrompt && viewMode === "map" && (
        <div
          className="absolute inset-0 z-[1004] bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPremiumPrompt(false)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default MapPage;
