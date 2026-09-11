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
    PostgrestVersion: "14.1"
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
      calculator_meta_field_options: {
        Row: {
          id: string
          field_id: string
          label: string
          value: string
          number_value: number | null
          is_default: boolean
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          field_id: string
          label: string
          value: string
          number_value?: number | null
          is_default?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          field_id?: string
          label?: string
          value?: string
          number_value?: number | null
          is_default?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_meta_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "calculator_meta_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_meta_fields: {
        Row: {
          id: string
          key: string
          label: string
          help_text: string | null
          field_type: Database["public"]["Enums"]["calculator_field_type"]
          unit_name: string | null
          unit_symbol: string | null
          min_value: number | null
          max_value: number | null
          step_value: number | null
          default_number: number | null
          default_text: string | null
          default_json: Json | null
          is_numeric: boolean
          is_required: boolean
          sort_order: number
          is_active: boolean
          is_deleted: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          help_text?: string | null
          field_type?: Database["public"]["Enums"]["calculator_field_type"]
          unit_name?: string | null
          unit_symbol?: string | null
          min_value?: number | null
          max_value?: number | null
          step_value?: number | null
          default_number?: number | null
          default_text?: string | null
          default_json?: Json | null
          is_numeric?: boolean
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          help_text?: string | null
          field_type?: Database["public"]["Enums"]["calculator_field_type"]
          unit_name?: string | null
          unit_symbol?: string | null
          min_value?: number | null
          max_value?: number | null
          step_value?: number | null
          default_number?: number | null
          default_text?: string | null
          default_json?: Json | null
          is_numeric?: boolean
          is_required?: boolean
          sort_order?: number
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      calculator_rule_conditions: {
        Row: {
          id: string
          rule_id: string
          field_id: string
          operator: Database["public"]["Enums"]["calculator_condition_operator"]
          min_value: number | null
          max_value: number | null
          value_text: string | null
          value_number: number | null
          value_boolean: boolean | null
          value_set: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          rule_id: string
          field_id: string
          operator?: Database["public"]["Enums"]["calculator_condition_operator"]
          min_value?: number | null
          max_value?: number | null
          value_text?: string | null
          value_number?: number | null
          value_boolean?: boolean | null
          value_set?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          rule_id?: string
          field_id?: string
          operator?: Database["public"]["Enums"]["calculator_condition_operator"]
          min_value?: number | null
          max_value?: number | null
          value_text?: string | null
          value_number?: number | null
          value_boolean?: boolean | null
          value_set?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_rule_conditions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "calculator_suggestion_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculator_rule_conditions_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "calculator_meta_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_rule_products: {
        Row: {
          id: string
          rule_id: string
          product_id: string
          variant_id: string | null
          sort_order: number
          is_primary: boolean
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rule_id: string
          product_id: string
          variant_id?: string | null
          sort_order?: number
          is_primary?: boolean
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rule_id?: string
          product_id?: string
          variant_id?: string | null
          sort_order?: number
          is_primary?: boolean
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculator_rule_products_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "calculator_suggestion_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculator_rule_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculator_rule_products_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      calculator_suggestion_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          min_load: number
          max_load: number | null
          unit_name: string
          unit_symbol: string
          priority: number
          headline: string | null
          note: string | null
          is_active: boolean
          is_deleted: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          min_load?: number
          max_load?: number | null
          unit_name?: string
          unit_symbol?: string
          priority?: number
          headline?: string | null
          note?: string | null
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          min_load?: number
          max_load?: number | null
          unit_name?: string
          unit_symbol?: string
          priority?: number
          headline?: string | null
          note?: string | null
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      load_groups: {
        Row: {
          id: string
          name: string
          slug: string | null
          icon: string | null
          description: string | null
          unit_name: string
          unit_symbol: string
          sort_order: number
          is_active: boolean
          is_deleted: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          icon?: string | null
          description?: string | null
          unit_name?: string
          unit_symbol?: string
          sort_order?: number
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          icon?: string | null
          description?: string | null
          unit_name?: string
          unit_symbol?: string
          sort_order?: number
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      load_items: {
        Row: {
          id: string
          load_group_id: string
          name: string
          icon: string | null
          unit_value: number
          default_quantity: number
          max_quantity: number | null
          sort_order: number
          is_active: boolean
          is_deleted: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          load_group_id: string
          name: string
          icon?: string | null
          unit_value?: number
          default_quantity?: number
          max_quantity?: number | null
          sort_order?: number
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          load_group_id?: string
          name?: string
          icon?: string | null
          unit_value?: number
          default_quantity?: number
          max_quantity?: number | null
          sort_order?: number
          is_active?: boolean
          is_deleted?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "load_items_load_group_id_fkey"
            columns: ["load_group_id"]
            isOneToOne: false
            referencedRelation: "load_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sections: {
        Row: {
          id: string
          project_id: string
          kind: Database["public"]["Enums"]["project_section_kind"]
          layout: Database["public"]["Enums"]["project_section_layout"]
          heading: string | null
          content_md: string | null
          image_url: string | null
          image_alt: string | null
          caption: string | null
          sort_order: number
          is_active: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          kind?: Database["public"]["Enums"]["project_section_kind"]
          layout?: Database["public"]["Enums"]["project_section_layout"]
          heading?: string | null
          content_md?: string | null
          image_url?: string | null
          image_alt?: string | null
          caption?: string | null
          sort_order?: number
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          kind?: Database["public"]["Enums"]["project_section_kind"]
          layout?: Database["public"]["Enums"]["project_section_layout"]
          heading?: string | null
          content_md?: string | null
          image_url?: string | null
          image_alt?: string | null
          caption?: string | null
          sort_order?: number
          is_active?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          id: string
          title: string
          slug: string
          summary: string | null
          cover_image_url: string | null
          client_name: string | null
          location: string | null
          completed_at: string | null
          is_featured: boolean
          is_active: boolean
          is_deleted: boolean
          sort_order: number
          published_at: string | null
          seo_title: string | null
          seo_description: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          summary?: string | null
          cover_image_url?: string | null
          client_name?: string | null
          location?: string | null
          completed_at?: string | null
          is_featured?: boolean
          is_active?: boolean
          is_deleted?: boolean
          sort_order?: number
          published_at?: string | null
          seo_title?: string | null
          seo_description?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          summary?: string | null
          cover_image_url?: string | null
          client_name?: string | null
          location?: string | null
          completed_at?: string | null
          is_featured?: boolean
          is_active?: boolean
          is_deleted?: boolean
          sort_order?: number
          published_at?: string | null
          seo_title?: string | null
          seo_description?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_deleted: boolean
          name: string
          parent_id: string | null
          sort_order: number
          slug: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          slug?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
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
      content_pages: {
        Row: {
          content_md: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          seo_description: string | null
          seo_title: string | null
          show_in_footer: boolean
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          show_in_footer?: boolean
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          show_in_footer?: boolean
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
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
          note: string | null
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
          note?: string | null
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
          note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_weight_rules: {
        Row: {
          base_charge: number
          base_weight_grams: number
          created_at: string
          delivery_id: string
          id: string
          increment_rounding: string
          incremental_charge: number
          incremental_unit_grams: number
          is_active: boolean
          label: string | null
          max_weight_grams: number | null
          metadata: Json | null
          min_weight_grams: number
          note: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_charge?: number
          base_weight_grams?: number
          created_at?: string
          delivery_id: string
          id?: string
          increment_rounding?: string
          incremental_charge?: number
          incremental_unit_grams?: number
          is_active?: boolean
          label?: string | null
          max_weight_grams?: number | null
          metadata?: Json | null
          min_weight_grams?: number
          note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_charge?: number
          base_weight_grams?: number
          created_at?: string
          delivery_id?: string
          id?: string
          increment_rounding?: string
          incremental_charge?: number
          incremental_unit_grams?: number
          is_active?: boolean
          label?: string | null
          max_weight_grams?: number | null
          metadata?: Json | null
          min_weight_grams?: number
          note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_weight_rules_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          button_label: string | null
          created_at: string
          custom_fields: Json | null
          id: string
          instructions: string | null
          is_active: boolean
          is_default: boolean
          key: string
          label: string
          metadata: Json | null
          note: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          button_label?: string | null
          created_at?: string
          custom_fields?: Json | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_default?: boolean
          key: string
          label: string
          metadata?: Json | null
          note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          button_label?: string | null
          created_at?: string
          custom_fields?: Json | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_default?: boolean
          key?: string
          label?: string
          metadata?: Json | null
          note?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_method_charges: {
        Row: {
          charge_option_id: string
          created_at: string
          id: string
          payment_method_id: string
          sort_order: number
        }
        Insert: {
          charge_option_id: string
          created_at?: string
          id?: string
          payment_method_id: string
          sort_order?: number
        }
        Update: {
          charge_option_id?: string
          created_at?: string
          id?: string
          payment_method_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_charges_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_method_charges_charge_option_id_fkey"
            columns: ["charge_option_id"]
            isOneToOne: false
            referencedRelation: "charge_options"
            referencedColumns: ["id"]
          },
        ]
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
          order_items_snapshot: Json
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
          order_items_snapshot?: Json
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
          order_items_snapshot?: Json
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
      product_badges: {
        Row: {
          color: string
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          label: string
          product_id: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          label: string
          product_id: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          product_id?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_badges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_datasheets: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          name: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_datasheets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
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
          is_deleted: boolean
          is_featured: boolean
          main_image_url: string | null
          name: string
          sort_order: number
          slug: string | null
          weight_grams: number
        }
        Insert: {
          brand?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          details_md?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          is_featured?: boolean
          main_image_url?: string | null
          name: string
          sort_order?: number
          slug?: string | null
          weight_grams?: number
        }
        Update: {
          brand?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          details_md?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          is_featured?: boolean
          main_image_url?: string | null
          name?: string
          sort_order?: number
          slug?: string | null
          weight_grams?: number
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
      calculator_match_rules: {
        Args: { p_meta?: Json; p_total_load: number }
        Returns: {
          headline: string
          max_load: number
          min_load: number
          name: string
          note: string
          priority: number
          rule_id: string
        }[]
      }
      calculator_suggested_products: {
        Args: { p_meta?: Json; p_total_load: number }
        Returns: {
          is_primary: boolean
          note: string
          product_id: string
          rule_headline: string
          rule_id: string
          rule_name: string
          rule_note: string
          rule_priority: number
          sort_order: number
          variant_id: string
        }[]
      }
      admin_customers_all: {
        Args: { p_search?: string }
        Returns: {
          email: string
          latest_order_at: string
          latest_order_id: string
          name: string
          orders_count: number
          phone: string
        }[]
      }
      admin_customers_page: {
        Args: { p_page?: number; p_page_size?: number; p_search?: string }
        Returns: {
          email: string
          latest_order_at: string
          latest_order_id: string
          name: string
          orders_count: number
          phone: string
          total_count: number
        }[]
      }
    }
    Enums: {
      attribute_data_type: "text" | "number" | "boolean" | "select"
      calculator_condition_operator:
        | "between"
        | "eq"
        | "neq"
        | "in"
        | "contains"
      calculator_field_type:
        | "slider"
        | "dropdown"
        | "input"
        | "radio"
        | "checkbox"
      project_section_kind: "text" | "image"
      project_section_layout: "full" | "left" | "right"
      order_status:
        | "pending"
        | "accepted"
        | "shipped"
        | "completed"
        | "cancelled"
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
      order_status: [
        "pending",
        "accepted",
        "shipped",
        "completed",
        "cancelled",
      ],
      promotion_type: ["carousel", "banner", "hero", "popup", "custom"],
    },
  },
} as const
