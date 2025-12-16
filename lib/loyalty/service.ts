import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type LoyaltySettings = Database['public']['Tables']['loyalty_settings']['Row'];
type Membership = Database['public']['Tables']['memberships']['Row'];
type LoyaltyCoinBalance = Database['public']['Tables']['loyalty_coin_balances']['Row'];

export async function calculateEarnedCoins(
  grandTotal: number,
  tenantId: string
): Promise<number> {
  const { data: settings } = await supabase
    .from('loyalty_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const loyaltySettings: LoyaltySettings | null = settings as any;

  if (!loyaltySettings || !loyaltySettings.is_enabled) return 0;

  return Math.floor(grandTotal * loyaltySettings.earn_rate_value);
}

export async function validateCoinRedemption(
  coinsToRedeem: number,
  membershipId: string,
  tenantId: string,
  saleTotal: number
): Promise<{ valid: boolean; error?: string; maxAllowed?: number }> {
  const { data: settingsData } = await supabase
    .from('loyalty_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const settings: LoyaltySettings | null = settingsData as any;

  if (!settings || !settings.is_enabled) {
    return { valid: false, error: 'Loyalty program is not enabled' };
  }

  if (coinsToRedeem < settings.min_coins_to_redeem) {
    return {
      valid: false,
      error: `Minimum ${settings.min_coins_to_redeem} coins required to redeem`,
      maxAllowed: 0,
    };
  }

  const { data: balanceData } = await supabase
    .from('loyalty_coin_balances')
    .select('balance')
    .eq('membership_id', membershipId)
    .maybeSingle();

  const balance: any = balanceData;
  const availableCoins = balance?.balance || 0;

  if (coinsToRedeem > availableCoins) {
    return {
      valid: false,
      error: `Insufficient coins. Available: ${availableCoins}`,
      maxAllowed: availableCoins,
    };
  }

  const maxDiscountAmount = saleTotal * (settings.max_coins_per_sale_percent / 100);
  const redemptionValue = coinsToRedeem * settings.redeem_value_per_coin;

  if (redemptionValue > maxDiscountAmount) {
    const maxCoins = Math.floor(maxDiscountAmount / settings.redeem_value_per_coin);
    return {
      valid: false,
      error: `Cannot redeem more than ${settings.max_coins_per_sale_percent}% of sale total`,
      maxAllowed: maxCoins,
    };
  }

  return { valid: true, maxAllowed: availableCoins };
}

export async function calculateRedemptionValue(
  coins: number,
  tenantId: string
): Promise<number> {
  const { data: settingsData } = await supabase
    .from('loyalty_settings')
    .select('redeem_value_per_coin')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const settings: any = settingsData;

  if (!settings) return 0;

  return coins * settings.redeem_value_per_coin;
}

export async function getMembershipByBarcode(
  barcode: string,
  tenantId: string
): Promise<Membership | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('card_barcode', barcode)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  const membership: Membership = data as any;

  const now = new Date();
  if (membership.expiry_date && new Date(membership.expiry_date) < now) {
    return null;
  }

  return membership;
}

export async function getMembershipBalance(
  membershipId: string
): Promise<LoyaltyCoinBalance | null> {
  const { data } = await supabase
    .from('loyalty_coin_balances')
    .select('*')
    .eq('membership_id', membershipId)
    .maybeSingle();

  return data as any;
}

export async function processLoyaltyTransaction(
  tenantId: string,
  membershipId: string,
  saleId: string,
  coinsEarned: number,
  coinsRedeemed: number
): Promise<void> {
  let { data: balanceData } = await supabase
    .from('loyalty_coin_balances')
    .select('*')
    .eq('membership_id', membershipId)
    .maybeSingle();

  let balance: any = balanceData;

  if (!balance) {
    const balanceInsert: any = {
      tenant_id: tenantId,
      membership_id: membershipId,
      balance: 0,
      lifetime_earned: 0,
      lifetime_redeemed: 0,
    };

    const { data: newBalance } = await supabase
      .from('loyalty_coin_balances')
      .insert(balanceInsert)
      .select()
      .single();

    balance = newBalance as any;
  }

  if (coinsRedeemed > 0) {
    const newBalance = balance.balance - coinsRedeemed;

    const updateData: any = {
      balance: newBalance,
      lifetime_redeemed: balance.lifetime_redeemed + coinsRedeemed,
    };

    await (supabase as any)
      .from('loyalty_coin_balances')
      .update(updateData)
      .eq('membership_id', membershipId);

    const transactionInsert: any = {
      tenant_id: tenantId,
      membership_id: membershipId,
      sale_id: saleId,
      transaction_type: 'redeem',
      coins: -coinsRedeemed,
      balance_after: newBalance,
      notes: 'Redeemed at POS',
    };

    await (supabase as any)
      .from('loyalty_coin_transactions')
      .insert(transactionInsert);

    balance.balance = newBalance;
  }

  if (coinsEarned > 0) {
    const newBalance = balance.balance + coinsEarned;

    const updateData: any = {
      balance: newBalance,
      lifetime_earned: balance.lifetime_earned + coinsEarned,
    };

    await (supabase as any)
      .from('loyalty_coin_balances')
      .update(updateData)
      .eq('membership_id', membershipId);

    const transactionInsert: any = {
      tenant_id: tenantId,
      membership_id: membershipId,
      sale_id: saleId,
      transaction_type: 'earn',
      coins: coinsEarned,
      balance_after: newBalance,
      notes: 'Earned from purchase',
    };

    await (supabase as any)
      .from('loyalty_coin_transactions')
      .insert(transactionInsert);
  }
}
