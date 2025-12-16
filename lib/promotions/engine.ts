import { CartItem, GroupOffer, BOGOOffer, TimeDiscount, PromotionSummary } from './types';

export function applyPromotions(
  cart: CartItem[],
  groupOffers: GroupOffer[],
  bogoOffers: BOGOOffer[],
  timeDiscounts: TimeDiscount[]
): { updatedCart: CartItem[]; summary: PromotionSummary } {
  let workingCart = resetDiscounts(cart);

  const groupDiscountSummary: PromotionSummary['groupDiscounts'] = [];
  const bogoDiscountSummary: PromotionSummary['bogoDiscounts'] = [];
  const timeDiscountSummary: PromotionSummary['timeDiscounts'] = [];

  const activeGroupOffers = groupOffers
    .filter(offer => isOfferActive(offer))
    .sort((a, b) => b.priority - a.priority);

  const activeBogoOffers = bogoOffers
    .filter(offer => isOfferActive(offer))
    .sort((a, b) => b.priority - a.priority);

  const activeTimeDiscounts = timeDiscounts
    .filter(discount => isTimeDiscountActive(discount))
    .sort((a, b) => b.priority - a.priority);

  workingCart = applyGroupOffers(workingCart, activeGroupOffers, groupDiscountSummary);
  workingCart = applyBOGOOffers(workingCart, activeBogoOffers, bogoDiscountSummary);
  workingCart = applyTimeDiscounts(workingCart, activeTimeDiscounts, timeDiscountSummary);

  workingCart = workingCart.map(item => ({
    ...item,
    line_discount: item.group_discount_share + item.bogo_discount_share + item.time_discount_amount,
    line_total: item.line_subtotal - (item.group_discount_share + item.bogo_discount_share + item.time_discount_amount),
  }));

  const totalDiscount = workingCart.reduce((sum, item) => sum + item.line_discount, 0);

  return {
    updatedCart: workingCart,
    summary: {
      groupDiscounts: groupDiscountSummary,
      bogoDiscounts: bogoDiscountSummary,
      timeDiscounts: timeDiscountSummary,
      totalDiscount,
    },
  };
}

function resetDiscounts(cart: CartItem[]): CartItem[] {
  return cart.map(item => ({
    ...item,
    line_discount: 0,
    group_offer_id: undefined,
    group_instance_index: undefined,
    group_discount_share: 0,
    bogo_offer_id: undefined,
    bogo_instance_index: undefined,
    bogo_discount_share: 0,
    time_discount_id: undefined,
    time_discount_amount: 0,
    line_total: item.line_subtotal,
  }));
}

function isOfferActive(offer: GroupOffer | BOGOOffer): boolean {
  if (!offer.is_active) return false;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (offer.start_date && today < offer.start_date) return false;
  if (offer.end_date && today > offer.end_date) return false;

  return true;
}

function isTimeDiscountActive(discount: TimeDiscount): boolean {
  if (!discount.is_active) return false;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

  if (!discount.days_of_week.includes(currentDay)) return false;
  if (currentTime < discount.start_time || currentTime > discount.end_time) return false;
  if (discount.start_date && today < discount.start_date) return false;
  if (discount.end_date && today > discount.end_date) return false;

  return true;
}

function applyGroupOffers(
  cart: CartItem[],
  offers: GroupOffer[],
  summary: PromotionSummary['groupDiscounts']
): CartItem[] {
  let workingCart = [...cart];

  for (const offer of offers) {
    const eligibleItems = workingCart.filter(item =>
      offer.eligible_product_ids.includes(item.product_id)
    );

    const totalQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
    const groupsAvailable = Math.floor(totalQuantity / offer.required_quantity);

    if (groupsAvailable === 0) continue;

    for (let instanceIndex = 0; instanceIndex < groupsAvailable; instanceIndex++) {
      const groupItems = [];
      let remainingQuantity = offer.required_quantity;

      for (const item of eligibleItems) {
        const availableQty = item.quantity - (groupItems
          .filter(gi => gi.id === item.id)
          .reduce((sum, gi) => sum + gi.usedQuantity, 0));

        if (availableQty > 0 && remainingQuantity > 0) {
          const useQty = Math.min(availableQty, remainingQuantity);
          groupItems.push({ id: item.id, usedQuantity: useQty, unitPrice: item.unit_price });
          remainingQuantity -= useQty;
        }

        if (remainingQuantity === 0) break;
      }

      if (remainingQuantity === 0) {
        const groupSubtotal = groupItems.reduce((sum, gi) => sum + (gi.usedQuantity * gi.unitPrice), 0);
        let discountAmount = 0;

        if (offer.discount_type === 'fixed_price') {
          discountAmount = Math.max(0, groupSubtotal - offer.discount_value);
        } else if (offer.discount_type === 'fixed_discount') {
          discountAmount = Math.min(offer.discount_value, groupSubtotal);
        } else if (offer.discount_type === 'percentage') {
          discountAmount = groupSubtotal * (offer.discount_value / 100);
        }

        summary.push({
          offer_id: offer.id,
          offer_name: offer.name,
          instance_index: instanceIndex,
          quantity_applied: offer.required_quantity,
          discount_amount: discountAmount,
        });

        groupItems.forEach(gi => {
          const itemIndex = workingCart.findIndex(item => item.id === gi.id);
          if (itemIndex !== -1) {
            const itemSubtotal = gi.usedQuantity * gi.unitPrice;
            const itemShare = (itemSubtotal / groupSubtotal) * discountAmount;

            workingCart[itemIndex] = {
              ...workingCart[itemIndex],
              group_offer_id: offer.id,
              group_instance_index: instanceIndex,
              group_discount_share: (workingCart[itemIndex].group_discount_share || 0) + itemShare,
            };
          }
        });
      }
    }
  }

  return workingCart;
}

function applyBOGOOffers(
  cart: CartItem[],
  offers: BOGOOffer[],
  summary: PromotionSummary['bogoDiscounts']
): CartItem[] {
  let workingCart = [...cart];

  for (const offer of offers) {
    const buyItems = workingCart.filter(item =>
      offer.buy_product_ids.includes(item.product_id)
    );
    const getItems = workingCart.filter(item =>
      offer.get_product_ids.includes(item.product_id)
    );

    const totalBuyQty = buyItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalGetQty = getItems.reduce((sum, item) => sum + item.quantity, 0);

    const applicationsAvailable = Math.min(
      Math.floor(totalBuyQty / offer.buy_quantity),
      Math.floor(totalGetQty / offer.get_quantity)
    );

    if (applicationsAvailable === 0) continue;

    for (let instanceIndex = 0; instanceIndex < applicationsAvailable; instanceIndex++) {
      let discountTargets: { id: string; quantity: number; unitPrice: number }[] = [];

      if (offer.apply_on === 'cheapest') {
        const sorted = [...getItems].sort((a, b) => a.unit_price - b.unit_price);
        let remainingGetQty = offer.get_quantity;

        for (const item of sorted) {
          if (remainingGetQty > 0) {
            const availableQty = item.quantity - (discountTargets
              .filter(dt => dt.id === item.id)
              .reduce((sum, dt) => sum + dt.quantity, 0));
            const useQty = Math.min(availableQty, remainingGetQty);
            if (useQty > 0) {
              discountTargets.push({ id: item.id, quantity: useQty, unitPrice: item.unit_price });
              remainingGetQty -= useQty;
            }
          }
        }
      } else if (offer.apply_on === 'most_expensive') {
        const sorted = [...getItems].sort((a, b) => b.unit_price - a.unit_price);
        let remainingGetQty = offer.get_quantity;

        for (const item of sorted) {
          if (remainingGetQty > 0) {
            const availableQty = item.quantity - (discountTargets
              .filter(dt => dt.id === item.id)
              .reduce((sum, dt) => sum + dt.quantity, 0));
            const useQty = Math.min(availableQty, remainingGetQty);
            if (useQty > 0) {
              discountTargets.push({ id: item.id, quantity: useQty, unitPrice: item.unit_price });
              remainingGetQty -= useQty;
            }
          }
        }
      } else {
        let remainingGetQty = offer.get_quantity;
        for (const item of getItems) {
          if (remainingGetQty > 0) {
            const availableQty = item.quantity - (discountTargets
              .filter(dt => dt.id === item.id)
              .reduce((sum, dt) => sum + dt.quantity, 0));
            const useQty = Math.min(availableQty, remainingGetQty);
            if (useQty > 0) {
              discountTargets.push({ id: item.id, quantity: useQty, unitPrice: item.unit_price });
              remainingGetQty -= useQty;
            }
          }
        }
      }

      const targetSubtotal = discountTargets.reduce((sum, dt) => sum + (dt.quantity * dt.unitPrice), 0);
      let discountAmount = 0;

      if (offer.discount_type === 'free') {
        discountAmount = targetSubtotal;
      } else if (offer.discount_type === 'percentage') {
        discountAmount = targetSubtotal * (offer.discount_value / 100);
      } else if (offer.discount_type === 'fixed_discount') {
        discountAmount = Math.min(offer.discount_value, targetSubtotal);
      }

      summary.push({
        offer_id: offer.id,
        offer_name: offer.name,
        instance_index: instanceIndex,
        buy_quantity: offer.buy_quantity,
        get_quantity: offer.get_quantity,
        discount_amount: discountAmount,
      });

      discountTargets.forEach(dt => {
        const itemIndex = workingCart.findIndex(item => item.id === dt.id);
        if (itemIndex !== -1) {
          const itemSubtotal = dt.quantity * dt.unitPrice;
          const itemShare = (itemSubtotal / targetSubtotal) * discountAmount;

          workingCart[itemIndex] = {
            ...workingCart[itemIndex],
            bogo_offer_id: offer.id,
            bogo_instance_index: instanceIndex,
            bogo_discount_share: (workingCart[itemIndex].bogo_discount_share || 0) + itemShare,
          };
        }
      });
    }
  }

  return workingCart;
}

function applyTimeDiscounts(
  cart: CartItem[],
  discounts: TimeDiscount[],
  summary: PromotionSummary['timeDiscounts']
): CartItem[] {
  let workingCart = [...cart];

  for (const discount of discounts) {
    let eligibleItems: CartItem[] = [];

    if (discount.discount_scope === 'all') {
      eligibleItems = workingCart;
    } else if (discount.discount_scope === 'category' && discount.category) {
      eligibleItems = workingCart.filter(item => item.category === discount.category);
    }

    if (eligibleItems.length === 0) continue;

    let totalDiscountAmount = 0;

    eligibleItems.forEach(item => {
      let itemDiscount = 0;

      if (discount.discount_type === 'percentage') {
        itemDiscount = item.line_subtotal * (discount.discount_value / 100);
      } else if (discount.discount_type === 'fixed_discount') {
        itemDiscount = Math.min(discount.discount_value / eligibleItems.length, item.line_subtotal);
      }

      totalDiscountAmount += itemDiscount;

      const itemIndex = workingCart.findIndex(ci => ci.id === item.id);
      if (itemIndex !== -1) {
        workingCart[itemIndex] = {
          ...workingCart[itemIndex],
          time_discount_id: discount.id,
          time_discount_amount: (workingCart[itemIndex].time_discount_amount || 0) + itemDiscount,
        };
      }
    });

    if (totalDiscountAmount > 0) {
      summary.push({
        discount_id: discount.id,
        discount_name: discount.name,
        discount_amount: totalDiscountAmount,
      });
    }
  }

  return workingCart;
}
