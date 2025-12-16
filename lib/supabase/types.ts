export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          email: string | null
          phone: string | null
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          email?: string | null
          phone?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      branches: {
        Row: {
          id: string
          tenant_id: string
          name: string
          code: string
          address: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          code: string
          address?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          code?: string
          address?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string | null
          email: string
          full_name: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          branch_id?: string | null
          email: string
          full_name: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string | null
          email?: string
          full_name?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          tenant_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          sku: string
          barcode: string | null
          name: string
          description: string | null
          category: string | null
          unit_type: string
          unit_label: string
          price_per_unit: number
          cost_per_unit: number
          is_scale_item: boolean
          scale_plu_code: string | null
          default_tare_weight: number
          is_active: boolean
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sku: string
          barcode?: string | null
          name: string
          description?: string | null
          category?: string | null
          unit_type?: string
          unit_label?: string
          price_per_unit?: number
          cost_per_unit?: number
          is_scale_item?: boolean
          scale_plu_code?: string | null
          default_tare_weight?: number
          is_active?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sku?: string
          barcode?: string | null
          name?: string
          description?: string | null
          category?: string | null
          unit_type?: string
          unit_label?: string
          price_per_unit?: number
          cost_per_unit?: number
          is_scale_item?: boolean
          scale_plu_code?: string | null
          default_tare_weight?: number
          is_active?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      product_stocks: {
        Row: {
          id: string
          tenant_id: string
          product_id: string
          branch_id: string
          quantity: number
          min_stock_level: number
          max_stock_level: number
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          product_id: string
          branch_id: string
          quantity?: number
          min_stock_level?: number
          max_stock_level?: number
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          product_id?: string
          branch_id?: string
          quantity?: number
          min_stock_level?: number
          max_stock_level?: number
          updated_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          tenant_id: string
          customer_id: string | null
          card_number: string
          card_barcode: string
          member_name: string
          member_email: string | null
          member_phone: string | null
          tier: string
          is_active: boolean
          issued_date: string
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          customer_id?: string | null
          card_number: string
          card_barcode: string
          member_name: string
          member_email?: string | null
          member_phone?: string | null
          tier?: string
          is_active?: boolean
          issued_date?: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          customer_id?: string | null
          card_number?: string
          card_barcode?: string
          member_name?: string
          member_email?: string | null
          member_phone?: string | null
          tier?: string
          is_active?: boolean
          issued_date?: string
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      loyalty_settings: {
        Row: {
          id: string
          tenant_id: string
          is_enabled: boolean
          earn_rate_value: number
          redeem_value_per_coin: number
          min_coins_to_redeem: number
          max_coins_per_sale_percent: number
          membership_barcode_prefix: string
          membership_barcode_length: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          is_enabled?: boolean
          earn_rate_value?: number
          redeem_value_per_coin?: number
          min_coins_to_redeem?: number
          max_coins_per_sale_percent?: number
          membership_barcode_prefix?: string
          membership_barcode_length?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          is_enabled?: boolean
          earn_rate_value?: number
          redeem_value_per_coin?: number
          min_coins_to_redeem?: number
          max_coins_per_sale_percent?: number
          membership_barcode_prefix?: string
          membership_barcode_length?: number
          created_at?: string
          updated_at?: string
        }
      }
      loyalty_coin_balances: {
        Row: {
          id: string
          tenant_id: string
          membership_id: string
          balance: number
          lifetime_earned: number
          lifetime_redeemed: number
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          membership_id: string
          balance?: number
          lifetime_earned?: number
          lifetime_redeemed?: number
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          membership_id?: string
          balance?: number
          lifetime_earned?: number
          lifetime_redeemed?: number
          updated_at?: string
        }
      }
      loyalty_coin_transactions: {
        Row: {
          id: string
          tenant_id: string
          membership_id: string
          sale_id: string | null
          transaction_type: string
          coins: number
          balance_after: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          membership_id: string
          sale_id?: string | null
          transaction_type: string
          coins: number
          balance_after: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          membership_id?: string
          sale_id?: string | null
          transaction_type?: string
          coins?: number
          balance_after?: number
          notes?: string | null
          created_at?: string
        }
      }
      group_offers: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          required_quantity: number
          discount_type: string
          discount_value: number
          is_active: boolean
          start_date: string | null
          end_date: string | null
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          required_quantity: number
          discount_type: string
          discount_value: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          required_quantity?: number
          discount_type?: string
          discount_value?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      group_offer_items: {
        Row: {
          id: string
          tenant_id: string
          group_offer_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          group_offer_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          group_offer_id?: string
          product_id?: string
          created_at?: string
        }
      }
      bogo_offers: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          buy_quantity: number
          get_quantity: number
          discount_type: string
          discount_value: number
          apply_on: string
          is_active: boolean
          start_date: string | null
          end_date: string | null
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          buy_quantity: number
          get_quantity: number
          discount_type: string
          discount_value: number
          apply_on?: string
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          buy_quantity?: number
          get_quantity?: number
          discount_type?: string
          discount_value?: number
          apply_on?: string
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      bogo_offer_buy_items: {
        Row: {
          id: string
          tenant_id: string
          bogo_offer_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          bogo_offer_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          bogo_offer_id?: string
          product_id?: string
          created_at?: string
        }
      }
      bogo_offer_get_items: {
        Row: {
          id: string
          tenant_id: string
          bogo_offer_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          bogo_offer_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          bogo_offer_id?: string
          product_id?: string
          created_at?: string
        }
      }
      time_discounts: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          discount_type: string
          discount_value: number
          days_of_week: number[]
          start_time: string
          end_time: string
          discount_scope: string
          category: string | null
          is_active: boolean
          start_date: string | null
          end_date: string | null
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          discount_type: string
          discount_value: number
          days_of_week: number[]
          start_time: string
          end_time: string
          discount_scope?: string
          category?: string | null
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          days_of_week?: number[]
          start_time?: string
          end_time?: string
          discount_scope?: string
          category?: string | null
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string
          sale_number: string
          customer_id: string | null
          membership_id: string | null
          cashier_id: string | null
          subtotal: number
          total_discount: number
          loyalty_coins_earned: number
          loyalty_coins_redeemed: number
          loyalty_discount_amount: number
          tax_amount: number
          grand_total: number
          payment_method: string | null
          payment_amount: number
          change_amount: number
          status: string
          notes: string | null
          sale_date: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branch_id: string
          sale_number: string
          customer_id?: string | null
          membership_id?: string | null
          cashier_id?: string | null
          subtotal?: number
          total_discount?: number
          loyalty_coins_earned?: number
          loyalty_coins_redeemed?: number
          loyalty_discount_amount?: number
          tax_amount?: number
          grand_total?: number
          payment_method?: string | null
          payment_amount?: number
          change_amount?: number
          status?: string
          notes?: string | null
          sale_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string
          sale_number?: string
          customer_id?: string | null
          membership_id?: string | null
          cashier_id?: string | null
          subtotal?: number
          total_discount?: number
          loyalty_coins_earned?: number
          loyalty_coins_redeemed?: number
          loyalty_discount_amount?: number
          tax_amount?: number
          grand_total?: number
          payment_method?: string | null
          payment_amount?: number
          change_amount?: number
          status?: string
          notes?: string | null
          sale_date?: string
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          product_id: string
          product_name: string
          product_sku: string
          quantity: number
          unit_price: number
          is_weight_item: boolean
          measured_weight: number | null
          tare_weight: number | null
          is_scale_measured: boolean
          line_subtotal: number
          line_discount: number
          group_offer_id: string | null
          group_instance_index: number | null
          group_discount_share: number
          bogo_offer_id: string | null
          bogo_instance_index: number | null
          bogo_discount_share: number
          time_discount_id: string | null
          time_discount_amount: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          product_id: string
          product_name: string
          product_sku: string
          quantity: number
          unit_price: number
          is_weight_item?: boolean
          measured_weight?: number | null
          tare_weight?: number | null
          is_scale_measured?: boolean
          line_subtotal: number
          line_discount?: number
          group_offer_id?: string | null
          group_instance_index?: number | null
          group_discount_share?: number
          bogo_offer_id?: string | null
          bogo_instance_index?: number | null
          bogo_discount_share?: number
          time_discount_id?: string | null
          time_discount_amount?: number
          line_total: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          product_id?: string
          product_name?: string
          product_sku?: string
          quantity?: number
          unit_price?: number
          is_weight_item?: boolean
          measured_weight?: number | null
          tare_weight?: number | null
          is_scale_measured?: boolean
          line_subtotal?: number
          line_discount?: number
          group_offer_id?: string | null
          group_instance_index?: number | null
          group_discount_share?: number
          bogo_offer_id?: string | null
          bogo_instance_index?: number | null
          bogo_discount_share?: number
          time_discount_id?: string | null
          time_discount_amount?: number
          line_total?: number
          created_at?: string
        }
      }
      sale_group_discounts: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          group_offer_id: string
          instance_index: number
          quantity_applied: number
          discount_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          group_offer_id: string
          instance_index: number
          quantity_applied: number
          discount_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          group_offer_id?: string
          instance_index?: number
          quantity_applied?: number
          discount_amount?: number
          created_at?: string
        }
      }
      sale_bogo_discounts: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          bogo_offer_id: string
          instance_index: number
          buy_quantity: number
          get_quantity: number
          discount_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          bogo_offer_id: string
          instance_index: number
          buy_quantity: number
          get_quantity: number
          discount_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          bogo_offer_id?: string
          instance_index?: number
          buy_quantity?: number
          get_quantity?: number
          discount_amount?: number
          created_at?: string
        }
      }
      sale_time_discounts: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          time_discount_id: string
          discount_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          time_discount_id: string
          discount_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          time_discount_id?: string
          discount_amount?: number
          created_at?: string
        }
      }
      draft_carts: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string
          user_id: string
          cart_data: Json
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branch_id: string
          user_id: string
          cart_data: Json
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string
          user_id?: string
          cart_data?: Json
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      device_settings: {
        Row: {
          id: string
          tenant_id: string
          device_type: string
          device_name: string
          is_enabled: boolean
          connection_type: string
          configuration: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          device_type: string
          device_name: string
          is_enabled?: boolean
          connection_type: string
          configuration?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          device_type?: string
          device_name?: string
          is_enabled?: boolean
          connection_type?: string
          configuration?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
