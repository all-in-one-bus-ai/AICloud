import { supabase } from '@/lib/supabase/client';

export type EventType = 'auth' | 'admin' | 'business' | 'security' | 'system';
export type Severity = 'info' | 'warning' | 'error' | 'critical';

interface LogActivityParams {
  eventType: EventType;
  eventName: string;
  description?: string;
  severity?: Severity;
  tenantId?: string;
  tenantName?: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  eventType,
  eventName,
  description,
  severity = 'info',
  tenantId,
  tenantName,
  metadata = {},
}: LogActivityParams): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        event_type: eventType,
        event_name: eventName,
        description,
        severity,
        user_id: user?.id,
        user_email: user?.email,
        tenant_id: tenantId,
        tenant_name: tenantName,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log activity:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
}

// Convenience functions for common events
export const ActivityLogger = {
  // Authentication events
  loginSuccess: (userEmail: string) => 
    logActivity({
      eventType: 'auth',
      eventName: 'login_success',
      description: `User ${userEmail} logged in successfully`,
    }),

  loginFailed: (userEmail: string, reason: string) =>
    logActivity({
      eventType: 'auth',
      eventName: 'login_failed',
      description: `Failed login attempt for ${userEmail}: ${reason}`,
      severity: 'warning',
      metadata: { email: userEmail, reason },
    }),

  logout: (userEmail: string) =>
    logActivity({
      eventType: 'auth',
      eventName: 'logout',
      description: `User ${userEmail} logged out`,
    }),

  signup: (userEmail: string, businessName: string) =>
    logActivity({
      eventType: 'auth',
      eventName: 'signup',
      description: `New business registered: ${businessName}`,
      metadata: { email: userEmail, businessName },
    }),

  // Admin events
  settingsUpdated: (updatedKeys: string[]) =>
    logActivity({
      eventType: 'admin',
      eventName: 'settings_updated',
      description: `Updated ${updatedKeys.length} platform settings`,
      metadata: { updatedKeys },
    }),

  businessApproved: (tenantId: string, tenantName: string) =>
    logActivity({
      eventType: 'admin',
      eventName: 'business_approved',
      description: `Business "${tenantName}" was approved`,
      tenantId,
      tenantName,
    }),

  businessRejected: (tenantId: string, tenantName: string, reason?: string) =>
    logActivity({
      eventType: 'admin',
      eventName: 'business_rejected',
      description: `Business "${tenantName}" was rejected`,
      severity: 'warning',
      tenantId,
      tenantName,
      metadata: { reason },
    }),

  businessSuspended: (tenantId: string, tenantName: string, reason?: string) =>
    logActivity({
      eventType: 'admin',
      eventName: 'business_suspended',
      description: `Business "${tenantName}" was suspended`,
      severity: 'warning',
      tenantId,
      tenantName,
      metadata: { reason },
    }),

  demoProductsToggled: (tenantId: string, tenantName: string, enabled: boolean) =>
    logActivity({
      eventType: 'admin',
      eventName: 'demo_products_toggled',
      description: `Demo products ${enabled ? 'enabled' : 'disabled'} for "${tenantName}"`,
      tenantId,
      tenantName,
      metadata: { enabled },
    }),

  featuresUpdated: (tenantId: string, tenantName: string, features: string[]) =>
    logActivity({
      eventType: 'admin',
      eventName: 'features_updated',
      description: `Features updated for "${tenantName}"`,
      tenantId,
      tenantName,
      metadata: { features },
    }),

  // Security events
  suspiciousActivity: (description: string, metadata?: Record<string, any>) =>
    logActivity({
      eventType: 'security',
      eventName: 'suspicious_activity',
      description,
      severity: 'warning',
      metadata,
    }),

  passwordChanged: (userEmail: string) =>
    logActivity({
      eventType: 'security',
      eventName: 'password_changed',
      description: `Password changed for ${userEmail}`,
    }),

  // System events
  systemError: (errorMessage: string, metadata?: Record<string, any>) =>
    logActivity({
      eventType: 'system',
      eventName: 'system_error',
      description: errorMessage,
      severity: 'error',
      metadata,
    }),

  maintenanceModeChanged: (enabled: boolean) =>
    logActivity({
      eventType: 'system',
      eventName: 'maintenance_mode_changed',
      description: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      severity: enabled ? 'warning' : 'info',
      metadata: { enabled },
    }),
};
