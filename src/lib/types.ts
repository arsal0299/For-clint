export interface Profile {
  id: string;
  username: string;
  email: string;
  wallet_balance: number;
  wallet_hold: number;
  referral_balance: number;
  status: "active" | "blocked";
  is_admin: boolean;
  referral_earnings: number;
  created_at: string;
}

export interface SmmService {
  id: number;
  category: string;
  title: string;
  description: string | null;
  icon: string | null;
  price_per_1000: number;
  mother_service_id: number;
  min_qty: number;
  max_qty: number;
  avg_delivery: string | null;
  badge: string | null;
  pinned: boolean;
  active?: boolean;
  position?: number;
}

export interface SmmOrder {
  id: number;
  service_id: number;
  service_title: string;
  quantity: number;
  link: string;
  price: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  mother_order_id?: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  username?: string;
}

export interface Announcement {
  id: number;
  message: string;
  active: boolean;
  created_at: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export type TxType = "credit" | "debit";

export interface Transaction {
  id: number;
  user_id: string;
  type: TxType;
  amount: number;
  description: string | null;
  created_at: string;
}

export type NumberStatus = "active" | "pending" | "released" | "expired";

export interface NumberRequest {
  id: number;
  user_id: string;
  service: string;
  country: string;
  number: string;
  operator: string | null;
  server: number;
  mother_request_id?: string | null;
  otp_code: string | null;
  status: NumberStatus;
  cost: number;
  hold_amount: number;
  expires_at: string | null;
  requested_at: string;
  released_at: string | null;
  otp_received_at: string | null;
}

export interface Mailbox {
  id: number;
  user_id: string;
  address: string;
  token: string | null;
  created_at: string;
}

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentRequest {
  id: number;
  user_id: string;
  amount: number;
  screenshot_url: string;
  status: PaymentStatus;
  admin_reply: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface ServicePrice {
  service: string;
  price: number;
}

export interface PublicSettings {
  site_name: string;
  price_per_number: string;
  min_topup_amount: string;
  number_hold_minutes: string;
  country_status: string;
  contact_email: string;
  site_logo_url: string;
  payment_method_name: string;
  payment_bank_name: string;
  payment_account_title: string;
  payment_account_number: string;
  payment_instructions: string;
  maintenance_enabled: string;
  maintenance_title: string;
  maintenance_message: string;
  maintenance_start: string;
  maintenance_end: string;
  withdrawal_enabled: string;
  withdrawal_min_amount: string;
  withdrawal_min_verified_referrals: string;
}

export interface AdminUser extends Profile {
  total_numbers: number;
  otp_count: number;
  total_spent: number;
}

export interface AdminStats {
  total_users: number;
  blocked_users: number;
  total_numbers: number;
  active_numbers: number;
  total_revenue: number;
  wallets_total: number;
  held_total: number;
  pending_numbers: number;
  pending_payments: number;
  recent: (NumberRequest & { username: string })[];
}
