'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, GroupOffer, BOGOOffer, TimeDiscount, PromotionSummary } from '@/lib/promotions/types';
import { applyPromotions } from '@/lib/promotions/engine';
import { useTenant } from './TenantContext';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type Membership = Database['public']['Tables']['memberships']['Row'];

interface CartContextType {
  cart: CartItem[];
  membership: Membership | null;
  promotionSummary: PromotionSummary;
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  addItem: (product: Product, quantity: number, weightData?: { weight: number; tare: number; isScaleMeasured: boolean; weightUnit?: string }) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setMembership: (membership: Membership | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { tenantId } = useTenant();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [groupOffers, setGroupOffers] = useState<GroupOffer[]>([]);
  const [bogoOffers, setBogoOffers] = useState<BOGOOffer[]>([]);
  const [timeDiscounts, setTimeDiscounts] = useState<TimeDiscount[]>([]);

  useEffect(() => {
    if (tenantId) {
      loadPromotions();
    }
  }, [tenantId]);

  const cartWithPromotions = cart.length > 0
    ? applyPromotions(cart, groupOffers, bogoOffers, timeDiscounts)
    : { updatedCart: [], summary: { groupDiscounts: [], bogoDiscounts: [], timeDiscounts: [], totalDiscount: 0 } };

  const displayCart = cartWithPromotions.updatedCart;
  const currentPromotionSummary = cartWithPromotions.summary;

  const loadPromotions = async () => {
    if (!tenantId) return;

    const { data: groupData } = await supabase
      .from('group_offers')
      .select('*, group_offer_items(product_id)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (groupData) {
      const mappedGroupOffers: GroupOffer[] = groupData.map((offer: any) => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        required_quantity: offer.required_quantity,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        is_active: offer.is_active,
        start_date: offer.start_date,
        end_date: offer.end_date,
        priority: offer.priority,
        eligible_product_ids: offer.group_offer_items?.map((item: any) => item.product_id) || [],
      }));
      setGroupOffers(mappedGroupOffers);
    }

    const { data: bogoData } = await supabase
      .from('bogo_offers')
      .select(`
        *,
        bogo_offer_buy_items(product_id),
        bogo_offer_get_items(product_id)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (bogoData) {
      const mappedBogoOffers: BOGOOffer[] = bogoData.map((offer: any) => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        buy_quantity: offer.buy_quantity,
        get_quantity: offer.get_quantity,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        apply_on: offer.apply_on,
        is_active: offer.is_active,
        start_date: offer.start_date,
        end_date: offer.end_date,
        priority: offer.priority,
        buy_product_ids: offer.bogo_offer_buy_items?.map((item: any) => item.product_id) || [],
        get_product_ids: offer.bogo_offer_get_items?.map((item: any) => item.product_id) || [],
      }));
      setBogoOffers(mappedBogoOffers);
    }

    const { data: timeData } = await supabase
      .from('time_discounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (timeData) {
      setTimeDiscounts(timeData);
    }
  };

  const addItem = (
    product: Product,
    quantity: number,
    weightData?: { weight: number; tare: number; isScaleMeasured: boolean; weightUnit?: string }
  ) => {
    const isWeightBased = (product as any).is_weight_based || product.is_scale_item;

    const existingItemIndex = cart.findIndex(
      item => item.product_id === product.id && item.is_weight_item === isWeightBased
    );

    if (existingItemIndex >= 0 && !isWeightBased) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += quantity;
      updatedCart[existingItemIndex].line_subtotal = updatedCart[existingItemIndex].quantity * product.price_per_unit;
      setCart(updatedCart);
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        quantity,
        unit_price: product.price_per_unit,
        is_weight_item: isWeightBased,
        measured_weight: weightData?.weight,
        weight_unit: weightData?.weightUnit || (product as any).weight_unit || 'kg',
        tare_weight: weightData?.tare,
        is_scale_measured: weightData?.isScaleMeasured || false,
        line_subtotal: quantity * product.price_per_unit,
        line_discount: 0,
        group_discount_share: 0,
        bogo_discount_share: 0,
        time_discount_amount: 0,
        line_total: quantity * product.price_per_unit,
      };

      setCart([...cart, newItem]);
    }
  };

  const removeItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity,
          line_subtotal: quantity * item.unit_price,
        };
      }
      return item;
    });

    setCart(updatedCart);
  };

  const clearCart = () => {
    setCart([]);
    setMembership(null);
  };

  const subtotal = displayCart.reduce((sum, item) => sum + item.line_subtotal, 0);
  const totalDiscount = currentPromotionSummary.totalDiscount;
  const grandTotal = subtotal - totalDiscount;

  return (
    <CartContext.Provider
      value={{
        cart: displayCart,
        membership,
        promotionSummary: currentPromotionSummary,
        subtotal,
        totalDiscount,
        grandTotal,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        setMembership,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
