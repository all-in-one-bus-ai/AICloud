import { supabase } from '@/lib/supabase/client';

export interface SecuritySettings {
  id?: string;
  tenant_id: string;
  require_pin_for_refunds: boolean;
  require_manager_approval: boolean;
  manager_approval_threshold: number;
  enable_2fa: boolean;
  session_timeout_minutes: number;
  lock_screen_after_minutes: number;
  require_biometric: boolean;
  log_all_actions: boolean;
  password_min_length: number;
  password_require_special: boolean;
  password_expiry_days: number;
}

export async function getSecuritySettings(tenantId: string): Promise<SecuritySettings | null> {
  const { data, error } = await supabase
    .from('security_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching security settings:', error);
    throw error;
  }

  return data;
}

export async function upsertSecuritySettings(settings: SecuritySettings): Promise<SecuritySettings> {
  const cleanSettings = {
    ...settings,
    id: settings.id || undefined,
  };

  if (!cleanSettings.id) {
    delete cleanSettings.id;
  }

  console.log('Upserting security settings:', cleanSettings);

  const { data, error } = await (supabase as any)
    .from('security_settings')
    .upsert(cleanSettings, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting security settings:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('Security settings upserted successfully:', data);
  return data;
}

export async function getAccessLogs(tenantId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching access logs:', error);
    throw error;
  }

  return data || [];
}
