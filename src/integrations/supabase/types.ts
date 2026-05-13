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
      drivers: {
        Row: {
          availability: Database["public"]["Enums"]["driver_availability"]
          balance: number
          city: string | null
          created_at: string
          id: string
          license_status: Database["public"]["Enums"]["license_status"]
          name: string
          phone: string
          rating: number
          status: Database["public"]["Enums"]["driver_status"]
          user_id: string | null
          vehicle_capacity: number
          vehicle_plate: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["driver_availability"]
          balance?: number
          city?: string | null
          created_at?: string
          id?: string
          license_status?: Database["public"]["Enums"]["license_status"]
          name: string
          phone: string
          rating?: number
          status?: Database["public"]["Enums"]["driver_status"]
          user_id?: string | null
          vehicle_capacity: number
          vehicle_plate: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["driver_availability"]
          balance?: number
          city?: string | null
          created_at?: string
          id?: string
          license_status?: Database["public"]["Enums"]["license_status"]
          name?: string
          phone?: string
          rating?: number
          status?: Database["public"]["Enums"]["driver_status"]
          user_id?: string | null
          vehicle_capacity?: number
          vehicle_plate?: string
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
          capacity: number
          city: string
          created_at: string
          customer_id: string
          driver_id: string | null
          id: string
          notes: string | null
          payment_collected_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          price: number
          quantity: number
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          water_type: Database["public"]["Enums"]["water_type"]
        }
        Insert: {
          address_id?: string | null
          address_snapshot?: Json | null
          capacity: number
          city: string
          created_at?: string
          customer_id: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          payment_collected_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          price: number
          quantity?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          water_type: Database["public"]["Enums"]["water_type"]
        }
        Update: {
          address_id?: string | null
          address_snapshot?: Json | null
          capacity?: number
          city?: string
          created_at?: string
          customer_id?: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          payment_collected_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          price?: number
          quantity?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
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
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string | null
          phone: string | null
          type: Database["public"]["Enums"]["user_type"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string | null
          phone?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "driver"
      driver_availability: "available" | "busy" | "offline"
      driver_status: "active" | "inactive" | "busy"
      license_status: "pending" | "approved" | "rejected"
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
      payment_status: "pending" | "paid" | "failed"
      user_type: "customer" | "driver" | "admin"
      water_type: "sweet" | "desalinated" | "well"
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
      payment_status: ["pending", "paid", "failed"],
      user_type: ["customer", "driver", "admin"],
      water_type: ["sweet", "desalinated", "well"],
    },
  },
} as const
