import { supabase } from '@/lib/supabase/client';

export interface ReceiptSettings {
  id?: string;
  tenant_id: string;
  receipt_printer_id?: string | null;
  paper_width: string;
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

export async function getReceiptSettings(tenantId: string): Promise<ReceiptSettings | null> {
  const { data, error } = await supabase
    .from('receipt_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching receipt settings:', error);
    throw error;
  }

  return data;
}

export async function upsertReceiptSettings(settings: ReceiptSettings): Promise<ReceiptSettings> {
  const cleanSettings = {
    ...settings,
    id: settings.id || undefined,
  };

  if (!cleanSettings.id) {
    delete cleanSettings.id;
  }

  console.log('Upserting receipt settings:', cleanSettings);

  const { data, error } = await (supabase as any)
    .from('receipt_settings')
    .upsert(cleanSettings, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting receipt settings:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('Receipt settings upserted successfully:', data);
  return data;
}
