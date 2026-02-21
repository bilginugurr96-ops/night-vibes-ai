import venue1 from "@/assets/venue-1.jpg";
import venue2 from "@/assets/venue-2.jpg";
import venue3 from "@/assets/venue-3.jpg";
import venue4 from "@/assets/venue-4.jpg";

export interface Venue {
  id: string;
  name: string;
  type: "club" | "bar" | "concert" | "lounge";
  image: string;
  address: string;
  rating: number;
  crowdLevel: number;
  isOpen: boolean;
  hours: string;
  hasVIP: boolean;
  distance: string;
  tags: string[];
}

export interface Event {
  id: string;
  name: string;
  venueId: string;
  venueName: string;
  image: string;
  date: string;
  time: string;
  description: string;
  price: string;
  attendees: number;
  tags: string[];
}

export const venues: Venue[] = [
  {
    id: "1",
    name: "Neon Pulse",
    type: "club",
    image: venue1,
    address: "Beşiktaş, Istanbul",
    rating: 4.8,
    crowdLevel: 78,
    isOpen: true,
    hours: "22:00 - 05:00",
    hasVIP: true,
    distance: "1.2 km",
    tags: ["Elektronik", "DJ", "Dans"],
  },
  {
    id: "2",
    name: "Skyline Terrace",
    type: "bar",
    image: venue2,
    address: "Karaköy, Istanbul",
    rating: 4.6,
    crowdLevel: 55,
    isOpen: true,
    hours: "18:00 - 03:00",
    hasVIP: true,
    distance: "0.8 km",
    tags: ["Kokteyl", "Manzara", "Chill"],
  },
  {
    id: "3",
    name: "Echo Stage",
    type: "concert",
    image: venue3,
    address: "Kadıköy, Istanbul",
    rating: 4.9,
    crowdLevel: 92,
    isOpen: true,
    hours: "20:00 - 02:00",
    hasVIP: false,
    distance: "3.5 km",
    tags: ["Canlı Müzik", "Rock", "Konser"],
  },
  {
    id: "4",
    name: "Velvet Room",
    type: "lounge",
    image: venue4,
    address: "Nişantaşı, Istanbul",
    rating: 4.7,
    crowdLevel: 40,
    isOpen: true,
    hours: "19:00 - 04:00",
    hasVIP: true,
    distance: "2.1 km",
    tags: ["Lounge", "Kokteyl", "Premium"],
  },
];

export const events: Event[] = [
  {
    id: "e1",
    name: "Midnight Electric",
    venueId: "1",
    venueName: "Neon Pulse",
    image: venue1,
    date: "22 Şubat 2026",
    time: "23:00",
    description: "DJ Pulse ile elektronik müzik gecesi. Lazer show ve özel performanslar.",
    price: "₺350",
    attendees: 234,
    tags: ["Elektronik", "DJ", "Lazer Show"],
  },
  {
    id: "e2",
    name: "Sunset Sessions",
    venueId: "2",
    venueName: "Skyline Terrace",
    image: venue2,
    date: "23 Şubat 2026",
    time: "18:00",
    description: "Günbatımı eşliğinde canlı akustik performans ve özel kokteyl menüsü.",
    price: "₺200",
    attendees: 89,
    tags: ["Akustik", "Kokteyl", "Sunset"],
  },
  {
    id: "e3",
    name: "Rock Riot",
    venueId: "3",
    venueName: "Echo Stage",
    image: venue3,
    date: "25 Şubat 2026",
    time: "21:00",
    description: "3 bant ile rock gecesi. Sahne önü biletler sınırlı.",
    price: "₺500",
    attendees: 456,
    tags: ["Rock", "Canlı Müzik", "Festival"],
  },
  {
    id: "e4",
    name: "Velvet Jazz Night",
    venueId: "4",
    venueName: "Velvet Room",
    image: venue4,
    date: "24 Şubat 2026",
    time: "20:00",
    description: "Caz müzik eşliğinde özel bir akşam. Sınırlı kontenjan.",
    price: "₺450",
    attendees: 42,
    tags: ["Jazz", "Premium", "Özel"],
  },
];

export const NIGHT_CATEGORIES = [
  { id: "all", label: "Tümü", icon: "✨" },
  { id: "club", label: "Kulüpler", icon: "🎵" },
  { id: "bar", label: "Barlar", icon: "🍸" },
  { id: "concert", label: "Konserler", icon: "🎸" },
  { id: "lounge", label: "Lounge", icon: "🛋️" },
];

export const DAY_CATEGORIES = [
  { id: "all", label: "Tümü", icon: "✨" },
  { id: "cafe", label: "Kafe", icon: "☕" },
  { id: "restaurant", label: "Restoran", icon: "🍽️" },
  { id: "brunch", label: "Brunch", icon: "🥞" },
  { id: "coworking", label: "Çalışma", icon: "💻" },
  { id: "beach", label: "Plaj", icon: "🏖️" },
  { id: "workshop", label: "Atölye", icon: "🎨" },
];

// Legacy export for backward compatibility
export const categories = NIGHT_CATEGORIES;
