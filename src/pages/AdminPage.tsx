import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, Users, MapPin, Calendar, Shield, ArrowLeft,
  TrendingUp, Activity, Eye, Search,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const AdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check admin role
  const { data: isAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["admin-check", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
  });

  if (checkingRole) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Yetki kontrol ediliyor…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-16 h-16 text-destructive/50" />
        <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
        <button onClick={() => navigate("/")} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-50 glass px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-display text-lg font-bold text-foreground">Admin Panel</h1>
        </div>
      </header>

      <div className="px-4 mt-4">
        <Tabs defaultValue="dashboard">
          <TabsList className="w-full glass overflow-x-auto">
            <TabsTrigger value="dashboard" className="flex-1 text-xs">Dashboard</TabsTrigger>
            <TabsTrigger value="users" className="flex-1 text-xs">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="venues" className="flex-1 text-xs">Mekanlar</TabsTrigger>
            <TabsTrigger value="events" className="flex-1 text-xs">Etkinlikler</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="venues"><VenuesTab /></TabsContent>
          <TabsContent value="events"><EventsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Dashboard
function DashboardTab() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: userCount },
        { count: venueCount },
        { count: eventCount },
        { count: checkinCount },
      ] = await Promise.all([
        db.from("profiles").select("*", { count: "exact", head: true }),
        db.from("venues").select("*", { count: "exact", head: true }),
        db.from("events").select("*", { count: "exact", head: true }),
        db.from("checkins").select("*", { count: "exact", head: true }),
      ]);
      return { userCount, venueCount, eventCount, checkinCount };
    },
  });

  const cards = [
    { label: "Toplam Kullanıcı", value: stats?.userCount ?? 0, icon: Users, color: "text-primary" },
    { label: "Toplam Mekan", value: stats?.venueCount ?? 0, icon: MapPin, color: "text-green-400" },
    { label: "Toplam Etkinlik", value: stats?.eventCount ?? 0, icon: Calendar, color: "text-amber-400" },
    { label: "Toplam Check-in", value: stats?.checkinCount ?? 0, icon: Activity, color: "text-pink-400" },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`w-4 h-4 ${card.color}`} />
            <span className="text-xs text-muted-foreground">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// Users Tab
function UsersTab() {
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, social_power, subscription_tier, created_at, is_premium, level")
        .order("social_power", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const filtered = users.filter((u: any) =>
    (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.username ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-4 space-y-3">
      <Input
        placeholder="Kullanıcı ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="glass border-border/30"
      />
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Yükleniyor…</div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((u: any) => (
            <div key={u.user_id} className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{u.display_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">@{u.username} · Lvl {u.level ?? 1}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{u.social_power} SP</p>
                <p className="text-xs text-muted-foreground">{u.subscription_tier}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Venues Tab
function VenuesTab() {
  const [search, setSearch] = useState("");
  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["admin-venues"],
    queryFn: async () => {
      const { data, error } = await db
        .from("venues")
        .select("id, name, type, rating, is_open, address, live_checkin_count, venue_mode")
        .order("rating", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filtered = venues.filter((v: any) =>
    (v.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-4 space-y-3">
      <Input
        placeholder="Mekan ara…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="glass border-border/30"
      />
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Yükleniyor…</div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((v: any) => (
            <div key={v.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{v.name}</p>
                <p className="text-xs text-muted-foreground">{v.type} · {v.venue_mode} · ⭐ {v.rating}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${v.is_open ? "bg-green-400" : "bg-red-400"}`} />
                {(v.live_checkin_count ?? 0) > 0 && (
                  <span className="text-xs text-primary font-semibold">{v.live_checkin_count} 📍</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Events Tab
function EventsTab() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await db
        .from("events")
        .select("id, name, event_date, event_time, attendees, venues(name)")
        .order("event_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mt-4 space-y-2">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Yükleniyor…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Etkinlik yok</div>
      ) : (
        events.map((e: any) => (
          <div key={e.id} className="glass rounded-xl p-3 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{e.name}</p>
              <p className="text-xs text-muted-foreground">
                {e.event_date} · {e.event_time?.slice(0, 5)} · {e.venues?.name ?? "—"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{e.attendees ?? 0} kişi</span>
          </div>
        ))
      )}
    </div>
  );
}

export default AdminPage;
