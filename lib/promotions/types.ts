export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  barcode: string | null;
  category: string | null;
  quantity: number;
  unit_price: number;
  is_weight_item: boolean;
  measured_weight?: number;
  weight_unit?: string;
  tare_weight?: number;
  is_scale_measured: boolean;
  line_subtotal: number;
  line_discount: number;
  group_offer_id?: string;
  group_instance_index?: number;
  group_discount_share: number;
  bogo_offer_id?: string;
  bogo_instance_index?: number;
  bogo_discount_share: number;
  time_discount_id?: string;
  time_discount_amount: number;
  line_total: number;
}

export interface GroupOffer {
  id: string;
  name: string;
  description: string | null;
  required_quantity: number;
  discount_type: 'fixed_price' | 'fixed_discount' | 'percentage';
  discount_value: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  eligible_product_ids: string[];
}

export interface BOGOOffer {
  id: string;
  name: string;
  description: string | null;
  buy_quantity: number;
  get_quantity: number;
  discount_type: 'free' | 'percentage' | 'fixed_discount';
  discount_value: number;
  apply_on: 'cheapest' | 'most_expensive' | 'specific';
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  buy_product_ids: string[];
  get_product_ids: string[];
}

export interface TimeDiscount {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'fixed_discount' | 'percentage';
  discount_value: number;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  discount_scope: 'all' | 'category' | 'specific';
  category: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
}

export interface PromotionSummary {
  groupDiscounts: {
    offer_id: string;
    offer_name: string;
    instance_index: number;
    quantity_applied: number;
    discount_amount: number;
  }[];
  bogoDiscounts: {
    offer_id: string;
    offer_name: string;
    instance_index: number;
    buy_quantity: number;
    get_quantity: number;
    discount_amount: number;
  }[];
  timeDiscounts: {
    discount_id: string;
    discount_name: string;
    discount_amount: number;
  }[];
  totalDiscount: number;
}
