import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  points?: number;
  total_reviews?: number;
}

export interface Restaurant {
  id: number;
  name: string;
  category: string;
  address: string;
  area: string;
  rating: number;
  review_count: number;
  price_range: string;
  image_url: string;
  lat: number;
  lng: number;
  gst_percent: number;
  service_charge_percent: number;
  tags?: { tag: string; votes: number }[];
  current_crowd?: { level: string; timestamp: string };
  moods?: string; // JSON string
  peak_hours?: string; // JSON string
  avg_spend?: number;
  value_score?: number;
  view_count?: number;
  contact_number?: string;
  opening_hours?: string; // JSON string
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  rating: number;
  rating_count: number;
  dietary_info?: string; // JSON string
  portion_size?: number;
  spicy_level?: string;
}

export interface Review {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  rating: number;
  created_at: string;
}

export interface Reservation {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  date: string;
  time: string;
  people: number;
  status: string;
}
