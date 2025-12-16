import { supabase } from '@/lib/supabase/client';
import { CartItem } from '@/lib/promotions/types';
import { PromotionSummary } from '@/lib/promotions/types';
import { processLoyaltyTransaction } from '@/lib/loyalty/service';

interface CompleteSaleParams {
  tenantId: string;
  branchId: string;
  cashierId: string;
  cart: CartItem[];
  promotionSummary: PromotionSummary;
  membershipId?: string;
  loyaltyCoinsEarned: number;
  loyaltyCoinsRedeemed: number;
  loyaltyDiscountAmount: number;
  paymentMethod: string;
  paymentAmount: number;
  taxRate?: number;
}

export async function completeSale(params: CompleteSaleParams): Promise<{ success: boolean; saleId?: string; error?: string }> {
  try {
    const subtotal = params.cart.reduce((sum, item) => sum + item.line_subtotal, 0);
    const totalDiscount = params.promotionSummary.totalDiscount;
    const taxAmount = params.taxRate
      ? (subtotal - totalDiscount - params.loyaltyDiscountAmount) * (params.taxRate / 100)
      : 0;
    const grandTotal = subtotal - totalDiscount - params.loyaltyDiscountAmount + taxAmount;
    const changeAmount = params.paymentAmount - grandTotal;

    const saleNumber = await generateSaleNumber(params.tenantId, params.branchId);

    const saleInsert: any = {
      tenant_id: params.tenantId,
      branch_id: params.branchId,
      sale_number: saleNumber,
      cashier_id: params.cashierId,
      membership_id: params.membershipId,
      subtotal,
      total_discount: totalDiscount + params.loyaltyDiscountAmount,
      loyalty_coins_earned: params.loyaltyCoinsEarned,
      loyalty_coins_redeemed: params.loyaltyCoinsRedeemed,
      loyalty_discount_amount: params.loyaltyDiscountAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      payment_method: params.paymentMethod,
      payment_amount: params.paymentAmount,
      change_amount: changeAmount,
      status: 'completed',
    };

    const { data: saleData, error: saleError } = await (supabase as any)
      .from('sales')
      .insert(saleInsert)
      .select()
      .single();

    if (saleError || !saleData) {
      return { success: false, error: 'Failed to create sale' };
    }

    const sale: any = saleData;

    const saleItems = params.cart.map(item => ({
      tenant_id: params.tenantId,
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      is_weight_item: item.is_weight_item,
      measured_weight: item.measured_weight,
      tare_weight: item.tare_weight,
      is_scale_measured: item.is_scale_measured,
      line_subtotal: item.line_subtotal,
      line_discount: item.line_discount,
      group_offer_id: item.group_offer_id,
      group_instance_index: item.group_instance_index,
      group_discount_share: item.group_discount_share,
      bogo_offer_id: item.bogo_offer_id,
      bogo_instance_index: item.bogo_instance_index,
      bogo_discount_share: item.bogo_discount_share,
      time_discount_id: item.time_discount_id,
      time_discount_amount: item.time_discount_amount,
      line_total: item.line_total,
    }));

    const { error: itemsError } = await (supabase as any)
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      return { success: false, error: 'Failed to create sale items' };
    }

    if (params.promotionSummary.groupDiscounts.length > 0) {
      const groupDiscounts = params.promotionSummary.groupDiscounts.map(gd => ({
        tenant_id: params.tenantId,
        sale_id: sale.id,
        group_offer_id: gd.offer_id,
        instance_index: gd.instance_index,
        quantity_applied: gd.quantity_applied,
        discount_amount: gd.discount_amount,
      }));

      await (supabase as any).from('sale_group_discounts').insert(groupDiscounts);
    }

    if (params.promotionSummary.bogoDiscounts.length > 0) {
      const bogoDiscounts = params.promotionSummary.bogoDiscounts.map(bd => ({
        tenant_id: params.tenantId,
        sale_id: sale.id,
        bogo_offer_id: bd.offer_id,
        instance_index: bd.instance_index,
        buy_quantity: bd.buy_quantity,
        get_quantity: bd.get_quantity,
        discount_amount: bd.discount_amount,
      }));

      await (supabase as any).from('sale_bogo_discounts').insert(bogoDiscounts);
    }

    if (params.promotionSummary.timeDiscounts.length > 0) {
      const timeDiscounts = params.promotionSummary.timeDiscounts.map(td => ({
        tenant_id: params.tenantId,
        sale_id: sale.id,
        time_discount_id: td.discount_id,
        discount_amount: td.discount_amount,
      }));

      await (supabase as any).from('sale_time_discounts').insert(timeDiscounts);
    }

    await deductStock(params.tenantId, params.branchId, params.cart);

    if (params.membershipId && (params.loyaltyCoinsEarned > 0 || params.loyaltyCoinsRedeemed > 0)) {
      await processLoyaltyTransaction(
        params.tenantId,
        params.membershipId,
        sale.id,
        params.loyaltyCoinsEarned,
        params.loyaltyCoinsRedeemed
      );
    }

    return { success: true, saleId: sale.id };
  } catch (error) {
    console.error('Sale completion error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

async function generateSaleNumber(tenantId: string, branchId: string): Promise<string> {
  const { data: branchData } = await supabase
    .from('branches')
    .select('code')
    .eq('id', branchId)
    .single();

  const branch: any = branchData;
  const branchCode = branch?.code || 'BR';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `${branchCode}-${timestamp}-${random}`;
}

async function deductStock(tenantId: string, branchId: string, cart: CartItem[]): Promise<void> {
  for (const item of cart) {
    const { data: stockData } = await supabase
      .from('product_stocks')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('branch_id', branchId)
      .eq('product_id', item.product_id)
      .maybeSingle();

    const stock: any = stockData;

    if (stock) {
      const newQuantity = Math.max(0, stock.quantity - item.quantity);

      const updateData: any = { quantity: newQuantity };

      await (supabase as any)
        .from('product_stocks')
        .update(updateData)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .eq('product_id', item.product_id);
    }
  }
}
