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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          lat: number
          lng: number
          title: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          lat: number
          lng: number
          title: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          lat?: number
          lng?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_handovers: {
        Row: {
          amount: number
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          received_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          received_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          received_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_handovers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          capacity: number | null
          city: string | null
          commission_type: string
          commission_value: number
          created_at: string
          free_until: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          city?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          free_until?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          city?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          free_until?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      driver_withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          driver_id: string
          id: string
          payment_method_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          driver_id: string
          id?: string
          payment_method_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          driver_id?: string
          id?: string
          payment_method_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          availability: Database["public"]["Enums"]["driver_availability"]
          balance: number
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          id: string
          license_status: Database["public"]["Enums"]["license_status"]
          name: string
          notifications_enabled: boolean
          payout_account: string | null
          payout_method: string | null
          payout_recipient_name: string | null
          payout_type: string | null
          phone: string
          rating: number
          status: Database["public"]["Enums"]["driver_status"]
          transfer_network_name: string | null
          transfer_phone: string | null
          transfer_recipient_name: string | null
          user_id: string | null
          vehicle_capacity: number
          vehicle_plate: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["driver_availability"]
          balance?: number
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          id?: string
          license_status?: Database["public"]["Enums"]["license_status"]
          name: string
          notifications_enabled?: boolean
          payout_account?: string | null
          payout_method?: string | null
          payout_recipient_name?: string | null
          payout_type?: string | null
          phone: string
          rating?: number
          status?: Database["public"]["Enums"]["driver_status"]
          transfer_network_name?: string | null
          transfer_phone?: string | null
          transfer_recipient_name?: string | null
          user_id?: string | null
          vehicle_capacity: number
          vehicle_plate: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["driver_availability"]
          balance?: number
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          id?: string
          license_status?: Database["public"]["Enums"]["license_status"]
          name?: string
          notifications_enabled?: boolean
          payout_account?: string | null
          payout_method?: string | null
          payout_recipient_name?: string | null
          payout_type?: string | null
          phone?: string
          rating?: number
          status?: Database["public"]["Enums"]["driver_status"]
          transfer_network_name?: string | null
          transfer_phone?: string | null
          transfer_recipient_name?: string | null
          user_id?: string | null
          vehicle_capacity?: number
          vehicle_plate?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          order_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          order_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          order_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          address_snapshot: Json | null
          app_commission: number
          capacity: number
          city: string
          commission_rule_snapshot: Json | null
          commission_status: string
          created_at: string
          customer_id: string
          driver_id: string | null
          driver_payout_amount: number
          driver_payout_status: string
          id: string
          notes: string | null
          payment_collected_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          price: number
          quantity: number
          refund_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          wallet_paid_at: string | null
          wallet_refunded_at: string | null
          water_type: Database["public"]["Enums"]["water_type"]
        }
        Insert: {
          address_id?: string | null
          address_snapshot?: Json | null
          app_commission?: number
          capacity: number
          city: string
          commission_rule_snapshot?: Json | null
          commission_status?: string
          created_at?: string
          customer_id: string
          driver_id?: string | null
          driver_payout_amount?: number
          driver_payout_status?: string
          id?: string
          notes?: string | null
          payment_collected_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          price: number
          quantity?: number
          refund_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          wallet_paid_at?: string | null
          wallet_refunded_at?: string | null
          water_type: Database["public"]["Enums"]["water_type"]
        }
        Update: {
          address_id?: string | null
          address_snapshot?: Json | null
          app_commission?: number
          capacity?: number
          city?: string
          commission_rule_snapshot?: Json | null
          commission_status?: string
          created_at?: string
          customer_id?: string
          driver_id?: string | null
          driver_payout_amount?: number
          driver_payout_status?: string
          id?: string
          notes?: string | null
          payment_collected_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          price?: number
          quantity?: number
          refund_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          wallet_paid_at?: string | null
          wallet_refunded_at?: string | null
          water_type?: Database["public"]["Enums"]["water_type"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          phone_number: string | null
          provider_name: string | null
          qr_code_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          phone_number?: string | null
          provider_name?: string | null
          qr_code_url?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          phone_number?: string | null
          provider_name?: string | null
          qr_code_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing: {
        Row: {
          capacity: number
          city: string
          created_at: string
          id: string
          price: number
        }
        Insert: {
          capacity: number
          city: string
          created_at?: string
          id?: string
          price: number
        }
        Update: {
          capacity?: number
          city?: string
          created_at?: string
          id?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string | null
          notifications_enabled: boolean
          phone: string | null
          type: Database["public"]["Enums"]["user_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string | null
          notifications_enabled?: boolean
          phone?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string | null
          notifications_enabled?: boolean
          phone?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_topups: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method_id: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_name: string | null
          sender_phone: string | null
          status: Database["public"]["Enums"]["topup_status"]
          transfer_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method_id?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["topup_status"]
          transfer_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method_id?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["topup_status"]
          transfer_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          direction: Database["public"]["Enums"]["wallet_tx_direction"]
          id: string
          order_id: string | null
          topup_id: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          direction: Database["public"]["Enums"]["wallet_tx_direction"]
          id?: string
          order_id?: string | null
          topup_id?: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          direction?: Database["public"]["Enums"]["wallet_tx_direction"]
          id?: string
          order_id?: string | null
          topup_id?: string | null
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_wallet_topup: {
        Args: { _topup_id: string }
        Returns: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method_id: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_name: string | null
          sender_phone: string | null
          status: Database["public"]["Enums"]["topup_status"]
          transfer_reference: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_topups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_app_commission: {
        Args: { _capacity: number; _city: string; _price: number }
        Returns: Record<string, unknown>
      }
      collect_order_payment: {
        Args: { _order_id: string }
        Returns: {
          address_id: string | null
          address_snapshot: Json | null
          app_commission: number
          capacity: number
          city: string
          commission_rule_snapshot: Json | null
          commission_status: string
          created_at: string
          customer_id: string
          driver_id: string | null
          driver_payout_amount: number
          driver_payout_status: string
          id: string
          notes: string | null
          payment_collected_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          price: number
          quantity: number
          refund_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          wallet_paid_at: string | null
          wallet_refunded_at: string | null
          water_type: Database["public"]["Enums"]["water_type"]
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_wallet_order: {
        Args: {
          _address_id: string
          _address_snapshot: Json
          _capacity: number
          _city: string
          _notes?: string
          _price: number
          _water_type: Database["public"]["Enums"]["water_type"]
        }
        Returns: {
          address_id: string | null
          address_snapshot: Json | null
          app_commission: number
          capacity: number
          city: string
          commission_rule_snapshot: Json | null
          commission_status: string
          created_at: string
          customer_id: string
          driver_id: string | null
          driver_payout_amount: number
          driver_payout_status: string
          id: string
          notes: string | null
          payment_collected_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          price: number
          quantity: number
          refund_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          wallet_paid_at: string | null
          wallet_refunded_at: string | null
          water_type: Database["public"]["Enums"]["water_type"]
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_order_customer_contact: {
        Args: { _order_id: string }
        Returns: {
          name: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_driver_withdrawal: {
        Args: { _action: string; _admin_notes?: string; _request_id: string }
        Returns: {
          admin_notes: string | null
          amount: number
          created_at: string
          driver_id: string
          id: string
          payment_method_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "driver_withdrawal_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_cash_handover: {
        Args: { _amount: number; _driver_id: string; _notes?: string }
        Returns: {
          amount: number
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          received_by: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_handovers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refund_wallet_order: {
        Args: { _order_id: string; _reason?: string }
        Returns: {
          address_id: string | null
          address_snapshot: Json | null
          app_commission: number
          capacity: number
          city: string
          commission_rule_snapshot: Json | null
          commission_status: string
          created_at: string
          customer_id: string
          driver_id: string | null
          driver_payout_amount: number
          driver_payout_status: string
          id: string
          notes: string | null
          payment_collected_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          price: number
          quantity: number
          refund_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          wallet_paid_at: string | null
          wallet_refunded_at: string | null
          water_type: Database["public"]["Enums"]["water_type"]
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_wallet_topup: {
        Args: { _admin_notes?: string; _topup_id: string }
        Returns: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method_id: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_name: string | null
          sender_phone: string | null
          status: Database["public"]["Enums"]["topup_status"]
          transfer_reference: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_topups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_driver_withdrawal: {
        Args: { _payment_method_notes?: string }
        Returns: {
          admin_notes: string | null
          amount: number
          created_at: string
          driver_id: string
          id: string
          payment_method_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "driver_withdrawal_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "driver"
      driver_availability: "available" | "busy" | "offline"
      driver_status: "active" | "inactive" | "busy"
      license_status: "pending" | "approved" | "rejected"
      notification_type:
        | "order_approved"
        | "order_rejected"
        | "order_accepted"
        | "order_on_way"
        | "order_arrived"
        | "order_unloading"
        | "order_payment_collected"
        | "order_completed"
        | "order_cancelled"
        | "general"
        | "wallet_topup_approved"
        | "wallet_topup_rejected"
      order_status:
        | "pending"
        | "approved"
        | "assigned"
        | "accepted"
        | "on_the_way"
        | "arrived"
        | "delivering"
        | "payment_collected"
        | "completed"
        | "cancelled"
        | "rejected"
      payment_method: "cash" | "wallet"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      topup_status: "pending" | "approved" | "rejected"
      user_type: "customer" | "driver" | "admin"
      wallet_tx_direction: "credit" | "debit"
      wallet_tx_type: "topup" | "order_payment" | "refund" | "adjustment"
      water_type: "normal" | "kawthar"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
  public: {
    Enums: {
      app_role: ["admin", "customer", "driver"],
      driver_availability: ["available", "busy", "offline"],
      driver_status: ["active", "inactive", "busy"],
      license_status: ["pending", "approved", "rejected"],
      notification_type: [
        "order_approved",
        "order_rejected",
        "order_accepted",
        "order_on_way",
        "order_arrived",
        "order_unloading",
        "order_payment_collected",
        "order_completed",
        "order_cancelled",
        "general",
        "wallet_topup_approved",
        "wallet_topup_rejected",
      ],
      order_status: [
        "pending",
        "approved",
        "assigned",
        "accepted",
        "on_the_way",
        "arrived",
        "delivering",
        "payment_collected",
        "completed",
        "cancelled",
        "rejected",
      ],
      payment_method: ["cash", "wallet"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      topup_status: ["pending", "approved", "rejected"],
      user_type: ["customer", "driver", "admin"],
      wallet_tx_direction: ["credit", "debit"],
      wallet_tx_type: ["topup", "order_payment", "refund", "adjustment"],
      water_type: ["normal", "kawthar"],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
