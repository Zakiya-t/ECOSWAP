import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── TypeScript types matching DB schema ─────────────────────

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  city?: string;
  pincode?: string;
  email?: string;
  phone?: string;
  upi_id?: string;
  bank_account?: string;
  eco_score: number;
  eco_points: number;
  agreed_terms: boolean;
  co2_saved: number;
  items_swapped: number;
  rating: number;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  type: 'Swap' | 'Borrow' | 'Sell' | 'Donate';
  condition?: string;
  price?: number;
  deposit?: number;
  city?: string;
  status: 'active' | 'pending' | 'sold' | 'borrowed' | 'flagged' | 'completed' | 'cancelled';
  image_url?: string;
  co2_impact: number;
  created_at: string;
  profiles?: Profile;
}

export interface Transaction {
  id: string;
  user_id: string;
  item_id?: string;
  partner_name: string;
  transaction_type: 'Swap' | 'Borrow' | 'Sell' | 'Donate';
  item_title: string;
  price?: number;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  item_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  message: string;
  admin_reply?: string;
  status: 'open' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  item_id?: string;
  user1_id: string;
  user2_id: string;
  last_message?: string;
  last_message_at: string;
  items?: Item;
  user1?: Profile;
  user2?: Profile;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}
