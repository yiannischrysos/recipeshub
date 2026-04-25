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
      ingredients: {
        Row: {
          allergens: string[]
          brand: string | null
          category: string | null
          cost_per_unit: number
          created_at: string
          description: string | null
          dietary: string[]
          id: string
          name: string
          notes: string | null
          supplier: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allergens?: string[]
          brand?: string | null
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          description?: string | null
          dietary?: string[]
          id?: string
          name: string
          notes?: string | null
          supplier?: string | null
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allergens?: string[]
          brand?: string | null
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          description?: string | null
          dietary?: string[]
          id?: string
          name?: string
          notes?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          default_margin_pct: number
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          default_margin_pct?: number
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          default_margin_pct?: number
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          ingredient_note: string | null
          position: number
          quantity: number
          recipe_id: string
          unit_override: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          ingredient_note?: string | null
          position?: number
          quantity?: number
          recipe_id: string
          unit_override?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          ingredient_note?: string | null
          position?: number
          quantity?: number
          recipe_id?: string
          unit_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          created_at: string
          degrees: string | null
          description: string
          estimated_time: number | null
          fan_power: string | null
          id: string
          recipe_id: string
          step_number: number
          time_unit: string | null
        }
        Insert: {
          created_at?: string
          degrees?: string | null
          description: string
          estimated_time?: number | null
          fan_power?: string | null
          id?: string
          recipe_id: string
          step_number?: number
          time_unit?: string | null
        }
        Update: {
          created_at?: string
          degrees?: string | null
          description?: string
          estimated_time?: number | null
          fan_power?: string | null
          id?: string
          recipe_id?: string
          step_number?: number
          time_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          dietary: string[]
          family: string | null
          id: string
          margin_pct: number
          name: string
          parent_id: string | null
          recipe_order: number | null
          source: string | null
          source_url: string | null
          updated_at: string
          user_id: string
          yield_portions: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          dietary?: string[]
          family?: string | null
          id?: string
          margin_pct?: number
          name: string
          parent_id?: string | null
          recipe_order?: number | null
          source?: string | null
          source_url?: string | null
          updated_at?: string
          user_id: string
          yield_portions?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          dietary?: string[]
          family?: string | null
          id?: string
          margin_pct?: number
          name?: string
          parent_id?: string | null
          recipe_order?: number | null
          source?: string | null
          source_url?: string | null
          updated_at?: string
          user_id?: string
          yield_portions?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
