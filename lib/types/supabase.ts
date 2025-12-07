export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attributes: {
        Row: {
          code: string | null
          created_at: string
          data_type: Database["public"]["Enums"]["attribute_data_type"]
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          data_type: Database["public"]["Enums"]["attribute_data_type"]
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          data_type?: Database["public"]["Enums"]["attribute_data_type"]
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_attributes: {
        Row: {
          attribute_id: string
          category_id: string
        }
        Insert: {
          attribute_id: string
          category_id: string
        }
        Update: {
          attribute_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_options: {
        Row: {
          amount: number
          calc_type: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          metadata: Json | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          calc_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          metadata?: Json | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          calc_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          metadata?: Json | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          amount: number
          calc_type: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          min_order_amount: number | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          amount?: number
          calc_type?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          min_order_amount?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          amount?: number
          calc_type?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          min_order_amount?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      delivery: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          metadata: Json | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          metadata?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          metadata?: Json | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          discount_type: string
          discount_value: number
          id: string
          product_id: string
          purchase_price: number
          quantity: number
          sale_price: number
          unit: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          discount_type?: string
          discount_value?: number
          id?: string
          product_id: string
          purchase_price?: number
          quantity?: number
          sale_price?: number
          unit?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          discount_type?: string
          discount_value?: number
          id?: string
          product_id?: string
          purchase_price?: number
          quantity?: number
          sale_price?: number
          unit?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_charges: {
        Row: {
          applied_amount: number
          base_amount: number
          calc_type: string
          charge_option_id: string | null
          coupon_id: string | null
          created_at: string
          currency: string | null
          delivery_id: string | null
          id: string
          metadata: Json | null
          order_id: string
          type: string
        }
        Insert: {
          applied_amount?: number
          base_amount?: number
          calc_type: string
          charge_option_id?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string | null
          delivery_id?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          type: string
        }
        Update: {
          applied_amount?: number
          base_amount?: number
          calc_type?: string
          charge_option_id?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string | null
          delivery_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_charges_charge_option_id_fkey"
            columns: ["charge_option_id"]
            isOneToOne: false
            referencedRelation: "charge_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_charges_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_charges_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_charges_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          sku: string | null
          unit_price: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name?: string | null
          quantity: number
          sku?: string | null
          unit_price: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          sku?: string | null
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          notes: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number
        }
        Relationships: []
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          product_id: string
          value_boolean: boolean | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          product_id: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          product_id?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          details_md: string | null
          id: string
          image_url: string | null
          is_active: boolean
          product_id: string
          sku: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          details_md?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_id: string
          sku?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          details_md?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_id?: string
          sku?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string
          created_at: string
          description: string | null
          details_md: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          main_image_url: string | null
          name: string
          slug: string | null
        }
        Insert: {
          brand?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          details_md?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          main_image_url?: string | null
          name: string
          slug?: string | null
        }
        Update: {
          brand?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          details_md?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          main_image_url?: string | null
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_items: {
        Row: {
          body: string | null
          created_at: string
          cta_label: string | null
          cta_target: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          metadata: Json | null
          mobile_image_url: string | null
          promotion_id: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_target?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          mobile_image_url?: string | null
          promotion_id: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_target?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json | null
          mobile_image_url?: string | null
          promotion_id?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          end_at: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          slot_key: string
          start_at: string | null
          title: string | null
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          slot_key: string
          start_at?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          slot_key?: string
          start_at?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          logo_dark_mode: string | null
          logo_light_mode: string | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          postal_code: string | null
          state: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_dark_mode?: string | null
          logo_light_mode?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_dark_mode?: string | null
          logo_light_mode?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attribute_data_type: "text" | "number" | "boolean" | "select"
      order_status: "pending" | "paid" | "shipped" | "completed" | "cancelled"
      promotion_type: "carousel" | "banner" | "hero" | "popup" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attribute_data_type: ["text", "number", "boolean", "select"],
      order_status: ["pending", "paid", "shipped", "completed", "cancelled"],
      promotion_type: ["carousel", "banner", "hero", "popup", "custom"],
    },
  },
} as const
