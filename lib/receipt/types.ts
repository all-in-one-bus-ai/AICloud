import { CartItem } from '@/lib/promotions/types';

export interface ReceiptData {
  storeInfo: StoreInfo;
  receiptSettings: ReceiptPreferences;
  taxSettings: TaxConfig;
  transaction: TransactionInfo;
  items: ReceiptItem[];
  totals: ReceiptTotals;
  membership?: MembershipInfo;
  cashier: CashierInfo;
}

export interface StoreInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
  whatsapp_number: string;
  whatsapp_qr_url?: string;
  currency_symbol: string;
}

export interface ReceiptPreferences {
  paper_width: '58mm' | '80mm';
  show_logo: boolean;
  show_barcode: boolean;
  show_qr_code: boolean;
  barcode_type: string;
  header_text: string;
  footer_text: string;
  greeting_message: string;
  thank_you_message: string;
  show_tax_breakdown: boolean;
  show_item_details: boolean;
  show_cashier_name: boolean;
  show_payment_method: boolean;
}

export interface TaxConfig {
  tax_name: string;
  tax_rate: number;
  tax_enabled: boolean;
  tax_inclusive: boolean;
}

export interface TransactionInfo {
  receipt_number: string;
  receipt_barcode: string;
  date: Date;
  payment_method: string;
  payment_amount: number;
  change_amount: number;
}

export interface ReceiptItem {
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_subtotal: number;
  line_discount: number;
  line_total: number;
  is_weight_item: boolean;
  measured_weight?: number;
  weight_unit?: string;
  member_discount?: number;
}

export interface ReceiptTotals {
  subtotal: number;
  total_discount: number;
  tax_amount: number;
  grand_total: number;
}

export interface MembershipInfo {
  card_number: string;
  member_name: string;
  points_earned: number;
  tier: string;
}

export interface CashierInfo {
  name: string;
  id: string;
}
