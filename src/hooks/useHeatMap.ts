import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VenueDB } from "./useVenues";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type HeatTier = "cold" | "warm" | "active" | "hot" | "on_fire";

export interface HeatVenue extends VenueDB {
  heatScore: number;
  heatTier: HeatTier;
  recentCheckinCount: number;
  recentStoryCount: number;
  isTrending: boolean;
  rank: number;
}

export const HEAT_TIERS: Record<HeatTier, {
  label: string;
  color: string;
  glowColor: string;
  markerColor: string;
  emoji: string;
  minScore: number;
}> = {
  cold: {
    label: "Sakin",
    color: "#3b82f6",
    glowColor: "rgba(59,130,246,0.6)",
    markerColor: "#3b82f6",
    emoji: "❄️",
    minScore: 0,
  },
  warm: {
    label: "Isınıyor",
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.6)",
    markerColor: "#a855f7",
    emoji: "✨",
    minScore: 20,
  },
  active: {
    label: "Aktif",
    color: "#ec4899",
    glowColor: "rgba(236,72,153,0.6)",
    markerColor: "#ec4899",
    emoji: "🎵",
    minScore: 40,
  },
  hot: {
    label: "Çok Hareketli",
    color: "#f97316",
    glowColor: "rgba(249,115,22,0.7)",
    markerColor: "#f97316",
    emoji: "🔥",
    minScore: 60,
  },
  on_fire: {
    label: "Yanıyor!",
    color: "#ef4444",
    glowColor: "rgba(239,68,68,0.8)",
    markerColor: "#ef4444",
    emoji: "🌋",
    minScore: 80,
  },
};

function getHeatTier(score: number): HeatTier {
  if (score >= 80) return "on_fire";
  if (score >= 60) return "hot";
  if (score >= 40) return "active";
  if (score >= 20) return "warm";
  return "cold";
}

export function calcHeatScore(
  venue: VenueDB,
  recentCheckins: number,
  recentStories: number,
  recentLikes: number,
  isPeakHour: boolean,
): number {
  const peakMultiplier = isPeakHour ? 1.4 : 1.0;

  // Base signals
  const checkinScore = Math.min(recentCheckins * 8, 35);  // max 35
  const liveScore = Math.min((venue.live_checkin_count ?? 0) * 3, 20); // max 20
  const crowdScore = Math.min(((venue.crowd_level ?? 50) / 100) * 20, 20); // max 20
  const storyScore = Math.min(recentStories * 5, 15); // max 15
  const likeScore = Math.min(recentLikes * 2, 10); // max 10
  const premiumBoost = venue.has_vip ? 5 : 0; // max 5

  const raw = (checkinScore + liveScore + crowdScore + storyScore + likeScore + premiumBoost) * peakMultiplier;
  return Math.min(Math.round(raw), 100);
}

export const useHeatMap = () => {
  return useQuery({
    queryKey: ["heat_map"],
    refetchInterval: 90_000, // refresh every 1.5 min
    queryFn: async () => {
      // Determine if peak hours (20:00 – 03:00)
      const hour = new Date().getHours();
      const isPeakHour = hour >= 20 || hour <= 3;

      // Parallel: venues + recent checkins (last 3h) + stories (last 3h)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();

      const [
        { data: venues, error: venuesErr },
        { data: recentCheckins },
        { data: recentStories },
        { data: recentLikes },
      ] = await Promise.all([
        db.from("venues").select("*").order("rating", { ascending: false }),
        db.from("checkins").select("venue_id, checked_in_at").gte("checked_in_at", threeHoursAgo),
        db.from("night_stories").select("venue_id, created_at").gte("created_at", ninetyMinAgo).not("venue_id", "is", null),
        db.from("likes").select("venue_id, created_at").gte("created_at", threeHoursAgo).not("venue_id", "is", null),
      ]);

      if (venuesErr) throw venuesErr;

      // Build venue-level aggregates
      const checkinByVenue = new Map<string, number>();
      for (const c of recentCheckins ?? []) {
        checkinByVenue.set(c.venue_id, (checkinByVenue.get(c.venue_id) ?? 0) + 1);
      }

      const storyByVenue = new Map<string, number>();
      for (const s of recentStories ?? []) {
        storyByVenue.set(s.venue_id, (storyByVenue.get(s.venue_id) ?? 0) + 1);
      }

      const likesByVenue = new Map<string, number>();
      for (const l of recentLikes ?? []) {
        likesByVenue.set(l.venue_id, (likesByVenue.get(l.venue_id) ?? 0) + 1);
      }

      // Compute heat scores
      const heatVenues: HeatVenue[] = (venues as VenueDB[])
        .filter((v) => v.latitude && v.longitude)
        .map((v) => {
          const recentCheckinCount = checkinByVenue.get(v.id) ?? 0;
          const recentStoryCount = storyByVenue.get(v.id) ?? 0;
          const recentLikeCount = likesByVenue.get(v.id) ?? 0;
          const heatScore = calcHeatScore(v, recentCheckinCount, recentStoryCount, recentLikeCount, isPeakHour);
          return {
            ...v,
            heatScore,
            heatTier: getHeatTier(heatScore),
            recentCheckinCount,
            recentStoryCount,
            isTrending: false,
            rank: 0,
          };
        })
        .sort((a, b) => b.heatScore - a.heatScore);

      // Mark top 3 as trending
      heatVenues.forEach((v, i) => {
        v.rank = i + 1;
        v.isTrending = i < 3 && v.heatScore >= 30;
      });

      return heatVenues;
    },
  });
};
