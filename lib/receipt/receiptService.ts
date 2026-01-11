import { supabase } from '@/lib/supabase/client';
import { CartItem } from '@/lib/promotions/types';
import {
  ReceiptData,
  StoreInfo,
  ReceiptPreferences,
  TaxConfig,
  TransactionInfo,
  ReceiptItem,
  ReceiptTotals,
  MembershipInfo,
  CashierInfo,
} from './types';
import { Database } from '@/lib/supabase/types';

type Membership = Database['public']['Tables']['memberships']['Row'];

export async function generateReceiptData(
  tenantId: string,
  cartItems: CartItem[],
  paymentMethod: string,
  paymentAmount: number,
  changeAmount: number,
  membership: Membership | null,
  cashierId: string,
  receiptBarcode: string
): Promise<ReceiptData> {
  const [storeSettings, receiptSettings, taxSettings, cashierProfile, loyaltySettings] =
    await Promise.all([
      fetchStoreSettings(tenantId),
      fetchReceiptSettings(tenantId),
      fetchTaxSettings(tenantId),
      fetchCashierInfo(cashierId),
      fetchLoyaltySettings(tenantId),
    ]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.line_subtotal, 0);
  const totalDiscount = cartItems.reduce((sum, item) => sum + (item.line_discount || 0), 0);

  const taxAmount = calculateTax(subtotal, totalDiscount, taxSettings);

  const grandTotal = taxSettings.tax_inclusive
    ? subtotal - totalDiscount
    : subtotal - totalDiscount + taxAmount;

  const pointsEarned = membership && loyaltySettings
    ? Math.floor(grandTotal * ((loyaltySettings as any).earn_rate_value || 0))
    : 0;

  const receiptItems: ReceiptItem[] = cartItems.map((item) => ({
    name: item.product_name,
    sku: item.product_sku,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_subtotal: item.line_subtotal,
    line_discount: item.line_discount,
    line_total: item.line_total,
    is_weight_item: item.is_weight_item,
    measured_weight: item.measured_weight,
    weight_unit: item.weight_unit,
    member_discount: item.manual_discount > 0 ? item.manual_discount : undefined,
  }));

  return {
    storeInfo: storeSettings,
    receiptSettings: receiptSettings,
    taxSettings: taxSettings,
    transaction: {
      receipt_number: receiptBarcode,
      receipt_barcode: receiptBarcode,
      date: new Date(),
      payment_method: paymentMethod,
      payment_amount: paymentAmount,
      change_amount: changeAmount,
    },
    items: receiptItems,
    totals: {
      subtotal,
      total_discount: totalDiscount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
    },
    membership: membership
      ? {
          card_number: membership.card_number,
          member_name: membership.member_name,
          points_earned: pointsEarned,
          tier: membership.tier,
        }
      : undefined,
    cashier: cashierProfile,
  };
}

async function fetchStoreSettings(tenantId: string): Promise<StoreInfo> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching store settings:', error);
  }

  const storeData = data as any;

  return {
    name: storeData?.store_name || 'My Shop',
    tagline: storeData?.tagline || 'Your neighborhood store for quality goods',
    address: storeData?.address || '123 Market Street, Downtown Plaza\nCity Center, ST 12345',
    phone: storeData?.phone || '+1 (555) 123-4567',
    email: storeData?.email || '',
    logo_url: storeData?.logo_url || undefined,
    whatsapp_number: storeData?.whatsapp_number || '',
    whatsapp_qr_url: storeData?.whatsapp_qr_url || undefined,
    currency_symbol: storeData?.currency_symbol || '£',
  };
}

async function fetchReceiptSettings(tenantId: string): Promise<ReceiptPreferences> {
  const { data, error } = await supabase
    .from('receipt_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching receipt settings:', error);
  }

  const receiptData = data as any;

  return {
    paper_width: (receiptData?.paper_width as '58mm' | '80mm') || '80mm',
    show_logo: receiptData?.show_logo ?? true,
    show_barcode: receiptData?.show_barcode ?? true,
    show_qr_code: receiptData?.show_qr_code ?? false,
    barcode_type: receiptData?.barcode_type || 'CODE128',
    header_text: receiptData?.header_text || '',
    footer_text: receiptData?.footer_text || 'Thank you for your purchase!',
    greeting_message: receiptData?.greeting_message || 'Welcome!',
    thank_you_message: receiptData?.thank_you_message || 'Thank you for shopping with us!',
    show_tax_breakdown: receiptData?.show_tax_breakdown ?? true,
    show_item_details: receiptData?.show_item_details ?? true,
    show_cashier_name: receiptData?.show_cashier_name ?? true,
    show_payment_method: receiptData?.show_payment_method ?? true,
  };
}

async function fetchTaxSettings(tenantId: string): Promise<TaxConfig> {
  const { data, error } = await supabase
    .from('tax_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tax settings:', error);
  }

  const taxData = data as any;

  return {
    tax_name: taxData?.tax_name || 'VAT',
    tax_rate: taxData?.tax_rate || 20.0,
    tax_enabled: taxData?.tax_enabled ?? true,
    tax_inclusive: taxData?.tax_inclusive ?? true,
  };
}

async function fetchCashierInfo(cashierId: string): Promise<CashierInfo> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('full_name, id')
    .eq('id', cashierId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching cashier info:', error);
  }

  const cashierData = data as any;

  return {
    name: cashierData?.full_name || 'Cashier',
    id: cashierId,
  };
}

async function fetchLoyaltySettings(tenantId: string) {
  const { data, error } = await supabase
    .from('loyalty_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching loyalty settings:', error);
  }

  return data;
}

function calculateTax(subtotal: number, discount: number, taxSettings: TaxConfig): number {
  if (!taxSettings.tax_enabled) return 0;

  const taxableAmount = subtotal - discount;

  if (taxSettings.tax_inclusive) {
    return taxableAmount - taxableAmount / (1 + taxSettings.tax_rate / 100);
  } else {
    return taxableAmount * (taxSettings.tax_rate / 100);
  }
}

export function formatCurrency(amount: number, currencySymbol: string = '£'): string {
  return `${currencySymbol}${amount.toFixed(2)}`;
}

export function generateReceiptBarcode(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `RCP${timestamp}${random}`;
}
