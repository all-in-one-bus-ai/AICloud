import { supabase } from '@/lib/supabase/client';

export interface StoreSettings {
  id?: string;
  tenant_id: string;
  branch_id?: string | null;
  store_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url?: string | null;
  whatsapp_number: string;
  whatsapp_qr_url?: string | null;
  currency_symbol: string;
  currency_code: string;
  timezone: string;
}

export async function getStoreSettings(tenantId: string): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching store settings:', error);
    throw error;
  }

  return data;
}

export async function upsertStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
  const cleanSettings = {
    ...settings,
    id: settings.id || undefined,
  };

  if (!cleanSettings.id) {
    delete cleanSettings.id;
  }

  console.log('Upserting store settings:', cleanSettings);

  const { data, error } = await (supabase as any)
    .from('store_settings')
    .upsert(cleanSettings, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting store settings:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('Store settings upserted successfully:', data);
  return data;
}

export async function uploadLogo(tenantId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${tenantId}/logos/logo-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('shop-assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('shop-assets')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteLogo(logoUrl: string): Promise<void> {
  const fileName = logoUrl.split('/').slice(-3).join('/');

  const { error } = await supabase.storage
    .from('shop-assets')
    .remove([fileName]);

  if (error) {
    console.error('Error deleting logo:', error);
    throw error;
  }
}
