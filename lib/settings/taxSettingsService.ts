import { supabase } from '@/lib/supabase/client';

export interface TaxSettings {
  id?: string;
  tenant_id: string;
  tax_name: string;
  tax_rate: number;
  tax_enabled: boolean;
  tax_inclusive: boolean;
}

export async function getTaxSettings(tenantId: string): Promise<TaxSettings | null> {
  const { data, error } = await supabase
    .from('tax_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tax settings:', error);
    throw error;
  }

  return data;
}

export async function upsertTaxSettings(settings: TaxSettings): Promise<TaxSettings> {
  const cleanSettings = {
    ...settings,
    id: settings.id || undefined,
  };

  if (!cleanSettings.id) {
    delete cleanSettings.id;
  }

  console.log('Upserting tax settings:', cleanSettings);

  const { data, error } = await (supabase as any)
    .from('tax_settings')
    .upsert(cleanSettings, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting tax settings:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('Tax settings upserted successfully:', data);
  return data;
}
